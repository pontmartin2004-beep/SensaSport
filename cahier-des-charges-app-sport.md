# Application d'entraînement sportif — Cahier des charges (V1)

## 1. Vision du projet

Application d'entraînement à faire à la maison, sans équipement, pensée comme une préparation progressive à la course à pied. Le programme couvrira à terme le renforcement musculaire (poids du corps), la course à pied et la natation — mais la V1 se concentre exclusivement sur le **renforcement au poids du corps**.

L'idée fondatrice : renforcer d'abord la ceinture abdominale et les jambes, à un rythme "à la sensation", pour préparer le corps à encaisser la course à pied sans se blesser.

## 2. Philosophie — principes non négociables

Ces principes gouvernent **toutes** les décisions de design et de mécanique de l'app. En cas de doute entre "plus efficace/rapide" et "plus respectueux du rythme de la personne", la réponse est toujours la seconde.

- **Entraînement à la sensation** : on écoute le corps, jamais un chiffre imposé.
- **Jamais de grosses courbatures** : la progression peut être plus lente qu'un entraînement classique, c'est un choix assumé.
- **Aucune notion d'échec** : pas de séance "ratée", tout est ajustable, jamais de jugement dans les textes ("séance ajustée" plutôt que "objectif manqué").
- **Passage de phase non-automatique mais accompagné** : l'appli suggère, l'utilisateur décide toujours.
- **Principe de confiance** : l'appli ne vérifie jamais que l'utilisateur respecte les consignes sensorielles. Le système se corrige via data2 (douleurs a posteriori), pas via de la surveillance. D'où l'importance capitale de la fiabilité du test initial.
- **Pas de pression visuelle** : pas de streaks punitifs, pas de comparaison sociale, pas de compte à rebours anxiogène, pas de rouge/orange "urgence".

## 3. Identité — nom et logo

- **Nom de l'application** : SensaSport (contraction de "sensation" et "sport", cohérent avec la philosophie "à la sensation").
- **Logo** : icône app arrondie, fond vert plein, motif de ligne de pulsation blanche centrée (évoque directement la sensation corporelle) — wordmark "SensaSport" en dessous, sentence case, poids 500.

## 4. Design system

- **Palette** : vert apaisant en accent (pas en fond plein sur les écrans, sauf bandeaux ponctuels), blanc/neutre en base. Un jaune/ambre doux réservé aux alertes non-critiques (jamais de rouge).
- **Ton** : bienveillant, rassurant, jamais culpabilisant.
- **Navigation** : 4 onglets en bas — **Accueil**, **Séance**, **Historique**, **Profil**.
- Gros boutons, peu de texte à l'écran pendant l'effort, lisibilité prioritaire sur la densité d'info.

## 5. Parcours d'onboarding

1. **Écran de bienvenue** : bandeau vert en haut avec icône, titre "Bienvenue", court texte de philosophie ("On avance à l'écoute de ton corps, jamais à l'écoute d'un chiffre. Pas de miracle promis, juste une progression sereine, sans blessure."), champ prénom, bouton "Commencer".
2. **Écran de choix de zone de départ** : "Par où commencer ?" — deux cartes de poids visuel identique (Haut du corps/Ceinture abdominale vs Jambes), avec la mention "Tu pourras débloquer l'autre zone dès demain."
3. Arrivée sur l'**Accueil**.

Pas de questionnaire de calibration en V1 (abandonné en cours de conception).

## 6. Règle de verrouillage entre zones

