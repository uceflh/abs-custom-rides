// Shared data layer for the platform (app.html) and the customer site (boutique/).
// Everything lives in localStorage on the viewer's device: this is a demo, not a backend.
import { seed, SEED_VERSION } from './data.js';

const KEY = 'abs-garage-os-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version === SEED_VERSION) return data;
    }
  } catch (e) { /* private mode or corrupted: fall back to seed */ }
  const s = seed();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  return s;
}

export const db = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
}

export function reset() {
  Object.keys(db).forEach((k) => delete db[k]);
  Object.assign(db, seed());
  save();
}

// Re-read when another tab (e.g. the customer site) writes.
export function onExternalChange(cb) {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue);
      Object.keys(db).forEach((k) => delete db[k]);
      Object.assign(db, next);
      cb();
    } catch (err) { /* ignore */ }
  });
}

export function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function find(coll, id) {
  return (db[coll] || []).find((x) => x.id === id);
}

export function today() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// e.g. nextRef('workOrders', 'OR') -> OR-2026-0147
export function nextRef(coll, prefix) {
  const year = new Date().getFullYear();
  let max = 0;
  (db[coll] || []).forEach((x) => {
    const m = String(x.ref || '').match(/-(\d+)$/);
    if (m) max = Math.max(max, +m[1]);
  });
  const width = prefix === 'STK' ? 4 : 4;
  return prefix === 'STK' ? 'STK-' + String(max + 1).padStart(width, '0') : prefix + '-' + year + '-' + String(max + 1).padStart(width, '0');
}

export function clientName(id) {
  const c = find('clients', id);
  return c ? c.name : '';
}

export function techName(id) {
  const t = find('technicians', id);
  return t ? t.name : id;
}

export function vehicleTitle(v) {
  return v ? v.make + ' ' + v.model + (v.year ? ', ' + v.year : '') : '';
}

// ----- work orders -----
export function woTotals(wo) {
  const s = db.settings;
  const hours = wo.labor.reduce((a, l) => a + (+l.hours || 0), 0);
  const laborPrice = hours * s.laborRate;
  const laborCost = hours * s.laborCostRate;
  const partsPrice = wo.parts.reduce((a, p) => a + p.qty * p.unitPrice, 0);
  const partsCost = wo.parts.reduce((a, p) => a + p.qty * p.unitCost, 0);
  const extPrice = wo.external.reduce((a, x) => a + (+x.price || 0), 0);
  const extCost = wo.external.reduce((a, x) => a + (+x.cost || 0), 0);
  const byTech = {};
  wo.labor.forEach((l) => { byTech[l.tech] = (byTech[l.tech] || 0) + (+l.hours || 0); });
  return {
    hours, laborPrice, laborCost, partsPrice, partsCost, extPrice, extCost, byTech,
    priceHT: laborPrice + partsPrice + extPrice,
    cost: laborCost + partsCost + extCost
  };
}

export function internalOrders(vehicleId) {
  return db.workOrders.filter((w) => w.stockVehicleId === vehicleId);
}

// ----- vehicles -----
export function vehicleCost(v) {
  const purchase = +(v.purchase && v.purchase.price) || 0;
  const fees = (v.costs || []).reduce((a, c) => a + (+c.amount || 0), 0);
  const atelier = internalOrders(v.id).reduce((a, w) => a + woTotals(w).cost, 0);
  const total = purchase + fees + atelier;
  const sale = v.status === 'Vendu' ? (+v.soldPrice || +v.price || 0) : (+v.price || 0);
  return { purchase, fees, atelier, total, sale, margin: sale ? sale - total : 0 };
}

// What the customer site may show.
export function publicVehicles() {
  return db.vehicles.filter((v) => ['Disponible', 'Réservé', 'En préparation'].includes(v.status));
}

export function soldVehicles() {
  return db.vehicles.filter((v) => v.status === 'Vendu');
}

// ----- documents (quotes, invoices) -----
export function docTotals(doc) {
  const rate = db.settings.tva / 100;
  const ht = doc.lines.reduce((a, l) => a + (+l.qty || 0) * (+l.unitPrice || 0), 0);
  if (doc.regime === 'marge') {
    // Used-vehicle margin regime: price is TTC, TVA applies to the margin only. To validate with the accountant.
    const v = (doc.lines[0] && doc.lines[0].label) ? db.vehicles.find((x) => doc.lines[0].label.includes(x.ref)) : null;
    const margin = v ? Math.max(0, ht - vehicleCost(v).total) : 0;
    const tva = Math.round(margin * rate / (1 + rate));
    return { ht: ht - tva, tva, ttc: ht, margin, regime: 'marge' };
  }
  const tva = Math.round(ht * rate * 100) / 100;
  return { ht, tva, ttc: ht + tva, regime: 'normal' };
}

export function paidAmount(doc) {
  return (doc.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
}

export function invoiceStatus(inv) {
  const t = docTotals(inv).ttc;
  const p = paidAmount(inv);
  if (p <= 0) return 'Émise';
  if (p + 0.5 < t) return 'Payée partiellement';
  return 'Payée';
}

// ----- customer site inquiries -----
// kind: 'vehicule' | 'sourcing' | 'restauration' | 'visite'
export function addInquiry(input) {
  const phone = (input.phone || '').trim();
  const email = (input.email || '').trim().toLowerCase();
  let client = db.clients.find((c) => (phone && c.phone === phone) || (email && (c.email || '').toLowerCase() === email));
  if (!client) {
    client = { id: uid('c'), name: (input.name || 'Visiteur du site').trim(), phone, email, city: input.city || '', country: input.country || '', type: 'Particulier', tier: 'B', source: 'Site client', interests: '', notes: '', createdAt: today() };
    db.clients.unshift(client);
  }
  const v = input.vehicleId ? find('vehicles', input.vehicleId) : null;
  const titles = {
    vehicule: v ? vehicleTitle(v) : 'Demande véhicule',
    sourcing: 'Recherche sur mesure : ' + (input.brief || '').slice(0, 60),
    restauration: 'Restauration : ' + (input.project || input.message || '').slice(0, 60),
    visite: 'Visite showroom' + (v ? ' : ' + vehicleTitle(v) : '')
  };
  const tier = input.kind === 'sourcing' || (input.budget && +input.budget >= 500000) ? 'A' : 'B';
  const lead = {
    id: uid('l'), clientId: client.id, title: titles[input.kind] || 'Demande site', vehicleId: v ? v.id : '',
    stage: 'Nouveau', tier, budget: +input.budget || 0, createdAt: today(),
    next: { date: today(), label: 'Répondre sous 24 h (demande du site)' },
    history: [{ date: today(), type: 'Site web', note: (input.message || input.brief || 'Demande envoyée depuis le site client.') + (input.date ? ' Date souhaitée : ' + input.date + '.' : '') }]
  };
  db.leads.unshift(lead);
  if (input.kind === 'sourcing') {
    db.sourcing.unshift({ id: uid('s'), clientId: client.id, brief: input.brief || '', budget: +input.budget || 0, deadline: '', status: 'Brief reçu', candidates: [] });
  }
  if ((input.kind === 'restauration' || input.kind === 'visite') && input.date) {
    db.events.push({ id: uid('ev'), start: input.date + 'T10:00', end: input.date + 'T11:00', title: (input.kind === 'restauration' ? 'Demande de créneau restauration : ' : 'Visite showroom : ') + client.name, type: input.kind === 'restauration' ? 'Réservation restauration' : 'Visite showroom', clientId: client.id, woId: '', notes: 'À confirmer. Demande reçue via le site client.' });
  }
  save();
  return lead;
}
