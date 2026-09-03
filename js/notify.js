/* SensaSport — rappel quotidien doux (§7.7).
   Sans serveur, la notification ne part que si l'app a été ouverte au moins
   une fois dans la journée : le vrai filet reste la carte « point du jour »
   sur l'accueil, qui elle ne dépend d'aucune permission. */
window.App = window.App || {};

App.notify = (function () {
  const U = App.util, C = App.config;
  let timer = null;

  function supported() { return typeof Notification !== 'undefined'; }

  function statusText() {
    if (!supported()) return 'Ton navigateur ne gère pas les notifications. Le point du jour reste affiché sur l’accueil.';
    if (Notification.permission === 'granted') return 'Notifications autorisées.';
    if (Notification.permission === 'denied') return 'Notifications refusées. Le point du jour reste affiché sur l’accueil.';
    return 'Autorisation pas encore demandée.';
  }

  function request() {
    if (!supported() || Notification.permission !== 'default') return;
    Notification.requestPermission().then(function () { schedule(); });
  }

  function fireIfDue() {
    const s = App.store.get();
    if (!s.settings.checkinReminder) return;
    if (!supported() || Notification.permission !== 'granted') return;

    const today = U.today();
    if (s.settings.notifiedOn[today]) return;

    const pending = App.progression.pendingCheckins();
    if (!pending.length) return;

    const cfg = C.zone(pending[0].zoneId);
    const body = pending.length > 1
      ? 'Comment tu te sens aujourd’hui ?'
      : cfg.checkinQuestion;

    try {
      new Notification('SensaSport', {
        body: body,
        tag: 'sensasport-checkin',
        icon: 'assets/icon.svg'
      });
      App.store.save(function (st) { st.settings.notifiedOn[today] = true; });
    } catch (e) { /* certains navigateurs exigent un service worker : on ignore */ }
  }

  /* Programme le prochain passage à l'heure choisie (ou tout de suite si
     l'heure est déjà passée et qu'un point est en attente). */
  function schedule() {
    clearTimeout(timer);
    const s = App.store.get();
    if (!s.settings.checkinReminder) return;

    const now = new Date();
    const target = new Date();
    target.setHours(C.REMINDER_HOUR, 0, 0, 0);

    if (now >= target) {
      fireIfDue();
      target.setDate(target.getDate() + 1);
    }
    const delay = Math.min(target - now, 2147483000);
    timer = setTimeout(function () { fireIfDue(); schedule(); }, Math.max(1000, delay));
  }

  function init() {
    schedule();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { App.store.refreshUnlocks(); schedule(); }
    });
  }

  return { init: init, schedule: schedule, request: request, statusText: statusText, supported: supported };
})();
