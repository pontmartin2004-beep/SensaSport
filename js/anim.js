/* SensaSport — silhouettes animées de démonstration (§7.5).
   Style épuré, vert, deux poses interpolées en SMIL : aucune dépendance,
   aucune image à charger, l’animation tourne toute seule. */
window.App = window.App || {};

App.anim = (function () {

  /* Chaque mouvement = une pose "départ" et une pose "fin".
     Les polylignes doivent avoir le même nombre de points dans les deux poses. */
  const MOVES = {

    /* ------------------------------------------------ SQUAT (de profil) */
    squat: {
      duration: 2.8,
      head: { from: [56, 28], to: [62, 54], r: 11 },
      lines: [
        { name: 'torse', from: '56,40 56,88',            to: '62,66 44,100' },
        { name: 'bras',  from: '56,52 60,72 62,90',      to: '62,74 80,80 94,84' },
        { name: 'jambe', from: '56,88 56,120 56,150',    to: '44,100 62,124 56,150' },
        { name: 'pied',  from: '56,150 72,150',          to: '56,150 72,150' }
      ]
    },

    /* ------------------------------------------ FENTE AVANT (de profil) */
    lunge: {
      duration: 3.2,
      head: { from: [56, 28], to: [54, 40], r: 11 },
      lines: [
        { name: 'torse',        from: '56,40 56,88',         to: '54,52 54,100' },
        { name: 'bras',         from: '56,52 58,72 58,90',   to: '54,64 56,84 56,102' },
        { name: 'jambe avant',  from: '56,88 56,120 56,150', to: '54,100 80,124 80,152' },
        { name: 'pied avant',   from: '56,150 70,150',       to: '80,152 92,152' },
        { name: 'jambe arrière',from: '56,88 56,120 56,150', to: '54,100 36,136 24,150' },
        { name: 'pied arrière', from: '56,150 48,150',       to: '24,150 16,144' }
      ]
    },

    /* -------------------------------- ÉLÉVATION LATÉRALE (de face) */
    raise: {
      duration: 3.0,
      head: { from: [60, 26], to: [60, 26], r: 11 },
      lines: [
        { name: 'torse',    from: '60,38 60,86',          to: '60,38 60,86' },
        { name: 'bras',     from: '44,72 60,52 76,72',    to: '44,72 60,52 76,72' },
        { name: 'appui',    from: '60,86 54,118 52,150',  to: '60,86 54,118 52,150' },
        { name: 'pied app', from: '52,150 42,150',        to: '52,150 42,150' },
        { name: 'jambe',    from: '60,86 66,118 68,150',  to: '60,86 88,104 108,116' },
        { name: 'pied',     from: '68,150 78,150',        to: '108,116 116,110' }
      ]
    },

    /* --------------------------------------- ABDOS CLASSIQUES (profil) */
    crunch: {
      duration: 2.8,
      head: { from: [34, 128], to: [44, 102], r: 11 },
      lines: [
        { name: 'torse',  from: '44,132 80,138',        to: '52,112 80,138' },
        { name: 'bras',   from: '46,132 38,116 28,122', to: '54,114 50,98 40,100' },
        { name: 'jambes', from: '80,138 100,110 104,140', to: '80,138 100,110 104,140' },
        { name: 'pied',   from: '104,140 114,140',      to: '104,140 114,140' }
      ]
    },

    /* ----------------------------------------- RELEVÉ DE JAMBES (profil) */
    legraise: {
      duration: 3.0,
      head: { from: [24, 132], to: [24, 132], r: 11 },
      lines: [
        { name: 'torse',  from: '34,138 68,140',          to: '34,138 68,140' },
        { name: 'bras',   from: '36,140 52,146 66,148',   to: '36,140 52,146 66,148' },
        { name: 'jambes', from: '68,140 88,141 108,142',  to: '68,140 72,110 76,80' },
        { name: 'pied',   from: '108,142 114,136',        to: '76,80 84,76' }
      ]
    },

    /* ----------------------------------- EXTENSION LOMBAIRE (profil) */
    superman: {
      duration: 3.0,
      head: { from: [26, 136], to: [24, 120], r: 11 },
      lines: [
        { name: 'torse',  from: '36,140 72,142',         to: '36,126 72,142' },
        { name: 'bras',   from: '38,140 24,146 10,148',  to: '38,128 22,126 8,124' },
        { name: 'jambes', from: '72,142 92,143 112,144', to: '72,142 92,136 112,124' },
        { name: 'pied',   from: '112,144 118,150',       to: '112,124 118,128' }
      ]
    }
  };

  const EASE = '.42 0 .28 1;.42 0 .28 1';

  function animEl(attr, a, b, dur) {
    return '<animate attributeName="' + attr + '" values="' + a + ';' + b + ';' + a +
           '" dur="' + dur + 's" repeatCount="indefinite" calcMode="spline"' +
           ' keyTimes="0;0.5;1" keySplines="' + EASE + '" />';
  }

  /* Rend l’animation d’un mouvement.
     opts : { mirror:bool, ground:bool } */
  function svg(moveId, opts) {
    opts = opts || {};
    const m = MOVES[moveId];
    if (!m) return '';
    const d = m.duration;

    let inner = '';
    inner += '<circle cx="' + m.head.from[0] + '" cy="' + m.head.from[1] + '" r="' + m.head.r +
             '" class="sil-head">' +
             animEl('cx', m.head.from[0], m.head.to[0], d) +
             animEl('cy', m.head.from[1], m.head.to[1], d) +
             '</circle>';

    m.lines.forEach(function (l) {
      inner += '<polyline points="' + l.from + '" class="sil-line">' +
               animEl('points', l.from, l.to, d) +
               '</polyline>';
    });

    const body = opts.mirror
      ? '<g transform="translate(120,0) scale(-1,1)">' + inner + '</g>'
      : inner;

    return '<svg class="silhouette" viewBox="0 0 120 170" role="img" ' +
           'aria-label="Démonstration du mouvement" xmlns="http://www.w3.org/2000/svg">' +
           (opts.ground === false ? '' : '<line class="sil-ground" x1="6" y1="158" x2="114" y2="158" />') +
           body + '</svg>';
  }

  /* Raccourci : rend la démo d’un exercice tel que défini dans config.js */
  function forExercise(ex, opts) {
    return svg(ex.anim, Object.assign({ mirror: !!ex.animMirror }, opts || {}));
  }

  return { svg: svg, forExercise: forExercise, moves: MOVES };
})();
