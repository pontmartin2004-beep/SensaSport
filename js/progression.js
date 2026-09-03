/* SensaSport — moteur de rythme d'entraînement.
   Chaque zone a son propre cycle : rien n'est partagé entre jambes et core.

   LE CYCLE
   --------
   séance ──► N jours d'attente ──► point du jour ──► selon le palier :

     palier 1  aucune gêne          séance rouverte le jour même
     palier 2  gêne légère          séance rouverte le jour même, avec un mot
                                    de prudence avant de commencer
     palier 3  gêne au quotidien    on attend, et on redemande chaque jour
                                    jusqu'à redescendre à 2 ou 1

   N vaut 3 par défaut. Il passe à 2 pour le cycle suivant quand deux
   conditions sont réunies : le point du jour a été répondu « aucune gêne »
   pile au bout des N jours, et la séance a été faite ce jour-là. Sinon on
   reste à 3. Rien n'est retiré à personne : 3 jours est le rythme normal,
   2 jours est un bonus qui se remérite à chaque cycle. */
window.App = window.App || {};

App.progression = (function () {
  const U = App.util;
  const C = App.config;

  /* ------------------------------------------------- DÉLAI D'UN CYCLE ---
     Le délai qui suit une séance dépend du cycle précédent. On rejoue donc
     l'historique depuis le début : déterministe, aucun état dérivé à stocker. */

  function delays(zoneId) {
    const cfg = C.zone(zoneId);
    const sessions = App.store.zone(zoneId).sessions;
    const out = [];

    for (let i = 0; i < sessions.length; i++) {
      if (i === 0) { out.push(cfg.delayDefault); continue; }

      const prev = sessions[i - 1];
      const prevDelay = out[i - 1];

      /* Le point du jour attendu, celui qui tombe pile au bout du délai. */
      const pointDuJour = prev.records.find(function (r) { return r.day === prevDelay; });

      const netAuBonJour = !!pointDuJour && pointDuJour.tier === 1;
      const seanceEnchainee = sessions[i].day === U.addDays(prev.day, prevDelay);

      out.push(netAuBonJour && seanceEnchainee ? cfg.delayReduced : cfg.delayDefault);
    }
    return out;
  }

  /* Délai qui s'applique après la dernière séance d'une zone. */
  function currentDelay(zoneId) {
    const cfg = C.zone(zoneId);
    const d = delays(zoneId);
    return d.length ? d[d.length - 1] : cfg.delayDefault;
  }

  /* ------------------------------------------------ ÉTAT D'UNE SÉANCE --- */

  function sessionStatus(session, delay) {
    if (delay == null) delay = C.zone(session.zoneId).delayDefault;

    const dayIndex = U.daysBetween(session.day, U.today());
    const records = session.records.slice().sort(function (a, b) { return a.day - b.day; });
    const last = records.length ? records[records.length - 1] : null;

    /* Le premier palier ≤ 2 rouvre la séance suivante et clôt le suivi. */
    const unlock = records.find(function (r) { return r.day >= delay && r.tier <= 2; }) || null;
    const resolved = !!unlock;

    const answeredToday = records.some(function (r) { return r.dayKey === U.today(); });

    /* On n'interroge qu'au bout du délai, puis chaque jour tant qu'un
       palier 3 traîne. Jamais avant : plus de questions à J+1 et J+2. */
    const checkinDue = !resolved && dayIndex >= delay && !answeredToday;

    return {
      delay: delay,
      dayIndex: dayIndex,
      records: records,
      lastTier: last ? last.tier : null,
      unlock: unlock,
      resolved: resolved,
      gentleWarning: resolved && unlock.tier === 2,
      /* Le cycle a mérité le délai réduit s'il a été net pile au bon jour.
         Reste à enchaîner la séance le jour même pour en profiter. */
      cleanOnTime: resolved && unlock.tier === 1 && unlock.day === delay,
      answeredToday: answeredToday,
      checkinDue: checkinDue,
      awaitingRelief: !resolved && last !== null && last.tier === 3
    };
  }

  /* --------------------------------------------- DISPONIBILITÉ SÉANCE --- */

  function nextSession(zoneId) {
    const z = App.store.zone(zoneId);

    if (!z.unlocked) return { state: 'locked' };
    if (!z.sessions.length) {
      return { state: 'ready', first: true, delay: C.zone(zoneId).delayDefault };
    }

    const last = z.sessions[z.sessions.length - 1];
    const delay = currentDelay(zoneId);
    const st = sessionStatus(last, delay);

    if (st.resolved) {
      return {
        state: 'ready',
        first: false,
        gentleWarning: st.gentleWarning,
        /* Faire la séance aujourd'hui décrocherait le délai réduit. */
        bonusToday: st.cleanOnTime && U.today() === U.addDays(last.day, delay),
        delay: delay, status: st, last: last
      };
    }

    if (st.dayIndex < delay) {
      return {
        state: 'resting',
        daysLeft: delay - st.dayIndex,
        availableOn: U.addDays(last.day, delay),
        delay: delay, status: st, last: last
      };
    }

    /* Le délai est écoulé : soit le point du jour attend une réponse,
       soit la personne a signalé une gêne qui la dérange encore. */
    return {
      state: st.awaitingRelief ? 'waiting' : 'checkin',
      delay: delay, status: st, last: last
    };
  }

  /* -------------------------------------------------------- RYTHME --- */

  function rhythmState(zoneId) {
    const cfg = C.zone(zoneId);
    const delay = currentDelay(zoneId);
    return {
      delay: delay,
      isReduced: delay <= cfg.delayReduced,
      standard: cfg.delayDefault,
      reduced: cfg.delayReduced
    };
  }

  /* Toutes les zones qui attendent une réponse aujourd'hui. */
  function pendingCheckins() {
    const out = [];
    C.zoneList.forEach(function (cfg) {
      const z = App.store.zone(cfg.id);
      if (!z.unlocked || !z.sessions.length) return;
      const last = z.sessions[z.sessions.length - 1];
      const st = sessionStatus(last, currentDelay(cfg.id));
      if (st.checkinDue) out.push({ zoneId: cfg.id, session: last, status: st });
    });
    return out;
  }

  return {
    delays: delays,
    currentDelay: currentDelay,
    sessionStatus: sessionStatus,
    nextSession: nextSession,
    rhythmState: rhythmState,
    pendingCheckins: pendingCheckins
  };
})();
