/* SensaSport — Accueil (§9.3) et onglet Séance */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  function greeting(name) {
    const h = new Date().getHours();
    const part = h < 6 ? 'Bonsoir' : h < 18 ? 'Bonjour' : 'Bonsoir';
    return name ? part + ', ' + name : part;
  }

  /* Carte d'une zone déverrouillée, selon l'état de son cycle.
     `pointDuJourAffiche` : la carte du point du jour est déjà à l'écran
     au-dessus, la zone ne redemande donc pas la même chose. */
  function zoneCard(cfg, pointDuJourAffiche) {
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
            '<p class="body" style="color:var(--amber-700)">Tu as signalé une petite gêne. ' +
            'Rien ne change dans la séance — écoute-toi simplement encore un peu plus attentivement ' +
            'que d’habitude, et arrête-toi au premier signal.</p></div>'
          : '') +
        (next.bonusToday
          ? '<p class="small" style="margin-top:12px;color:var(--green-700)">' +
            'En la faisant aujourd’hui, ton prochain point du jour tombera au bout de ' +
            C.zone(cfg.id).delayReduced + ' jours au lieu de ' + C.zone(cfg.id).delayDefault + '.</p>'
          : '');
      ctaHtml = '<button class="btn btn-primary" data-start="' + cfg.id + '" style="margin-top:18px">' +
                (next.first ? 'Commencer le test' : 'Commencer la séance') + '</button>';

    } else if (next.state === 'resting') {
      const d = next.daysLeft;
      bodyHtml = '<p class="body">Récupération en cours. On refait le point ' +
                 (d === 1 ? 'demain' : 'dans ' + d + ' jours') + '.</p>' +
                 '<p class="small" style="margin-top:8px">Rythme actuel : ' + next.delay +
                 ' jours entre deux circuits.</p>';
      ctaHtml = '<div class="stack" style="margin-top:18px">' +
                  App.calendar.button(cfg.id, next.availableOn, 'Me rappeler le point du jour') +
                  '<button class="btn btn-quiet" data-history="' + cfg.id + '">Revoir la dernière séance</button>' +
                '</div>';

    } else if (next.state === 'checkin') {
      bodyHtml = '<p class="body">Les ' + next.delay + ' jours de récupération sont passés. ' +
                 'Dis-moi comment tu te sens et la séance s’ouvre.</p>';
      ctaHtml = '<button class="btn btn-primary" data-checkin="' + cfg.id + '" style="margin-top:18px">' +
                'Faire le point</button>';

    } else if (next.state === 'waiting') {
      bodyHtml = '<p class="body">Tu as signalé une gêne qui te dérange encore au quotidien. ' +
                 'On laisse le temps faire — la suite se rouvre dès que ça se calme.</p>';
      ctaHtml = next.status.answeredToday
        ? '<p class="small" style="margin-top:14px">Je te repose la question demain.</p>'
        : '<button class="btn btn-primary" data-checkin="' + cfg.id + '" style="margin-top:18px">' +
          'Faire le point</button>';
    }

    if (pointDuJourAffiche) ctaHtml = '';

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
    const relance = pending.status.awaitingRelief;
    return '<div class="card accent">' +
      '<div class="eyebrow">Le point du jour</div>' +
      '<div class="subtitle" style="margin-top:6px">' + U.esc(cfg.checkinQuestion) + '</div>' +
      '<p class="small" style="margin-top:8px">' +
        (relance
          ? 'On continue à faire le point chaque jour, jusqu’à ce que la gêne se calme.'
          : 'Une réponse en un geste, et ta séance s’ouvre.') +
      '</p>' +
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
    const zonesEnAttente = pendings.map(function (p) { return p.zoneId; });

    root.innerHTML =
      ui.header(greeting(s.firstName)) +
      '<div style="margin-top:22px">' +
        (interrupted ? interruptedCard(interrupted) : '') +
        pendings.map(checkinCard).join('') +
        unlocked.map(function (c) {
          return zoneCard(c, zonesEnAttente.indexOf(c.id) !== -1);
        }).join('') +
        (locked.length ? lockedCard() : '') +
      '</div>';
  });

  /* --------------------------------------------------------- ONGLET SÉANCE
     Point d'entrée direct vers le circuit : liste des zones et leur état. */

  ui.register('session-tab', function (root) {
    const unlocked = C.zoneList.filter(function (c) { return App.store.zone(c.id).unlocked; });

    root.innerHTML =
      ui.header('Séance', { sub: 'Tes circuits, chacun à son rythme.' }) +
      '<div style="margin-top:22px">' +
        (App.store.getRun() ? interruptedCard(App.store.getRun()) : '') +
        unlocked.map(function (c) { return zoneCard(c, false); }).join('') +
        (unlocked.length < C.zoneList.length ? lockedCard() : '') +
      '</div>' +
      '<div class="divider"></div>' +
      App.bonus.card() +
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

  App.home = { zoneCard: zoneCard, lockedCard: lockedCard };
})();
