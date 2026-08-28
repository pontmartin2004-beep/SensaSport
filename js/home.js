/* SensaSport — Accueil (§9.3) et onglet Séance */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  function greeting(name) {
    const h = new Date().getHours();
    const part = h < 6 ? 'Bonsoir' : h < 18 ? 'Bonjour' : 'Bonsoir';
    return name ? part + ', ' + name : part;
  }

  /* Carte d'une zone déverrouillée, selon l'état de son cycle. */
  function zoneCard(cfg) {
    const next = P.nextSession(cfg.id);
    const z = App.store.zone(cfg.id);
    const count = z.sessions.length;

    let bodyHtml = '', ctaHtml = '';

    if (next.state === 'ready') {
      bodyHtml =
        (next.first
          ? '<p class="body">Ton premier circuit. Aucun objectif chiffré : tu t’arrêtes à la sensation, c’est tout.</p>'
          : '<p class="body">Ton corps a eu le temps de récupérer. Quand tu veux.</p>') +
        (next.gentleWarning
          ? '<div class="card amber" style="margin-top:14px;box-shadow:none">' +
            '<p class="body" style="color:var(--amber-700)">Tu as signalé une petite gêne ces derniers jours. ' +
            'Rien ne change dans la séance — écoute-toi simplement encore un peu plus attentivement que d’habitude, ' +
            'et arrête-toi au premier signal.</p></div>'
          : '');
      ctaHtml = '<button class="btn btn-primary" data-start="' + cfg.id + '" style="margin-top:18px">' +
                (next.first ? 'Commencer le test' : 'Commencer la séance') + '</button>';

    } else if (next.state === 'resting') {
      const d = next.daysLeft;
      bodyHtml = '<p class="body">Récupération en cours. Ta prochaine séance sera proposée ' +
                 (d === 1 ? 'demain' : 'dans ' + d + ' jours') + '.</p>' +
                 '<p class="small" style="margin-top:8px">Plancher actuel : ' + next.floor.floorDays +
                 ' jours entre deux circuits.</p>';
      ctaHtml = '<button class="btn btn-ghost" data-history="' + cfg.id + '" style="margin-top:18px">' +
                'Revoir la dernière séance</button>';

    } else if (next.state === 'waiting') {
      bodyHtml = '<p class="body">Tu as signalé une gêne qui te dérange encore au quotidien. ' +
                 'On laisse le temps faire — la suite se débloquera dès que ça se calme.</p>';
      ctaHtml = '<button class="btn btn-ghost" data-checkin="' + cfg.id + '" style="margin-top:18px">' +
                'Faire le point maintenant</button>';
    }

    return '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
        '<div>' +
          '<div class="eyebrow">' + (count === 0 ? 'Zone active' : 'Circuit ' + (count + 1)) + '</div>' +
          '<div class="subtitle" style="margin-top:4px">' + U.esc(cfg.name) + '</div>' +
        '</div>' +
        '<div style="flex:0 0 64px;opacity:.9">' +
          App.anim.forExercise(cfg.exercises[0], { ground: false }) + '</div>' +
      '</div>' +
      '<div style="margin-top:12px">' + bodyHtml + ctaHtml + '</div>' +
    '</div>';
  }

  /* Zone encore verrouillée : formulation neutre, sans date précise (§6). */
  function lockedCard() {
    return '<div class="card quiet">' +
      '<div style="display:flex;align-items:center;gap:12px;color:var(--muted)">' +
        ui.icon('lock', 20) +
        '<div>' +
          '<div class="subtitle" style="color:var(--ink-soft)">Aucune autre zone en cours</div>' +
          '<div class="small" style="margin-top:3px">Elle apparaîtra ici une fois débloquée.</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* Séance interrompue : jamais présentée comme un échec, juste une reprise. */
  function interruptedCard(snap) {
    const d = App.session.describePending(snap);
    return '<div class="card amber">' +
      '<div class="eyebrow" style="color:var(--amber-700)">Séance en cours</div>' +
      '<div class="subtitle" style="margin-top:6px">' + U.esc(d.cfg.name) +
        ' — tour ' + d.round + '/' + d.rounds + '</div>' +
      '<p class="body" style="margin-top:8px;color:var(--amber-700)">' +
        (d.sameDay
          ? 'Tu t’es arrêté en cours de route. Tes ' + d.total +
            ' répétition' + (d.total > 1 ? 's' : '') + ' sont gardées.'
          : 'Commencée le ' + U.esc(U.formatDayShort(d.day)) + ', jamais terminée. ' +
            'Tes ' + d.total + ' répétition' + (d.total > 1 ? 's' : '') + ' sont gardées.') +
      '</p>' +
      '<div class="stack" style="margin-top:16px">' +
        (d.sameDay
          ? '<button class="btn btn-primary" data-resume="1">Reprendre où j’en étais</button>'
          : '') +
        '<button class="btn btn-ghost" data-finish-pending="1">Terminer cette séance ici</button>' +
        '<button class="btn btn-quiet" data-discard-pending="1">L’effacer</button>' +
      '</div>' +
    '</div>';
  }

  function checkinCard(pending) {
    const cfg = C.zone(pending.zoneId);
    return '<div class="card accent">' +
      '<div class="eyebrow">Le point du jour</div>' +
      '<div class="subtitle" style="margin-top:6px">' + U.esc(cfg.checkinQuestion) + '</div>' +
      '<p class="small" style="margin-top:8px">Une réponse en un geste, pour ajuster la suite.</p>' +
      '<button class="btn btn-primary" data-checkin="' + cfg.id + '" style="margin-top:16px">Répondre</button>' +
    '</div>';
  }

  /* -------------------------------------------------------------- ACCUEIL */

  ui.register('home', function (root) {
    const s = App.store.get();
    const pendings = P.pendingCheckins();

    const unlocked = C.zoneList.filter(function (c) { return App.store.zone(c.id).unlocked; });
    const locked   = C.zoneList.filter(function (c) { return !App.store.zone(c.id).unlocked; });

    const interrupted = App.store.getRun();

    root.innerHTML =
      ui.header(greeting(s.firstName)) +
      '<div style="margin-top:22px">' +
        (interrupted ? interruptedCard(interrupted) : '') +
        pendings.map(checkinCard).join('') +
        unlocked.map(zoneCard).join('') +
        (locked.length ? lockedCard() : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<button class="btn btn-ghost" data-pain="1">' + ui.icon('plus', 18) + ' Signaler une douleur</button>' +
      '<p class="muted-note center" style="margin-top:12px">' +
        'À tout moment, sans attendre le point du jour.</p>';
  });

  /* --------------------------------------------------------- ONGLET SÉANCE
     Point d'entrée direct vers le circuit : liste des zones et leur état. */

  ui.register('session-tab', function (root) {
    const unlocked = C.zoneList.filter(function (c) { return App.store.zone(c.id).unlocked; });

    root.innerHTML =
      ui.header('Séance', { sub: 'Tes circuits, chacun à son rythme.' }) +
      '<div style="margin-top:22px">' +
        (App.store.getRun() ? interruptedCard(App.store.getRun()) : '') +
        unlocked.map(zoneCard).join('') +
        (unlocked.length < C.zoneList.length ? lockedCard() : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="card quiet">' +
        '<div class="subtitle" style="font-size:16px">Ce qui ne change jamais</div>' +
        '<ul class="body" style="margin:10px 0 0;padding-left:18px">' +
          '<li>Aucun nombre de répétitions ne t’est imposé.</li>' +
          '<li>Le repère sensoriel décide, pas le compteur.</li>' +
          '<li>S’arrêter tôt n’est pas un échec.</li>' +
        '</ul>' +
      '</div>';
  });

  /* Zone dont le circuit n'est pas encore spécifié (§8) */
  ui.register('zone-pending', function (root, params) {
    const cfg = C.zone(params.zoneId);
    root.innerHTML =
      ui.header(cfg.name, { back: true, eyebrow: 'Circuit en cours de définition' }) +
      '<p class="body" style="margin-top:14px">' +
        'Les exercices et leurs repères sensoriels sont arrêtés. La structure du circuit, elle, ' +
        'ne l’est pas encore — et on préfère ne rien inventer plutôt que de te faire tourner ' +
        'sur des réglages approximatifs.' +
      '</p>' +
      '<div class="card" style="margin-top:22px">' +
        '<div class="eyebrow">Ce qu’il reste à trancher</div>' +
        '<ul class="body" style="margin:10px 0 0;padding-left:18px">' +
          cfg.missingSpecs.map(function (m) { return '<li>' + U.esc(m) + '</li>'; }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="eyebrow">Les exercices retenus</div>' +
      cfg.exercises.map(function (ex) {
        return '<div class="card" style="margin-top:12px">' +
          '<div style="display:flex;gap:14px;align-items:center">' +
            '<div style="flex:0 0 78px">' + App.anim.forExercise(ex, { ground: false }) + '</div>' +
            '<div style="flex:1">' +
              '<div class="subtitle" style="font-size:17px">' + U.esc(ex.name) + '</div>' +
              '<div class="small" style="margin-top:5px">' + U.esc(ex.posture) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sensory" style="margin-top:14px;font-size:15px">' + U.esc(ex.sensory) + '</div>' +
        '</div>';
      }).join('');
  });

  App.home = { zoneCard: zoneCard, lockedCard: lockedCard };
})();
