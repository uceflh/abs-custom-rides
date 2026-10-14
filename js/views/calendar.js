import { db, save, find, uid, today, clientName } from '../store.js';
import { esc, fdate, ftime, daysFrom, icon, openForm, openModal, closeModal, toast } from '../ui.js';
import { go, refresh, query } from '../nav.js';
import { EVENT_TYPES } from '../data.js';
import { clientOptions } from './crm.js';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const cls = (t) => 'ev-' + t.replace(/\s/g, '');

function eventForm(ev, date) {
  const isNew = !ev;
  ev = ev || {};
  openForm(isNew ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous', [
    { name: 'title', label: 'Objet', required: true, value: ev.title },
    { name: 'type', label: 'Type', type: 'select', options: EVENT_TYPES, value: ev.type, half: true },
    { name: 'clientId', label: 'Client', type: 'select', options: [{ value: '', label: 'Aucun' }].concat(clientOptions(false)), value: ev.clientId, half: true },
    { name: 'date', label: 'Date', type: 'date', required: true, value: (ev.start || '').slice(0, 10) || date || today(), half: true },
    { name: 'start', label: 'Début', type: 'time', value: ftime(ev.start) || '10:00', half: true },
    { name: 'end', label: 'Fin', type: 'time', value: ftime(ev.end) || '11:00', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: ev.notes }
  ], (d) => {
    const data = { title: d.title, type: d.type, clientId: d.clientId, start: d.date + 'T' + d.start, end: d.date + 'T' + d.end, notes: d.notes };
    if (isNew) db.events.push(Object.assign({ id: uid('ev'), woId: '' }, data)); else Object.assign(ev, data);
    save(); toast(isNew ? 'Rendez-vous ajouté' : 'Rendez-vous mis à jour'); refresh();
  });
}

function showEvent(ev) {
  const w = ev.woId ? find('workOrders', ev.woId) : null;
  const m = openModal(ev.title, '<dl class="dl"><dt>Type</dt><dd><span class="cal-ev ' + cls(ev.type) + '">' + esc(ev.type) + '</span></dd><dt>Quand</dt><dd>' + fdate(ev.start) + ', ' + ftime(ev.start) + ' à ' + ftime(ev.end) + '</dd>' +
    (ev.clientId ? '<dt>Client</dt><dd><a href="#/client/' + ev.clientId + '">' + esc(clientName(ev.clientId)) + '</a></dd>' : '') +
    (w ? '<dt>Ordre de réparation</dt><dd><a href="#/or/' + w.id + '">' + esc(w.ref) + '</a></dd>' : '') +
    (ev.notes ? '<dt>Notes</dt><dd>' + esc(ev.notes) + '</dd>' : '') + '</dl>' +
    '<div class="form-actions"><button class="btn btn-ghost" type="button" data-del>' + icon('trash', 16) + 'Supprimer</button><button class="btn btn-red" type="button" data-edit>' + icon('edit', 16) + 'Modifier</button></div>');
  m.querySelector('[data-edit]').addEventListener('click', () => eventForm(ev));
  m.querySelector('[data-del]').addEventListener('click', () => { db.events = db.events.filter((x) => x.id !== ev.id); save(); closeModal(); toast('Rendez-vous supprimé'); refresh(); });
  m.addEventListener('click', (e) => { if (e.target.closest('a')) closeModal(); });
}

