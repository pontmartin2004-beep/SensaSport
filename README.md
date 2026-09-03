# SensaSport — V1

Application d'entraînement au poids du corps, à la sensation.
Implémentation du [cahier des charges](cahier-des-charges-app-sport.md).

C'est une **PWA sans outillage** : pas de Node, pas de build, pas de dépendance.
Du HTML, du CSS et du JavaScript classique. Les données restent sur l'appareil
(`localStorage`), rien n'est envoyé nulle part.

---

## Lancer l'app

### Sur cet ordinateur

```powershell
.\serve.ps1
```

Puis ouvrir <http://127.0.0.1:8123>.

### Sur ton téléphone (même Wi-Fi)

```powershell
.\serve.ps1 -Lan
```

Le script affiche l'adresse à saisir sur le téléphone (`http://192.168.x.x:8123`).
Depuis Chrome ou Safari, « Ajouter à l'écran d'accueil » installe SensaSport
comme une vraie app, en plein écran.

`serve.ps1` est un serveur de fichiers statiques en PowerShell (socket TCP brut,
aucun droit administrateur requis). `Ctrl+C` pour l'arrêter.

> Ouvrir `index.html` directement par double-clic fonctionne aussi, mais le mode
> hors ligne et l'installation sur l'écran d'accueil demandent `http://`.

---

## Structure

```
index.html              coquille + ordre de chargement des scripts
manifest.webmanifest    installation sur l'écran d'accueil
sw.js                   cache hors ligne
serve.ps1               serveur local de développement
css/app.css             design system (couleurs, composants, écrans)
assets/                 icône de l'app
js/
  config.js         circuits, textes, constantes — tout ce qui vient du CDC
  util.js           dates en jours calendaires locaux, aides DOM
  store.js          état persistant, séances, déverrouillage des zones
  progression.js    moteur de rythme : délais, point du jour, bonus mérité
  anim.js           silhouettes animées (SVG + SMIL, aucune image)
  ui.js             routeur, onglets, feuilles, icônes
  onboarding.js     bienvenue, choix de zone
  home.js           accueil et onglet Séance
  session.js        déroulé du circuit (machine à états)
  bonus.js          séance de gainage, hors de tout cycle
  checkin.js        point du jour à 3 paliers
  history.js        répétitions par tour, progression du rythme
  profile.js        prénom, rappel, philosophie, aide
  notify.js         rappel quotidien doux, à heure fixe
  app.js            amorçage et délégation d'évènements
```

**Pour ajuster le contenu, `js/config.js` suffit dans la plupart des cas** :
exercices, repères sensoriels, temps de récupération, plafond de temps,
délais de récupération, paliers, textes de philosophie.

---

## Ce qui est implémenté

- Onboarding : bienvenue, prénom, choix de la zone de départ
- Verrouillage de la seconde zone jusqu'au lendemain du premier circuit
- Circuit jambes complet : 3 tours × 4 exercices, récupérations 30 / 30 / 15 / 60 s,
  plafond de temps global, transition automatique non zappable
- Circuit ceinture abdominale : 3 tours × 3 exercices, récupérations 30 / 30 / 60 s,
  même plafond et même délai que les jambes
- Démonstrations animées en silhouette + replay accessible pendant l'effort
- Repères sensoriels affichés en continu pendant l'exercice
- Saisie des répétitions par tour, état ambre si la saisie manque à 0 s
- Point du jour à 3 paliers, indépendant par zone : il ne survient qu’au bout
  du délai de récupération, puis chaque jour tant qu’un palier 3 dure. C’est
  l’unique façon de renseigner son état — il n’y a pas de signalement libre.
- Moteur de rythme : 3 jours par défaut, 2 jours mérités quand le point du jour
  est « aucune gêne » pile au bon jour et que la séance est enchaînée le jour même
- Historique : répétitions par tour, ressenti des jours suivants, rythme
- Séance bonus de gainage, activable à tout moment depuis l’onglet Séance :
  5 séries au choix (30 s / repos 15 s, ou 1 min / repos 30 s), sans effet
  sur les cycles des circuits
