/* SensaSport — utilitaires (dates locales, DOM, formatage) */
window.App = window.App || {};

App.util = (function () {

  /* ------------------------------------------------------------- DATES ---
     Tout raisonne en "jour calendaire local" (§6 : peu importe l’heure). */

  function dayKey(d) {
    d = d || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function fromDayKey(key) {
    const p = key.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function addDays(key, n) {
    const d = fromDayKey(key);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  }

  /* Nombre de jours calendaires entre deux clés (b - a) */
  function daysBetween(a, b) {
    const da = fromDayKey(a), db = fromDayKey(b);
    return Math.round((db - da) / 86400000);
  }

  function today() { return dayKey(); }

  function formatDay(key) {
    const d = fromDayKey(key);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatDayShort(key) {
    const d = fromDayKey(key);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function relativeDay(key) {
    const diff = daysBetween(today(), key);
    if (diff === 0) return 'aujourd’hui';
    if (diff === 1) return 'demain';
    if (diff === -1) return 'hier';
    if (diff < 0) return 'il y a ' + (-diff) + ' jours';
    return 'dans ' + diff + ' jours';
  }

  /* --------------------------------------------------------------- DOM --- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Délégation d’évènements sur un conteneur : on(root, 'click', '[data-go]', fn) */
  function on(root, type, sel, fn) {
    root.addEventListener(type, function (e) {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clockText(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    if (s < 60) return s + ' s';
    const m = Math.floor(s / 60);
    return m + ' min ' + String(s % 60).padStart(2, '0');
  }

  return {
    dayKey: dayKey, fromDayKey: fromDayKey, addDays: addDays,
    daysBetween: daysBetween, today: today,
    formatDay: formatDay, formatDayShort: formatDayShort, relativeDay: relativeDay,
    esc: esc, $: $, $$: $$, on: on, uid: uid, clockText: clockText
  };
})();
