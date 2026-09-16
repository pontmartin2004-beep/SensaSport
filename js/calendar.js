/* SensaSport — rappel du point du jour dans l'agenda du téléphone.

   Une PWA sans serveur ne peut pas programmer de notification : tout
   minuteur vit dans la page et disparaît quand l'app est fermée. L'agenda
   du téléphone, lui, notifie de façon fiable, app fermée et hors ligne.
   On lui confie donc le rappel, sous forme d'un événement à ajouter en
   un geste.

   Rien n'est transmis par l'app elle-même. Si la personne choisit Google
   Agenda, seuls le titre et la date de l'événement partent vers son propre
   agenda — aucune répétition, aucun palier de gêne. */
window.App = window.App || {};

App.calendar = (function () {
  const U = App.util, C = App.config;

  const DUREE_MIN = 15;

  function appUrl() { return new URL('./', location.href).href; }

  function titre(zoneId) {
    return 'SensaSport — point du jour ' + C.zone(zoneId).name.toLowerCase();
  }

  function description(zoneId) {
    return 'Tes jours de récupération sont passés. Ouvre SensaSport pour dire comment ' +
           'se sent ta zone « ' + C.zone(zoneId).name.toLowerCase() + ' » : ta séance s’ouvrira. ' +
           appUrl();
  }

  /* 20260919T060000 — heure locale « flottante », sans fuseau : l'agenda
     l'interprète dans le fuseau du téléphone, ce qu'on veut pour « 6h ». */
  function horodatage(dayKey, minutes) {
    const d = U.fromDayKey(dayKey);
    d.setHours(C.REMINDER_HOUR, minutes, 0, 0);
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
           'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
  }

  /* ---------------------------------------------------- FICHIER .ICS --- */

  function echapper(texte) {
    return String(texte)
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /* RFC 5545 : lignes de 75 octets au plus, suite indentée d'un espace. */
  function plier(ligne) {
    const octets = new TextEncoder().encode(ligne);
    if (octets.length <= 75) return ligne;
    const morceaux = [];
    let courant = '', taille = 0;
    for (const car of ligne) {
      const t = new TextEncoder().encode(car).length;
      if (taille + t > (morceaux.length ? 74 : 75)) {
        morceaux.push(courant); courant = ''; taille = 0;
      }
      courant += car; taille += t;
    }
    morceaux.push(courant);
    return morceaux.join('\r\n ');
  }

  function ics(zoneId, dayKey) {
    const maintenant = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lignes = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SensaSport//Point du jour//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + U.uid() + '@sensasport',
      'DTSTAMP:' + maintenant,
      'DTSTART:' + horodatage(dayKey, 0),
      'DTEND:' + horodatage(dayKey, DUREE_MIN),
      'SUMMARY:' + echapper(titre(zoneId)),
      'DESCRIPTION:' + echapper(description(zoneId)),
      'URL:' + appUrl(),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + echapper(titre(zoneId)),
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lignes.map(plier).join('\r\n') + '\r\n';
  }

  function estIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function telechargerIcs(zoneId, dayKey) {
    const contenu = ics(zoneId, dayKey);

    /* Sur iPhone, une app installée ignore souvent l'attribut download :
       ouvrir le contenu en data: déclenche la fiche « Ajouter à l'agenda ». */
    if (estIOS()) {
      location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(contenu);
      return;
    }

    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sensasport-point-du-jour.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  /* ------------------------------------------------------ GOOGLE AGENDA --- */

  function lienGoogle(zoneId, dayKey) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(titre(zoneId)) +
      '&dates=' + horodatage(dayKey, 0) + '/' + horodatage(dayKey, DUREE_MIN) +
      '&details=' + encodeURIComponent(description(zoneId));
  }

  /* ------------------------------------------------------------ FEUILLE --- */

  function jourLisible(dayKey) {
    const diff = U.daysBetween(U.today(), dayKey);
    if (diff === 1) return 'demain';
    return U.formatDay(dayKey);
  }

  function offer(zoneId, dayKey) {
    App.ui.sheet(
      '<h2 class="subtitle">Me rappeler le point du jour</h2>' +
      '<p class="body" style="margin-top:10px">' +
        'Ajoute-le à ton agenda : ' + U.esc(jourLisible(dayKey)) + ' vers ' + C.REMINDER_HOUR +
        'h, c’est ton téléphone qui te préviendra, même si l’app est fermée.' +
      '</p>' +
      '<div class="stack" style="margin-top:22px">' +
        '<a class="btn btn-primary" href="' + U.esc(lienGoogle(zoneId, dayKey)) + '" ' +
          'target="_blank" rel="noopener" data-cal-google="1">Google Agenda</a>' +
        '<button class="btn btn-ghost" data-cal-ics="' + zoneId + '|' + dayKey + '">' +
          'Autre agenda (Apple, Samsung, Outlook…)</button>' +
        '<button class="btn btn-quiet" data-sheet-close="1">Pas maintenant</button>' +
      '</div>' +
      '<p class="muted-note center" style="margin-top:12px">' +
        'Seuls le titre et la date du rappel vont dans ton agenda.</p>'
    );
  }

  /* Bouton réutilisable, à poser là où un rappel a du sens. */
  function button(zoneId, dayKey, label, classe) {
    return '<button class="btn ' + (classe || 'btn-ghost') + '" ' +
      'data-remind="' + zoneId + '|' + dayKey + '">' + U.esc(label) + '</button>';
  }

  return {
    offer: offer,
    button: button,
    downloadIcs: telechargerIcs,
    ics: ics,
    googleLink: lienGoogle
  };
})();