- Profil : prénom, rappel, zones, philosophie, aide, réinitialisation
- Reprise de séance : le circuit en cours est écrit sur le disque à chaque
  étape et à chaque saisie ; si l’app se ferme en route, elle propose de
  reprendre, de clôturer la séance en gardant les répétitions, ou de l’effacer
- Stockage durable demandé au navigateur, pour qu’il n’évince pas les séances

## Ce qui ne l'est pas

- Échauffement, détection de stagnation, course et natation.

---

## Points d'interprétation

Cinq endroits où le cahier des charges laissait le choix ouvert, ou bien où
l’usage a demandé de s’en écarter. Ils sont isolés et faciles à changer.

**Structure du circuit ceinture abdominale** (§8) — laissée ouverte par le cahier
des charges. Arrêtée à : 3 tours, ordre du §8 (abdos classiques → relevé de
jambes → extension lombaire), récupérations et plafond identiques aux jambes,
même délai entre séances. Terminer par l’extension lombaire rééquilibre le dos
après les deux mouvements de flexion. Le délai reste volontairement prudent
malgré la piste d’un cycle plus léger évoquée au §8 : le bas du dos est une zone
où l’on se blesse, et le principe « plutôt plus lent que plus rapide » prime.
→ `js/config.js`, constante `CORE`.

**Rythme d’entraînement** — le cahier des charges prévoyait une réduction du
plancher après 3 circuits validés d’affilée et une régression sur deux paliers 2
consécutifs (§7.8 et §7.9). Remplacé sur demande par une règle par cycle :
3 jours par défaut, 2 jours si le point du jour est « aucune gêne » pile au bout
des 3 jours ET que la séance est faite ce jour-là. Chaque cycle se remérite, ce
qui rend la régression du §7.9 sans objet.
→ `js/progression.js`, fonction `delays`.

**Plafond de temps** (§7.1) — « ~15-20 minutes ». Retenu : 20 minutes, la borne
haute, et **aucun décompte affiché pendant l'effort** (pas de pression visuelle).
La séance se referme en douceur à l'échéance.
→ `js/config.js`, `globalCapSeconds`.

**Durée imposée du gainage** — la séance bonus est le seul endroit de l’app où
une durée est fixée d’avance, ce qui contredit « jamais un chiffre imposé »
(§2). Assumé : le gainage chauffe dès la première seconde, le repère d’arrêt
n’est donc pas la brûlure mais la perte de posture. Le repère sensoriel porte
sur le bassin qui s’affaisse, « Je m’arrête ici » reste affiché en permanence,
et s’arrêter à la troisième série est enregistré comme « séance ajustée »,
exactement comme un circuit écourté.
→ `js/config.js`, constante `BONUS`.

**Transition après saisie** (§7.6) — « dès que la personne saisit une valeur, la
transition se fait immédiatement ». Pris au pied de la lettre, taper « 1 » de
« 12 » validerait 1 répétition. Retenu : un délai de stabilisation de 1,2 s
après la dernière touche. Le ressenti reste immédiat, le temps de récupération
n'est toujours pas zappable.
→ `js/session.js`, constante `SETTLE_MS`.

---

## Notifications

Sans serveur, une PWA ne peut pas pousser de notification quand elle est fermée.
Le rappel quotidien part si l’app a été ouverte dans la journée et que
l’autorisation a été donnée. Son heure est la même pour tout le monde —
`REMINDER_HOUR` dans `js/config.js` — et seule son activation se règle
dans Profil. Le vrai filet reste la carte
**« Le point du jour »** en haut de l'accueil, qui ne dépend d'aucune permission.

Si le rappel fermé devient important, il faudra passer à une app native
(Expo / React Native) ou ajouter un petit serveur de push.

---

## Mise à jour du code déployé

GitHub Pages sert les fichiers avec un `max-age` de 10 minutes. Sans précaution,
un navigateur pouvait donc exécuter, juste après un déploiement, un mélange de
fichiers anciens et récents — bien plus gênant qu’un simple retard, puisque des
modules incompatibles se retrouvent chargés ensemble.

