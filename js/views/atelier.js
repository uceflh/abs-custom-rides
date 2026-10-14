import { db, save, find, uid, today, nextRef, clientName, vehicleTitle, woTotals, techName, docTotals } from '../store.js';
import { esc, money, num, fdate, rel, daysFrom, chip, icon, table, openForm, toast, confirmBox, progressBar } from '../ui.js';
import { go, refresh, query } from '../nav.js';
import { STAGES_OR, INSPECTION_ZONES } from '../data.js';
import { clientOptions, contactButtons } from './crm.js';

const OR_TYPES = ['Réparation', 'Restauration', 'Entretien', 'Tuning', 'Préparation stock'];
const STATE_CLS = { 'OK': 's-ok', 'À surveiller': 's-warn', 'Défaut': 's-bad' };

function techOptions() { return db.technicians.map((t) => ({ value: t.id, label: t.name + ' · ' + t.role })); }
function initials(w) { return [...new Set(w.labor.map((l) => techName(l.tech)))].join(', '); }
function stageIndex(s) { return STAGES_OR.indexOf(s); }
function setStage(w, s) { if (stageIndex(s) > stageIndex(w.stage)) w.stage = s; }

// ---------- board ----------
export function atelierBoard() {
  const q = query();
  const f = q.get('f') || '';
  const list = db.workOrders.filter((w) => !f || (f === 'interne' ? !w.clientId : !!w.clientId));
  const active = db.workOrders.filter((w) => !['Facturé', 'Livré'].includes(w.stage));
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const wk = weekAgo.toISOString().slice(0, 10);
  const hoursBy = {};
  db.workOrders.forEach((w) => w.labor.filter((l) => l.date >= wk).forEach((l) => { hoursBy[l.tech] = (hoursBy[l.tech] || 0) + (+l.hours || 0); }));
  const maxH = Math.max(1, ...Object.values(hoursBy), 40);
  const cols = STAGES_OR.map((s) => {
    const items = list.filter((w) => w.stage === s);
    return '<div class="kcol"><div class="kcol-h"><span>' + s + '</span><span class="mono faint">' + items.length + '</span></div>' + items.map((w) => {
      const late = daysFrom(w.promisedAt) < 0 && !['Facturé', 'Livré'].includes(w.stage);
      return '<a class="kcard" href="#/or/' + w.id + '"><span class="row-sb"><span class="mono small faint">' + esc(w.ref) + '</span>' + (w.clientId ? '' : '<span class="chip chip-neutral">Interne</span>') + '</span>' +
        '<span class="t">' + esc(w.vehicle.make + ' ' + w.vehicle.model) + ', ' + esc(w.vehicle.year) + '</span>' +
        '<span class="d">' + esc(w.clientId ? clientName(w.clientId) : 'Préparation stock') + ' · ' + esc(w.type) + '</span>' + progressBar(w.progress, 'Avancement') +
        '<span class="d ' + (late ? 'margin-neg' : '') + '">Promis ' + rel(w.promisedAt) + (initials(w) ? ' · ' + esc(initials(w)) : '') + '</span></a>';
    }).join('') + '</div>';
  }).join('');
  const html =
    '<div class="page-head"><div><h1>Ordres de réparation</h1><div class="sub">' + active.length + ' véhicule(s) à l\'atelier, de la réception à la livraison.</div></div>' +
    '<div class="actions"><a class="btn btn-ghost" href="#/documents">' + icon('file', 18) + 'Devis et factures</a><a class="btn btn-red" href="#/reception">' + icon('clipboard', 18) + 'Nouvelle réception</a></div></div>' +
    '<div class="grid g4 kpis">' +
    '<div class="kpi"><span class="k">En attente client</span><span class="v">' + db.workOrders.filter((w) => ['Devis', 'Approbation'].includes(w.stage)).length + '</span><span class="s">devis à valider</span></div>' +
    '<div class="kpi"><span class="k">En travaux</span><span class="v">' + db.workOrders.filter((w) => w.stage === 'Travaux').length + '</span><span class="s">dont ' + db.workOrders.filter((w) => w.stage === 'Travaux' && !w.clientId).length + ' préparation(s) stock</span></div>' +
    '<div class="kpi"><span class="k">À facturer</span><span class="v">' + db.workOrders.filter((w) => w.stage === 'Contrôle sortie' && w.clientId).length + '</span><span class="s">contrôle de sortie</span></div>' +
    '<div class="kpi"><span class="k">Heures, 7 jours</span><span class="v">' + num(Object.values(hoursBy).reduce((a, b) => a + b, 0)) + ' h</span><span class="s">toutes équipes</span></div></div>' +
    '<div class="row-sb wrap"><div class="filters" role="group" aria-label="Type">' + [['', 'Tous les OR'], ['client', 'Clients'], ['interne', 'Préparations stock']].map(([k, l]) => '<button class="fchip" type="button" data-f="' + k + '" aria-pressed="' + (f === k) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="kanban">' + cols + '</div>' +
    '<section class="card"><h2>Charge par technicien, 7 derniers jours</h2><div class="techbars">' + db.technicians.map((t) => '<div class="techbar"><span>' + esc(t.name) + '</span><span class="bar"><i style="width:' + ((hoursBy[t.id] || 0) / maxH * 100) + '%"></i></span><span class="mono small right">' + num(hoursBy[t.id] || 0) + ' h</span></div>').join('') + '</div></section>';
  return {
    title: 'Atelier', html,
    mount(root) { root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => go('#/atelier' + (b.dataset.f ? '?f=' + b.dataset.f : '')))); }
  };
}

