import { db, save, find, uid, today, nextRef, clientName, vehicleTitle, vehicleCost, woTotals, internalOrders, paidAmount } from '../store.js';
import { esc, money, num, fdate, rel, chip, icon, table, openForm, toast, confirmBox, progressBar } from '../ui.js';
import { go, refresh, query } from '../nav.js';
import { VEHICLE_STATUS, VEHICLE_CATEGORIES, ORDER_STATUS } from '../data.js';
import { vehicleArt } from '../vehicle-art.js';
import { clientOptions, contactButtons } from './crm.js';

function specLine(v) {
  return [v.year, v.mileage ? num(v.mileage) + ' ' + v.unit : '', v.energy, v.gearbox].filter(Boolean).join(' · ');
}

export function vehicleForm(v) {
  const isNew = !v;
  v = v || { purchase: {}, costs: [], options: [] };
  openForm(isNew ? 'Nouveau véhicule en stock' : 'Modifier ' + v.ref, [
    { type: 'section', name: '_s1', label: 'Identification' },
    { name: 'category', label: 'Catégorie', type: 'select', options: VEHICLE_CATEGORIES, value: v.category, half: true },
    { name: 'status', label: 'Statut', type: 'select', options: VEHICLE_STATUS, value: v.status || 'En préparation', half: true },
    { name: 'make', label: 'Marque', required: true, value: v.make, half: true },
    { name: 'model', label: 'Modèle et version', required: true, value: v.model, half: true },
    { name: 'year', label: 'Année', type: 'number', value: v.year, half: true },
    { name: 'mileage', label: 'Kilométrage ou heures', type: 'number', value: v.mileage, half: true },
    { name: 'unit', label: 'Unité', type: 'select', options: ['km', 'miles', 'h'], value: v.unit || 'km', half: true },
    { name: 'plate', label: 'Immatriculation', value: v.plate, half: true },
    { name: 'vin', label: 'Numéro de châssis (VIN)', value: v.vin },
    { type: 'section', name: '_s2', label: 'Caractéristiques' },
    { name: 'energy', label: 'Énergie', type: 'select', options: ['Essence', 'Diesel', 'Hybride', 'Électrique'], value: v.energy, half: true },
    { name: 'engine', label: 'Motorisation', value: v.engine, half: true },
    { name: 'power', label: 'Puissance', value: v.power, half: true },
    { name: 'gearbox', label: 'Boîte', value: v.gearbox, half: true },
    { name: 'colorExt', label: 'Couleur extérieure', value: v.colorExt, half: true },
    { name: 'colorInt', label: 'Intérieur', value: v.colorInt, half: true },
    { name: 'options', label: 'Options (séparées par des virgules)', value: (v.options || []).join(', ') },
    { type: 'section', name: '_s3', label: 'Provenance' },
    { name: 'origin', label: 'Pays de provenance', value: v.origin, half: true },
    { name: 'owners', label: 'Nombre de propriétaires', type: 'number', value: v.owners, half: true },
    { name: 'matching', label: 'Numéros concordants', type: 'checkbox', value: v.matching },
    { name: 'history', label: 'Histoire du véhicule', type: 'textarea', value: v.history },
    { name: 'why', label: 'Pourquoi ce véhicule', type: 'textarea', value: v.why, rows: 2 },
    { type: 'section', name: '_s4', label: 'Achat et prix' },
    { name: 'pdate', label: 'Date d\'achat', type: 'date', value: v.purchase.date, half: true },
    { name: 'pprice', label: 'Prix d\'achat (MAD)', type: 'number', value: v.purchase.price, half: true },
    { name: 'sellerType', label: 'Vendeur', type: 'select', options: ['Particulier', 'Professionnel'], value: v.purchase.sellerType, half: true },
    { name: 'from', label: 'Acheté auprès de', value: v.purchase.from, half: true },
    { name: 'price', label: 'Prix affiché (MAD)', type: 'number', value: v.price, half: true },
    { name: 'minPrice', label: 'Prix plancher (MAD)', type: 'number', value: v.minPrice, half: true },
    { name: 'location', label: 'Emplacement', type: 'select', options: ['Showroom', 'Atelier', 'Dépôt', 'À l\'étranger'], value: v.location, half: true }
  ], (d) => {
    const data = {
      category: d.category, status: d.status, make: d.make, model: d.model, year: d.year, mileage: d.mileage, unit: d.unit, plate: d.plate, vin: d.vin,
      energy: d.energy, engine: d.engine, power: d.power, gearbox: d.gearbox, colorExt: d.colorExt, colorInt: d.colorInt,
      options: d.options ? d.options.split(',').map((x) => x.trim()).filter(Boolean) : [],
      origin: d.origin, owners: d.owners, matching: d.matching, history: d.history, why: d.why,
      purchase: { date: d.pdate, price: d.pprice, sellerType: d.sellerType, from: d.from }, price: d.price, minPrice: d.minPrice, location: d.location
    };
    if (isNew) {
      const n = Object.assign({ id: uid('v'), ref: nextRef('vehicles', 'STK'), costs: [], seats: 0, createdAt: today() }, data);
      db.vehicles.unshift(n); save(); toast('Véhicule ajouté au stock'); go('#/vehicule/' + n.id);
    } else { Object.assign(v, data); save(); toast('Fiche mise à jour'); refresh(); }
  }, { wide: true });
}

