/* SensaSport — coquille de l'app : icônes, routeur, onglets, feuilles, toasts. */
window.App = window.App || {};

App.ui = (function () {
  const U = App.util;

  /* ------------------------------------------------------------ ICÔNES ---
     Tracés simples, stroke uniquement, pour rester lisibles en petit. */
  const ICONS = {
    /* Ligne de pulsation : le motif du logo (§3) */
    pulse: '<path d="M2 12h4.5l2.5-7 4 14 2.5-7H22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    history: '<path d="M5 20V11M12 20V5M19 20v-6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    profile: '<circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 20c.6-3.6 3.6-5.6 7.2-5.6S18.6 16.4 19.2 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>',
    back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    plus: '<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };

  function icon(name, size) {
    const s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true">' +
           (ICONS[name] || '') + '</svg>';
  }

  function logoMark() {
    return '<div class="logo-mark">' +
           '<svg viewBox="0 0 24 24" aria-hidden="true" style="color:#fff">' + ICONS.pulse + '</svg>' +
           '</div>';
  }

  /* ------------------------------------------------------------ ROUTEUR --- */

  const routes = {};
  let current = null;
  let prev = null;

  const NO_RETURN = ['session', 'session-done', 'welcome', 'choose-zone'];

  function register(name, renderFn) { routes[name] = renderFn; }

  function go(name, params) {
    const fn = routes[name];
    if (!fn) { console.warn('Écran inconnu :', name); return; }
    closeSheet();
    if (current && current.name !== name) prev = current.name;
    current = { name: name, params: params || {} };
    App.store.refreshUnlocks();

    const root = document.getElementById('app');
    const screen = document.getElementById('screen');
    const isTabbed = ['home', 'session-tab', 'history', 'profile'].indexOf(name) !== -1;
    root.classList.toggle('no-tabs', !isTabbed);

    screen.innerHTML = '';
    fn(screen, current.params);
    renderTabs(name);
    window.scrollTo(0, 0);
  }

  function refresh() { if (current) go(current.name, current.params); }
  function currentRoute() { return current; }

  /* Retour : l'écran précédent, sauf s'il n'a plus de sens (séance terminée,
     onboarding déjà passé) — dans ce cas on revient à l'accueil. */
  function back() {
    const target = (prev && NO_RETURN.indexOf(prev) === -1) ? prev : 'home';
    go(target);
  }

  /* ------------------------------------------------------------ ONGLETS --- */

  const TABS = [
    { id: 'home',        label: 'Accueil',    icon: 'home' },
    { id: 'session-tab', label: 'Séance',     icon: 'pulse' },
    { id: 'history',     label: 'Historique', icon: 'history' },
    { id: 'profile',     label: 'Profil',     icon: 'profile' }
  ];

  function renderTabs(active) {
    const bar = document.getElementById('tabbar');
    const pending = App.progression.pendingCheckins().length > 0;
    bar.innerHTML = TABS.map(function (t) {
      const on = t.id === active;
      return '<button class="tab" data-tab="' + t.id + '"' +
             (on ? ' aria-current="page"' : '') + '>' +
             icon(t.icon) +
             (t.id === 'home' && pending ? '<span class="dot"></span>' : '') +
             '<span>' + t.label + '</span></button>';
    }).join('');
  }

  /* --------------------------------------------------- FEUILLE / TOAST --- */

  function sheet(html, opts) {
    opts = opts || {};
    closeSheet();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'overlay';
    ov.innerHTML = '<div class="sheet">' + html + '</div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov && opts.dismissible !== false) closeSheet();
    });
    document.body.appendChild(ov);
    if (opts.onMount) opts.onMount(ov.querySelector('.sheet'));
    return ov;
  }

  function closeSheet() {
    const ov = document.getElementById('overlay');
    if (ov) ov.remove();
  }

  let toastTimer = null;
  function toast(msg) {
    const old = document.getElementById('toast');
    if (old) old.remove();
    clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.className = 'toast';
    el.id = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    toastTimer = setTimeout(function () { el.remove(); }, 3200);
  }

  /* ---------------------------------------------------------- FRAGMENTS --- */

  function header(title, opts) {
    opts = opts || {};
    return '<div class="screen-pad-top">' +
      (opts.back ? '<button class="btn btn-quiet btn-sm" data-back="1" style="margin:0 0 10px -12px">' +
        icon('back', 18) + ' Retour</button>' : '') +
      (opts.eyebrow ? '<div class="eyebrow">' + U.esc(opts.eyebrow) + '</div>' : '') +
      '<h1 class="title">' + U.esc(title) + '</h1>' +
      (opts.sub ? '<p class="body" style="margin-top:8px">' + opts.sub + '</p>' : '') +
      '</div>';
  }

  function demoStage(exercise) {
    return '<div class="demo-stage">' + App.anim.forExercise(exercise) + '</div>';
  }

  return {
    icon: icon, logoMark: logoMark,
    register: register, go: go, back: back, refresh: refresh, currentRoute: currentRoute,
    renderTabs: renderTabs,
    sheet: sheet, closeSheet: closeSheet, toast: toast,
    header: header, demoStage: demoStage
  };
})();
