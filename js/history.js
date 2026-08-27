/* SensaSport — Historique (§9.8) */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  let sel = { zoneId: null, exerciseId: null };

  function rhythmCard(zoneId) {
    const fs = P.floorState(zoneId);
    const segs = [];
    for (let i = 0; i < fs.needed; i++) {
      segs.push('<span class="seg ' + (i < fs.streak ? 'on' : '') + '"></span>');
    }

    const text = fs.atMinimum
      ? 'Ton rythme est à ' + fs.floorDays + ' jours entre deux circuits. ' +
        'Il remontera à 3 jours si une gêne s’installe — sans que ce soit un recul.'
      : fs.streak === 0
        ? 'Ton rythme est de ' + fs.floorDays + ' jours entre deux circuits. ' +
          'Après ' + fs.needed + ' circuits d’affilée où la gêne se résorbe en 3 jours ou moins, il pourra se resserrer.'
        : fs.streak + ' circuit' + (fs.streak > 1 ? 's' : '') + ' sur ' + fs.needed +
          ' où tout s’est résorbé en 3 jours ou moins. Rien à forcer, ça vient tout seul.';

    return '<div class="card">' +
      '<div class="eyebrow">Rythme d’entraînement</div>' +
      '<div class="subtitle" style="margin-top:6px">' + fs.floorDays + ' jours entre deux circuits</div>' +
      '<div class="segbar" style="margin-top:14px">' + segs.join('') + '</div>' +
      '<p class="small" style="margin-top:12px">' + U.esc(text) + '</p>' +
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
        '</div>';
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

    const st = P.sessionStatus(last);

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
                const area = r.area ? (C.BODY_AREAS.find(function (a) { return a.id === r.area; }) || {}).label : null;
                return '<div class="list-row">' +
                  '<span class="body">Jour ' + r.day + (area ? ' · ' + U.esc(area) : '') + '</span>' +
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
        : '');
  });

  App.history = {
    selectZone: function (id) { sel.zoneId = id; sel.exerciseId = null; ui.refresh(); },
    selectExercise: function (id) { sel.exerciseId = id; ui.refresh(); },
    openZone: function (id) { sel.zoneId = id; sel.exerciseId = null; ui.go('history'); }
  };
})();
