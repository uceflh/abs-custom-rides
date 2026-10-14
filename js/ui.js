// Small UI helpers: escaping, formatting, icons, chips, modal forms, toasts.

export function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
export function num(n) { return nf.format(+n || 0).replace(/ /g, ' '); }
export function money(n, unit = 'MAD') { return num(Math.round((+n || 0) * 100) / 100) + ' ' + unit; }

export function fdate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d + '/' + m + '/' + y;
}
export function ftime(iso) { return iso && iso.length > 10 ? iso.slice(11, 16) : ''; }

export function daysFrom(iso) {
  if (!iso) return null;
  const a = new Date(iso.slice(0, 10) + 'T12:00:00');
  const b = new Date(); b.setHours(12, 0, 0, 0);
  return Math.round((a - b) / 864e5);
}
export function rel(iso) {
  const n = daysFrom(iso);
  if (n == null) return '';
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? 'dans ' + n + ' j' : 'il y a ' + (-n) + ' j';
}

const TONES = {
  red: ['Travaux', 'Défaut', 'En retard', 'A', 'Réservé', 'Émise', 'Rupture', 'En maintenance', 'Perdu', 'Refusé'],
  amber: ['Devis', 'Approbation', 'À surveiller', 'Envoyé', 'Payée partiellement', 'En préparation', 'Papiers en cours', 'Acompte reçu', 'Consultation', 'Offre', 'B', 'Stock bas', 'Commandé', 'En cours', 'En utilisation', 'En chasse', 'Proposition'],
  green: ['Livré', 'Payée', 'Approuvé', 'OK', 'Disponible', 'Gagné', 'Terminé', 'Prêt à livrer', 'Conclu'],
  blue: ['Réception', 'Inspection', 'Contrôle sortie', 'Facturé', 'Nouveau', 'Qualifié', 'En sourcing', 'Brouillon', 'Brief reçu', 'C']
};
export function tone(label) {
  for (const [t, list] of Object.entries(TONES)) if (list.includes(label)) return t;
  return 'neutral';
}
export function chip(label, t) {
  return '<span class="chip chip-' + (t || tone(label)) + '">' + esc(label) + '</span>';
}