Le service worker contourne le problème : ses requêtes sont émises avec
`cache: 'no-cache'`, ce qui force une revalidation auprès du serveur, à
l’installation comme à l’usage. Le serveur répond 304 quand rien n’a changé, donc
le coût est négligeable, et le mode hors ligne continue de passer par le cache.

`CACHE` dans `sw.js` doit être incrémenté quand la stratégie de cache change,
pour que l’ancien cache soit purgé à l’activation.

---

## Mettre en ligne (GitHub Pages)

Le dépôt git est déjà initialisé et le premier commit est fait. Il reste trois
étapes, toutes de ton côté.

### 1. Créer le dépôt sur GitHub

Sur <https://github.com/new> : nom `sensasport`, visibilité **Public** (requis
pour GitHub Pages sur un compte gratuit). **Ne coche rien** — pas de README, pas
de .gitignore, pas de licence : le dépôt local les contient déjà.

### 2. Pousser le code

```powershell
git remote add origin https://github.com/TON_PSEUDO/sensasport.git
git push -u origin main
```

Au premier push, Git pour Windows ouvre une fenêtre de connexion GitHub. Tu te
connectes, et c'est retenu pour la suite.

### 3. Activer Pages

Sur le dépôt : **Settings → Pages**. Source : « Deploy from a branch »,
branche `main`, dossier `/ (root)`. Enregistrer.

Une à deux minutes plus tard, l'app est en ligne :

```
https://TON_PSEUDO.github.io/sensasport/
```

Ouvre cette adresse sur ton téléphone, puis « Ajouter à l'écran d'accueil ».
Tu obtiens l'icône verte, le plein écran, et le fonctionnement hors ligne.

### Publier une modification

```powershell
git add -A
git commit -m "ce que tu as changé"
git push
```

Le site se met à jour tout seul en une minute environ.

### Trois points à connaître

**Ton adresse e-mail sera visible.** Git l'inscrit dans chaque commit, et
l'historique d'un dépôt public est consultable par tous. Pour utiliser l'adresse
masquée que GitHub te fournit, active « Keep my email addresses private » dans
tes réglages GitHub, puis avant de pousser :

```powershell
git config user.email "TON_ID+TON_PSEUDO@users.noreply.github.com"
git commit --amend --reset-author --no-edit
```

**Le cahier des charges sera public** lui aussi. Pour le garder pour toi :

```powershell
git rm --cached cahier-des-charges-app-sport.md
Add-Content .gitignore "cahier-des-charges-app-sport.md"
git commit -m "Retire le cahier des charges du depot"
```

**Le projet est dans OneDrive.** La synchronisation peut occasionnellement
perturber le dossier `.git`. Si tu vois des erreurs git inexpliquées, déplace le
projet hors de OneDrive (par exemple `C:\dev\sensasport`) — GitHub servira
alors de sauvegarde.

---

## Mode test (local uniquement)

Une horloge virtuelle permet de sauter des jours pour vérifier la mécanique de
progression sans attendre les planchers réels.

Elle vit dans deux fichiers **ignorés par git et jamais déployés** :
`js/dev.js` et `dev.html`. Le site public n'en contient aucune trace et n'y fait
aucune référence — rien à masquer, puisque rien n'est envoyé.

```powershell
.\serve.ps1
```

Puis ouvrir <http://127.0.0.1:8123/dev.html> (et non `index.html`).

Une barre sombre apparaît en haut : jour simulé, boutons −1 j / +1 j / +3 j /
Aujourd'hui. Depuis la console, `devClock(30)` fixe directement un décalage.

Le décalage est conservé d'un rechargement à l'autre. Il agit sur `App.util.today()`,
le point d'entrée unique de toute la logique de calendrier : planchers de jours,
fenêtres de check-in, validation des circuits et déverrouillage de zone suivent
automatiquement. Les chronos de récupération ne sont pas touchés — ce sont des
durées, pas des dates.

Comme `127.0.0.1` est une origine distincte de `github.io`, les données de test
sont **naturellement séparées** de celles de l'app installée sur ton téléphone.

> Ces deux fichiers n'étant pas versionnés, ils ne sont pas sauvegardés sur
> GitHub. Ils se régénèrent en quelques secondes si besoin.