// ---------- stock ----------
export function stock() {
  const q = query();
  const cat = q.get('cat') || '';
  const st = q.get('st') || 'actif';
  let list = db.vehicles.filter((v) => (!cat || v.category === cat));
  if (st === 'actif') list = list.filter((v) => v.status !== 'Vendu');
  else if (st) list = list.filter((v) => v.status === st);
  const value = list.filter((v) => v.status !== 'Vendu').reduce((a, v) => a + (+v.price || 0), 0);
  const cats = [''].concat(VEHICLE_CATEGORIES);
  const html =
    '<div class="page-head"><div><h1>Stock véhicules</h1><div class="sub">' + list.length + ' véhicule(s) · ' + money(value) + ' en prix affiché</div></div>' +
    '<div class="actions"><a class="btn btn-ghost" href="boutique/#/collection" target="_blank" rel="noopener">' + icon('globe', 18) + 'Voir sur le site client</a><button class="btn btn-red" type="button" id="newV">' + icon('plus', 18) + 'Ajouter un véhicule</button></div></div>' +
    '<div class="filters" role="group" aria-label="Catégorie">' + cats.map((c) => '<button class="fchip" type="button" data-cat="' + c + '" aria-pressed="' + (cat === c) + '">' + (c || 'Toutes catégories') + '</button>').join('') + '</div>' +
    '<div class="filters" role="group" aria-label="Statut">' + [['actif', 'En stock'], ...VEHICLE_STATUS.map((s) => [s, s])].map(([k, l]) => '<button class="fchip" type="button" data-st="' + k + '" aria-pressed="' + (st === k) + '">' + l + '</button>').join('') + '</div>' +
    (list.length ? '<div class="vgrid">' + list.map((v) => {
      const c = vehicleCost(v);
      return '<a class="vcard" href="#/vehicule/' + v.id + '"><div class="vart">' + chip(v.status) + '<span class="ref">' + esc(v.ref) + '</span>' + vehicleArt(v) + '</div>' +
        '<div class="vbody"><span class="small faint">' + esc(v.category) + '</span><span class="t">' + esc(v.make + ' ' + v.model) + '</span><span class="specs">' + esc(specLine(v)) + '</span>' +
        '<span class="price"><span>' + (v.price ? money(v.status === 'Vendu' ? v.soldPrice : v.price) : 'Prix à définir') + '</span>' + (c.sale ? '<span class="small ' + (c.margin >= 0 ? 'margin-pos' : 'margin-neg') + '">marge ' + money(c.margin) + '</span>' : '') + '</span></div></a>';
    }).join('') + '</div>' : '<div class="empty">Aucun véhicule ne correspond à ces filtres.</div>');
  return {
    title: 'Stock', html,
    mount(root) {
      root.querySelector('#newV').addEventListener('click', () => vehicleForm());
      const nav = (c, s) => go('#/stock?' + new URLSearchParams({ ...(c ? { cat: c } : {}), st: s }).toString());
      root.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.cat, st)));
      root.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => nav(cat, b.dataset.st)));
    }
  };
}

