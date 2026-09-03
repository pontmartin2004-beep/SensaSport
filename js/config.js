/* SensaSport — configuration : circuits, textes, constantes.
   Tout ce qui vient du cahier des charges est regroupé ici. */
window.App = window.App || {};

App.config = (function () {

  /* Message commun affiché avant chaque exercice, une fois, à froid (§7.4) */
  const COUNT_REMINDER =
    'N’oublie pas de compter tes répétitions au fur et à mesure — tu les noteras juste après.';

  /* ---------------------------------------------------------------- JAMBES */

  const LEGS = {
    id: 'legs',
    name: 'Jambes',
    label: 'Jambes',
    implemented: true,

    /* Question du check-in quotidien, propre à la zone (§7.7) */
    checkinQuestion: 'Comment se sentent tes jambes aujourd’hui ?',

    rounds: 3,

    /* Plafond de temps global ~15-20 min (§7.1). Borne haute retenue,
       aucun compte à rebours n’est affiché pendant l’effort. */
    globalCapSeconds: 20 * 60,

    /* Délai entre une séance et le point du jour qui rouvre la suivante.
       3 jours par défaut, 2 quand le cycle précédent a été net et enchaîné. */
    delayDefault: 3,
    delayReduced: 2,

    exercises: [
      {
        id: 'squat',
        name: 'Squat',
        anim: 'squat',
        posture: 'Dos droit, genoux dans l’axe des pieds.',
        sensory: 'Cuisses et fessiers qui tirent, souffle qui s’accélère ? Arrête-toi.',
        extraIntro: null,
        restAfter: 30
      },
      {
        id: 'lunge',
        name: 'Fente avant',
        anim: 'lunge',
        posture: 'Genou avant aligné avec la cheville, buste droit, genou arrière qui descend proche du sol.',
        sensory: 'Quadriceps et fessier qui chauffent, équilibre qui vacille un peu ? Arrête-toi.',
        extraIntro: 'Termine sur un chiffre pair, quitte à faire une répétition de plus, pour équilibrer les deux jambes.',
        restAfter: 30
      },
      {
        id: 'raise_r',
        name: 'Élévation latérale — jambe droite',
        shortName: 'Élévation droite',
        anim: 'raise',
        animMirror: false,
        posture: null,
        sensory: 'Tu dois te déhancher ou prendre de l’élan ? Arrête-toi.',
        extraIntro: null,
        /* 15 s spécifiquement entre élévation droite et gauche (§7.1) */
        restAfter: 15
      },
      {
        id: 'raise_l',
        name: 'Élévation latérale — jambe gauche',
        shortName: 'Élévation gauche',
        anim: 'raise',
        animMirror: true,
        posture: null,
        sensory: 'Tu dois te déhancher ou prendre de l’élan ? Arrête-toi.',
        extraIntro: null,
        /* Dernier exercice du tour : 1 minute entre chaque tour complet (§7.1) */
        restAfter: 60
      }
    ]
  };

  /* --------------------------------------------- CEINTURE ABDOMINALE (§8) */
  /* Exercices et repères sensoriels sont spécifiés ; la structure du circuit
     (tours, ordre, timers, plafond, plancher de jours) ne l’est pas encore.
     On ne l’invente pas : la zone existe et se déverrouille, mais le circuit
     affiche ce qu’il manque au lieu de tourner sur des valeurs arbitraires. */

  const CORE = {
    id: 'core',
    name: 'Ceinture abdominale',
    label: 'Ceinture abdominale',
    implemented: false,

    checkinQuestion: 'Comment se sent ta ceinture abdominale aujourd’hui ?',

    delayDefault: 3,
    delayReduced: 2,

    exercises: [
      {
        id: 'crunch',
        name: 'Abdos classiques',
        anim: 'crunch',
        posture: 'Allongé, mains derrière la tête, coudes qui remontent au niveau des genoux.',
        sensory: 'Abdos qui chauffent, tu tires sur ta nuque pour continuer ? Arrête-toi.'
      },
      {
        id: 'leg_raise',
        name: 'Relevé de jambes',
        anim: 'legraise',
        posture: 'Allongé sur le dos, jambes tendues qui montent sans décoller le bas du dos.',
        sensory: 'Bas du ventre qui chauffe, bas du dos qui se cambre ? Arrête-toi.'
      },
      {
        id: 'superman',
        name: 'Extension lombaire',
        anim: 'superman',
        posture: 'Allongé sur le ventre, on soulève simultanément buste et jambes.',
        sensory: 'Bas du dos qui chauffe, tu dois t’aider d’un élan pour monter ? Arrête-toi.'
      }
    ],

    missingSpecs: [
      'Structure exacte du circuit (nombre de tours, ordre des exercices)',
      'Plafond de temps global',
      'Temps de récupération entre exercices et entre tours',
      'Plancher de jours entre deux séances'
    ]
  };

  /* Les 3 paliers du point du jour */
  const TIERS = [
    { tier: 1, label: 'Aucune gêne',
      hint: 'Tout va bien, je ne sens rien de particulier.' },
    { tier: 2, label: 'Une petite gêne, mais ça ne me dérange pas au quotidien',
      hint: 'Je la sens, mais elle ne change rien à mes mouvements de tous les jours.' },
    { tier: 3, label: 'Ça me gêne encore dans mes mouvements du quotidien',
      hint: 'Marcher, m’asseoir ou me baisser me rappelle la gêne.' }
  ];

  const PHILOSOPHY = [
    'On avance à l’écoute de ton corps, jamais à l’écoute d’un chiffre.',
    'Pas de miracle promis, juste une progression sereine, sans blessure.',
    'Il n’y a pas de séance ratée : tout s’ajuste, rien ne se juge.',
    'La progression peut être plus lente qu’un entraînement classique. C’est un choix assumé.'
  ];

  return {
    zones: { legs: LEGS, core: CORE },
    zoneList: [LEGS, CORE],
    zone: function (id) { return this.zones[id]; },
    COUNT_REMINDER: COUNT_REMINDER,
    TIERS: TIERS,
    PHILOSOPHY: PHILOSOPHY,
    /* Heure du rappel, identique pour tout le monde : tôt convient aux
       lève-tôt, et le rappel reste visible toute la journée pour les autres. */
    REMINDER_HOUR: 6
  };
})();