export function calendar() {
  const q = query();
  const now = new Date();
  const [y, mo] = (q.get('m') || now.toISOString().slice(0, 7)).split('-').map(Number);
  const typeF = q.get('type') || '';
  const evs = db.events.filter((e) => !typeF || e.type === typeF).sort((a, b) => a.start.localeCompare(b.start));
  const first = new Date(y, mo - 1, 1, 12);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(y, mo - 1, 1 - startOffset, 12);
  const t = today();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayEvs = evs.filter((e) => e.start.slice(0, 10) === iso);
    cells += '<div class="cal-d' + (d.getMonth() !== mo - 1 ? ' out' : '') + (iso === t ? ' today' : '') + '" data-day="' + iso + '" role="button" tabindex="0" aria-label="' + fdate(iso) + ', ' + dayEvs.length + ' rendez-vous"><span class="n">' + d.getDate() + '</span>' +
      dayEvs.slice(0, 3).map((e) => '<button type="button" class="cal-ev ' + cls(e.type) + '" data-ev="' + e.id + '" style="border:0;text-align:left;cursor:pointer">' + ftime(e.start) + ' ' + esc(e.title) + '</button>').join('') +
      (dayEvs.length > 3 ? '<span class="small faint">+' + (dayEvs.length - 3) + '</span>' : '') + '</div>';
    if (i >= 34 && d.getMonth() !== mo - 1 && i % 7 === 6) break;
  }
  const prev = new Date(y, mo - 2, 1).toISOString().slice(0, 7);
  const next = new Date(y, mo, 1).toISOString().slice(0, 7);
  const upcoming = evs.filter((e) => e.start.slice(0, 10) >= t).slice(0, 30);
  let lastDay = '';
  const agenda = upcoming.length ? upcoming.map((e) => {
    const d = e.start.slice(0, 10);
    const head = d !== lastDay ? '<div class="day">' + (daysFrom(d) === 0 ? "Aujourd'hui" : daysFrom(d) === 1 ? 'Demain' : new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })) + '</div>' : '';
    lastDay = d;
    return head + '<button type="button" class="li" data-ev="' + e.id + '" style="width:100%;background:none;border:0;border-top:1px solid var(--line);color:inherit;text-align:left;cursor:pointer"><span class="mono small muted" style="width:46px">' + ftime(e.start) + '</span><span class="grow"><span class="t">' + esc(e.title) + '</span><span class="d">' + (e.clientId ? esc(clientName(e.clientId)) : '') + '</span></span><span class="cal-ev ' + cls(e.type) + '">' + esc(e.type) + '</span></button>';
  }).join('') : '<div class="empty">Aucun rendez-vous à venir.</div>';

  const html =
    '<div class="page-head"><div><h1>Calendrier</h1><div class="sub">Rendez-vous atelier, réservations de restauration, essais, livraisons et événements.</div></div>' +
    '<div class="actions"><button class="btn btn-red" type="button" id="newEv">' + icon('plus', 18) + 'Rendez-vous</button></div></div>' +
    '<div class="filters" role="group" aria-label="Type">' + [''].concat(EVENT_TYPES).map((x) => '<button class="fchip" type="button" data-type="' + x + '" aria-pressed="' + (typeF === x) + '">' + (x || 'Tous') + '</button>').join('') + '</div>' +
    '<section class="card"><h2><span class="row"><a class="icon-btn" href="#/calendrier?m=' + prev + '" aria-label="Mois précédent">' + icon('back', 18) + '</a><span style="min-width:150px;text-align:center">' + MONTHS[mo - 1] + ' ' + y + '</span><a class="icon-btn" href="#/calendrier?m=' + next + '" aria-label="Mois suivant">' + icon('arrow', 18) + '</a></span><a href="#/calendrier">Aujourd\'hui</a></h2>' +
    '<div class="cal">' + ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => '<div class="cal-h">' + d + '</div>').join('') + cells + '</div>' +
    '<div class="agenda agenda-only">' + agenda + '</div></section>';

  return {
    title: 'Calendrier', html,
    mount(root) {
      root.querySelector('#newEv').addEventListener('click', () => eventForm(null));
      root.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => go('#/calendrier?' + new URLSearchParams({ m: y + '-' + String(mo).padStart(2, '0'), ...(b.dataset.type ? { type: b.dataset.type } : {}) }))));
      root.querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); showEvent(find('events', b.dataset.ev)); }));
      root.querySelectorAll('[data-day]').forEach((c) => {
        const open = () => eventForm(null, c.dataset.day);
        c.addEventListener('click', open);
        c.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === c) open(); });
      });
    }
  };
}