// ---------- reception ----------
export function reception() {
  const q = query();
  const stockV = q.get('vehicle') ? find('vehicles', q.get('vehicle')) : null;
  const preClient = q.get('client') || '';
  const zones = INSPECTION_ZONES.map((z, i) => '<div class="insp-item"><div class="row-sb"><b style="font-weight:500">' + esc(z) + '</b></div>' +
    '<div class="seg" role="group" aria-label="' + esc(z) + '">' + ['OK', 'À surveiller', 'Défaut'].map((s) => '<button type="button" class="' + STATE_CLS[s] + '" data-zone="' + i + '" data-state="' + s + '" aria-pressed="' + (s === 'OK') + '">' + s + '</button>').join('') + '</div>' +
    '<input class="inp" name="znote' + i + '" placeholder="Remarque" aria-label="Remarque ' + esc(z) + '" hidden></div>').join('');
  const v = stockV || {};
  const html =
    '<div><a class="crumb" href="#/atelier">' + icon('back', 14) + 'Atelier</a><div class="page-head"><div><h1>Réception d\'un véhicule</h1><div class="sub">Fiche d\'entrée datée du ' + fdate(today()) + '. Elle protège l\'atelier et le client : tout ce qui est noté ici est constaté à l\'arrivée.</div></div></div></div>' +
    '<form id="recForm" class="stack" novalidate>' +
    '<section class="card"><h2>1. Client</h2><div class="form-grid">' +
    (stockV ? '<div class="field"><div class="note info">Préparation interne du véhicule de stock <b>' + esc(stockV.ref + ' · ' + vehicleTitle(stockV)) + '</b>. Les coûts seront imputés à son coût de revient.</div></div>' :
      '<div class="field"><label for="r_client">Client</label><select id="r_client" name="clientId">' + clientOptions(true).map((o) => '<option value="' + esc(o.value) + '"' + (o.value === preClient ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></div>' +
      '<div class="field half" data-newc><label for="r_name">Nom du nouveau client</label><input id="r_name" name="name"></div><div class="field half" data-newc><label for="r_phone">Téléphone</label><input id="r_phone" name="phone" type="tel"></div>') +
    '</div></section>' +
    '<section class="card"><h2>2. Véhicule</h2><div class="form-grid">' +
    '<div class="field half"><label for="r_make">Marque *</label><input id="r_make" name="make" required value="' + esc(v.make || '') + '"></div>' +
    '<div class="field half"><label for="r_model">Modèle *</label><input id="r_model" name="model" required value="' + esc(v.model || '') + '"></div>' +
    '<div class="field half"><label for="r_year">Année</label><input id="r_year" name="year" type="number" inputmode="numeric" value="' + esc(v.year || '') + '"></div>' +
    '<div class="field half"><label for="r_plate">Immatriculation</label><input id="r_plate" name="plate" value="' + esc(v.plate || '') + '"></div>' +
    '<div class="field half"><label for="r_vin">Châssis (VIN)</label><input id="r_vin" name="vin" value="' + esc(v.vin || '') + '"></div>' +
    '<div class="field half"><label for="r_color">Couleur</label><input id="r_color" name="color" value="' + esc(v.colorExt || '') + '"></div>' +
    '<div class="field half"><label for="r_km">Kilométrage à l\'entrée *</label><input id="r_km" name="mileage" type="number" inputmode="numeric" required value="' + esc(v.mileage || '') + '"></div>' +
    '<div class="field half"><label for="r_fuel">Niveau de carburant</label><select id="r_fuel" name="fuel">' + ['Réserve', '1/4', '1/2', '3/4', 'Plein'].map((x) => '<option>' + x + '</option>').join('') + '</select></div>' +
    '</div></section>' +
    '<section class="card"><h2>3. Travaux demandés</h2><div class="form-grid">' +
    '<div class="field half"><label for="r_type">Type d\'intervention</label><select id="r_type" name="type">' + OR_TYPES.map((t) => '<option' + ((stockV && t === 'Préparation stock') ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
    '<div class="field half"><label for="r_prom">Restitution prévue</label><input id="r_prom" name="promisedAt" type="date"></div>' +
    '<div class="field"><label for="r_req">Demandes du client, une par ligne *</label><textarea id="r_req" name="requested" rows="4" required placeholder="Ex. : bruit au freinage avant"></textarea></div></div></section>' +
    '<section class="card"><h2>4. Fiche d\'inspection</h2><p class="small muted" style="margin:-6px 0 12px">Tout est « OK » par défaut. Touchez un point pour signaler une réserve ou un défaut.</p><div class="insp">' + zones + '</div></section>' +
    '<section class="card"><h2>5. Anomalies, accidents, remarques</h2><div class="form-grid">' +
    '<div class="field"><label for="r_dmg">Dommages constatés, un par ligne (zone : description)</label><textarea id="r_dmg" name="damages" rows="3" placeholder="Aile avant gauche : rayure de 20 cm"></textarea></div>' +
    '<div class="field"><label for="r_acc">Historique d\'accident signalé</label><input id="r_acc" name="accident" placeholder="Aucun signalé"></div>' +
    '<div class="field"><label for="r_rem">Remarques du client</label><textarea id="r_rem" name="remarks" rows="2"></textarea></div>' +
    '<div class="field half"><label for="r_ph">Photos prises</label><input id="r_ph" name="photos" type="number" inputmode="numeric" value="0"></div>' +
    '<div class="field half"><label for="r_sig">Signé par</label><input id="r_sig" name="signedBy" placeholder="Nom de la personne présente"></div>' +
    '<div class="field check"><label for="r_ack"><input type="checkbox" id="r_ack" name="ack"> La personne présente a pris connaissance de l\'état du véhicule à l\'entrée.</label></div></div></section>' +
    '<div class="form-actions"><a class="btn btn-ghost" href="#/atelier">Annuler</a><button class="btn btn-red" type="submit">' + icon('check', 18) + 'Créer l\'ordre de réparation</button></div></form>';

  return {
    title: 'Réception', html,
    mount(root) {
      const form = root.querySelector('#recForm');
      const states = INSPECTION_ZONES.map(() => 'OK');
      root.querySelectorAll('[data-zone]').forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.zone;
        states[i] = b.dataset.state;
        root.querySelectorAll('[data-zone="' + i + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const note = form.elements['znote' + i];
        note.hidden = states[i] === 'OK';
        if (!note.hidden) note.focus();
      }));
      const sel = form.elements.clientId;
      const toggleNew = () => root.querySelectorAll('[data-newc]').forEach((el) => { el.hidden = !sel || sel.value !== '__new'; });
      if (sel) { sel.addEventListener('change', toggleNew); toggleNew(); }
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const E = form.elements;
        const missing = ['make', 'model', 'mileage', 'requested'].filter((n) => !E[n].value.trim());
        if (missing.length) { missing.forEach((n) => E[n].setAttribute('aria-invalid', 'true')); E[missing[0]].focus(); toast('Complétez les champs obligatoires'); return; }
        let clientId = '';
        if (!stockV) {
          clientId = E.clientId.value;
          if (clientId === '__new') {
            if (!E.name.value.trim()) { E.name.focus(); toast('Indiquez le nom du client'); return; }
            const c = { id: uid('c'), name: E.name.value.trim(), phone: E.phone.value.trim(), email: '', city: 'Tanger', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Atelier', interests: '', notes: '', createdAt: today() };
            db.clients.unshift(c); clientId = c.id;
          }
        }
        const checks = INSPECTION_ZONES.map((zone, i) => ({ zone, state: states[i], note: E['znote' + i].value.trim() }));
        const internal = !!stockV;
        const w = {
          id: uid('w'), ref: nextRef('workOrders', 'OR'), type: E.type.value, clientId, stockVehicleId: internal ? stockV.id : '',
          vehicle: { make: E.make.value.trim(), model: E.model.value.trim(), year: +E.year.value || '', plate: E.plate.value.trim(), vin: E.vin.value.trim(), color: E.color.value.trim() },
          receivedAt: today(), promisedAt: E.promisedAt.value || '', stage: internal ? 'Travaux' : 'Devis', progress: 0,
          requested: E.requested.value.split('\n').map((x) => x.trim()).filter(Boolean),
          jobs: E.requested.value.split('\n').map((x) => x.trim()).filter(Boolean).map((label) => ({ label, done: false })),
          inspection: { mileage: +E.mileage.value, fuel: E.fuel.value, checks, damages: E.damages.value.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const [zone, ...rest] = x.split(':'); return { zone: zone.trim(), desc: rest.join(':').trim() }; }), accident: E.accident.value.trim(), remarks: E.remarks.value.trim(), photos: +E.photos.value || 0, signedBy: E.signedBy.value.trim() + (E.ack.checked ? ' (état pris en compte)' : '') },
          labor: [], parts: [], external: [], quoteId: '', invoiceId: '', exit: null, notes: ''
        };
        db.workOrders.unshift(w);
        if (internal) { stockV.status = 'En préparation'; stockV.location = 'Atelier'; }
        db.events.push({ id: uid('ev'), start: today() + 'T' + new Date().toTimeString().slice(0, 5), end: today() + 'T' + new Date().toTimeString().slice(0, 5), title: 'Réception ' + w.vehicle.make + ' ' + w.vehicle.model, type: 'RDV atelier', clientId, woId: w.id, notes: '' });
        save(); toast(w.ref + ' créé'); go('#/or/' + w.id + (internal ? '' : '?tab=devis'));
      });
    }
  };
}

