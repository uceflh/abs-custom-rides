import { db, save, find, uid, today, nextRef, clientName, vehicleTitle, woTotals, docTotals, invoiceStatus } from '../store.js';
import { esc, money, fdate, rel, daysFrom, chip, icon, table, openForm, toast, waLink } from '../ui.js';
import { go, refresh, query } from '../nav.js';
import { STAGES_LEAD } from '../data.js';
import { dueItems, dueList, bindDue } from './dashboard.js';

const SOURCES = ['Instagram', 'WhatsApp', 'Site client', 'Site web', 'Showroom', 'Recommandation', 'TikTok', 'Événement', 'Autre'];
const TYPES = ['Appel', 'WhatsApp', 'Visite', 'Email', 'Instagram', 'Essai', 'Site web'];

function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export function clientOptions(withNew) {
  return (withNew ? [{ value: '__new', label: '+ Nouveau client' }] : []).concat(db.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name + ' · ' + c.city })));
}

export function contactButtons(c, msg) {
  if (!c) return '';
  return '<div class="actions">' +
    (c.phone ? '<button class="btn btn-ghost btn-sm" type="button" data-demo-call="' + esc(c.phone) + '">' + icon('phone', 16) + 'Appeler</button>' : '') +
    (c.phone ? '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + esc(waLink(c.phone, msg || ('Bonjour ' + c.name + ','))) + '">' + icon('chat', 16) + 'WhatsApp</a>' : '') +
    (c.email ? '<a class="btn btn-ghost btn-sm" href="mailto:' + esc(c.email) + '">Email</a>' : '') + '</div>';
}

export function newLeadForm(preset = {}) {
  openForm('Nouveau prospect', [
    { name: 'clientId', label: 'Client', type: 'select', options: clientOptions(true), value: preset.clientId || '__new' },
    { name: 'name', label: 'Nom (si nouveau client)', half: true },
    { name: 'phone', label: 'Téléphone', type: 'tel', half: true },
    { name: 'city', label: 'Ville', half: true },
    { name: 'source', label: 'Source', type: 'select', options: SOURCES, half: true },
    { name: 'title', label: 'Recherche ou véhicule visé', required: true, value: preset.title || '' },
    { name: 'vehicleId', label: 'Véhicule du stock (optionnel)', type: 'select', options: [{ value: '', label: 'Aucun' }].concat(db.vehicles.filter((v) => v.status !== 'Vendu').map((v) => ({ value: v.id, label: v.ref + ' · ' + vehicleTitle(v) }))), value: preset.vehicleId || '' },
    { name: 'tier', label: 'Priorité', type: 'select', options: [{ value: 'A', label: 'A : véhicule précis, budget, moins de 3 mois' }, { value: 'B', label: 'B : intérêt réel, à accompagner' }, { value: 'C', label: 'C : curiosité, newsletter' }], value: 'B', half: true },
    { name: 'budget', label: 'Budget (MAD)', type: 'number', half: true },
    { name: 'nextDate', label: 'Prochaine action le', type: 'date', value: today(), half: true },
    { name: 'nextLabel', label: 'Prochaine action', value: 'Premier contact sous 24 h', half: true }
  ], (d) => {
    let clientId = d.clientId;
    if (clientId === '__new') {
      if (!d.name) { toast('Indiquez le nom du nouveau client'); return false; }
      const c = { id: uid('c'), name: d.name, phone: d.phone, email: '', city: d.city, country: 'Maroc', type: 'Particulier', tier: d.tier, source: d.source, interests: '', notes: '', createdAt: today() };
      db.clients.unshift(c); clientId = c.id;
    }
    const l = { id: uid('l'), clientId, title: d.title, vehicleId: d.vehicleId, stage: 'Nouveau', tier: d.tier, budget: d.budget, createdAt: today(), next: { date: d.nextDate, label: d.nextLabel }, history: [{ date: today(), type: d.source === 'WhatsApp' ? 'WhatsApp' : 'Appel', note: 'Prospect créé (' + d.source + ').' }] };
    db.leads.unshift(l); save(); toast('Prospect ajouté'); go('#/lead/' + l.id);
  }, { submit: 'Créer le prospect' });
}

// ---------- CRM pipeline ----------
export function crm() {
  const q = query();
  const tier = q.get('tier') || '';
  const leads = db.leads.filter((l) => !tier || l.tier === tier);
  const due = dueItems();
  const cols = STAGES_LEAD.map((s) => {
    const items = leads.filter((l) => l.stage === s);
    return '<div class="kcol"><div class="kcol-h"><span>' + s + '</span><span class="mono faint">' + items.length + '</span></div>' +
      items.map((l) => {
        const late = l.next && daysFrom(l.next.date) < 0 && !['Gagné', 'Perdu'].includes(l.stage);
        return '<a class="kcard" href="#/lead/' + l.id + '"><span class="row-sb"><span class="small muted">' + esc(clientName(l.clientId)) + '</span>' + chip(l.tier) + '</span>' +
          '<span class="t">' + esc(l.title) + '</span>' +
          (l.budget ? '<span class="d mono">' + money(l.budget) + '</span>' : '') +
          (l.next && !['Gagné', 'Perdu'].includes(l.stage) ? '<span class="d ' + (late ? 'margin-neg' : '') + '">' + icon('clock', 14).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-2px"') + ' ' + esc(l.next.label) + ', ' + rel(l.next.date) + '</span>' : '') + '</a>';
      }).join('') + '</div>';
  }).join('');
  const html =
    '<div class="page-head"><div><h1>CRM et relances</h1><div class="sub">Prospects classés A, B, C. Relances à J+7, J+21, J+60 après chaque consultation.</div></div>' +
    '<div class="actions"><a class="btn btn-ghost" href="#/clients">' + icon('users', 18) + 'Clients</a><button class="btn btn-red" type="button" id="newLead">' + icon('plus', 18) + 'Nouveau prospect</button></div></div>' +
    '<section class="card"><h2>À relancer maintenant <span class="chip chip-' + (due.length ? 'red' : 'green') + '">' + due.length + '</span></h2>' + dueList(due) + '</section>' +
    '<div class="row-sb wrap"><div class="filters" role="group" aria-label="Priorité">' + [['', 'Toutes priorités'], ['A', 'Priorité A'], ['B', 'Priorité B'], ['C', 'Priorité C']].map(([v, l]) => '<button class="fchip" type="button" data-tier="' + v + '" aria-pressed="' + (tier === v) + '">' + l + '</button>').join('') + '</div>' +
    '<span class="small faint">Faites glisser horizontalement pour voir toutes les étapes</span></div>' +
    '<div class="kanban">' + cols + '</div>';
  return {
    title: 'CRM', html,
    mount(root) {
      bindDue(root);
      root.querySelector('#newLead').addEventListener('click', () => newLeadForm());
      root.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => go('#/crm' + (b.dataset.tier ? '?tier=' + b.dataset.tier : ''))));
      if (q.has('new')) { history.replaceState(null, '', '#/crm'); newLeadForm(); }
    }
  };
}

