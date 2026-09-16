/* SensaSport — amorçage et délégation d'évènements globale. */
(function () {
  const U = App.util, ui = App.ui;

  /* ---------------------------------------------------- CLICS GLOBAUX --- */

  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-tab],[data-back],[data-go],[data-start],[data-checkin],' +
      '[data-history],[data-ready],[data-stop],[data-replay],[data-key],' +
      '[data-quit],[data-quit-confirm],[data-quit-cancel],[data-sheet-close],' +
      '[data-resume],[data-finish-pending],[data-discard-pending],' +
      '[data-bonus-start],[data-bonus-quit],' +
      '[data-remind],[data-cal-ics],[data-cal-google],' +
      '[data-hzone],[data-hex],#finishBtn');
    if (!t) return;

    const a = function (n) { return t.getAttribute(n); };

    /* Rappel d'agenda. Le lien Google navigue nativement : on referme la
       feuille juste après, sinon le lien quitterait le document avant de partir. */
    if (t.hasAttribute('data-cal-google')) { setTimeout(ui.closeSheet, 300); return; }
    if (t.hasAttribute('data-remind')) {
      const p = a('data-remind').split('|');
      return App.calendar.offer(p[0], p[1]);
    }
    if (t.hasAttribute('data-cal-ics')) {
      const p = a('data-cal-ics').split('|');
      App.calendar.downloadIcs(p[0], p[1]);
      ui.closeSheet();
      return ui.toast('Ouvre le fichier pour l’ajouter à ton agenda.');
    }

    /* Feuille : on ferme d'abord, une éventuelle navigation suit. */
    if (t.hasAttribute('data-sheet-close') || t.hasAttribute('data-quit-cancel')) {
      ui.closeSheet();
      if (!t.hasAttribute('data-go')) return;
    }

    if (t.hasAttribute('data-tab'))     return ui.go(a('data-tab'));
    if (t.hasAttribute('data-back'))    return ui.back();
    if (t.hasAttribute('data-go'))      return ui.go(a('data-go'));

    if (t.hasAttribute('data-start'))   return App.session.start(a('data-start'));
    if (t.hasAttribute('data-checkin')) return ui.go('checkin', { zoneId: a('data-checkin') });
    if (t.hasAttribute('data-history')) return App.history.openZone(a('data-history'));

    if (t.hasAttribute('data-ready'))   return App.session.handleReady();
    if (t.hasAttribute('data-stop'))    return App.session.handleStop();
    if (t.hasAttribute('data-replay'))  return App.session.replay();
    if (t.hasAttribute('data-key'))     return App.session.handleKey(a('data-key'));
    if (t.hasAttribute('data-quit'))    return App.session.handleQuit();
    if (t.hasAttribute('data-quit-confirm')) return App.session.handleQuitConfirm();

    if (t.hasAttribute('data-bonus-start'))     return App.bonus.start(a('data-bonus-start'));
    if (t.hasAttribute('data-bonus-quit'))      return App.bonus.quit();
    if (t.hasAttribute('data-resume'))          return App.session.resume();
    if (t.hasAttribute('data-finish-pending'))  return App.session.finishInterrupted();
    if (t.hasAttribute('data-discard-pending')) return App.session.discardInterrupted();
    if (t.id === 'finishBtn')           return App.session.handleFinish();

    if (t.hasAttribute('data-hzone'))   return App.history.selectZone(a('data-hzone'));
    if (t.hasAttribute('data-hex'))     return App.history.selectExercise(a('data-hex'));
  });

  /* Le check-in se répond depuis l'accueil comme depuis son écran dédié. */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-tier]');
    if (!t) return;
    const group = t.closest('[data-tier-group]');
    if (!group) return;
    const zoneId = group.getAttribute('data-tier-group');
    const tier = Number(t.getAttribute('data-tier'));
    App.store.recordTier(zoneId, tier);
    App.checkin.feedback(zoneId, tier);
  });

  /* Le pavé numérique répond aussi au vrai clavier, sur ordinateur. */
  document.addEventListener('keydown', function (e) {
    if (!App.session.isRunning()) return;
    if (/^[0-9]$/.test(e.key)) { App.session.handleKey(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { App.session.handleKey('back'); e.preventDefault(); }
  });

  /* ------------------------------------------------------- DÉMARRAGE --- */

  function boot() {
    const s = App.store.load();
    App.store.refreshUnlocks();

    ui.go(s.onboarded ? 'home' : 'welcome');

    if (App.store.persistenceWarning) {
      ui.toast('Stockage local indisponible : cette session ne sera pas conservée.');
    }

    /* L'app restée ouverte en arrière-plan peut être rouverte des jours plus
       tard — typiquement depuis le rappel d'agenda. Si le jour a changé, on
       rafraîchit l'écran pour ne pas afficher « récupération en cours » le
       jour même où le point du jour est attendu. Jamais pendant une séance. */
    let jourAffiche = U.today();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || U.today() === jourAffiche) return;
      jourAffiche = U.today();
      App.store.refreshUnlocks();
      if (!App.session.isRunning() && !App.bonus.isRunning()) ui.refresh();
    });

    /* Demande au navigateur de ne pas évincer les données d'entraînement. */
    App.store.requestPersistence();

    /* Le cache hors ligne n'existe que pour la version servie en fichiers
       séparés : la version compilée en page unique n'a pas de sw.js. */
    if (!window.SENSASPORT_SINGLE_FILE &&
        'serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne non critique */ });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
