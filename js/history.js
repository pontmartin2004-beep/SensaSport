/* SensaSport — Historique (§9.8) */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  let sel = { zoneId: null, exerciseId: null };

  function rhythmCard(zoneId) {
    const r = P.rhythmState(zoneId);

    const text = r.isReduced
      ? 'Tu as récupéré sans aucune gêne au bout de ' + r.standard + ' jours, et tu as enchaîné ' +
        'le jour même : ton point du jour tombe maintenant au bout de ' + r.reduced + ' jours. ' +
        'Il reviendra à ' + r.standard + ' jours dès qu’une gêne apparaît ou que tu décales ta séance — ' +
        'ce n’est pas un recul, c’est le rythme normal.'
      : 'Ton point du jour tombe ' + r.standard + ' jours après chaque circuit. ' +
        'Si tu réponds « aucune gêne » ce jour-là et que tu fais ta séance dans la foulée, ' +
        'il passera à ' + r.reduced + ' jours pour le cycle suivant.';

    return '<div class="card">' +
      '<div class="eyebrow">Rythme d’entraînement</div>' +
      '<div class="subtitle" style="margin-top:6px">' + r.delay + ' jours entre deux circuits</div>' +
      '<p class="small" style="margin-top:12px">' + U.esc(text) + '</p>' +
    '</div>';
  }

  /* Section à part : le gainage ne suit aucun cycle, il n'a donc rien à
     faire au milieu des circuits et de leur rythme. */
  function bonusSection() {
    const list = App.store.bonusSessions();
    if (!list.length) return '';

    const recentes = list.slice(-8).reverse();
    const totalSec = list.reduce(function (n, b) { return n + b.sets * b.hold; }, 0);

    return '<div class="divider"></div>' +
      '<div class="eyebrow">Gainage</div>' +
      '<div class="card" style="margin-top:12px">' +
        '<div style="display:flex;gap:24px">' +
          '<div><div class="title">' + list.length + '</div><div class="small">séance' +
            (list.length > 1 ? 's' : '') + '</div></div>' +
          '<div><div class="title">' + U.clockText(totalSec) + '</div>' +
            '<div class="small">au total</div></div>' +
        '</div>' +
        '<div style="margin-top:14px">' +
          recentes.map(function (b) {
            return '<div class="list-row">' +
              '<span class="body">' + U.esc(U.formatDayShort(b.day)) + '</span>' +
              '<span class="small">' + b.sets + '/' + b.planned + ' × ' + b.hold + ' s' +
              (b.completed ? '' : ' · séance ajustée') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function barChart(session, exercise, rounds) {
    const series = (session.reps[exercise.id] || []);
    const max = Math.max.apply(null, series.concat([1]).map(function (v) { return v || 0; }));
    let cols = '';
    for (let r = 0; r < rounds; r++) {
      const v = series[r];
      const h = v ? Math.max(6, Math.round((v / max) * 118)) : 4;
      cols += '<div class="bar-col">' +
        '<div class="bar-val">' + (v == null ? '—' : v) + '</div>' +
        '<div class="bar' + (v ? '' : ' empty') + '" style="height:' + h + 'px"></div>' +
        '<div class="bar-lbl">Tour ' + (r + 1) + '</div>' +
      '</div>';
    }
    return '<div class="bars">' + cols + '</div>';
  }

  ui.register('history', function (root) {
    const zones = C.zoneList.filter(function (c) {
      return App.store.zone(c.id).unlocked && App.store.zone(c.id).sessions.length;
    });

    if (!zones.length) {
      root.innerHTML = ui.header('Historique') +
        '<div class="card quiet" style="margin-top:24px">' +
          '<p class="body">Ton historique se remplira après ton premier circuit. ' +
          'Tu y verras tes répétitions par tour, et l’évolution de ton rythme.</p>' +
        '</div>' +
        bonusSection();
      return;
    }

    if (!sel.zoneId || zones.every(function (z) { return z.id !== sel.zoneId; })) {
      sel.zoneId = zones[0].id;
      sel.exerciseId = null;
    }

    const cfg = C.zone(sel.zoneId);
    const z = App.store.zone(sel.zoneId);
    const sessions = z.sessions;
    const last = sessions[sessions.length - 1];

    if (!sel.exerciseId || cfg.exercises.every(function (e) { return e.id !== sel.exerciseId; })) {
      sel.exerciseId = cfg.exercises[0].id;
    }
    const exercise = cfg.exercises.find(function (e) { return e.id === sel.exerciseId; });

    const st = P.sessionStatus(last, P.currentDelay(sel.zoneId));

    root.innerHTML =
      ui.header('Historique') +

      (zones.length > 1
        ? '<div class="select-row" style="margin-top:18px" data-group="hzone">' +
            zones.map(function (c) {
              return '<button class="chip" data-hzone="' + c.id + '" aria-pressed="' +
                     (c.id === sel.zoneId) + '">' + U.esc(c.name) + '</button>';
            }).join('') +
          '</div>'
        : '') +

      '<div style="margin-top:22px">' + rhythmCard(sel.zoneId) + '</div>' +

      '<div class="divider"></div>' +
      '<div class="eyebrow">Dernière séance — ' + U.esc(U.formatDayShort(last.day)) + '</div>' +

      '<div class="select-row" style="margin-top:14px" data-group="hex">' +
        cfg.exercises.map(function (e) {
          return '<button class="chip" data-hex="' + e.id + '" aria-pressed="' +
                 (e.id === sel.exerciseId) + '">' + U.esc(e.shortName || e.name) + '</button>';
        }).join('') +
      '</div>' +

      '<div class="card" style="margin-top:14px">' +
        barChart(last, exercise, cfg.rounds || 3) +
        '<p class="small" style="margin-top:14px">' + U.esc(exercise.sensory) + '</p>' +
      '</div>' +

      (st.records.length
        ? '<div class="card" style="margin-top:14px">' +
            '<div class="eyebrow">Ce que tu as ressenti après</div>' +
            '<div style="margin-top:6px">' +
              st.records.map(function (r) {
                const t = C.TIERS[r.tier - 1];
                return '<div class="list-row">' +
                  '<span class="body">Jour ' + r.day + '</span>' +
                  '<span class="small" style="text-align:right;max-width:55%">' + U.esc(t.label) + '</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>'
        : '') +

      (sessions.length > 1
        ? '<div class="divider"></div>' +
          '<div class="eyebrow">Circuits précédents</div>' +
          '<div class="card" style="margin-top:12px">' +
            sessions.slice(0, -1).reverse().map(function (s) {
              let total = 0;
              Object.keys(s.reps).forEach(function (k) {
                s.reps[k].forEach(function (v) { total += (v || 0); });
              });
              return '<div class="list-row">' +
                '<span class="body">' + U.esc(U.formatDayShort(s.day)) + '</span>' +
                '<span class="small">' + total + ' répétitions' +
                (s.completed ? '' : ' · séance ajustée') + '</span>' +
              '</div>';
            }).join('') +
          '</div>'
        : '') +

      bonusSection();
  });

  App.history = {
    selectZone: function (id) { sel.zoneId = id; sel.exerciseId = null; ui.refresh(); },
    selectExercise: function (id) { sel.exerciseId = id; ui.refresh(); },
    openZone: function (id) { sel.zoneId = id; sel.exerciseId = null; ui.go('history'); }
  };
})();