// ---------- lead ----------
export function leadView(id) {
  const l = find('leads', id);
  if (!l) return { title: 'Prospect', html: '<div class="empty">Prospect introuvable.</div>' };
  const c = find('clients', l.clientId);
  const v = l.vehicleId ? find('vehicles', l.vehicleId) : null;
  const order = v ? db.orders.find((o) => o.vehicleId === v.id && o.clientId === l.clientId) : null;
  const msg = 'Bonjour ' + (c ? c.name.split(' ')[0] : '') + ', ' + (v ? 'concernant ' + vehicleTitle(v) + ' (réf. ' + v.ref + ').' : 'suite à votre demande.');
  const html =
    '<div><a class="crumb" href="#/crm">' + icon('back', 14) + 'CRM</a>' +
    '<div class="page-head"><div><h1>' + esc(l.title) + '</h1><div class="sub">' + (c ? '<a href="#/client/' + c.id + '">' + esc(c.name) + '</a> · ' + esc(c.city) : '') + ' · créé ' + rel(l.createdAt) + '</div></div>' +
    '<div class="actions">' + chip(l.tier) + chip(l.stage) + '</div></div></div>' +
    '<div class="filters" role="group" aria-label="Étape">' + STAGES_LEAD.map((s) => '<button class="fchip" type="button" data-stage="' + s + '" aria-pressed="' + (l.stage === s) + '">' + s + '</button>').join('') + '</div>' +
    '<div class="grid g2">' +
    '<section class="card"><h2>Prochaine action</h2>' +
    (l.next && l.next.label ? '<div class="note ' + (daysFrom(l.next.date) < 0 ? 'warn' : 'info') + '"><b>' + esc(l.next.label) + '</b><br><span class="small">' + fdate(l.next.date) + ', ' + rel(l.next.date) + '</span></div>' : '<div class="empty">Aucune action planifiée.</div>') +
    '<div class="actions" style="margin-top:12px"><button class="btn btn-red btn-sm" type="button" id="doneNext">' + icon('check', 16) + 'Fait, planifier la suite</button>' +
    '<button class="btn btn-ghost btn-sm" type="button" data-plus="7">J+7</button><button class="btn btn-ghost btn-sm" type="button" data-plus="21">J+21</button><button class="btn btn-ghost btn-sm" type="button" data-plus="60">J+60</button></div>' +
    '<div class="hr" style="margin:16px 0"></div>' + contactButtons(c, msg) + '</section>' +
    '<section class="card"><h2>Détails</h2><dl class="dl">' +
    '<dt>Budget</dt><dd class="mono">' + (l.budget ? money(l.budget) : 'Non communiqué') + '</dd>' +
    '<dt>Véhicule</dt><dd>' + (v ? '<a href="#/vehicule/' + v.id + '">' + esc(v.ref + ' · ' + vehicleTitle(v)) + '</a> · ' + chip(v.status) : 'Pas encore de véhicule') + '</dd>' +
    (v ? '<dt>Prix affiché</dt><dd class="mono">' + (v.price ? money(v.price) : 'À définir') + '</dd>' : '') +
    '<dt>Source</dt><dd>' + esc(c ? c.source : '') + '</dd>' +
    '<dt>Notes client</dt><dd>' + esc(c && c.notes || '') + '</dd></dl>' +
    (v && !order && v.status !== 'Vendu' ? '<div class="actions" style="margin-top:14px"><button class="btn btn-cream btn-sm" type="button" id="toOrder">' + icon('truck', 16) + 'Créer la commande</button></div>' : '') +
    (order ? '<div class="note info" style="margin-top:14px">Commande <a href="#/commande/' + order.id + '">' + esc(order.ref) + '</a> · ' + esc(order.status) + '</div>' : '') + '</section>' +
    '<section class="card span2"><h2>Historique des échanges <button class="btn btn-ghost btn-sm" type="button" id="addInt">' + icon('plus', 16) + 'Ajouter</button></h2>' +
    '<div class="list">' + l.history.slice().reverse().map((h) => '<div class="li"><span class="chip chip-neutral">' + esc(h.type) + '</span><span class="grow"><span class="t" style="white-space:normal">' + esc(h.note) + '</span></span><span class="small muted nowrap">' + fdate(h.date) + '</span></div>').join('') + '</div></section></div>';

  return {
    title: l.title, html,
    mount(root) {
      root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => {
        l.stage = b.dataset.stage;
        l.history.push({ date: today(), type: 'Étape', note: 'Passage en « ' + l.stage + ' ».' });
        save(); toast('Étape mise à jour'); refresh();
      }));
      root.querySelectorAll('[data-plus]').forEach((b) => b.addEventListener('click', () => {
        const n = +b.dataset.plus;
        l.next = { date: addDays(n), label: 'Relance J+' + n };
        save(); toast('Relance planifiée à J+' + n); refresh();
      }));
      root.querySelector('#doneNext').addEventListener('click', () => {
        openForm('Action réalisée', [
          { name: 'type', label: 'Type d\'échange', type: 'select', options: TYPES, half: true },
          { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
          { name: 'note', label: 'Compte rendu', type: 'textarea', required: true, value: l.next ? l.next.label + ' : ' : '' },
          { name: 'nextDate', label: 'Prochaine action le', type: 'date', value: addDays(7), half: true },
          { name: 'nextLabel', label: 'Prochaine action', value: 'Relance J+7', half: true }
        ], (d) => {
          l.history.push({ date: d.date, type: d.type, note: d.note });
          l.next = d.nextLabel ? { date: d.nextDate, label: d.nextLabel } : null;
          save(); toast('Échange enregistré'); refresh();
        });
      });
      root.querySelector('#addInt').addEventListener('click', () => {
        openForm('Nouvel échange', [
          { name: 'type', label: 'Type', type: 'select', options: TYPES, half: true },
          { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
          { name: 'note', label: 'Note', type: 'textarea', required: true }
        ], (d) => { l.history.push(d); save(); toast('Échange ajouté'); refresh(); });
      });
      const to = root.querySelector('#toOrder');
      if (to) to.addEventListener('click', () => {
        openForm('Créer la commande', [
          { name: 'price', label: 'Prix convenu (MAD)', type: 'number', value: v.price, required: true, half: true },
          { name: 'deposit', label: 'Acompte encaissé (MAD)', type: 'number', value: Math.round(v.price * 0.2), half: true },
          { name: 'mode', label: 'Mode de paiement', type: 'select', options: ['Virement', 'Chèque', 'Espèces', 'Carte'], half: true },
          { name: 'delivery', label: 'Livraison prévue', type: 'date', value: addDays(10), half: true },
          { name: 'dmode', label: 'Mode de livraison', type: 'select', options: ['Retrait showroom', 'Livraison plateau', 'Export'], half: true },
          { name: 'address', label: 'Adresse de livraison', half: true }
        ], (d) => {
          const o = { id: uid('o'), ref: nextRef('orders', 'CMD'), clientId: l.clientId, vehicleId: v.id, date: today(), price: d.price, status: d.deposit ? 'Acompte reçu' : 'Réservé', payments: d.deposit ? [{ date: today(), amount: d.deposit, mode: d.mode }] : [], delivery: { date: d.delivery, mode: d.dmode, address: d.address }, checklist: ['Bon de commande signé', 'Acompte encaissé', 'Déclaration de cession NARSA', 'Dossier mutation déposé', 'Contrôle final atelier', 'Nettoyage et plein', 'Solde encaissé'].map((x, i) => ({ label: x, done: i < (d.deposit ? 2 : 0) })), notes: '' };
          db.orders.unshift(o);
          v.status = 'Réservé';
          l.stage = 'Gagné';
          l.history.push({ date: today(), type: 'Visite', note: 'Commande ' + o.ref + ' créée à ' + money(d.price) + '.' });
          l.next = { date: d.delivery, label: 'Livraison ' + vehicleTitle(v) };
          db.events.push({ id: uid('ev'), start: d.delivery + 'T11:00', end: d.delivery + 'T12:00', title: 'Livraison ' + vehicleTitle(v), type: 'Livraison', clientId: l.clientId, woId: '', notes: '' });
          save(); toast('Commande créée, véhicule réservé'); go('#/commande/' + o.id);
        }, { submit: 'Créer la commande' });
      });
    }
  };
}