const ICONS = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M17 4a4 4 0 0 1 0 8"/><path d="M22 21c0-3-1.8-5.5-4.5-6.5"/>',
  car: '<path d="M3 13l2-6h14l2 6"/><rect x="2" y="13" width="20" height="5" rx="1.5"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  clipboard: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="m9 13 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h7"/><path d="M9 17h5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  print: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5"/><path d="M12 18h.01"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'
};
export function icon(name, size = 20) {
  return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

export function progressBar(p, label) {
  const v = Math.max(0, Math.min(100, Math.round(+p || 0)));
  return '<div class="prog" role="progressbar" aria-valuenow="' + v + '" aria-valuemin="0" aria-valuemax="100"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><i style="width:' + v + '%"></i></div>';
}

// Responsive table: becomes cards under 760px (labels come from data-label).
// cols: [{ label, render(row), cls }], opts: { rowHref(row), empty }
export function table(rows, cols, opts = {}) {
  if (!rows.length) return '<div class="empty">' + esc(opts.empty || 'Aucun élément.') + '</div>';
  const head = cols.map((c) => '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>').join('');
  const body = rows.map((r) => {
    const href = opts.rowHref ? opts.rowHref(r) : '';
    return '<tr' + (href ? ' class="link-row" data-href="' + esc(href) + '" tabindex="0"' : '') + '>' +
      cols.map((c) => '<td class="' + (c.cls || '') + '" data-label="' + esc(c.label) + '">' + c.render(r) + '</td>').join('') + '</tr>';
  }).join('');
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

// ----- toast -----
export function toast(msg) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = icon('check', 18) + '<span>' + esc(msg) + '</span>';
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

// ----- modal -----
let lastFocus = null;
export function closeModal() {
  const m = document.getElementById('modal');
  if (!m) return;
  m.classList.remove('open');
  setTimeout(() => { m.remove(); if (lastFocus) lastFocus.focus(); }, 200);
  document.body.classList.remove('modal-open');
}
export function openModal(title, bodyHtml, opts = {}) {
  closeModalNow();
  lastFocus = document.activeElement;
  const m = document.createElement('div');
  m.id = 'modal';
  m.className = 'modal' + (opts.wide ? ' wide' : '');
  m.innerHTML = '<div class="modal-back" data-close></div><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
    '<div class="modal-head"><h2 id="modal-title">' + esc(title) + '</h2><button class="icon-btn" type="button" data-close aria-label="Fermer">' + icon('x') + '</button></div>' +
    '<div class="modal-body">' + bodyHtml + '</div></div>';
  document.body.appendChild(m);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => m.classList.add('open'));
  m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  m.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  const first = m.querySelector('input, select, textarea, button:not([data-close])');
  setTimeout(() => (first || m.querySelector('.modal-card')).focus(), 60);
  return m;
}
function closeModalNow() { const m = document.getElementById('modal'); if (m) m.remove(); }

// fields: [{ name, label, type: text|number|date|datetime-local|select|textarea|checkbox|tel|email, options, value, required, step, half, hint }]
export function openForm(title, fields, onSubmit, opts = {}) {
  const html = '<form class="form" novalidate>' + '<div class="form-grid">' + fields.map(fieldHtml).join('') + '</div>' +
    '<div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button type="submit" class="btn btn-red">' + esc(opts.submit || 'Enregistrer') + '</button></div></form>';
  const m = openModal(title, html, opts);
  const form = m.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    const data = {};
    fields.forEach((f) => {
      const el = form.elements[f.name];
      if (!el) return;
      let v = f.type === 'checkbox' ? el.checked : el.value.trim();
      if (f.type === 'number') v = v === '' ? 0 : +v;
      data[f.name] = v;
      const err = form.querySelector('[data-err="' + f.name + '"]');
      if (f.required && (v === '' || v == null)) { ok = false; el.setAttribute('aria-invalid', 'true'); if (err) err.textContent = 'Champ requis'; }
      else { el.removeAttribute('aria-invalid'); if (err) err.textContent = ''; }
    });
    if (!ok) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    const res = onSubmit(data);
    if (res !== false) closeModal();
  });
  return m;
}

function fieldHtml(f) {
  const id = 'f_' + f.name;
  const req = f.required ? ' required aria-required="true"' : '';
  const cls = 'field' + (f.half ? ' half' : '') + (f.type === 'checkbox' ? ' check' : '');
  let input;
  if (f.type === 'section') return '<div class="form-section">' + esc(f.label) + '</div>';
  if (f.type === 'select') {
    input = '<select id="' + id + '" name="' + f.name + '"' + req + '>' + (f.options || []).map((o) => {
      const val = typeof o === 'object' ? o.value : o;
      const lab = typeof o === 'object' ? o.label : o;
      return '<option value="' + esc(val) + '"' + (String(val) === String(f.value ?? '') ? ' selected' : '') + '>' + esc(lab) + '</option>';
    }).join('') + '</select>';
  } else if (f.type === 'textarea') {
    input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + req + '>' + esc(f.value || '') + '</textarea>';
  } else if (f.type === 'checkbox') {
    return '<div class="' + cls + '"><label for="' + id + '"><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (f.value ? ' checked' : '') + '> ' + esc(f.label) + '</label></div>';
  } else {
    input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '"' + (f.step ? ' step="' + f.step + '"' : '') + (f.type === 'number' ? ' inputmode="decimal"' : '') + ' value="' + esc(f.value ?? '') + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + req + '>';
  }
  return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' <span aria-hidden="true">*</span>' : '') + '</label>' + input +
    (f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '') + '<small class="err" data-err="' + f.name + '"></small></div>';
}

export function confirmBox(title, text, onYes, yesLabel = 'Confirmer') {
  const m = openModal(title, '<p class="muted">' + esc(text) + '</p><div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button type="button" class="btn btn-red" data-yes>' + esc(yesLabel) + '</button></div>');
  m.querySelector('[data-yes]').addEventListener('click', () => { onYes(); closeModal(); });
}

// Demo numbers are fictitious but well-formed, so no number is passed:
// WhatsApp opens its contact picker with the message pre-filled.
export function waLink(phone, text) {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}
