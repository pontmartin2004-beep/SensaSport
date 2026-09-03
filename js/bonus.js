/* SensaSport — séance bonus de gainage.
   Indépendante de tout : aucun point du jour, aucun délai, aucun effet sur
   les cycles des jambes et de la ceinture abdominale. Se lance quand on veut.

   Machine à états : choix du format → maintien → repos → … → fin.
   Le maintien s'enchaîne automatiquement, mais « Je m'arrête ici » reste
   disponible en permanence et s'arrêter tôt n'est jamais un échec. */
(function () {
  const U = App.util, C = App.config, ui = App.ui;

  const RING_R = 62;
  const RING_C = 2 * Math.PI * RING_R;

  let run = null;
  let ticker = null;

  /* ---------------------------------------------------------- LANCEMENT --- */

  function start(formatId) {
    const f = C.BONUS.format(formatId);
    run = {
      format: f,
      set: 1,                 // série en cours, 1..f.sets
      state: 'hold',
      endsAt: Date.now() + f.hold * 1000,
      completed: 0            // séries tenues jusqu'au bout
    };
    clearInterval(ticker);
    ticker = setInterval(tick, 200);
    ui.go('bonus-run');
  }

  function stop() {
    clearInterval(ticker);
    ticker = null;
    run = null;
  }

  function remaining() {
    return Math.max(0, (run.endsAt - Date.now()) / 1000);
  }

  function total() {
    return run.state === 'hold' ? run.format.hold : run.format.rest;
  }

  /* -------------------------------------------------------- TRANSITIONS --- */

  function tick() {
    if (!run) { clearInterval(ticker); return; }
    paint();
    if (remaining() > 0) return;

    if (run.state === 'hold') {
      run.completed += 1;
      if (run.completed >= run.format.sets) { finish('complete'); return; }
      run.state = 'rest';
      run.endsAt = Date.now() + run.format.rest * 1000;
      ui.go('bonus-run');
    } else {
      run.set += 1;
      run.state = 'hold';
      run.endsAt = Date.now() + run.format.hold * 1000;
      ui.go('bonus-run');
    }
  }

  function finish(reason) {
    const record = {
      id: U.uid(),
      day: U.today(),
      at: new Date().toISOString(),
      formatId: run.format.id,
      hold: run.format.hold,
      rest: run.format.rest,
      planned: run.format.sets,
      sets: run.completed,
      completed: reason === 'complete'
    };
    App.store.pushBonus(record);
    stop();
    ui.go('bonus-done', { record: record });
  }

  function quit() {
    if (!run) return;
    if (run.completed === 0) { stop(); ui.go('session-tab'); return; }
    finish('user');
  }

  /* ------------------------------------------------------------- ÉCRANS --- */

  /* Choix du format, démonstration et rappel de posture. */
  ui.register('bonus', function (root) {
    const b = C.BONUS;

    root.innerHTML =
      ui.header(b.name, {
        back: true,
        eyebrow: 'Séance bonus',
        sub: 'Quand tu veux, en plus de tes circuits. Elle ne change rien à leur rythme.'
      }) +
      '<div style="margin-top:20px">' + ui.demoStage(b.exercise) + '</div>' +
      '<p class="body" style="margin-top:14px">' + U.esc(b.exercise.posture) + '</p>' +
      '<div class="sensory" style="margin-top:16px">' + U.esc(b.exercise.sensory) + '</div>' +

      '<div class="divider"></div>' +
      '<div class="eyebrow">Choisis ta version du jour</div>' +
      '<div class="stack" style="margin-top:12px">' +
        b.formats.map(function (f) {
          const mn = Math.round(b.totalSeconds(f) / 60);
          return '<button class="tier-btn" data-bonus-start="' + f.id + '">' +
            '<strong>' + U.esc(f.label) + '</strong>' +
            '<span>' + U.esc(f.detail) + ' · environ ' + mn + ' minutes</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<p class="muted-note center" style="margin-top:16px">' +
        'Rien ne t’engage : tu peux t’arrêter à n’importe quelle série.</p>';
  });

  /* Maintien et repos, sur le même écran pour ne pas casser le fil. */
  ui.register('bonus-run', function (root) {
    if (!run) { ui.go('session-tab'); return; }
    const enTenue = run.state === 'hold';

    root.innerHTML =
      '<div class="session-top">' +
        '<div>' +
          '<div class="small">Série ' + run.set + '/' + run.format.sets + '</div>' +
          '<div class="progress-pips" style="margin-top:8px">' +
            Array.from({ length: run.format.sets }, function (_, i) {
              return '<span class="pip ' + (i < run.completed ? 'done' : i === run.set - 1 ? 'now' : '') + '"></span>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<button class="btn btn-quiet btn-sm" data-bonus-quit="1" style="padding:6px 10px">Quitter</button>' +
      '</div>' +

      '<div class="center" style="margin-top:18px">' +
        '<div class="eyebrow">' + (enTenue ? 'Tiens la position' : 'Repos') + '</div>' +
        '<div class="ring-wrap large" id="ring" style="margin-top:16px">' +
          '<svg viewBox="0 0 140 140">' +
            '<circle class="ring-bg" cx="70" cy="70" r="' + RING_R + '"/>' +
            '<circle class="ring-fg" id="ringFg" cx="70" cy="70" r="' + RING_R + '" ' +
              'stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="0"/>' +
          '</svg>' +
          '<div class="ring-label" id="ringLabel"></div>' +
        '</div>' +
        '<p class="small" style="margin-top:14px" id="bonusNote"></p>' +
      '</div>' +

      (enTenue
        ? '<div class="sensory" style="margin-top:24px">' + U.esc(C.BONUS.exercise.sensory) + '</div>' +
          '<button class="btn btn-primary" style="margin-top:20px" data-bonus-quit="1">Je m’arrête ici</button>'
        : '<div style="margin-top:24px">' + ui.demoStage(C.BONUS.exercise) + '</div>' +
          '<p class="muted-note center" style="margin-top:14px">Reprends ta position, ça repart tout seul.</p>');

    paint();
  });

  function paint() {
    const label = document.getElementById('ringLabel');
    const fg = document.getElementById('ringFg');
    const note = document.getElementById('bonusNote');
    if (!label || !run) return;

    const rem = remaining();
    label.textContent = Math.ceil(rem);
    fg.setAttribute('stroke-dashoffset', String(RING_C * (1 - rem / total())));

    if (note) {
      note.textContent = run.state === 'hold'
        ? (run.set < run.format.sets ? 'Repos ensuite : ' + run.format.rest + ' secondes'
                                     : 'Dernière série')
        : 'Série ' + (run.set + 1) + '/' + run.format.sets + ' juste après';
    }
  }

  /* Écran de fin — le même ton que les circuits : rien n'est raté. */
  ui.register('bonus-done', function (root, params) {
    const r = params.record;
    const tenu = r.sets * r.hold;

    root.innerHTML =
      '<div class="banner">' +
        '<div style="display:flex;align-items:center;gap:14px">' +
          '<div class="logo-mark" style="width:52px;height:52px;border-radius:16px">' +
            '<svg viewBox="0 0 24 24" style="color:#fff;width:26px;height:26px">' +
            '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" ' +
            'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<h1 class="title">Gainage terminé</h1>' +
        '</div>' +
        '<p class="body" style="margin-top:14px">' +
          (r.completed
            ? 'Les ' + r.planned + ' séries au complet.'
            : 'Tu t’es arrêté quand ta posture l’a demandé. C’est le bon repère.') +
        '</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="eyebrow">Séance bonus</div>' +
        '<div style="display:flex;gap:24px;margin-top:12px">' +
          '<div><div class="title">' + r.sets + '/' + r.planned + '</div><div class="small">séries tenues</div></div>' +
          '<div><div class="title">' + U.clockText(tenu) + '</div><div class="small">de gainage</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:22px" class="stack">' +
        '<button class="btn btn-primary" data-go="session-tab">Retour aux séances</button>' +
        '<button class="btn btn-quiet" data-go="bonus">En refaire une</button>' +
      '</div>';
  });

  /* -------------------------------------------------------------- CARTE --- */

  /* Carte affichée dans l'onglet Séance, sous les circuits. */
  function card() {
    const faites = App.store.bonusSessions();
    const derniere = faites.length ? faites[faites.length - 1] : null;

    return '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
        '<div>' +
          '<div class="eyebrow">Séance bonus</div>' +
          '<div class="subtitle" style="margin-top:4px">Gainage</div>' +
        '</div>' +
        '<div style="flex:0 0 74px;opacity:.9">' +
          App.anim.svg('plank', { ground: false }) + '</div>' +
      '</div>' +
      '<p class="body" style="margin-top:12px">' +
        'Courte, à faire quand tu veux. Elle ne compte pas dans le rythme de tes circuits.' +
      '</p>' +
      (derniere
        ? '<p class="small" style="margin-top:8px">Dernière fois ' +
          U.esc(U.relativeDay(derniere.day)) + ' · ' + derniere.sets + '/' + derniere.planned + ' séries</p>'
        : '') +
      '<button class="btn btn-ghost" data-go="bonus" style="margin-top:16px">Faire un gainage</button>' +
    '</div>';
  }

  App.bonus = {
    start: start,
    quit: quit,
    stop: stop,
    isRunning: function () { return !!run; },
    card: card
  };
})();