// ---------- clients ----------
export function clientForm(c) {
  const isNew = !c;
  openForm(isNew ? 'Nouveau client' : 'Modifier le client', [
    { name: 'name', label: 'Nom complet ou société', required: true, value: c && c.name },
    { name: 'phone', label: 'Téléphone', type: 'tel', value: c && c.phone, half: true },
    { name: 'email', label: 'Email', type: 'email', value: c && c.email, half: true },
    { name: 'city', label: 'Ville', value: c && c.city, half: true },
    { name: 'country', label: 'Pays', value: c ? c.country : 'Maroc', half: true },
    { name: 'type', label: 'Type', type: 'select', options: ['Particulier', 'Professionnel'], value: c && c.type, half: true },
    { name: 'tier', label: 'Priorité', type: 'select', options: ['A', 'B', 'C'], value: c ? c.tier : 'B', half: true },
    { name: 'source', label: 'Source', type: 'select', options: SOURCES, value: c && c.source, half: true },
    { name: 'interests', label: 'Centres d\'intérêt (marques, modèles)', value: c && c.interests, half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: c && c.notes }
  ], (d) => {
    if (isNew) { const n = Object.assign({ id: uid('c'), createdAt: today() }, d); db.clients.unshift(n); save(); toast('Client ajouté'); go('#/client/' + n.id); }
    else { Object.assign(c, d); save(); toast('Client mis à jour'); refresh(); }
  });
}