// ---------- OR detail ----------
const TABS = [['resume', 'Résumé'], ['inspection', 'Inspection'], ['heures', 'Heures'], ['pieces', 'Pièces et fluides'], ['externes', 'Travaux externes'], ['devis', 'Devis et facture'], ['sortie', 'Contrôle de sortie']];

export function orView(id) {
  const w = find('workOrders', id);
  if (!w) return { title: 'OR', html: '<div class="empty">Ordre de réparation introuvable.</div>' };
  const tab = query().get('tab') || 'resume';
  const t = woTotals(w);
  const c = w.clientId ? find('clients', w.clientId) : null;
  const sv = w.stockVehicleId ? find('vehicles', w.stockVehicleId) : null;
  const quote = w.quoteId ? find('quotes', w.quoteId) : null;
  const inv = w.invoiceId ? find('invoices', w.invoiceId) : null;
  const ins = w.inspection;
  const si = stageIndex(w.stage);

  const stagebar = '<div class="stagebar" role="group" aria-label="Étape de l\'OR">' + STAGES_OR.map((s, i) => '<button type="button" data-stage="' + s + '" class="' + (i < si ? 'done' : i === si ? 'cur' : '') + '"' + (i === si ? ' aria-current="step"' : '') + '><span></span><span>' + s + '</span></button>').join('') + '</div>';

  const kpis = '<div class="grid g4 kpis">' +
    '<div class="kpi"><span class="k">Avancement</span><span class="v">' + w.progress + ' %</span><input type="range" min="0" max="100" step="5" value="' + w.progress + '" id="prog" aria-label="Avancement des travaux" style="width:100%"></div>' +
    '<div class="kpi"><span class="k">Heures pointées</span><span class="v">' + num(t.hours) + ' h</span><span class="s">' + Object.entries(t.byTech).map(([k, h]) => esc(techName(k)) + ' ' + num(h) + ' h').join(' · ') + '</span></div>' +
    (sv ? '<div class="kpi"><span class="k">Coût interne</span><span class="v">' + money(t.cost) + '</span><span class="s">imputé à ' + esc(sv.ref) + '</span></div>' : '<div class="kpi"><span class="k">Réalisé, prix HT</span><span class="v">' + money(t.priceHT) + '</span><span class="s">main d\'œuvre, pièces, externes</span></div>') +
    (quote ? '<div class="kpi"><span class="k">Devis ' + esc(quote.status.toLowerCase()) + '</span><span class="v">' + money(docTotals(quote).ht) + '</span><span class="s">HT · ' + (docTotals(quote).ht ? Math.round(t.priceHT / docTotals(quote).ht * 100) : 0) + ' % consommé</span></div>' : '<div class="kpi"><span class="k">Restitution</span><span class="v">' + (w.promisedAt ? fdate(w.promisedAt) : 'À définir') + '</span><span class="s">' + (w.promisedAt ? rel(w.promisedAt) : '') + '</span></div>') + '</div>';

  let body = '';
  if (tab === 'resume') {
    const maxT = Math.max(1, ...Object.values(t.byTech));
    body = '<div class="grid g2"><section class="card"><h2>Travaux demandés</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + w.requested.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
      (w.notes ? '<div class="note info" style="margin-top:12px">' + esc(w.notes) + '</div>' : '') + '</section>' +
      '<section class="card"><h2>Plan de travail <button class="btn btn-ghost btn-sm" type="button" id="addJob">' + icon('plus', 16) + 'Étape</button></h2>' + (w.jobs.length ? '<div class="list">' + w.jobs.map((j, i) => '<div class="li"><button type="button" class="check-btn' + (j.done ? ' on' : '') + '" data-job="' + i + '" aria-pressed="' + j.done + '" aria-label="' + esc(j.label) + '">' + icon('check', 16) + '</button><span class="grow"><span class="t" style="white-space:normal">' + esc(j.label) + '</span></span></div>').join('') + '</div><p class="small faint" style="margin:10px 0 0">Cocher une étape met à jour l\'avancement.</p>' : '<div class="empty">Ajoutez les étapes du chantier.</div>') + '</section>' +
      '<section class="card"><h2>Répartition des heures</h2>' + (Object.keys(t.byTech).length ? '<div class="techbars">' + Object.entries(t.byTech).map(([k, h]) => '<div class="techbar"><span>' + esc(techName(k)) + '</span><span class="bar"><i style="width:' + (h / maxT * 100) + '%"></i></span><span class="mono small right">' + num(h) + ' h</span></div>').join('') + '</div>' : '<div class="empty">Aucune heure pointée.</div>') + '</section>' +
      '<section class="card"><h2>' + (c ? 'Client' : 'Véhicule de stock') + '</h2>' + (c ? '<dl class="dl"><dt>Nom</dt><dd><a href="#/client/' + c.id + '">' + esc(c.name) + '</a></dd><dt>Téléphone</dt><dd>' + esc(c.phone) + '</dd><dt>Ville</dt><dd>' + esc(c.city) + '</dd></dl><div style="margin-top:12px">' + contactButtons(c, 'Bonjour ' + c.name.split(' ')[0] + ', point d\'avancement sur votre ' + w.vehicle.make + ' ' + w.vehicle.model + ' (' + w.ref + ') : ' + w.progress + ' %.') + '</div>' : sv ? '<p style="margin:0">Préparation de <a href="#/vehicule/' + sv.id + '">' + esc(sv.ref + ' · ' + vehicleTitle(sv)) + '</a>. Coût interne actuel <b class="mono">' + money(t.cost) + '</b>, intégré au coût de revient du véhicule.</p>' : '') + '</section></div>';
  } else if (tab === 'inspection') {
    body = '<section class="card"><h2>Fiche d\'inspection du ' + fdate(w.receivedAt) + '</h2><div class="row wrap small muted" style="gap:16px;margin:-4px 0 14px"><span>Kilométrage <b class="mono">' + num(ins.mileage) + '</b></span><span>Carburant <b>' + esc(ins.fuel) + '</b></span><span>Photos <b>' + (ins.photos || 0) + '</b></span><span>Signé par <b>' + esc(ins.signedBy || 'n/d') + '</b></span></div>' +
      '<div class="insp">' + ins.checks.map((ch, i) => '<div class="insp-item"><b style="font-weight:500">' + esc(ch.zone) + '</b><div class="seg" role="group" aria-label="' + esc(ch.zone) + '">' + ['OK', 'À surveiller', 'Défaut'].map((s) => '<button type="button" class="' + STATE_CLS[s] + '" data-chk="' + i + '" data-state="' + s + '" aria-pressed="' + (ch.state === s) + '">' + s + '</button>').join('') + '</div>' + (ch.note ? '<span class="small muted">' + esc(ch.note) + '</span>' : '') + '</div>').join('') + '</div></section>' +
      '<div class="grid g2"><section class="card"><h2>Dommages et anomalies <button class="btn btn-ghost btn-sm" type="button" id="addDmg">' + icon('plus', 16) + 'Ajouter</button></h2>' + (ins.damages.length ? '<div class="list">' + ins.damages.map((d) => '<div class="li"><span class="dot red"></span><span class="grow"><span class="t">' + esc(d.zone) + '</span><span class="d" style="white-space:normal">' + esc(d.desc) + '</span></span></div>').join('') + '</div>' : '<div class="empty">Aucun dommage relevé.</div>') + '</section>' +
      '<section class="card"><h2>Historique et remarques</h2><dl class="dl"><dt>Accident signalé</dt><dd>' + esc(ins.accident || 'Aucun') + '</dd><dt>Remarques client</dt><dd>' + esc(ins.remarks || 'Aucune') + '</dd></dl></section></div>';
  } else if (tab === 'heures') {
    body = '<section class="card"><h2>Pointage <button class="btn btn-red btn-sm" type="button" id="addHours">' + icon('plus', 16) + 'Ajouter des heures</button></h2>' +
      table(w.labor.slice().reverse(), [
        { label: 'Date', render: (l) => fdate(l.date) },
        { label: 'Technicien', render: (l) => esc(techName(l.tech)) },
        { label: 'Tâche', render: (l) => esc(l.task) },
        { label: 'Heures', cls: 'right', render: (l) => '<span class="mono">' + num(l.hours) + '</span>' }
      ], { empty: 'Aucune heure pointée.' }) +
      '<div class="row-sb" style="margin-top:12px"><span class="muted">Total ' + num(t.hours) + ' h · taux ' + money(db.settings.laborRate) + ' HT</span><span class="mono">' + money(t.laborPrice) + ' HT</span></div></section>';
  } else if (tab === 'pieces') {
    body = '<section class="card"><h2>Pièces, fluides et consommables <button class="btn btn-red btn-sm" type="button" id="addPart">' + icon('plus', 16) + 'Ajouter</button></h2>' +
      table(w.parts, [
        { label: 'Article', render: (p) => esc(p.label) + (p.itemId ? ' <span class="faint small">stock</span>' : '') },
        { label: 'Type', render: (p) => chip(p.kind, p.kind === 'Pièce' ? 'blue' : p.kind === 'Fluide' ? 'amber' : 'neutral') },
        { label: 'Qté', cls: 'right', render: (p) => '<span class="mono">' + num(p.qty) + '</span>' },
        { label: 'Coût', cls: 'right', render: (p) => '<span class="mono">' + money(p.qty * p.unitCost) + '</span>' },
        { label: 'Prix HT', cls: 'right', render: (p) => '<span class="mono">' + money(p.qty * p.unitPrice) + '</span>' }
      ], { empty: 'Aucune pièce consommée.' }) +
      '<div class="row-sb" style="margin-top:12px"><span class="muted">Coût ' + money(t.partsCost) + '</span><span class="mono">' + money(t.partsPrice) + ' HT</span></div></section>';
  } else if (tab === 'externes') {
    body = '<section class="card"><h2>Travaux externes <button class="btn btn-red btn-sm" type="button" id="addExt">' + icon('plus', 16) + 'Ajouter</button></h2>' +
      table(w.external, [
        { label: 'Prestation', render: (x) => esc(x.label) },
        { label: 'Prestataire', render: (x) => esc(x.supplier) },
        { label: 'Statut', render: (x) => chip(x.status) },
        { label: 'Coût', cls: 'right', render: (x) => '<span class="mono">' + money(x.cost) + '</span>' },
        { label: 'Refacturé HT', cls: 'right', render: (x) => '<span class="mono">' + money(x.price) + '</span>' }
      ], { empty: 'Aucun travail sous-traité.' }) + '</section>';
  } else if (tab === 'devis') {
    if (sv) body = '<section class="card"><h2>Préparation interne</h2><p style="margin:0">Pas de devis ni de facture : cet OR prépare un véhicule du stock. Son coût interne (<b class="mono">' + money(t.cost) + '</b>) est intégré au coût de revient de <a href="#/vehicule/' + sv.id + '">' + esc(sv.ref) + '</a>.</p></section>';
    else body = '<div class="grid g2"><section class="card"><h2>Devis</h2>' + (quote ?
      '<div class="row-sb"><a href="#/doc/devis/' + quote.id + '" class="mono">' + esc(quote.ref) + '</a>' + chip(quote.status) + '</div><div class="row-sb" style="margin-top:8px"><span class="muted">Total TTC</span><span class="mono">' + money(docTotals(quote).ttc) + '</span></div>' +
      (quote.approvedAt ? '<p class="small muted" style="margin:8px 0 0">Approuvé le ' + fdate(quote.approvedAt) + ' par ' + esc(quote.approvedBy) + '.</p>' : '') +
      '<div class="actions" style="margin-top:14px"><a class="btn btn-ghost btn-sm" href="#/doc/devis/' + quote.id + '">' + icon('print', 16) + 'Voir et imprimer</a>' +
      (quote.status === 'Brouillon' ? '<button class="btn btn-ghost btn-sm" type="button" id="sendQ">Marquer envoyé</button>' : '') +
      (['Brouillon', 'Envoyé'].includes(quote.status) ? '<button class="btn btn-red btn-sm" type="button" id="approveQ">' + icon('check', 16) + 'Approuvé par le client</button>' : '') + '</div>'
      : '<p class="muted" style="margin:0 0 12px">Le devis reprend les travaux demandés. Ajustez les lignes avant l\'envoi.</p><button class="btn btn-red" type="button" id="mkQuote">' + icon('file', 18) + 'Générer le devis</button>') + '</section>' +
      '<section class="card"><h2>Facture</h2>' + (inv ? '<div class="row-sb"><a href="#/doc/facture/' + inv.id + '" class="mono">' + esc(inv.ref) + '</a></div><div class="row-sb" style="margin-top:8px"><span class="muted">Total TTC</span><span class="mono">' + money(docTotals(inv).ttc) + '</span></div><div class="actions" style="margin-top:14px"><a class="btn btn-ghost btn-sm" href="#/doc/facture/' + inv.id + '">' + icon('print', 16) + 'Voir, encaisser, imprimer</a></div>'
        : '<p class="muted" style="margin:0 0 12px">La facture reprend le réalisé : ' + num(t.hours) + ' h, ' + w.parts.length + ' ligne(s) de pièces, ' + w.external.length + ' prestation(s) externe(s), soit <b class="mono">' + money(t.priceHT) + ' HT</b>.</p>' +
        (stageIndex(w.stage) >= stageIndex('Contrôle sortie') ? '<button class="btn btn-red" type="button" id="mkInv">' + icon('file', 18) + 'Générer la facture</button>' : '<div class="note">Disponible après le contrôle de sortie.</div>')) + '</section></div>';
  } else if (tab === 'sortie') {
    const flagged = ins.checks.filter((ch) => ch.state !== 'OK');
    body = '<section class="card"><h2>Contrôle de sortie</h2>' + (w.exit ? '<div class="note info">Validé le ' + fdate(w.exit.date) + ' · ' + num(w.exit.mileage) + ' km · ' + esc(w.exit.notes) + '</div>' +
      (w.exit.checks && w.exit.checks.length ? '<div class="list" style="margin-top:10px">' + w.exit.checks.map((x) => '<div class="li"><span class="grow"><span class="t">' + esc(x.zone) + '</span><span class="d">Entrée : ' + esc(x.before) + '</span></span>' + chip(x.after) + '</div>').join('') + '</div>' : '')
      : '<p class="muted" style="margin:0 0 14px">Comparez l\'état de sortie avec les points relevés à l\'entrée.</p><form id="exitForm" class="stack" novalidate>' +
      (flagged.length ? flagged.map((ch, i) => '<div class="insp-item"><div class="row-sb wrap"><b style="font-weight:500">' + esc(ch.zone) + '</b><span class="small muted">Entrée : ' + esc(ch.state) + (ch.note ? ', ' + esc(ch.note) : '') + '</span></div><select class="inp" name="x' + i + '" aria-label="État de sortie ' + esc(ch.zone) + '"><option>Corrigé</option><option>Inchangé, hors devis</option><option>À surveiller</option></select></div>').join('') : '<div class="note">Aucune réserve à l\'entrée.</div>') +
      '<div class="form-grid"><div class="field half"><label for="x_km">Kilométrage de sortie</label><input id="x_km" name="km" type="number" inputmode="numeric" value="' + (ins.mileage || '') + '"></div><div class="field half"><label for="x_date">Date</label><input id="x_date" name="date" type="date" value="' + today() + '"></div>' +
      '<div class="field"><label for="x_notes">Observations et essai routier</label><textarea id="x_notes" name="notes" rows="2">Essai routier sans remarque.</textarea></div></div>' +
      '<div class="form-actions"><button class="btn btn-red" type="submit">' + icon('check', 18) + 'Valider le contrôle de sortie</button></div></form>') + '</section>';
  }

  const html =
    '<div><a class="crumb" href="#/atelier">' + icon('back', 14) + 'Atelier</a>' +
    '<div class="page-head"><div><div class="mono small muted">' + esc(w.ref) + ' · reçu le ' + fdate(w.receivedAt) + ' · ' + num(ins.mileage) + ' km</div><h1>' + esc(w.vehicle.make + ' ' + w.vehicle.model) + ', ' + esc(w.vehicle.year) + '</h1>' +
    '<div class="sub">' + esc(w.type) + ' · ' + (c ? '<a href="#/client/' + c.id + '">' + esc(c.name) + '</a>' : sv ? 'Interne, <a href="#/vehicule/' + sv.id + '">' + esc(sv.ref) + '</a>' : '') + (w.vehicle.plate ? ' · ' + esc(w.vehicle.plate) : '') + '</div></div>' +
    '<div class="actions">' + chip(w.stage) + '<button class="btn btn-ghost" type="button" id="qPart">' + icon('box', 18) + 'Pièce</button><button class="btn btn-red" type="button" id="qHours">' + icon('clock', 18) + 'Heures</button></div></div></div>' +
    stagebar + kpis +
    '<div class="tabs" role="tablist">' + TABS.map(([k, l]) => '<button class="tab" role="tab" type="button" data-tab="' + k + '" aria-selected="' + (tab === k) + '">' + l + '</button>').join('') + '</div>' + body;

  function addHours() {
    openForm('Pointer des heures', [
      { name: 'tech', label: 'Technicien', type: 'select', options: techOptions(), half: true },
      { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
      { name: 'task', label: 'Tâche réalisée', required: true },
      { name: 'hours', label: 'Heures', type: 'number', step: '0.5', required: true, value: 1 }
    ], (d) => { w.labor.push(d); if (w.stage === 'Approbation' || w.stage === 'Devis') w.stage = 'Travaux'; save(); toast(num(d.hours) + ' h pointées'); refresh(); });
  }
  function addPart() {
    const items = db.inventory.filter((i) => i.category !== 'Outillage');
    openForm('Ajouter une pièce ou un fluide', [
      { name: 'itemId', label: 'Article de l\'inventaire', type: 'select', options: [{ value: '', label: 'Article hors stock (achat dédié)' }].concat(items.map((i) => ({ value: i.id, label: i.name + ' · ' + num(i.qty) + ' ' + i.unit + ' dispo' }))) },
      { name: 'label', label: 'Libellé (si hors stock)', half: true },
      { name: 'kind', label: 'Type', type: 'select', options: ['Pièce', 'Fluide', 'Consommable'], half: true },
      { name: 'qty', label: 'Quantité', type: 'number', step: '0.5', value: 1, required: true, half: true },
      { name: 'unitCost', label: 'Coût unitaire HT (si hors stock)', type: 'number', half: true },
      { name: 'unitPrice', label: 'Prix unitaire HT (si hors stock)', type: 'number', half: true }
    ], (d) => {
      const it = d.itemId ? find('inventory', d.itemId) : null;
      if (it) { it.qty = Math.max(0, it.qty - d.qty); w.parts.push({ label: it.name, kind: it.category, qty: d.qty, unitCost: it.cost, unitPrice: it.price, itemId: it.id }); }
      else { if (!d.label) { toast('Indiquez un libellé'); return false; } w.parts.push({ label: d.label, kind: d.kind, qty: d.qty, unitCost: d.unitCost, unitPrice: d.unitPrice, itemId: '' }); }
      save(); toast(it ? 'Ajouté, stock décrémenté' : 'Pièce ajoutée'); refresh();
    });
  }

  return {
    title: w.ref, html,
    mount(root) {
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => go('#/or/' + w.id + '?tab=' + b.dataset.tab)));
      root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => { w.stage = b.dataset.stage; if (w.stage === 'Livré' && sv) { sv.status = 'Disponible'; sv.location = 'Showroom'; } save(); toast('Étape : ' + w.stage); refresh(); }));
      const pr = root.querySelector('#prog');
      pr.addEventListener('change', () => { w.progress = +pr.value; save(); refresh(); });
      root.querySelector('#qHours').addEventListener('click', addHours);
      root.querySelector('#qPart').addEventListener('click', addPart);
      const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener('click', fn); };
      on('#addHours', addHours);
      on('#addPart', addPart);
      on('#addJob', () => openForm('Nouvelle étape', [{ name: 'label', label: 'Étape', required: true }], (d) => { w.jobs.push({ label: d.label, done: false }); save(); refresh(); }));
      root.querySelectorAll('[data-job]').forEach((b) => b.addEventListener('click', () => {
        const j = w.jobs[+b.dataset.job]; j.done = !j.done;
        w.progress = Math.round(w.jobs.filter((x) => x.done).length / w.jobs.length * 100);
        save(); refresh();
      }));
      root.querySelectorAll('[data-chk]').forEach((b) => b.addEventListener('click', () => { ins.checks[+b.dataset.chk].state = b.dataset.state; save(); refresh(); }));
      on('#addDmg', () => openForm('Nouveau dommage', [{ name: 'zone', label: 'Zone', required: true }, { name: 'desc', label: 'Description', type: 'textarea', required: true }], (d) => { ins.damages.push(d); save(); refresh(); }));
      on('#addExt', () => openForm('Travail externe', [
        { name: 'label', label: 'Prestation', required: true }, { name: 'supplier', label: 'Prestataire', half: true },
        { name: 'status', label: 'Statut', type: 'select', options: ['Commandé', 'En cours', 'Terminé'], half: true },
        { name: 'cost', label: 'Coût (MAD)', type: 'number', half: true }, { name: 'price', label: 'Refacturé HT (MAD)', type: 'number', half: true }
      ], (d) => { w.external.push(d); save(); toast('Prestation ajoutée'); refresh(); }));
      on('#mkQuote', () => {
        openForm('Générer le devis', [
          { name: 'hours', label: 'Main d\'œuvre estimée (heures)', type: 'number', step: '0.5', value: Math.max(1, Math.round(t.hours)) || 4, half: true },
          { name: 'parts', label: 'Pièces et fluides estimés HT', type: 'number', value: t.partsPrice, half: true },
          { name: 'ext', label: 'Sous-traitance estimée HT', type: 'number', value: t.extPrice, half: true },
          { name: 'validDays', label: 'Validité (jours)', type: 'number', value: db.settings.quoteValidity, half: true },
          { name: 'notes', label: 'Conditions', type: 'textarea', value: 'Acompte de 30 % à l\'approbation. Toute pièce supplémentaire fera l\'objet d\'un accord préalable.' }
        ], (d) => {
          const lines = [{ label: 'Main d\'œuvre : ' + w.requested.join(' ; '), kind: 'Main d\'œuvre', qty: d.hours, unitPrice: db.settings.laborRate }];
          if (d.parts) lines.push({ label: 'Pièces, fluides et consommables', kind: 'Pièce', qty: 1, unitPrice: d.parts });
          if (d.ext) lines.push({ label: 'Travaux sous-traités', kind: 'Sous-traitance', qty: 1, unitPrice: d.ext });
          const q = { id: uid('q'), ref: nextRef('quotes', 'DV'), company: 'atelier', clientId: w.clientId, woId: w.id, date: today(), validDays: d.validDays, status: 'Brouillon', lines, notes: d.notes };
          db.quotes.unshift(q); w.quoteId = q.id; setStage(w, 'Devis'); save(); toast('Devis ' + q.ref + ' créé'); go('#/doc/devis/' + q.id);
        }, { submit: 'Créer le devis' });
      });
      on('#sendQ', () => { quote.status = 'Envoyé'; setStage(w, 'Approbation'); save(); toast('Devis marqué envoyé'); refresh(); });
      on('#approveQ', () => openForm('Approbation du client', [
        { name: 'by', label: 'Approuvé par', value: c ? c.name : '', required: true, half: true },
        { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
        { name: 'deposit', label: 'Acompte reçu (MAD)', type: 'number', value: Math.round(docTotals(quote).ttc * 0.3) }
      ], (d) => {
        quote.status = 'Approuvé'; quote.approvedAt = d.date; quote.approvedBy = d.by; quote.deposit = d.deposit;
        w.stage = 'Travaux'; save(); toast('Devis approuvé, travaux lancés'); refresh();
      }, { submit: 'Valider l\'approbation' }));
      on('#mkInv', () => {
        const lines = [];
        const tbt = t.byTech;
        if (t.hours) lines.push({ label: 'Main d\'œuvre (' + Object.entries(tbt).map(([k, h]) => techName(k) + ' ' + num(h) + ' h').join(', ') + ')', kind: 'Main d\'œuvre', qty: t.hours, unitPrice: db.settings.laborRate });
        w.parts.forEach((p) => lines.push({ label: p.label, kind: p.kind, qty: p.qty, unitPrice: p.unitPrice }));
        w.external.forEach((x) => lines.push({ label: x.label, kind: 'Sous-traitance', qty: 1, unitPrice: +x.price || 0 }));
        const payments = quote && quote.deposit ? [{ date: quote.approvedAt || today(), amount: quote.deposit, mode: 'Virement' }] : [];
        const f = { id: uid('f'), ref: nextRef('invoices', 'FA'), company: 'atelier', clientId: w.clientId, woId: w.id, orderId: '', date: today(), lines, payments, notes: 'Garantie main d\'œuvre : 6 mois ou 10 000 km.' };
        db.invoices.unshift(f); w.invoiceId = f.id; w.stage = 'Facturé'; save(); toast('Facture ' + f.ref + ' générée'); go('#/doc/facture/' + f.id);
      });
      const ef = root.querySelector('#exitForm');
      if (ef) ef.addEventListener('submit', (e) => {
        e.preventDefault();
        const flagged = ins.checks.filter((ch) => ch.state !== 'OK');
        w.exit = { date: ef.elements.date.value, mileage: +ef.elements.km.value, notes: ef.elements.notes.value, checks: flagged.map((ch, i) => ({ zone: ch.zone, before: ch.state + (ch.note ? ', ' + ch.note : ''), after: ef.elements['x' + i].value })) };
        w.progress = 100;
        if (sv) { w.stage = 'Livré'; sv.status = 'Disponible'; sv.location = 'Showroom'; toast('Véhicule prêt à la vente'); }
        else { setStage(w, 'Contrôle sortie'); toast('Contrôle validé, facture disponible'); }
        save(); go('#/or/' + w.id + '?tab=' + (sv ? 'resume' : 'devis'));
      });
    }
  };
}
