/* SensaSport — Profil (§9.9) */
(function () {
  const U = App.util, C = App.config, ui = App.ui, P = App.progression;

  ui.register('profile', function (root) {
    const s = App.store.get();

    const zoneRows = C.zoneList.map(function (cfg) {
      const z = App.store.zone(cfg.id);
      let statusText;
      if (!z.unlocked) {
        statusText = 'Pas encore débloquée';
      } else if (!cfg.implemented) {
        statusText = 'Circuit en cours de définition';
      } else {
        const r = P.rhythmState(cfg.id);
        statusText = z.sessions.length + ' circuit' + (z.sessions.length > 1 ? 's' : '') +
                     ' · ' + r.delay + ' jours de rythme';
      }
      return '<div class="list-row">' +
        '<span class="body">' + U.esc(cfg.name) + '</span>' +
        '<span class="small" style="text-align:right">' + U.esc(statusText) + '</span>' +
      '</div>';
    }).join('');

    root.innerHTML =
      ui.header('Profil') +

      '<div class="card" style="margin-top:22px">' +
        '<label class="label" for="pName">Prénom</label>' +
        '<input class="field" id="pName" type="text" maxlength="30" value="' + U.esc(s.firstName) + '">' +
      '</div>' +

      '<div class="card">' +
        '<div class="subtitle" style="font-size:16px">Rappel du point du jour</div>' +
        '<p class="small" style="margin-top:6px">' +
          'L’app ne peut pas t’envoyer de notification quand elle est fermée. ' +
          'À la fin de chaque séance, ajoute le point du jour à ton agenda : ' +
          'c’est lui qui te préviendra, vers ' + C.REMINDER_HOUR + 'h.' +
        '</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="eyebrow">Tes zones</div>' +
        '<div style="margin-top:6px">' + zoneRows + '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="eyebrow">Tes données</div>' +
        '<p class="body" style="margin-top:8px">Tout est enregistré sur cet appareil, ' +
        'et nulle part ailleurs. Aucune donnée n’est envoyée sur internet.</p>' +
        '<p class="small" style="margin-top:10px" id="pStorage">Vérification…</p>' +
      '</div>' +

      '<div class="card accent">' +
        '<div class="eyebrow">Pourquoi on avance comme ça</div>' +
        '<div class="stack" style="margin-top:10px">' +
          C.PHILOSOPHY.map(function (p) {
            return '<p class="body" style="color:var(--green-900)">' + U.esc(p) + '</p>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="eyebrow">Aide</div>' +
        '<div class="stack" style="margin-top:10px">' +
          '<div>' +
            '<div class="subtitle" style="font-size:15.5px">Je ne sais pas quand m’arrêter</div>' +
            '<p class="small" style="margin-top:4px">Le repère sensoriel affiché pendant l’exercice est le seul ' +
            'signal à suivre. Dès qu’il se manifeste, tu t’arrêtes — même à trois répétitions.</p>' +
          '</div>' +
          '<div>' +
            '<div class="subtitle" style="font-size:15.5px">J’ai oublié de compter</div>' +
            '<p class="small" style="margin-top:4px">Mets ton estimation. L’objectif n’est pas la précision ' +
            'mais la tendance sur plusieurs séances.</p>' +
          '</div>' +
          '<div>' +
            '<div class="subtitle" style="font-size:15.5px">J’ai oublié le point du jour</div>' +
            '<p class="small" style="margin-top:4px">Ce n’est pas grave : il t’attend sur l’accueil, et ta ' +
            'séance s’ouvre dès que tu réponds. Ton rythme reste simplement à trois jours pour ce cycle. ' +
            'Pour ne plus l’oublier, ajoute-le à ton agenda en fin de séance.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="divider"></div>' +
      '<button class="btn btn-quiet" id="pReset">Tout réinitialiser</button>' +
      '<p class="muted-note center" style="margin-top:8px">SensaSport · V1 · données locales uniquement</p>';

    /* --- interactions --- */

    const name = U.$('#pName', root);
    name.addEventListener('change', function () {
      App.store.save(function (st) { st.firstName = name.value.trim(); });
      ui.toast('Prénom mis à jour');
    });


    const storageState = U.$('#pStorage', root);
    App.store.persistenceStatus().then(function (st) {
      if (!storageState) return;
      if (!st.supported) {
        storageState.textContent =
          'Ton navigateur ne permet pas de vérifier la durabilité du stockage.';
      } else if (st.persisted) {
        storageState.textContent =
          'Stockage durable actif : le navigateur ne supprimera pas tes séances pour libérer de la place.';
      } else {
        storageState.textContent =
          'Stockage standard. Installe l’app sur ton écran d’accueil pour que le navigateur protège tes séances.';
      }
    });

    U.$('#pReset', root).addEventListener('click', function () {
      ui.sheet(
        '<h2 class="subtitle">Tout effacer ?</h2>' +
        '<p class="body" style="margin-top:10px">Ton prénom, tes circuits et ton historique de ressenti ' +
        'seront supprimés de cet appareil. C’est définitif.</p>' +
        '<div class="stack" style="margin-top:22px">' +
          '<button class="btn btn-primary" id="doReset">Oui, tout effacer</button>' +
          '<button class="btn btn-quiet" data-sheet-close="1">Annuler</button>' +
        '</div>',
        { onMount: function (sheet) {
            U.$('#doReset', sheet).addEventListener('click', function () {
              App.store.reset();
              ui.closeSheet();
              ui.go('welcome');
            });
          } }
      );
    });
  });
})();