export function clients() {
  const rows = db.clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  const html =
    '<div class="page-head"><div><h1>Clients</h1><div class="sub">' + rows.length + ' fiches partagées entre le showroom et l\'atelier.</div></div>' +
    '<div class="actions"><button class="btn btn-red" type="button" id="newClient">' + icon('plus', 18) + 'Nouveau client</button></div></div>' +
    '<section class="card">' + table(rows, [
      { label: 'Client', render: (c) => '<b>' + esc(c.name) + '</b>' },
      { label: 'Ville', render: (c) => esc(c.city + (c.country && c.country !== 'Maroc' ? ', ' + c.country : '')) },
      { label: 'Priorité', render: (c) => chip(c.tier) },
      { label: 'Source', render: (c) => esc(c.source) },
      { label: 'Achats', cls: 'right', render: (c) => String(db.orders.filter((o) => o.clientId === c.id).length) },
      { label: 'Atelier', cls: 'right', render: (c) => String(db.workOrders.filter((w) => w.clientId === c.id).length) }
    ], { rowHref: (c) => '#/client/' + c.id }) + '</section>';
  return { title: 'Clients', html, mount(root) { root.querySelector('#newClient').addEventListener('click', () => clientForm()); } };
}

export function clientView(id) {
  const c = find('clients', id);
  if (!c) return { title: 'Client', html: '<div class="empty">Client introuvable.</div>' };
  const leads = db.leads.filter((l) => l.clientId === id);
  const orders = db.orders.filter((o) => o.clientId === id);
  const wos = db.workOrders.filter((w) => w.clientId === id);
  const docs = db.quotes.filter((q) => q.clientId === id).map((q) => ['devis', q]).concat(db.invoices.filter((f) => f.clientId === id).map((f) => ['facture', f]));
  const tasks = db.tasks.filter((k) => k.clientId === id);
  const loyalty = [];
  orders.filter((o) => o.status === 'Livré').forEach((o) => {
    const v = find('vehicles', o.vehicleId);
    [[7, 'Message de bienvenue'], [30, 'Appel de satisfaction'], [90, 'Invitation à un événement'], [180, 'Proposition d\'entretien'], [365, 'Anniversaire d\'achat']].forEach(([n, lab]) => {
      const d = new Date(o.delivery.date + 'T12:00:00'); d.setDate(d.getDate() + n);
      loyalty.push({ date: d.toISOString().slice(0, 10), label: 'J+' + n + ' · ' + lab, v });
    });
  });
  const totalSpent = orders.reduce((a, o) => a + o.price, 0) + db.invoices.filter((f) => f.clientId === id && f.company === 'atelier').reduce((a, f) => a + docTotals(f).ttc, 0);
  const html =
    '<div><a class="crumb" href="#/clients">' + icon('back', 14) + 'Clients</a>' +
    '<div class="page-head"><div><h1>' + esc(c.name) + '</h1><div class="sub">' + esc(c.city + ', ' + c.country) + ' · client depuis ' + fdate(c.createdAt) + '</div></div>' +
    '<div class="actions">' + chip(c.tier) + '<button class="btn btn-ghost btn-sm" type="button" id="editC">' + icon('edit', 16) + 'Modifier</button></div></div></div>' +
    '<div class="grid g4 kpis"><div class="kpi"><span class="k">Opportunités</span><span class="v">' + leads.length + '</span></div><div class="kpi"><span class="k">Véhicules achetés</span><span class="v">' + orders.length + '</span></div><div class="kpi"><span class="k">Passages atelier</span><span class="v">' + wos.length + '</span></div><div class="kpi"><span class="k">Chiffre d\'affaires</span><span class="v">' + money(totalSpent) + '</span></div></div>' +
    '<div class="grid g2">' +
    '<section class="card"><h2>Coordonnées</h2><dl class="dl"><dt>Téléphone</dt><dd>' + esc(c.phone) + '</dd><dt>Email</dt><dd>' + esc(c.email) + '</dd><dt>Type</dt><dd>' + esc(c.type) + '</dd><dt>Source</dt><dd>' + esc(c.source) + '</dd><dt>Intérêts</dt><dd>' + esc(c.interests) + '</dd><dt>Notes</dt><dd>' + esc(c.notes) + '</dd></dl><div style="margin-top:14px">' + contactButtons(c) + '</div>' +
    '<div class="actions" style="margin-top:10px"><button class="btn btn-ghost btn-sm" type="button" id="cLead">' + icon('plus', 16) + 'Opportunité</button><a class="btn btn-ghost btn-sm" href="#/reception?client=' + c.id + '">' + icon('clipboard', 16) + 'Réception atelier</a><button class="btn btn-ghost btn-sm" type="button" id="cTask">' + icon('clock', 16) + 'Rappel</button></div></section>' +
    '<section class="card"><h2>Opportunités</h2>' + (leads.length ? '<div class="list">' + leads.map((l) => '<a class="li" href="#/lead/' + l.id + '"><span class="grow"><span class="t">' + esc(l.title) + '</span><span class="d">' + (l.next ? esc(l.next.label) + ', ' + rel(l.next.date) : '') + '</span></span>' + chip(l.stage) + '</a>').join('') + '</div>' : '<div class="empty">Aucune opportunité.</div>') + '</section>' +
    '<section class="card"><h2>Atelier</h2>' + (wos.length ? '<div class="list">' + wos.map((w) => '<a class="li" href="#/or/' + w.id + '"><span class="grow"><span class="t">' + esc(w.vehicle.make + ' ' + w.vehicle.model) + '</span><span class="d">' + esc(w.ref + ' · ' + w.type + ' · reçu le ' + fdate(w.receivedAt)) + '</span></span>' + chip(w.stage) + '</a>').join('') + '</div>' : '<div class="empty">Aucun passage à l\'atelier.</div>') + '</section>' +
    '<section class="card"><h2>Achats et documents</h2>' + (orders.length || docs.length ? '<div class="list">' + orders.map((o) => { const v = find('vehicles', o.vehicleId); return '<a class="li" href="#/commande/' + o.id + '"><span class="grow"><span class="t">' + esc(vehicleTitle(v)) + '</span><span class="d">' + esc(o.ref) + ' · ' + money(o.price) + '</span></span>' + chip(o.status) + '</a>'; }).join('') +
      docs.map(([k, d]) => '<a class="li" href="#/doc/' + k + '/' + d.id + '"><span class="grow"><span class="t">' + esc(d.ref) + '</span><span class="d">' + (k === 'devis' ? 'Devis' : 'Facture') + ' · ' + fdate(d.date) + ' · ' + money(docTotals(d).ttc) + '</span></span>' + chip(k === 'devis' ? d.status : invoiceStatus(d)) + '</a>').join('') + '</div>' : '<div class="empty">Aucun achat ni document.</div>') + '</section>' +
    '<section class="card span2"><h2>Fidélisation et rappels</h2>' + (loyalty.length || tasks.length ? '<div class="list">' +
      tasks.map((k) => '<div class="li"><span class="dot ' + (k.done ? 'green' : 'amber') + '"></span><span class="grow"><span class="t">' + esc(k.label) + '</span><span class="d">' + esc(k.kind) + '</span></span><span class="small muted">' + (k.done ? 'fait' : rel(k.date)) + '</span></div>').join('') +
      loyalty.map((x) => { const past = daysFrom(x.date) < 0; return '<div class="li"><span class="dot ' + (past ? 'green' : 'blue') + '"></span><span class="grow"><span class="t">' + esc(x.label) + '</span><span class="d">' + esc(vehicleTitle(x.v)) + '</span></span><span class="small muted nowrap">' + fdate(x.date) + '</span></div>'; }).join('') + '</div>' : '<div class="empty">Le parcours de fidélisation démarre à la première livraison (J+7, J+30, J+90, J+180, anniversaire).</div>') + '</section></div>';
  return {
    title: c.name, html,
    mount(root) {
      root.querySelector('#editC').addEventListener('click', () => clientForm(c));
      root.querySelector('#cLead').addEventListener('click', () => newLeadForm({ clientId: c.id }));
      root.querySelector('#cTask').addEventListener('click', () => openForm('Nouveau rappel', [
        { name: 'label', label: 'Rappel', required: true }, { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
        { name: 'kind', label: 'Type', type: 'select', options: ['Relance', 'Fidélisation', 'Atelier'], half: true }
      ], (d) => { db.tasks.push({ id: uid('k'), clientId: c.id, done: false, ...d }); save(); toast('Rappel ajouté'); refresh(); }));
    }
  };
}

// ---------- bespoke sourcing ----------
const SRC_STATUS = ['Brief reçu', 'En chasse', 'Proposition', 'Conclu', 'Abandonné'];
export function sourcing() {
  const html =
    '<div class="page-head"><div><h1>Recherches sur mesure</h1><div class="sub">Le client décrit le véhicule, l\'équipe suit chaque piste jusqu\'à la proposition.</div></div>' +
    '<div class="actions"><button class="btn btn-red" type="button" id="newS">' + icon('plus', 18) + 'Nouveau brief</button></div></div>' +
    '<div class="grid g2">' + db.sourcing.map((s) => '<section class="card"><h2><span>' + esc(clientName(s.clientId)) + '</span>' + chip(s.status) + '</h2>' +
      '<p style="margin:0 0 10px">' + esc(s.brief) + '</p><div class="row wrap small muted" style="gap:14px"><span>Budget <b class="mono">' + (s.budget ? money(s.budget) : 'à préciser') + '</b></span>' + (s.deadline ? '<span>Échéance ' + fdate(s.deadline) + '</span>' : '') + '</div>' +
      '<div class="hr" style="margin:12px 0"></div>' +
      (s.candidates.length ? '<div class="list">' + s.candidates.map((x) => '<div class="li"><span class="grow"><span class="t">' + esc(x.desc) + '</span><span class="d">' + esc(x.country) + ' · ' + money(x.price) + '</span></span><span class="small ' + (/Écarté/.test(x.verdict) ? 'margin-neg' : 'muted') + '">' + esc(x.verdict) + '</span></div>').join('') + '</div>' : '<div class="empty">Aucune piste pour le moment.</div>') +
      '<div class="actions" style="margin-top:12px"><button class="btn btn-ghost btn-sm" type="button" data-cand="' + s.id + '">' + icon('plus', 16) + 'Piste</button><select class="inp" style="width:auto;min-height:34px;padding:4px 10px" data-sst="' + s.id + '" aria-label="Statut">' + SRC_STATUS.map((x) => '<option' + (x === s.status ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></section>').join('') + '</div>';
  return {
    title: 'Recherches sur mesure', html,
    mount(root) {
      root.querySelector('#newS').addEventListener('click', () => openForm('Nouveau brief de recherche', [
        { name: 'clientId', label: 'Client', type: 'select', options: clientOptions(false) },
        { name: 'brief', label: 'Véhicule recherché (modèle, années, spécificités)', type: 'textarea', required: true },
        { name: 'budget', label: 'Budget (MAD)', type: 'number', half: true },
        { name: 'deadline', label: 'Échéance', type: 'date', half: true }
      ], (d) => { db.sourcing.unshift({ id: uid('s'), status: 'Brief reçu', candidates: [], ...d }); save(); toast('Brief enregistré'); refresh(); }));
      root.querySelectorAll('[data-cand]').forEach((b) => b.addEventListener('click', () => {
        const s = find('sourcing', b.dataset.cand);
        openForm('Nouvelle piste', [
          { name: 'desc', label: 'Description', required: true }, { name: 'country', label: 'Pays', half: true },
          { name: 'price', label: 'Prix (MAD)', type: 'number', half: true }, { name: 'verdict', label: 'Verdict', type: 'select', options: ['À inspecter', 'Inspecté, conforme', 'Proposé', 'Écarté : état', 'Écarté : numéros non concordants', 'Écarté : prix'] }
        ], (d) => { s.candidates.push(d); if (s.status === 'Brief reçu') s.status = 'En chasse'; save(); toast('Piste ajoutée'); refresh(); });
      }));
      root.querySelectorAll('[data-sst]').forEach((sel) => sel.addEventListener('change', () => { find('sourcing', sel.dataset.sst).status = sel.value; save(); toast('Statut mis à jour'); refresh(); }));
    }
  };
}
