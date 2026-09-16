/* SensaSport — le point du jour, à 3 paliers.
   Il ne survient qu'une fois le délai de récupération écoulé, puis chaque
   jour tant qu'un palier 3 dure. Il n'y a pas d'autre moment où l'on
   renseigne son état : c'est l'unique porte d'entrée de data2. */
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
      text = next.bonusToday
        ? 'Rien à signaler, ta séance est ouverte. En la faisant aujourd’hui, ton prochain point ' +
          'du jour tombera au bout de ' + cfg.delayReduced + ' jours au lieu de ' + cfg.delayDefault + '.'
        : 'Rien à signaler. Ta séance est ouverte, quand tu le sens.';
    } else if (tier === 2) {
      title = 'Merci, on en tient compte.';
      text = 'Une petite gêne qui ne dérange pas le quotidien ne bloque rien : ta séance est ouverte. ' +
             'Tu auras juste un rappel de prudence avant de commencer, et ton rythme reste à ' +
             cfg.delayDefault + ' jours.';
    } else {
      title = 'On attend, sans se presser.';
      text = 'Tant que ça te gêne dans tes mouvements de tous les jours, on ne rouvre pas la suite. ' +
             'Je te repose la question demain : dès que ça redescend, la séance s’ouvre.';
    }

    ui.sheet(
      '<h2 class="subtitle">' + U.esc(title) + '</h2>' +
      '<p class="body" style="margin-top:10px">' + U.esc(text) + '</p>' +
      '<p class="small" style="margin-top:14px">' + U.esc(cfg.name) + '</p>' +
      '<div class="stack" style="margin-top:22px">' +
        /* Palier 3 : on redemande demain, autant que l'agenda le rappelle. */
        (tier === 3
          ? App.calendar.button(zoneId, U.addDays(U.today(), 1), 'Me le rappeler demain', 'btn-primary')
          : '') +
        '<button class="btn ' + (tier === 3 ? 'btn-quiet' : 'btn-primary') + '" data-sheet-close="1" ' +
        'data-go="home">Compris</button>' +
      '</div>'
    );
  }

  /* --------------------------------------------------- POINT DU JOUR --- */

  ui.register('checkin', function (root, params) {
    const zoneId = params.zoneId;
    const cfg = C.zone(zoneId);
    const last = App.store.lastSession(zoneId);
    const st = last ? P.sessionStatus(last, P.currentDelay(zoneId)) : null;

    let sousTitre = '';
    if (st) {
      sousTitre = st.awaitingRelief
        ? 'Jour ' + st.dayIndex + ' après ton circuit. On refait le point chaque jour ' +
          'jusqu’à ce que la gêne se calme.'
        : 'Tes ' + st.delay + ' jours de récupération sont passés.';
    }

    root.innerHTML =
      ui.header(cfg.checkinQuestion, {
        back: true,
        eyebrow: 'Le point du jour',
        sub: U.esc(sousTitre)
      }) +
      '<div class="stack" style="margin-top:24px" data-tier-group="' + zoneId + '">' +
        tierButtons() +
      '</div>' +
      '<p class="muted-note center" style="margin-top:18px">' +
        'Il n’y a pas de bonne réponse. Ce que tu notes ici sert juste à régler ton rythme.' +
      '</p>' +
      (st && st.records.length
        ? '<div class="divider"></div>' +
          '<div class="eyebrow">Ce que tu as déjà noté</div>' +
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

  App.checkin = { feedback: feedback };
})();
