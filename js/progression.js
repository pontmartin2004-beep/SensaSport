/* SensaSport — moteur de rythme d’entraînement.
   Traduit les règles §7.7, §7.8 et §7.9 du cahier des charges.
   Chaque zone a son propre cycle : rien n’est partagé entre jambes et core. */
window.App = window.App || {};

App.progression = (function () {
  const U = App.util;
  const C = App.config;

  /* ------------------------------------------------ ÉTAT D’UNE SÉANCE ---
     Une séance ouvre une fenêtre de suivi de 3 jours pleins (§7.7).
     Elle reste ouverte au-delà tant que le dernier palier connu est un 3. */

  function sessionStatus(session) {
    const dayIndex = U.daysBetween(session.day, U.today());
    const records = session.records.slice().sort(function (a, b) { return a.day - b.day; });
    const last = records.length ? records[records.length - 1] : null;

    const lastTier = last ? last.tier : null;
    const blocked = lastTier === 3;                    // palier 3 : on attend (§7.7)
    const hasTier2 = records.some(function (r) { return r.tier === 2; });
    const tier3Days = records.filter(function (r) { return r.tier === 3; })
                             .map(function (r) { return r.day; });
    const lastTier3Day = tier3Days.length ? Math.max.apply(null, tier3Days) : -1;

    /* Circuit validé : plus aucun palier 3 au jour 3 ou après.
       « 3 jours pile = validé » → un palier 3 au jour 3 n’est PAS résolu en
       3 jours, un palier 3 au jour 2 suivi d’un retour au calme l’est.
       Les paliers 2 ne cassent pas la validation : ils sont traités à part
       par la règle de régression (§7.9). */
    const validated = lastTier3Day < C.CHECKIN_WINDOW_DAYS && !blocked;

    /* La fenêtre est close quand les 3 jours pleins sont passés et qu’aucun
       palier 3 ne traîne. Tant qu’elle est ouverte, le circuit ne compte pas
       encore dans le calcul du plancher. */
    const windowClosed = dayIndex >= C.CHECKIN_WINDOW_DAYS && !blocked;

    /* Un check-in est dû aujourd’hui si on est dans la fenêtre (ou bloqué)
       et qu’aucun palier n’a encore été noté aujourd’hui (§7.7 : filet
       anti-oubli, on interroge chaque jour même sans douleur signalée). */
    const answeredToday = records.some(function (r) { return r.dayKey === U.today(); });
    const checkinDue = dayIndex >= 1 && !answeredToday &&
                       (dayIndex <= C.CHECKIN_WINDOW_DAYS || blocked);

    return {
      dayIndex: dayIndex,
      records: records,
      lastTier: lastTier,
      blocked: blocked,
      hasTier2: hasTier2,
      validated: validated,
      windowClosed: windowClosed,
      checkinDue: checkinDue
    };
  }

  /* ------------------------------------------------------- PLANCHER ---
     Rejoué depuis l’historique complet à chaque appel : déterministe,
     pas d’état dérivé à maintenir en base. */

  function floorState(zoneId) {
    const zoneCfg = C.zone(zoneId);
    const sessions = App.store.zone(zoneId).sessions;

    let floor = zoneCfg.floorInitial;   // 3 jours au départ (§7.8)
    let streak = 0;                     // circuits validés d’affilée
    let tier2Streak = 0;                // circuits consécutifs avec au moins un palier 2
    let reducedOnce = false;

    for (let i = 0; i < sessions.length; i++) {
      const st = sessionStatus(sessions[i]);
      if (!st.windowClosed) break;      // circuit encore en cours de suivi

      /* --- Régression (§7.9) : ne s’applique que si le plancher a été réduit */
      const hasTier3 = st.records.some(function (r) { return r.tier === 3; });
      tier2Streak = st.hasTier2 ? tier2Streak + 1 : 0;

      if (floor < zoneCfg.floorInitial && (hasTier3 || tier2Streak >= 2)) {
        floor = zoneCfg.floorInitial;   // retour à 3 jours
        streak = 0;                     // remise à zéro du compteur
        tier2Streak = 0;
        continue;
      }

      /* --- Progression (§7.8) */
      if (st.validated) {
        streak += 1;
        if (floor > zoneCfg.floorReduced && streak >= C.CIRCUITS_TO_REDUCE_FLOOR) {
          floor = zoneCfg.floorReduced;
          reducedOnce = true;
          streak = 0;                   // le palier suivant repart de zéro
        }
      } else {
        streak = 0;                     // un circuit non validé casse la série
      }
    }

    return {
      floorDays: floor,
      streak: streak,
      needed: C.CIRCUITS_TO_REDUCE_FLOOR,
      atMinimum: floor <= zoneCfg.floorReduced,
      reducedOnce: reducedOnce
    };
  }

  /* --------------------------------------------- DISPONIBILITÉ SÉANCE --- */

  function nextSession(zoneId) {
    const zoneCfg = C.zone(zoneId);
    const z = App.store.zone(zoneId);
    const fs = floorState(zoneId);

    if (!z.unlocked) {
      return { state: 'locked', floor: fs };
    }
    if (!z.sessions.length) {
      return { state: 'ready', first: true, floor: fs };
    }

    const last = z.sessions[z.sessions.length - 1];
    const st = sessionStatus(last);

    if (st.blocked) {
      return { state: 'waiting', floor: fs, status: st, last: last };
    }

    const elapsed = U.daysBetween(last.day, U.today());
    if (elapsed < fs.floorDays) {
      return {
        state: 'resting',
        availableOn: U.addDays(last.day, fs.floorDays),
        daysLeft: fs.floorDays - elapsed,
        floor: fs, status: st, last: last
      };
    }

    /* Palier 2 signalé pendant la fenêtre : la séance est autorisée, avec un
       avertissement doux avant de commencer, sans rien changer au protocole. */
    return {
      state: 'ready',
      first: false,
      gentleWarning: st.hasTier2,
      floor: fs, status: st, last: last
    };
  }

  /* Toutes les zones qui attendent un check-in aujourd’hui. */
  function pendingCheckins() {
    const out = [];
    C.zoneList.forEach(function (cfg) {
      const z = App.store.zone(cfg.id);
      if (!z.unlocked || !z.sessions.length) return;
      const last = z.sessions[z.sessions.length - 1];
      const st = sessionStatus(last);
      if (st.checkinDue) out.push({ zoneId: cfg.id, session: last, status: st });
    });
    return out;
  }

  return {
    sessionStatus: sessionStatus,
    floorState: floorState,
    nextSession: nextSession,
    pendingCheckins: pendingCheckins
  };
})();
