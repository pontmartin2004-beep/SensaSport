/* SensaSport — déroulé d'un circuit (§7.1 à §7.6)
   Machine à états : intro → exercice → récupération → … → saisie finale → fin.
   La transition après récupération est automatique et non zappable. */
(function () {
  const U = App.util, C = App.config, ui = App.ui;

  const RING_R = 62;
  const RING_C = 2 * Math.PI * RING_R;

  /* Court délai de stabilisation après la dernière touche : sans lui, saisir
     « 12 » validerait dès le « 1 ». La transition reste ressentie comme
     immédiate, et le temps de récupération n'est toujours pas zappable. */
  const SETTLE_MS = 1200;

  let run = null;             // séance en cours, reflet de ce qui est sur le disque
  let ticker = null;
  let pendingStartZone = null; // zone que l'utilisateur voulait démarrer, mise en attente

  /* ------------------------------------------------------------ HELPERS --- */

  function exCount() { return run.cfg.exercises.length; }
  function roundOf(i) { return Math.floor(i / exCount()); }        // 0-based
  function posOf(i) { return i % exCount(); }                      // 0-based
  function exAt(i) { return run.cfg.exercises[posOf(i)]; }
  function isLast(i) { return i >= run.cfg.rounds * exCount() - 1; }

  function elapsed() { return (Date.now() - run.startedAt) / 1000; }

  /* ------------------------------------------------- PERSISTANCE ---
     Le circuit est réécrit sur le disque à chaque étape et à chaque
     saisie : si l'app est fermée en pleine séance, rien n'est perdu.
     On enregistre le temps écoulé plutôt qu'une heure de départ, pour
     que le plafond de temps ne compte pas les minutes hors de l'app. */

  function persist() {
    if (!run) return;
    App.store.saveRun({
      zoneId: run.zoneId,
      session: run.session,
      index: run.index,
      state: run.state,
      buffer: run.buffer,
      elapsed: elapsed(),
      capReached: run.capReached,
      pendingFinish: run.pendingFinish,
      finalReason: run.finalReason || null,
      rest: run.rest
        ? { total: run.rest.total, remaining: remaining(), nextLabel: run.rest.nextLabel }
        : null,
      savedAt: Date.now()
    });
  }

  function recordReps(index, value) {
    const ex = exAt(index);
    const r = roundOf(index);
    if (!run.session.reps[ex.id]) run.session.reps[ex.id] = [];
    run.session.reps[ex.id][r] = value;
  }

  /* --------------------------------------------------------- DÉMARRAGE --- */

  function start(zoneId) {
    const cfg = C.zone(zoneId);
    /* Garde-fou : toutes les zones sont désormais implémentées, mais une
       nouvelle pourrait être ajoutée avant que son circuit soit défini. */
    if (!cfg.implemented) {
      ui.toast('Le circuit ' + cfg.name.toLowerCase() + ' n’est pas encore prêt.');
      ui.go('home');
      return;
    }

    /* Une séance interrompue ne doit jamais être écrasée en silence. */
    const pending = App.store.getRun();
    if (pending) { pendingStartZone = zoneId; askAboutPending(pending); return; }

    startFresh(zoneId);
  }

  function startFresh(zoneId) {
    const cfg = C.zone(zoneId);
    run = {
      zoneId: zoneId,
      cfg: cfg,
      session: App.store.newSession(zoneId),
      index: 0,
      state: 'intro',
      startedAt: Date.now(),
      capReached: false,
      pendingFinish: false,
      rest: null,
      buffer: '',
      lastKeyAt: 0
    };

    clearInterval(ticker);
    ticker = setInterval(tick, 200);
    persist();
    ui.go('session');
  }

  /* Décrit une séance interrompue : zone, position dans le circuit, total noté. */
  function describePending(snap) {
    const cfg = C.zone(snap.zoneId);
    const n = cfg.exercises.length;
    let total = 0;
    Object.keys(snap.session.reps).forEach(function (k) {
      snap.session.reps[k].forEach(function (v) { total += (v || 0); });
    });
    return {
      cfg: cfg,
      round: Math.floor(snap.index / n) + 1,
      rounds: cfg.rounds,
      position: (snap.index % n) + 1,
      perRound: n,
      total: total,
      sameDay: snap.session.day === U.today(),
      day: snap.session.day
    };
  }

  function askAboutPending(snap) {
    const d = describePending(snap);
    ui.sheet(
      '<h2 class="subtitle">Une séance est déjà commencée</h2>' +
      '<p class="body" style="margin-top:10px">' +
        U.esc(d.cfg.name) + ', tour ' + d.round + '/' + d.rounds +
        '. Tu avais noté ' + d.total + ' répétition' + (d.total > 1 ? 's' : '') + '.' +
      '</p>' +
      '<div class="stack" style="margin-top:22px">' +
        (d.sameDay
          ? '<button class="btn btn-primary" data-resume="1">Reprendre où j’en étais</button>'
          : '') +
        '<button class="btn btn-ghost" data-finish-pending="1">Terminer cette séance ici</button>' +
        '<button class="btn btn-quiet" data-discard-pending="1">L’effacer et repartir de zéro</button>' +
      '</div>'
    );
  }

  /* Reprend une séance interrompue à l'endroit exact où elle s'est arrêtée. */
  function resume() {
    const snap = App.store.getRun();
    if (!snap) { ui.go('home'); return; }

    const cfg = C.zone(snap.zoneId);
    run = {
      zoneId: snap.zoneId,
      cfg: cfg,
      session: snap.session,
      index: snap.index,
      state: snap.state,
      startedAt: Date.now() - snap.elapsed * 1000,
      capReached: snap.capReached,
      pendingFinish: snap.pendingFinish,
      finalReason: snap.finalReason,
      rest: snap.rest
        ? {
            total: snap.rest.total,
            endsAt: Date.now() + snap.rest.remaining * 1000,
            nextLabel: snap.rest.nextLabel
          }
        : null,
      buffer: snap.buffer || '',
      lastKeyAt: 0
    };

    clearInterval(ticker);
    ticker = setInterval(tick, 200);
    ui.go('session');
  }

  /* Clôt une séance interrompue en gardant ce qui avait été noté. */
  function finishInterrupted() {
    const snap = App.store.getRun();
    if (!snap) { ui.go('home'); return; }
    const s = snap.session;
    s.finishedAt = new Date().toISOString();
    s.endedBy = 'user';
    s.completed = false;
    App.store.pushSession(s);
    App.store.clearRun();
    ui.go('session-done', { zoneId: snap.zoneId, session: s });
  }

  /* Abandonne une séance interrompue sans rien enregistrer. Si l'utilisateur
     venait de demander un nouveau circuit, on l'enchaîne directement. */
  function discardInterrupted() {
    App.store.clearRun();
    ui.closeSheet();
    const zoneId = pendingStartZone;
    pendingStartZone = null;
    if (zoneId) startFresh(zoneId);
    else ui.go('home');
  }

  function stop() {
    clearInterval(ticker);
    ticker = null;
    run = null;
  }

  /* Plafond de temps global : on n'affiche aucun décompte pendant l'effort,
     la séance se referme simplement en douceur quand le temps est écoulé (§7.1). */
  function tick() {
    if (!run) { clearInterval(ticker); return; }

    if (!run.capReached && elapsed() >= run.cfg.globalCapSeconds) {
      run.capReached = true;
      if (run.state === 'exercise') { goFinal('cap'); return; }
      run.pendingFinish = true;
    }

    if (run.state === 'rest') tickRest();
  }

  /* ------------------------------------------------------- TRANSITIONS --- */

  function beginExercise() {
    run.state = 'exercise';
    persist();
    ui.go('session');
  }

  function endExercise() {
    if (isLast(run.index) || run.pendingFinish || run.capReached) { goFinal(run.capReached ? 'cap' : 'end'); return; }
    const ex = exAt(run.index);
    const nextIndex = run.index + 1;
    const nextEx = exAt(nextIndex);
    const newRound = posOf(nextIndex) === 0;

    run.state = 'rest';
    run.buffer = '';
    run.lastKeyAt = 0;
    run.rest = {
      total: ex.restAfter,
      endsAt: Date.now() + ex.restAfter * 1000,
      nextLabel: 'Ensuite : ' + (newRound
        ? 'Tour ' + (roundOf(nextIndex) + 1) + ' — ' + nextEx.name
        : nextEx.name)
    };
    persist();
    ui.go('session');
  }

  function advance() {
    recordReps(run.index, Number(run.buffer));
    run.index += 1;
    run.buffer = '';
    run.rest = null;
    if (run.pendingFinish) { finish('cap'); return; }
    run.state = roundOf(run.index) === 0 ? 'intro' : 'exercise';
    persist();
    ui.go('session');
  }

  function goFinal(reason) {
    run.state = 'final';
    run.finalReason = reason;
    run.buffer = '';
    run.rest = null;
    persist();
    ui.go('session');
  }

  function finish(reason) {
    const s = run.session;
    s.finishedAt = new Date().toISOString();
    s.endedBy = reason === 'cap' ? 'cap' : (reason === 'user' ? 'user' : 'complete');
    s.completed = isLast(run.index) && reason !== 'cap' && reason !== 'user';
    App.store.pushSession(s);
    App.store.clearRun();
    const summary = { zoneId: run.zoneId, session: s };
    stop();
    ui.go('session-done', summary);
  }

  /* ------------------------------------------------------------- RENDU --- */

  ui.register('session', function (root) {
    if (!run) { ui.go('home'); return; }
    if (run.state === 'intro') return renderIntro(root);
    if (run.state === 'exercise') return renderExercise(root);
    if (run.state === 'rest') return renderRest(root);
    if (run.state === 'final') return renderFinal(root);
  });

  function topBar() {
    const total = run.cfg.rounds * exCount();
    const pips = [];
    for (let i = 0; i < total; i++) {
      pips.push('<span class="pip ' + (i < run.index ? 'done' : i === run.index ? 'now' : '') + '"></span>');
    }
    return '<div class="session-top">' +
      '<div>' +
        '<div class="small">Tour ' + (roundOf(run.index) + 1) + '/' + run.cfg.rounds +
        ' — Exercice ' + (posOf(run.index) + 1) + '/' + exCount() + '</div>' +
        '<div class="progress-pips" style="margin-top:8px">' + pips.join('') + '</div>' +
      '</div>' +
      '<button class="btn btn-quiet btn-sm" data-quit="1" style="padding:6px 10px">Quitter</button>' +
    '</div>';
  }

  /* --- Écran avant un exercice, première apparition (§9.4) --- */
  function renderIntro(root) {
    const ex = exAt(run.index);
    root.innerHTML =
      topBar() +
      '<div class="stack-lg" style="margin-top:14px">' +
        ui.demoStage(ex) +
        '<div>' +
          '<h1 class="exercise-name">' + U.esc(ex.name) + '</h1>' +
          (ex.posture ? '<p class="body" style="margin-top:10px">' + U.esc(ex.posture) + '</p>' : '') +
        '</div>' +
        '<div class="card accent">' +
          '<p class="body" style="color:var(--green-900)">' + U.esc(C.COUNT_REMINDER) + '</p>' +
          (ex.extraIntro ? '<p class="body" style="color:var(--green-900);margin-top:10px">' +
                           U.esc(ex.extraIntro) + '</p>' : '') +
        '</div>' +
        '<button class="btn btn-primary" data-ready="1">C’est bon, je suis prêt</button>' +
      '</div>';
  }

  /* --- Exercice en cours (§9.5) : repère sensoriel affiché en continu --- */
  function renderExercise(root) {
    const ex = exAt(run.index);
    root.innerHTML =
      topBar() +
      '<div class="stack-lg" style="margin-top:14px">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">' +
          '<h1 class="exercise-name" style="flex:1">' + U.esc(ex.name) + '</h1>' +
          '<button class="replay-btn" data-replay="1" aria-label="Revoir la démonstration">' +
            ui.icon('play', 18) + '</button>' +
        '</div>' +
        '<div class="sensory">' + U.esc(ex.sensory) + '</div>' +
        '<div style="height:6px"></div>' +
        '<button class="btn btn-primary" data-stop="1">Je m’arrête ici</button>' +
        '<p class="muted-note center">Tu noteras tes répétitions juste après.</p>' +
      '</div>';
  }

  /* --- Récupération (§7.6, §9.6) --- */
  function renderRest(root) {
    const done = exAt(run.index);

    root.innerHTML =
      topBar() +
      '<div class="stack-lg" style="margin-top:10px">' +
        '<div class="center">' +
          '<div class="eyebrow">Récupération</div>' +
          '<div class="ring-wrap" id="ring" style="margin-top:14px">' +
            '<svg viewBox="0 0 140 140">' +
              '<circle class="ring-bg" cx="70" cy="70" r="' + RING_R + '"/>' +
              '<circle class="ring-fg" id="ringFg" cx="70" cy="70" r="' + RING_R + '" ' +
                'stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="0"/>' +
            '</svg>' +
            '<div class="ring-label" id="ringLabel">' + run.rest.total + '</div>' +
          '</div>' +
          '<p class="small" style="margin-top:12px" id="restNote">' +
            U.esc(run.rest.nextLabel) +
          '</p>' +
        '</div>' +
        '<div>' +
          '<div class="label center">Répétitions — ' + U.esc(done.shortName || done.name) + '</div>' +
          '<div class="reps-display empty" id="reps">0</div>' +
        '</div>' +
        numpad() +
      '</div>';

    paintRest();
  }

  function numpad() {
    let html = '<div class="numpad">';
    ['1','2','3','4','5','6','7','8','9'].forEach(function (n) {
      html += '<button data-key="' + n + '">' + n + '</button>';
    });
    html += '<button class="util" data-key="clear">Effacer</button>';
    html += '<button data-key="0">0</button>';
    html += '<button class="util" data-key="back">←</button>';
    html += '</div>';
    return html;
  }

  function remaining() {
    return Math.max(0, (run.rest.endsAt - Date.now()) / 1000);
  }

  function paintRest() {
    const ringLabel = document.getElementById('ringLabel');
    const ringFg = document.getElementById('ringFg');
    const ring = document.getElementById('ring');
    const reps = document.getElementById('reps');
    const note = document.getElementById('restNote');
    if (!ringLabel || !run.rest) return;

    const rem = remaining();
    ringLabel.textContent = Math.ceil(rem);
    ringFg.setAttribute('stroke-dashoffset', String(RING_C * (1 - rem / run.rest.total)));

    reps.textContent = run.buffer === '' ? '0' : run.buffer;
    reps.classList.toggle('empty', run.buffer === '');

    /* Saisie manquante à 0 s : on reste là, en ambre, jamais en rouge (§7.6) */
    const waiting = rem <= 0 && run.buffer === '';
    ring.classList.toggle('waiting', waiting);
    reps.classList.toggle('highlight', waiting);

    if (waiting) {
      ringLabel.textContent = '0';
      note.textContent = 'Note ton nombre de répétitions pour continuer.';
      note.style.color = 'var(--amber-700)';
    } else if (rem <= 0) {
      ringLabel.textContent = '0';
      note.textContent = 'On enchaîne.';
      note.style.color = '';
    } else {
      note.textContent = run.rest.nextLabel;
      note.style.color = '';
    }
  }

  function readyToAdvance() {
    return remaining() <= 0 && run.buffer !== '' &&
           (Date.now() - run.lastKeyAt) >= SETTLE_MS;
  }

  function tickRest() {
    if (!run.rest) return;
    paintRest();
    if (readyToAdvance()) advance();
  }

  /* --- Saisie finale : dernier exercice, sans timer --- */
  function renderFinal(root) {
    const done = exAt(run.index);
    const capped = run.finalReason === 'cap';
    root.innerHTML =
      topBar() +
      '<div class="stack-lg" style="margin-top:14px">' +
        (capped
          ? '<div class="card amber"><p class="body" style="color:var(--amber-700)">' +
            'Le temps du circuit est écoulé — tu t’arrêtes ici, et c’est très bien comme ça. ' +
            'Note ce que tu viens de faire, on garde tout.</p></div>'
          : '<div class="card accent"><p class="body" style="color:var(--green-900)">' +
            'Dernier exercice du circuit. Note tes répétitions et c’est terminé.</p></div>') +
        '<div>' +
          '<div class="label center">Répétitions — ' + U.esc(done.shortName || done.name) + '</div>' +
          '<div class="reps-display empty" id="reps">0</div>' +
        '</div>' +
        numpad() +
        '<button class="btn btn-primary" id="finishBtn" disabled>Terminer la séance</button>' +
      '</div>';
    paintFinal();
  }

  function paintFinal() {
    const reps = document.getElementById('reps');
    const btn = document.getElementById('finishBtn');
    if (!reps) return;
    reps.textContent = run.buffer === '' ? '0' : run.buffer;
    reps.classList.toggle('empty', run.buffer === '');
    btn.disabled = run.buffer === '';
  }

  /* ------------------------------------------------------------ ÉVÈNEMENTS */

  function onKey(k) {
    run.lastKeyAt = Date.now();
    if (k === 'clear') run.buffer = '';
    else if (k === 'back') run.buffer = run.buffer.slice(0, -1);
    else if (run.buffer.length < 3) run.buffer = (run.buffer === '' ? '' : run.buffer) + k;

    if (run.buffer.length > 1) run.buffer = String(Number(run.buffer)); // pas de zéro en tête

    persist();   // la saisie en cours survit à une fermeture de l'app

    if (run.state === 'rest') paintRest();   // le ticker enchaîne dès que la saisie est posée
    else paintFinal();
  }

  function confirmQuit() {
    ui.sheet(
      '<h2 class="subtitle">Tu veux t’arrêter là ?</h2>' +
      '<p class="body" style="margin-top:10px">Ce que tu as déjà fait est gardé. ' +
      'Il n’y a pas de séance ratée.</p>' +
      '<div class="stack" style="margin-top:22px">' +
        '<button class="btn btn-primary" data-quit-confirm="1">Arrêter la séance</button>' +
        '<button class="btn btn-quiet" data-quit-cancel="1">Continuer</button>' +
      '</div>'
    );
  }

  function quitNow() {
    ui.closeSheet();
    const hasSomething = Object.keys(run.session.reps).length > 0;
    if (!hasSomething) { App.store.clearRun(); stop(); ui.go('home'); return; }
    finish('user');
  }

  /* ------------------------------------------------------- ÉCRAN DE FIN --- */

  ui.register('session-done', function (root, params) {
    const cfg = C.zone(params.zoneId);
    const s = params.session;
    const delai = App.progression.currentDelay(params.zoneId);
    const pointDuJour = U.addDays(s.day, delai);
    let total = 0;
    Object.keys(s.reps).forEach(function (k) {
      s.reps[k].forEach(function (v) { total += (v || 0); });
    });

    root.innerHTML =
      '<div class="banner">' +
        '<div style="display:flex;align-items:center;gap:14px">' +
          '<div class="logo-mark" style="width:52px;height:52px;border-radius:16px">' +
            '<svg viewBox="0 0 24 24" style="color:#fff;width:26px;height:26px">' +
            '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" ' +
            'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<h1 class="title">Séance terminée</h1>' +
        '</div>' +
        '<p class="body" style="margin-top:14px">' +
          (s.completed
            ? 'Tu es allé au bout du circuit, à ton rythme.'
            : 'Tu t’es arrêté quand ton corps l’a demandé. C’est exactement le principe.') +
        '</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="eyebrow">' + U.esc(cfg.name) + '</div>' +
        '<div style="display:flex;gap:24px;margin-top:12px">' +
          '<div><div class="title">' + total + '</div><div class="small">répétitions</div></div>' +
          '<div><div class="title">' + Object.keys(s.reps).length + '</div><div class="small">exercices notés</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card accent" style="margin-top:14px">' +
        '<div class="subtitle" style="font-size:16px">Et maintenant ?</div>' +
        '<p class="body" style="margin-top:8px;color:var(--green-900)">' +
          'Ton corps récupère. Dans ' + delai + ' jours, ' + U.esc(U.formatDay(pointDuJour)) +
          ', l’app te demandera comment tu te sens — et ta séance suivante s’ouvrira.' +
        '</p>' +
        '<div style="margin-top:14px">' +
          App.calendar.button(params.zoneId, pointDuJour, 'Me le rappeler dans mon agenda', 'btn-primary') +
        '</div>' +
      '</div>' +
      '<div style="margin-top:22px" class="stack">' +
        '<button class="btn btn-ghost" data-go="home">Retour à l’accueil</button>' +
        '<button class="btn btn-quiet" data-history="' + params.zoneId + '">Voir mes répétitions</button>' +
      '</div>';
  });

  /* ------------------------------------------------------------- EXPORT --- */

  App.session = {
    start: start,
    stop: stop,
    isRunning: function () { return !!run; },
    resume: resume,
    finishInterrupted: finishInterrupted,
    discardInterrupted: discardInterrupted,
    describePending: describePending,
    handleReady: function () { beginExercise(); },
    handleStop: function () { endExercise(); },
    handleKey: onKey,
    handleQuit: confirmQuit,
    handleQuitConfirm: quitNow,
    handleFinish: function () { recordReps(run.index, Number(run.buffer)); finish(run.finalReason); },
    replay: function () {
      const ex = exAt(run.index);
      ui.sheet(
        '<h2 class="subtitle center">' + U.esc(ex.name) + '</h2>' +
        '<div class="demo-stage" style="margin-top:16px">' + App.anim.forExercise(ex) + '</div>' +
        (ex.posture ? '<p class="body center" style="margin-top:14px">' + U.esc(ex.posture) + '</p>' : '') +
        '<button class="btn btn-primary" style="margin-top:22px" data-sheet-close="1">Reprendre</button>'
      );
    }
  };
})();
