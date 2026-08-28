/* SensaSport — parcours d'onboarding (§5) */
(function () {
  const U = App.util, C = App.config, ui = App.ui;

  /* ------------------------------------------------- 1. BIENVENUE (§5.1) */

  ui.register('welcome', function (root) {
    root.innerHTML =
      '<div class="banner">' +
        ui.logoMark() +
        '<h1 class="title" style="margin-top:18px">Bienvenue</h1>' +
        '<p class="body" style="margin-top:10px">' +
          'On avance à l’écoute de ton corps, jamais à l’écoute d’un chiffre.<br>' +
          'Pas de miracle promis, juste une progression sereine, sans blessure.' +
        '</p>' +
      '</div>' +
      '<div class="stack-lg">' +
        '<div>' +
          '<label class="label" for="firstName">Comment tu t’appelles ?</label>' +
          '<input class="field" id="firstName" type="text" autocomplete="given-name" ' +
                 'placeholder="Ton prénom" maxlength="30">' +
        '</div>' +
        '<button class="btn btn-primary" id="start" disabled>Commencer</button>' +
        '<p class="muted-note center">Tes données restent sur ton téléphone. Rien n’est envoyé nulle part.</p>' +
      '</div>';

    const input = U.$('#firstName', root);
    const btn = U.$('#start', root);

    function sync() { btn.disabled = input.value.trim().length === 0; }
    input.addEventListener('input', sync);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !btn.disabled) btn.click();
    });
    btn.addEventListener('click', function () {
      ui.go('choose-zone', { firstName: input.value.trim() });
    });
    setTimeout(function () { input.focus(); }, 60);
  });

  /* --------------------------------------- 2. CHOIX DE ZONE (§5.2, §6) */

  ui.register('choose-zone', function (root, params) {
    let picked = null;

    function zoneCard(cfg) {
      const ex = cfg.exercises.slice(0, 3).map(function (e) { return e.name; }).join(' · ');
      return '<button class="card card-choice" data-zone="' + cfg.id + '" aria-pressed="false">' +
        '<div style="display:flex;align-items:center;gap:16px">' +
          '<div style="flex:0 0 84px">' + App.anim.forExercise(cfg.exercises[0], { ground: false }) + '</div>' +
          '<div style="flex:1">' +
            '<div class="subtitle">' + U.esc(cfg.name) + '</div>' +
            '<div class="small" style="margin-top:5px">' + U.esc(ex) + '</div>' +
          '</div>' +
        '</div>' +
      '</button>';
    }

    root.innerHTML =
      ui.header('Par où commencer ?', {
        sub: 'Choisis la zone que tu as envie de tester en premier. Il n’y a pas de bon ou de mauvais choix.'
      }) +
      '<div style="margin-top:26px">' +
        zoneCard(C.zones.core) +
        zoneCard(C.zones.legs) +
      '</div>' +
      /* Le déblocage part du premier circuit, pas de l’inscription (§6) :
         la promesse doit dire la même chose que le code. */
      '<p class="muted-note center" style="margin-top:18px">' +
        'L’autre zone se débloquera dès le lendemain de ton premier circuit.</p>' +
      '<div style="margin-top:24px">' +
        '<button class="btn btn-primary" id="confirm" disabled>Continuer</button>' +
      '</div>';

    const confirm = U.$('#confirm', root);

    U.on(root, 'click', '[data-zone]', function (e, t) {
      picked = t.getAttribute('data-zone');
      U.$$('[data-zone]', root).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === t));
      });
      confirm.disabled = false;
    });

    confirm.addEventListener('click', function () {
      App.store.completeOnboarding(params.firstName, picked);
      ui.go('home');
    });
  });
})();
