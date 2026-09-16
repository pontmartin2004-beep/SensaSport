/* SensaSport — état de l’application et persistance locale.
   Aucune donnée ne quitte l’appareil. */
window.App = window.App || {};

App.store = (function () {
  const U = App.util;
  const KEY = 'sensasport.v1';

  let memoryFallback = null;   // si localStorage est indisponible (ouverture en file://)
  let state = null;

  function blankZone(id) {
    return {
      id: id,
      unlocked: false,
      unlockDay: null,      // jour calendaire à partir duquel la zone devient testable
      isStartZone: false,
      sessions: [],         // historique des circuits
      seenDemos: {}         // exerciceId -> true (démo déjà vue au moins une fois)
    };
  }

  function blankState() {
    return {
      version: 1,
      firstName: '',
      createdDay: U.today(),
      onboarded: false,
      startZone: null,
      zones: { legs: blankZone('legs'), core: blankZone('core') },
      /* Séance commencée mais pas terminée. Réécrite à chaque étape du
         circuit pour que rien ne soit perdu si l’app est fermée en route. */
      activeRun: null,
      /* Séances de gainage : hors de tout cycle, donc stockées à part
         des zones et sans effet sur leurs délais. */
      bonusSessions: [],
      settings: {}
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memoryFallback;
    }
  }

  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      memoryFallback = state;
      App.store.persistenceWarning = true;
    }
  }

  function load() {
    const found = read();
    state = found && found.version === 1 ? found : blankState();
    // Migration douce : garantit la présence des champs ajoutés plus tard.
    const fresh = blankState();
    for (const k in fresh) if (!(k in state)) state[k] = fresh[k];
    for (const z in fresh.zones) {
      if (!state.zones[z]) state.zones[z] = fresh.zones[z];
      for (const k in fresh.zones[z]) if (!(k in state.zones[z])) state.zones[z][k] = fresh.zones[z][k];
    }
    for (const k in fresh.settings) if (!(k in state.settings)) state.settings[k] = fresh.settings[k];

    /* Réglages devenus sans objet : l’heure du rappel (fixée pour tous),
       puis la notification elle-même, remplacée par un rappel d’agenda.
       On les efface plutôt que de les laisser traîner dans l’état. */
    const obsoletes = ['reminderHour', 'hourMigrated', 'checkinReminder', 'notifiedOn'];
    if (obsoletes.some(function (k) { return k in state.settings; })) {
      obsoletes.forEach(function (k) { delete state.settings[k]; });
      write();
    }

    return state;
  }

  function get() { return state || load(); }

  function save(mutator) {
    const s = get();
    if (mutator) mutator(s);
    write();
    return s;
  }

  function zone(id) { return get().zones[id]; }

  /* ------------------------------------------------------- ONBOARDING --- */

  function completeOnboarding(firstName, startZoneId) {
    save(function (s) {
      s.firstName = (firstName || '').trim();
      s.onboarded = true;
      s.startZone = startZoneId;
      s.zones[startZoneId].unlocked = true;
      s.zones[startZoneId].unlockDay = U.today();
      s.zones[startZoneId].isStartZone = true;
      // L’autre zone reste verrouillée jusqu’au lendemain du premier test (§6).
      // Son unlockDay sera posé au moment où le premier circuit est terminé.
    });
  }

  /* Appelé quand un circuit se termine : débloque l’autre zone dès le
     jour calendaire suivant, pour ne jamais cumuler deux tests d’affilée (§6). */
  function scheduleOtherZoneUnlock() {
    save(function (s) {
      for (const id in s.zones) {
        const z = s.zones[id];
        if (!z.unlocked && !z.unlockDay) z.unlockDay = U.addDays(U.today(), 1);
      }
    });
  }

  /* Applique les déverrouillages arrivés à échéance. À appeler à chaque
     ouverture d’écran : le temps passe même quand l’app est fermée. */
  function refreshUnlocks() {
    let changed = false;
    const s = get();
    for (const id in s.zones) {
      const z = s.zones[id];
      if (!z.unlocked && z.unlockDay && U.daysBetween(z.unlockDay, U.today()) >= 0) {
        z.unlocked = true;
        changed = true;
      }
    }
    if (changed) write();
    return changed;
  }

  /* ---------------------------------------------------------- SÉANCES --- */

  function newSession(zoneId) {
    return {
      id: U.uid(),
      zoneId: zoneId,
      day: U.today(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      completed: false,        // les 3 tours ont été menés au bout
      endedBy: null,           // 'complete' | 'cap' | 'user'
      reps: {},                // exerciceId -> [tour1, tour2, tour3]
      records: []              // { day: n, dayKey, tier, at }
    };
  }

  function pushSession(session) {
    save(function (s) {
      s.zones[session.zoneId].sessions.push(session);
    });
    scheduleOtherZoneUnlock();
  }

  function lastSession(zoneId) {
    const list = zone(zoneId).sessions;
    return list.length ? list[list.length - 1] : null;
  }

  function markDemoSeen(zoneId, exerciseId) {
    save(function (s) { s.zones[zoneId].seenDemos[exerciseId] = true; });
  }

  /* --------------------------------------------- SÉANCE INTERROMPUE --- */

  /* ------------------------------------------------ STOCKAGE DURABLE ---
     Par défaut, un navigateur peut évincer les données d'un site quand
     l'espace manque. On demande le statut « persistant », qui l'en empêche.
     Accordé sans question quand l'app est installée sur l'écran d'accueil. */

  function requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) {
      return Promise.resolve({ supported: false, persisted: false });
    }
    return navigator.storage.persisted()
      .then(function (already) {
        return already ? true : navigator.storage.persist();
      })
      .then(function (ok) { return { supported: true, persisted: !!ok }; })
      .catch(function () { return { supported: true, persisted: false }; });
  }

  function persistenceStatus() {
    if (!navigator.storage || !navigator.storage.persisted) {
      return Promise.resolve({ supported: false, persisted: false });
    }
    return navigator.storage.persisted()
      .then(function (p) { return { supported: true, persisted: !!p }; })
      .catch(function () { return { supported: true, persisted: false }; });
  }

  /* ------------------------------------------------ SÉANCE BONUS --- */

  function pushBonus(record) {
    save(function (s) {
      if (!s.bonusSessions) s.bonusSessions = [];
      s.bonusSessions.push(record);
    });
  }

  function bonusSessions() { return get().bonusSessions || []; }

  function saveRun(snapshot) { save(function (s) { s.activeRun = snapshot; }); }
  function clearRun() { save(function (s) { s.activeRun = null; }); }
  function getRun() { return get().activeRun || null; }

  /* -------------------------------------------- CHECK-IN & DOULEURS --- */

  /* Enregistre un palier pour aujourd’hui sur la dernière séance de la zone.
     Un seul enregistrement par jour, et c’est la dernière réponse qui fait
     foi : le point du jour étant désormais l’unique façon de se signaler,
     une erreur de saisie doit pouvoir se corriger sans attendre demain. */
  function recordTier(zoneId, tier) {
    const s = get();
    const list = s.zones[zoneId].sessions;
    if (!list.length) return null;
    const session = list[list.length - 1];
    const key = U.today();
    const dayIndex = U.daysBetween(session.day, key);
    const existing = session.records.find(function (r) { return r.dayKey === key; });
    if (existing) {
      existing.tier = tier;
      existing.at = new Date().toISOString();
    } else {
      session.records.push({
        day: dayIndex, dayKey: key, tier: tier,
        at: new Date().toISOString()
      });
    }
    write();
    return session;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignoré */ }
    memoryFallback = null;
    state = blankState();
    write();
  }

  return {
    load: load, get: get, save: save, zone: zone,
    completeOnboarding: completeOnboarding,
    refreshUnlocks: refreshUnlocks,
    newSession: newSession, pushSession: pushSession, lastSession: lastSession,
    markDemoSeen: markDemoSeen,
    saveRun: saveRun, clearRun: clearRun, getRun: getRun,
    pushBonus: pushBonus, bonusSessions: bonusSessions,
    requestPersistence: requestPersistence, persistenceStatus: persistenceStatus,
    recordTier: recordTier,
    reset: reset,
    persistenceWarning: false
  };
})();