export function vehicleView(id) {
  const v = find('vehicles', id);
  if (!v) return { title: 'Véhicule', html: '<div class="empty">Véhicule introuvable.</div>' };
  const c = vehicleCost(v);
  const ors = internalOrders(v.id);
  const leads = db.leads.filter((l) => l.vehicleId === v.id);
  const order = db.orders.find((o) => o.vehicleId === v.id);
  const html =
    '<div><a class="crumb" href="#/stock">' + icon('back', 14) + 'Stock</a>' +
    '<div class="page-head"><div><h1>' + esc(v.make + ' ' + v.model) + '</h1><div class="sub mono">' + esc(v.ref) + ' · ' + esc(v.category) + ' · ' + esc(v.location || '') + '</div></div>' +
    '<div class="actions"><button class="btn btn-ghost" type="button" id="editV">' + icon('edit', 18) + 'Modifier</button>' +
    (v.status !== 'Vendu' ? '<button class="btn btn-ghost" type="button" id="toAtelier">' + icon('wrench', 18) + 'Envoyer à l\'atelier</button>' : '') +
    '<a class="btn btn-ghost" href="boutique/#/vehicule/' + v.id + '" target="_blank" rel="noopener">' + icon('globe', 18) + 'Site client</a></div></div></div>' +
    '<div class="hero-veh"><div class="vart">' + vehicleArt(v, { animate: true }) + '</div>' +
    '<section class="card stack"><div class="row-sb"><span class="k small faint">STATUT</span>' + chip(v.status) + '</div>' +
    '<div class="filters" role="group" aria-label="Changer le statut">' + VEHICLE_STATUS.map((s) => '<button class="fchip" type="button" data-vst="' + s + '" aria-pressed="' + (v.status === s) + '">' + s + '</button>').join('') + '</div>' +
    '<div class="row-sb"><span class="muted">Prix affiché</span><span class="mono" style="font-size:22px">' + (v.price ? money(v.price) : 'À définir') + '</span></div>' +
    (v.minPrice ? '<div class="row-sb small"><span class="muted">Prix plancher</span><span class="mono">' + money(v.minPrice) + '</span></div>' : '') +
    (v.status === 'Vendu' ? '<div class="row-sb small"><span class="muted">Vendu à</span><span>' + esc(clientName(v.soldTo)) + ' · ' + money(v.soldPrice) + ' · ' + fdate(v.soldDate) + '</span></div>' : '') +
    '<div class="row-sb"><span class="muted">Marge ' + (v.status === 'Vendu' ? 'réalisée' : 'estimée') + '</span><span class="mono ' + (c.margin >= 0 ? 'margin-pos' : 'margin-neg') + '" style="font-size:18px">' + (c.sale ? money(c.margin) : 'n/d') + '</span></div>' +
    (order ? '<div class="note info">Commande <a href="#/commande/' + order.id + '">' + esc(order.ref) + '</a> · ' + esc(clientName(order.clientId)) + ' · ' + esc(order.status) + '</div>' : '') + '</section></div>' +
    '<div class="grid g3">' +
    '<section class="card"><h2>Caractéristiques</h2><dl class="dl">' +
    [['Année', v.year], ['Kilométrage', v.mileage ? num(v.mileage) + ' ' + v.unit : ''], ['Motorisation', v.engine], ['Puissance', v.power], ['Énergie', v.energy], ['Boîte', v.gearbox], ['Extérieur', v.colorExt], ['Intérieur', v.colorInt], ['Immatriculation', v.plate], ['Châssis', v.vin]].map(([k, val]) => '<dt>' + k + '</dt><dd>' + esc(val || 'n/d') + '</dd>').join('') + '</dl>' +
    (v.options && v.options.length ? '<div class="row wrap" style="gap:6px;margin-top:12px">' + v.options.map((o) => '<span class="chip chip-neutral">' + esc(o) + '</span>').join('') + '</div>' : '') + '</section>' +
    '<section class="card"><h2>Provenance et histoire</h2><dl class="dl"><dt>Provenance</dt><dd>' + esc(v.origin || 'n/d') + '</dd><dt>Propriétaires</dt><dd>' + esc(v.owners || 'n/d') + '</dd><dt>Numéros concordants</dt><dd>' + (v.matching ? 'Oui' : 'Non vérifié') + '</dd><dt>Acheté auprès de</dt><dd>' + esc(v.purchase.from || '') + ' (' + esc(v.purchase.sellerType || '') + ')</dd></dl>' +
    (v.history ? '<p class="small" style="margin:12px 0 0">' + esc(v.history) + '</p>' : '') + (v.why ? '<div class="note" style="margin-top:12px"><b>Pourquoi ce véhicule.</b> ' + esc(v.why) + '</div>' : '') + '</section>' +
    '<section class="card cost-table"><h2>Coût de revient <button class="btn btn-ghost btn-sm" type="button" id="addCost">' + icon('plus', 16) + 'Frais</button></h2>' +
    '<div class="row-sb"><span>Prix d\'achat</span><span class="mono">' + money(c.purchase) + '</span></div>' +
    (v.costs || []).map((x, i) => '<div class="row-sb"><span>' + esc(x.label) + ' <span class="faint small">' + esc(x.cat || '') + '</span></span><span class="row"><span class="mono">' + money(x.amount) + '</span><button class="icon-btn" style="width:30px;height:30px" type="button" data-delcost="' + i + '" aria-label="Supprimer ce frais">' + icon('x', 14) + '</button></span></div>').join('') +
    ors.map((w) => '<div class="row-sb"><span>Atelier <a href="#/or/' + w.id + '">' + esc(w.ref) + '</a> <span class="faint small">' + num(woTotals(w).hours) + ' h, ' + esc(w.stage.toLowerCase()) + '</span></span><span class="mono">' + money(woTotals(w).cost) + '</span></div>').join('') +
    '<div class="row-sb total"><span>Coût de revient</span><span class="mono">' + money(c.total) + '</span></div>' +
    '<div class="row-sb"><span>' + (v.status === 'Vendu' ? 'Prix de vente' : 'Prix affiché') + '</span><span class="mono">' + money(c.sale) + '</span></div>' +
    '<div class="row-sb marg"><span>Marge</span><span class="mono">' + money(c.margin) + '</span></div>' +
    '<p class="small faint" style="margin:10px 0 0">Atelier valorisé au coût interne (' + money(db.settings.laborCostRate) + ' par heure, pièces au prix d\'achat).</p></section></div>' +
    '<section class="card"><h2>Clients intéressés</h2>' + (leads.length ? '<div class="list">' + leads.map((l) => '<a class="li" href="#/lead/' + l.id + '"><span class="grow"><span class="t">' + esc(clientName(l.clientId)) + '</span><span class="d">' + esc(l.title) + '</span></span>' + chip(l.tier) + chip(l.stage) + '</a>').join('') + '</div>' : '<div class="empty">Aucun prospect lié. Les demandes du site client apparaissent ici.</div>') + '</section>';

  return {
    title: vehicleTitle(v), html,
    mount(root) {
      root.querySelector('#editV').addEventListener('click', () => vehicleForm(v));
      root.querySelectorAll('[data-vst]').forEach((b) => b.addEventListener('click', () => { v.status = b.dataset.vst; save(); toast('Statut : ' + v.status); refresh(); }));
      const ta = root.querySelector('#toAtelier');
      if (ta) ta.addEventListener('click', () => go('#/reception?vehicle=' + v.id));
      root.querySelector('#addCost').addEventListener('click', () => openForm('Ajouter un frais', [
        { name: 'label', label: 'Libellé', required: true }, { name: 'amount', label: 'Montant (MAD)', type: 'number', required: true, half: true },
        { name: 'cat', label: 'Catégorie', type: 'select', options: ['Transport', 'Douane', 'Administratif', 'Esthétique', 'Autre'], half: true }
      ], (d) => { v.costs.push(d); save(); toast('Frais ajouté, marge recalculée'); refresh(); }));
      root.querySelectorAll('[data-delcost]').forEach((b) => b.addEventListener('click', () => { v.costs.splice(+b.dataset.delcost, 1); save(); refresh(); }));
    }
  };
}

