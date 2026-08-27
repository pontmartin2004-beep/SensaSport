/* SensaSport — check-in quotidien à 3 paliers et signalement de douleur (§7.7).
   Un cycle par zone : la question, l'historique et les paliers sont distincts. */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  function tierButtons() {
    return C.TIERS.map(function (t) {
      return '<button class="tier-btn" data-tier="' + t.tier + '">' +
        '<strong>' + U.esc(t.label) + '</strong>' +
        '<span>' + U.esc(t.hint) + '</span>' +
      '</button>';
    }).join('');
  }

  /* Retour après réponse — jamais de jugement, jamais de rouge. */
  function feedback(zoneId, tier) {
    const cfg = C.zone(zoneId);
    const next = P.nextSession(zoneId);

    let title, text;
    if (tier === 1) {
      title = 'C’est noté.';
      text = next.state === 'resting'
        ? 'Rien à signaler. On laisse encore le plancher de ' + next.floor.floorDays +
          ' jours faire son travail, puis la séance suivante te sera proposée.'
        : 'Rien à signaler. Ta prochaine séance est disponible quand tu le sens.';
    } else if (tier === 2) {
      title = 'Merci, on en tient compte.';
      text = 'Une petite gêne qui ne dérange pas le quotidien ne bloque rien. ' +
             'La séance suivante reste ouverte — tu auras juste un rappel de prudence avant de commencer.';
    } else {
      title = 'On attend, sans se presser.';
      text = 'Tant que ça te gêne dans tes mouvements de tous les jours, on ne propose pas la suite. ' +
             'Reviens dire comment tu te sens demain : dès que ça redescend, la séance se rouvre.';
    }

    ui.sheet(
      '<h2 class="subtitle">' + U.esc(title) + '</h2>' +
      '<p class="body" style="margin-top:10px">' + U.esc(text) + '</p>' +
      '<p class="small" style="margin-top:14px">' + U.esc(cfg.name) + '</p>' +
      '<button class="btn btn-primary" style="margin-top:22px" data-sheet-close="1" ' +
      'data-go="home">Compris</button>'
    );
  }

  /* ------------------------------------------------- CHECK-IN QUOTIDIEN --- */

  ui.register('checkin', function (root, params) {
    const zoneId = params.zoneId;
    const cfg = C.zone(zoneId);
    const last = App.store.lastSession(zoneId);
    const st = last ? P.sessionStatus(last) : null;

    root.innerHTML =
      ui.header(cfg.checkinQuestion, {
        back: true,
        eyebrow: 'Le point du jour',
        sub: st
          ? 'Jour ' + st.dayIndex + ' après ton dernier circuit ' + U.esc(cfg.name.toLowerCase()) + '.'
          : ''
      }) +
      '<div class="stack" style="margin-top:24px" data-tier-group="' + zoneId + '">' +
        tierButtons() +
      '</div>' +
      '<p class="muted-note center" style="margin-top:18px">' +
        'Il n’y a pas de bonne réponse. Ce que tu notes ici sert juste à régler ton rythme.' +
      '</p>' +
      (st && st.records.length
        ? '<div class="divider"></div>' +
          '<div class="eyebrow">Les jours précédents</div>' +
          '<div style="margin-top:10px">' +
            st.records.map(function (r) {
              const t = C.TIERS[r.tier - 1];
              return '<div class="list-row">' +
                '<span class="body">Jour ' + r.day + '</span>' +
                '<span class="small" style="text-align:right;max-width:60%">' + U.esc(t.label) + '</span>' +
              '</div>';
            }).join('') +
          '</div>'
        : '');
  });

  /* ------------------------------------------- SIGNALEMENT DE DOULEUR --- */

  ui.register('pain', function (root) {
    const zones = C.zoneList.filter(function (c) {
      const z = App.store.zone(c.id);
      return z.unlocked && z.sessions.length;
    });

    if (!zones.length) {
      root.innerHTML = ui.header('Signaler une douleur', { back: true }) +
        '<div class="card quiet" style="margin-top:22px"><p class="body">' +
        'Tu n’as pas encore fait de circuit. Le signalement s’ouvrira après ta première séance.' +
        '</p></div>';
      return;
    }

    let picked = { zoneId: zones.length === 1 ? zones[0].id : null, area: null, tier: null };

    root.innerHTML =
      ui.header('Signaler une douleur', {
        back: true,
        sub: 'À tout moment, sans attendre le point du jour.'
      }) +
      (zones.length > 1
        ? '<div style="margin-top:24px">' +
            '<div class="label">Quelle zone d’entraînement ?</div>' +
            '<div class="chip-grid" data-group="zone">' +
              zones.map(function (c) {
                return '<button class="chip" data-zone="' + c.id + '" aria-pressed="false">' +
                       U.esc(c.name) + '</button>';
              }).join('') +
            '</div>' +
          '</div>'
        : '') +
      '<div style="margin-top:24px">' +
        '<div class="label">Où, exactement ?</div>' +
        '<div class="chip-grid" data-group="area">' +
          C.BODY_AREAS.map(function (a) {
            return '<button class="chip" data-area="' + a.id + '" aria-pressed="false">' +
                   U.esc(a.label) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="margin-top:24px">' +
        '<div class="label">À quel point ça te gêne ?</div>' +
        '<div class="stack" style="margin-top:10px" data-group="tier">' +
          C.TIERS.slice(1).map(function (t) {
            return '<button class="tier-btn" data-ptier="' + t.tier + '" aria-pressed="false">' +
              '<strong>' + U.esc(t.label) + '</strong>' +
              '<span>' + U.esc(t.hint) + '</span></button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="margin-top:26px">' +
        '<button class="btn btn-primary" id="sendPain" disabled>Enregistrer</button>' +
      '</div>';

    const send = U.$('#sendPain', root);
    function sync() {
      send.disabled = !(picked.zoneId && picked.area && picked.tier);
    }

    function selectIn(groupSel, el) {
      U.$$(groupSel + ' [aria-pressed]', root).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === el));
      });
    }

    U.on(root, 'click', '[data-zone]', function (e, t) {
      picked.zoneId = t.getAttribute('data-zone');
      selectIn('[data-group="zone"]', t); sync();
    });
    U.on(root, 'click', '[data-area]', function (e, t) {
      picked.area = t.getAttribute('data-area');
      selectIn('[data-group="area"]', t); sync();
    });
    U.on(root, 'click', '[data-ptier]', function (e, t) {
      picked.tier = Number(t.getAttribute('data-ptier'));
      selectIn('[data-group="tier"]', t); sync();
      /* Un palier sélectionné met en évidence le bouton choisi */
      U.$$('[data-ptier]', root).forEach(function (b) {
        b.style.borderColor = b === t ? 'var(--green-700)' : 'var(--line)';
      });
    });

    send.addEventListener('click', function () {
      App.store.recordTier(picked.zoneId, picked.tier, picked.area);
      feedback(picked.zoneId, picked.tier);
    });
  });

  App.checkin = { feedback: feedback };
})();