- La zone choisie au démarrage devient testable immédiatement.
- **L'autre zone reste verrouillée jusqu'au jour calendaire suivant** (peu importe l'heure du premier test), pour éviter de cumuler deux tests d'affilée.
- Sur l'accueil, la zone verrouillée est communiquée de façon neutre, **sans date précise** : "Aucune autre zone en cours — Elle apparaîtra ici une fois débloquée."
- Une fois débloquées, les deux zones suivent des **cycles totalement indépendants** (chacune son propre data1/data2, son propre plancher de jours).

## 7. Circuit "Jambes" — spécification complète

### 7.1 Structure du circuit

Ordre des exercices, répété sur **3 tours** :

1. Squat
2. Fente avant
3. Élévation latérale — jambe droite
4. Élévation latérale — jambe gauche

Soit : `(Squat → Fente avant → Élévation D → Élévation G) × 3 tours`

- **Plafond de temps global** : ~15-20 minutes pour l'ensemble (basé sur retour d'expérience terrain de l'auteur du projet, tout niveau confondu). Si la personne n'a pas terminé, elle s'arrête là — pas de plafond de répétitions par exercice.
- **Temps de récupération fixes, non ajustables au ressenti** (pour rester comparables dans le temps) :
  - 30 secondes entre chaque exercice
  - **15 secondes** spécifiquement entre élévation droite et élévation gauche
  - 1 minute entre chaque tour complet

### 7.2 Description des mouvements

- **Squat** : mouvement classique, dos droit, genoux dans l'axe des pieds.
- **Fente avant** : genou avant aligné avec la cheville, buste droit, genou arrière qui descend proche du sol.
- **Élévation latérale** (jambe droite / jambe gauche traités comme deux exercices séparés) : en appui sur une jambe, on lève l'autre sur le côté, buste immobile.

### 7.3 Repères sensoriels (texte exact affiché pendant l'exercice)

- **Squat** : *"Cuisses et fessiers qui tirent, souffle qui s'accélère ? Arrête-toi."*
- **Fente avant** : *"Quadriceps et fessier qui chauffent, équilibre qui vacille un peu ? Arrête-toi."*
- **Élévation latérale** : *"Tu dois te déhancher ou prendre de l'élan ? Arrête-toi."*

Ces textes doivent rester affichés **pendant toute la durée de l'exercice**, pas seulement en intro.

### 7.4 Message avant chaque exercice (une fois, à froid, avant de commencer)

*"N'oublie pas de compter tes répétitions au fur et à mesure — tu les noteras juste après."*

Pour la fente avant, message additionnel : *"Termine sur un chiffre pair, quitte à faire une répétition de plus, pour équilibrer les deux jambes."*

Pas de repère chiffré donné à l'avance (pas de "fais X répétitions") — uniquement le repère sensoriel.

### 7.5 Démonstration du mouvement

- Une **animation en silhouette** (style épuré, vert) montre le mouvement correct avant la première fois que l'exercice apparaît.
- Une **icône de replay** (petit rond avec icône play) reste accessible en permanence pendant l'exercice, pour revoir la démo à la demande sans interrompre le flow.
- Squat et fente avant : posture rappelée sous l'animation ("Dos droit, genoux dans l'axe des pieds..." / "Genou avant aligné avec la cheville...").

### 7.6 Collecte de data1 (pendant la récupération)

- **data1 = uniquement un nombre de répétitions**, saisi par exercice et par tour (pas de champ ressenti séparé — le repère sensoriel qui a déclenché l'arrêt fait déjà office d'info qualitative).
- Saisie via clavier numérique simple en V1 (à faire évoluer selon l'usage réel).
- Le timer de récupération continue de tourner pendant la saisie (pas d'attente).
- **Pas de bouton "continuer"** : la transition vers l'exercice/tour suivant est **automatique** quand le timer atteint 0. Le temps de récup ne doit jamais être zappable manuellement.
- **Cas particulier — saisie manquante** : si le timer atteint 0 et que le champ est vide, l'appli **ne passe pas** à la suite. Le timer reste affiché à "0s" (couleur ambre, pas rouge), le champ est mis en évidence, et un message doux apparaît : *"Note ton nombre de répétitions pour continuer."* Dès que la personne saisit une valeur, la transition se fait immédiatement.

### 7.7 Collecte de data2 (douleurs, modèle événementiel)

- **Pas de date fixe d'interrogation.** La personne peut signaler une douleur dès qu'elle apparaît, à tout moment, localisée sur le corps.
- **Notification quotidienne douce**, envoyée une fois par jour tant que le go n'est pas donné, à partir du lendemain du test : *"Comment tu te sens aujourd'hui ?"* avec 3 choix :
  1. **Aucune gêne** → séance suivante proposée normalement
  2. **Une petite gêne, mais ça ne me dérange pas au quotidien** → séance autorisée, avec un texte d'avertissement doux avant de commencer (pas de modification du protocole ni des repères sensoriels)
  3. **Ça me gêne encore dans mes mouvements du quotidien** → on attend ; il faut redescendre au minimum au palier 2 pour débloquer la suite
- **Si aucune douleur n'est signalée dans les 3 jours pleins suivant le test**, la séance suivante est proposée automatiquement (feu vert par défaut).
- Le check-in interroge quotidiennement **pendant toute la fenêtre de 3 jours**, même en l'absence de douleur signalée (filet anti-oubli), avec la même logique à 3 paliers.
- **Le check-in est indépendant par zone** : une notification et un historique de paliers distincts pour les jambes et pour la ceinture abdominale (ex. "Comment se sentent tes jambes aujourd'hui ?" vs "Comment se sent ta ceinture abdominale aujourd'hui ?"), cohérent avec le fait que chaque zone suit son propre cycle.

### 7.8 Mécanique de progression (rythme d'entraînement)

- **Plancher fixe de 3 jours minimum** entre chaque séance du circuit jambes, pour les **3 premières occurrences** du circuit (test initial inclus) — même si le ressenti est excellent, aucune séance n'est proposée avant ce délai.
- Pour réduire ce plancher (ex. passer à 2 jours), il faut avoir validé **3 circuits consécutifs** où la douleur (ou son absence) s'est résolue en **3 jours ou moins** (3 jours pile = validé).
- Un circuit non-validé (douleur qui dure plus de 3 jours) **réinitialise le compteur de consécutivité** — il faut recommencer une série de 3 circuits validés d'affilée.
- Aucune progression chiffrée n'est imposée : le nombre de répétitions augmente naturellement grâce au repère sensoriel, sans objectif donné à l'avance. Un mécanisme de suggestion douce en cas de stagnation détectée sur plusieurs séances (texte type "nous pensons que ton corps est prêt à augmenter un peu") est prévu mais **pas encore spécifié en détail** — à définir plus tard.

### 7.9 Mécanisme de régression (perte du rythme)

Si le plancher a été réduit (ex. passé à 2 jours), il peut **remonter à 3 jours**, avec **remise à zéro du compteur de circuits consécutifs validés**, dans deux cas :

- **Un seul palier 3** ("gêne encore dans les mouvements du quotidien") signalé sur ce circuit, OU
- **Deux paliers 2** ("petite gêne, ne dérange pas au quotidien") signalés sur **deux circuits consécutifs**

Dans les deux cas, il faudra de nouveau valider 3 circuits consécutifs au plancher de 3 jours pour redescendre à 2 jours. Cette logique est indépendante par zone (le vécu sur les jambes ne déclenche pas de régression sur la ceinture abdominale, et inversement).

## 8. Circuit "Ceinture abdominale" — état actuel (partiel, en cours de conception)

- **Objectif** : préparer l'utilisateur à encaisser l'impact de la course à pied (abdos + bas du dos).
- **Même mécanisme que le circuit jambes** (test initial, data1/data2, check-in quotidien à 3 paliers).
- **Exercices dynamiques uniquement en V1** (répétitions, pas de temps tenu) — le gainage/statique est prévu pour une version future.
- **Exercices retenus** :
  1. **Abdos classiques** : allongé, mains derrière la tête, coudes qui remontent au niveau des genoux.
     Repère sensoriel : *"Abdos qui chauffent, tu tires sur ta nuque pour continuer ? Arrête-toi."*
  2. **Relevé de jambes** (cible le bas des abdominaux, plus sollicité à la course).
     Repère sensoriel : *"Bas du ventre qui chauffe, bas du dos qui se cambre ? Arrête-toi."*
  3. **Extension lombaire ("superman")** : allongé sur le ventre, on soulève simultanément buste et jambes. Cible le bas du dos, sans équipement.
     Repère sensoriel : *"Bas du dos qui chauffe, tu dois t'aider d'un élan pour monter ? Arrête-toi."*

**Non défini pour l'instant** (à récupérer auprès de l'auteur du projet avant de coder cette partie) :
- Structure exacte du circuit (nombre de tours, ordre)
- Plafond de temps global
- Temps de récupération entre exercices/tours
- Plancher de jours pour la progression (à retravailler — le core est potentiellement moins fatigant que les jambes, un cycle plus léger a été évoqué mais pas tranché)

## 9. Écrans de l'application (liste)

1. **Onboarding — bienvenue** (bandeau vert, philosophie, prénom)
2. **Onboarding — choix de zone de départ**
3. **Accueil** : salutation par prénom, carte de la zone active (avec CTA "Commencer le test"), carte neutre pour la zone verrouillée, navigation par onglets
4. **Avant un exercice (première apparition)** : animation de démonstration + repère de posture + rappel de comptage + bouton "C'est bon, je suis prêt"
5. **Exercice en cours** : nom de l'exercice, tour et position dans le circuit (ex. "Tour 1/3 — Exercice 2/4"), repère sensoriel affiché en continu, icône de replay de la démo, bouton "Je m'arrête ici"
6. **Récupération** : timer circulaire, champ de saisie du nombre de reps, indication de l'exercice suivant, pas de bouton — transition automatique (avec état d'alerte si saisie manquante à 0s)
7. **Check-in quotidien** : "Comment tu te sens ?" à 3 paliers
8. **Historique** : sélection par exercice, graphique en barres des reps par tour de la dernière séance, indicateur de progression du rythme d'entraînement (barre à 3 segments)
9. **Profil** : prénom modifiable, rappel de check-in, relecture de la philosophie, zones actives, aide

## 10. Points encore ouverts (non tranchés à ce stade)

- Échauffement avant les circuits (mentionné dès le début, jamais détaillé)
- Détail complet du circuit ceinture abdominale (structure, timers, plancher de jours)
- Mécanisme précis de détection de stagnation → suggestion d'augmentation
- Gainage / exercices statiques (V2)
- Extension à d'autres zones du corps au-delà de jambes + ceinture abdominale
- Extension future à la course à pied et à la natation (hors périmètre V1)