// ---------- orders ----------
export function orders() {
  const rows = db.orders.slice().sort((a, b) => b.date.localeCompare(a.date));
  const html =
    '<div class="page-head"><div><h1>Commandes et livraisons</h1><div class="sub">De la réservation à la remise des clés : acomptes, papiers, mutation, livraison.</div></div>' +
    '<div class="actions"><button class="btn btn-red" type="button" id="newO">' + icon('plus', 18) + 'Nouvelle commande</button></div></div>' +
    '<section class="card">' + table(rows, [
      { label: 'Commande', render: (o) => '<span class="mono">' + esc(o.ref) + '</span>' },
      { label: 'Client', render: (o) => esc(clientName(o.clientId)) },
      { label: 'Véhicule', render: (o) => esc(vehicleTitle(find('vehicles', o.vehicleId))) },
      { label: 'Prix', cls: 'right', render: (o) => '<span class="mono">' + money(o.price) + '</span>' },
      { label: 'Encaissé', cls: 'right', render: (o) => '<span class="mono">' + money(paidAmount(o)) + '</span>' },
      { label: 'Livraison', render: (o) => fdate(o.delivery.date) + ' <span class="faint small">' + esc(o.delivery.mode) + '</span>' },
      { label: 'Statut', render: (o) => chip(o.status) }
    ], { rowHref: (o) => '#/commande/' + o.id }) + '</section>';
  return {
    title: 'Commandes', html,
    mount(root) {
      root.querySelector('#newO').addEventListener('click', () => openForm('Nouvelle commande', [
        { name: 'clientId', label: 'Client', type: 'select', options: clientOptions(false) },
        { name: 'vehicleId', label: 'Véhicule', type: 'select', options: db.vehicles.filter((v) => ['Disponible', 'En préparation'].includes(v.status)).map((v) => ({ value: v.id, label: v.ref + ' · ' + vehicleTitle(v) + ' · ' + money(v.price) })) },
        { name: 'price', label: 'Prix convenu (MAD)', type: 'number', required: true, half: true },
        { name: 'deposit', label: 'Acompte (MAD)', type: 'number', half: true },
        { name: 'ddate', label: 'Livraison prévue', type: 'date', half: true },
        { name: 'dmode', label: 'Mode', type: 'select', options: ['Retrait showroom', 'Livraison plateau', 'Export'], half: true }
      ], (d) => {
        const v = find('vehicles', d.vehicleId);
        const o = { id: uid('o'), ref: nextRef('orders', 'CMD'), clientId: d.clientId, vehicleId: d.vehicleId, date: today(), price: d.price, status: d.deposit ? 'Acompte reçu' : 'Réservé', payments: d.deposit ? [{ date: today(), amount: d.deposit, mode: 'Virement' }] : [], delivery: { date: d.ddate, mode: d.dmode, address: '' }, checklist: ['Bon de commande signé', 'Acompte encaissé', 'Déclaration de cession NARSA', 'Dossier mutation déposé', 'Contrôle final atelier', 'Nettoyage et plein', 'Solde encaissé'].map((x) => ({ label: x, done: false })), notes: '' };
        db.orders.unshift(o); if (v) v.status = 'Réservé'; save(); toast('Commande créée'); go('#/commande/' + o.id);
      }));
    }
  };
}

export function orderView(id) {
  const o = find('orders', id);
  if (!o) return { title: 'Commande', html: '<div class="empty">Commande introuvable.</div>' };
  const v = find('vehicles', o.vehicleId);
  const c = find('clients', o.clientId);
  const paid = paidAmount(o);
  const done = o.checklist.filter((x) => x.done).length;
  const inv = db.invoices.find((f) => f.orderId === o.id);
  const html =
    '<div><a class="crumb" href="#/commandes">' + icon('back', 14) + 'Commandes</a>' +
    '<div class="page-head"><div><h1>' + esc(vehicleTitle(v)) + '</h1><div class="sub"><span class="mono">' + esc(o.ref) + '</span> · <a href="#/client/' + o.clientId + '">' + esc(clientName(o.clientId)) + '</a> · ' + fdate(o.date) + '</div></div>' +
    '<div class="actions">' + (inv ? '<a class="btn btn-ghost" href="#/doc/facture/' + inv.id + '">' + icon('file', 18) + esc(inv.ref) + '</a>' : '<button class="btn btn-ghost" type="button" id="mkInv">' + icon('file', 18) + 'Générer la facture</button>') +
    (o.status !== 'Livré' ? '<button class="btn btn-red" type="button" id="deliver">' + icon('check', 18) + 'Marquer livré</button>' : '') + '</div></div></div>' +
    '<div class="filters" role="group" aria-label="Statut">' + ORDER_STATUS.map((s) => '<button class="fchip" type="button" data-ost="' + s + '" aria-pressed="' + (o.status === s) + '">' + s + '</button>').join('') + '</div>' +
    '<div class="grid g3">' +
    '<section class="card"><h2>Paiements <button class="btn btn-ghost btn-sm" type="button" id="addPay">' + icon('plus', 16) + 'Encaissement</button></h2>' +
    '<div class="row-sb"><span class="muted">Prix convenu</span><span class="mono">' + money(o.price) + '</span></div><div class="row-sb"><span class="muted">Encaissé</span><span class="mono margin-pos">' + money(paid) + '</span></div><div class="row-sb"><span class="muted">Reste à payer</span><span class="mono">' + money(o.price - paid) + '</span></div>' +
    '<div style="margin:12px 0">' + progressBar(paid / o.price * 100, 'Encaissé') + '</div>' +
    '<div class="list">' + o.payments.map((p) => '<div class="li"><span class="grow"><span class="t mono">' + money(p.amount) + '</span><span class="d">' + esc(p.mode) + '</span></span><span class="small muted">' + fdate(p.date) + '</span></div>').join('') + '</div>' +
    '<p class="small faint" style="margin:10px 0 0">Rappel : au-delà de 5 000 MAD par jour, privilégier chèque barré ou virement pour les clients professionnels.</p></section>' +
    '<section class="card"><h2>Dossier de livraison <span class="mono small faint">' + done + '/' + o.checklist.length + '</span></h2><div class="list">' +
    o.checklist.map((x, i) => '<div class="li"><button type="button" class="check-btn' + (x.done ? ' on' : '') + '" data-chk="' + i + '" aria-pressed="' + x.done + '" aria-label="' + esc(x.label) + '">' + icon('check', 16) + '</button><span class="grow"><span class="t">' + esc(x.label) + '</span></span></div>').join('') + '</div></section>' +
    '<section class="card"><h2>Livraison</h2><dl class="dl"><dt>Date</dt><dd>' + fdate(o.delivery.date) + ' (' + rel(o.delivery.date) + ')</dd><dt>Mode</dt><dd>' + esc(o.delivery.mode) + '</dd><dt>Adresse</dt><dd>' + esc(o.delivery.address || 'Showroom') + '</dd><dt>Véhicule</dt><dd><a href="#/vehicule/' + v.id + '">' + esc(v.ref) + '</a></dd></dl>' +
    '<div style="margin-top:14px">' + contactButtons(c, 'Bonjour ' + (c ? c.name.split(' ')[0] : '') + ', votre ' + vehicleTitle(v) + ' (' + o.ref + ') : ') + '</div></section></div>';
  return {
    title: o.ref, html,
    mount(root) {
      root.querySelectorAll('[data-ost]').forEach((b) => b.addEventListener('click', () => { o.status = b.dataset.ost; save(); toast('Statut mis à jour'); refresh(); }));
      root.querySelectorAll('[data-chk]').forEach((b) => b.addEventListener('click', () => { const x = o.checklist[+b.dataset.chk]; x.done = !x.done; save(); refresh(); }));
      root.querySelector('#addPay').addEventListener('click', () => openForm('Nouvel encaissement', [
        { name: 'amount', label: 'Montant (MAD)', type: 'number', required: true, value: o.price - paid, half: true },
        { name: 'mode', label: 'Mode', type: 'select', options: ['Virement', 'Chèque', 'Espèces', 'Carte'], half: true },
        { name: 'date', label: 'Date', type: 'date', value: today() }
      ], (d) => { o.payments.push(d); if (o.status === 'Réservé') o.status = 'Acompte reçu'; save(); toast('Encaissement enregistré'); refresh(); }));
      const mk = root.querySelector('#mkInv');
      if (mk) mk.addEventListener('click', () => {
        const f = { id: uid('f'), ref: nextRef('invoices', 'FA'), company: 'showroom', clientId: o.clientId, woId: '', orderId: o.id, date: today(), regime: 'marge', lines: [{ label: vehicleTitle(v) + ', ' + v.ref, kind: 'Véhicule', qty: 1, unitPrice: o.price }], payments: o.payments.slice(), notes: '' };
        db.invoices.unshift(f); save(); toast('Facture ' + f.ref + ' générée'); go('#/doc/facture/' + f.id);
      });
      const dl = root.querySelector('#deliver');
      if (dl) dl.addEventListener('click', () => confirmBox('Livrer le véhicule', 'Le véhicule passe en « Vendu » et le parcours de fidélisation démarre (J+7, J+30, J+90).', () => {
        o.status = 'Livré'; o.delivery.date = today();
        o.checklist.forEach((x) => { x.done = true; });
        v.status = 'Vendu'; v.soldPrice = o.price; v.soldTo = o.clientId; v.soldDate = today(); v.location = 'Livré';
        [[7, 'Message de bienvenue J+7'], [30, 'Appel de satisfaction J+30']].forEach(([n, lab]) => { const d = new Date(); d.setDate(d.getDate() + n); db.tasks.push({ id: uid('k'), date: d.toISOString().slice(0, 10), label: lab + ' : ' + vehicleTitle(v), clientId: o.clientId, kind: 'Fidélisation', done: false }); });
        save(); toast('Livré. Relances de fidélisation planifiées'); refresh();
      }, 'Confirmer la livraison'));
    }
  };
}
