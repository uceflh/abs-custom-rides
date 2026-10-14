import { db, save, clientName, vehicleTitle, vehicleCost, woTotals, today, invoiceStatus, docTotals, paidAmount } from '../store.js';
import { esc, money, num, fdate, ftime, rel, daysFrom, chip, icon, progressBar } from '../ui.js';
import { scope, refresh } from '../nav.js';
import { STAGES_LEAD } from '../data.js';

export function dueItems() {
  const t = today();
  const leads = db.leads.filter((l) => !['Gagné', 'Perdu'].includes(l.stage) && l.next && l.next.date && l.next.date <= t)
    .map((l) => ({ kind: 'lead', id: l.id, date: l.next.date, label: l.next.label, who: clientName(l.clientId), sub: l.title, tier: l.tier }));
  const tasks = db.tasks.filter((k) => !k.done && k.date <= t)
    .map((k) => ({ kind: 'task', id: k.id, date: k.date, label: k.label, who: clientName(k.clientId), sub: k.kind }));
  return leads.concat(tasks).sort((a, b) => a.date.localeCompare(b.date));
}

export function dueList(items) {
  if (!items.length) return '<div class="empty">Rien d\'urgent. Toutes les relances sont à jour.</div>';
  return '<div class="list">' + items.map((it) => {
    const late = daysFrom(it.date) < 0;
    const left = it.kind === 'task'
      ? '<button type="button" class="check-btn" data-done-task="' + it.id + '" aria-label="Marquer comme fait : ' + esc(it.label) + '">' + icon('check', 16) + '</button>'
      : '<span class="dot ' + (late ? 'red' : 'amber') + '" aria-hidden="true"></span>';
    const body = '<span class="grow"><span class="t">' + esc(it.label) + '</span><span class="d">' + esc(it.who) + ' · ' + esc(it.sub) + '</span></span>' +
      '<span class="small ' + (late ? 'margin-neg' : 'muted') + ' nowrap">' + (late ? 'En retard, ' : '') + rel(it.date) + '</span>';
    return it.kind === 'lead'
      ? '<a class="li" href="#/lead/' + it.id + '">' + left + body + '</a>'
      : '<div class="li">' + left + body + '</div>';
  }).join('') + '</div>';
}

export function bindDue(root) {
  root.querySelectorAll('[data-done-task]').forEach((b) => b.addEventListener('click', () => {
    const k = db.tasks.find((x) => x.id === b.dataset.doneTask);
    if (k) { k.done = true; save(); refresh(); }
  }));
}

export function dashboard() {
  const sc = scope();
  const t = today();
  const showS = sc !== 'atelier';
  const showA = sc !== 'showroom';
  const due = dueItems();

  const avail = db.vehicles.filter((v) => v.status === 'Disponible');
  const prep = db.vehicles.filter((v) => v.status === 'En préparation');
  const stockValue = avail.concat(prep).reduce((a, v) => a + (+v.price || 0), 0);
  const potMargin = avail.concat(prep).reduce((a, v) => a + vehicleCost(v).margin, 0);
  const activeLeads = db.leads.filter((l) => !['Gagné', 'Perdu'].includes(l.stage));
  const hot = activeLeads.filter((l) => l.tier === 'A').length;

  const activeOR = db.workOrders.filter((w) => !['Facturé', 'Livré'].includes(w.stage));
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const wk = weekAgo.toISOString().slice(0, 10);
  const hours = db.workOrders.reduce((a, w) => a + w.labor.filter((l) => l.date >= wk).reduce((s, l) => s + (+l.hours || 0), 0), 0);
  const toInvoice = db.workOrders.filter((w) => w.stage === 'Contrôle sortie' && w.clientId);
  const lowStock = db.inventory.filter((i) => i.category !== 'Outillage' && i.qty <= i.min);
  const unpaid = db.invoices.filter((i) => invoiceStatus(i) !== 'Payée');
  const unpaidAmt = unpaid.reduce((a, i) => a + docTotals(i).ttc - paidAmount(i), 0);

  const kS = [
    ['#/stock', 'Stock à vendre', String(avail.length + prep.length), money(stockValue)],
    ['#/stock', 'Marge potentielle', money(potMargin), 'sur le stock actuel'],
    ['#/crm', 'Prospects actifs', String(activeLeads.length), hot + ' en priorité A'],
    ['#/crm', 'Relances dues', String(due.length), due.filter((d) => daysFrom(d.date) < 0).length + ' en retard']
  ];
  const kA = [
    ['#/atelier', 'OR en cours', String(activeOR.length), db.workOrders.filter((w) => w.type === 'Préparation stock' && !['Livré'].includes(w.stage)).length + ' préparations stock'],
    ['#/atelier', 'Heures, 7 jours', num(hours) + ' h', db.technicians.length + ' techniciens'],
    ['#/documents', 'À encaisser', money(unpaidAmt), unpaid.length + ' facture(s) ouverte(s)'],
    ['#/inventaire', 'Pièces sous le seuil', String(lowStock.length), lowStock.length ? 'à commander' : 'stock correct']
  ];
  const kpis = (showS ? kS : []).concat(showA ? kA : []);

  const orList = activeOR.sort((a, b) => (a.promisedAt || '').localeCompare(b.promisedAt || '')).map((w) => {
    const late = daysFrom(w.promisedAt) < 0;
    return '<a class="li" href="#/or/' + w.id + '"><span class="grow"><span class="t">' + esc(w.vehicle.make + ' ' + w.vehicle.model) + ' <span class="faint mono small">' + esc(w.ref) + '</span></span>' +
      '<span class="d">' + esc(w.clientId ? clientName(w.clientId) : 'Interne, ' + w.type.toLowerCase()) + ' · promis ' + rel(w.promisedAt) + (late ? ' (dépassé)' : '') + '</span>' +
      '<span style="display:block;margin-top:6px">' + progressBar(w.progress, 'Avancement ' + w.ref) + '</span></span>' + chip(w.stage) + '</a>';
  }).join('');

  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const lim = in7.toISOString().slice(0, 10);
  const agenda = db.events.filter((e) => e.start.slice(0, 10) >= t && e.start.slice(0, 10) <= lim).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 7);
  const agendaHtml = agenda.length ? '<div class="list">' + agenda.map((e) => '<a class="li" href="#/calendrier"><span class="mono small muted nowrap" style="width:86px">' + (daysFrom(e.start) === 0 ? "Auj." : fdate(e.start).slice(0, 5)) + ' ' + ftime(e.start) + '</span><span class="grow"><span class="t">' + esc(e.title) + '</span><span class="d">' + esc(e.type) + (e.clientId ? ' · ' + esc(clientName(e.clientId)) : '') + '</span></span></a>').join('') + '</div>' : '<div class="empty">Aucun rendez-vous cette semaine.</div>';

  const prepHtml = prep.length ? '<div class="list">' + prep.map((v) => {
    const c = vehicleCost(v);
    return '<a class="li" href="#/vehicule/' + v.id + '"><span class="grow"><span class="t">' + esc(vehicleTitle(v)) + '</span><span class="d">Atelier ' + money(c.atelier) + ' · coût de revient ' + money(c.total) + '</span></span><span class="mono small ' + (c.margin >= 0 ? 'margin-pos' : 'margin-neg') + ' nowrap">' + money(c.margin) + '</span></a>';
  }).join('') + '</div>' : '<div class="empty">Aucune préparation en cours.</div>';

  const pipe = STAGES_LEAD.filter((s) => s !== 'Perdu').map((s) => [s, db.leads.filter((l) => l.stage === s).length]);
  const maxP = Math.max(1, ...pipe.map((p) => p[1]));
  const pipeHtml = '<div class="techbars">' + pipe.map(([s, n]) => '<div class="techbar"><span class="small">' + s + '</span><span class="bar"><i style="width:' + (n / maxP * 100) + '%"></i></span><span class="mono small right">' + n + '</span></div>').join('') + '</div>';

  const lowHtml = lowStock.length ? '<div class="list">' + lowStock.slice(0, 6).map((i) => '<a class="li" href="#/inventaire"><span class="dot ' + (i.qty <= 0 ? 'red' : 'amber') + '"></span><span class="grow"><span class="t">' + esc(i.name) + '</span><span class="d">' + esc(i.location) + ' · seuil ' + i.min + ' ' + esc(i.unit) + '</span></span><span class="mono small">' + num(i.qty) + ' ' + esc(i.unit) + '</span></a>').join('') + '</div>' : '<div class="empty">Tous les articles sont au-dessus du seuil.</div>';

  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  const dateTxt = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const html =
    '<div class="page-head"><div><h1>' + hello + '.</h1><div class="sub">' + esc(dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1)) + ' · ' + (sc === 'all' ? 'Showroom et atelier' : sc === 'showroom' ? 'Showroom' : 'Atelier') + '</div></div>' +
    '<div class="actions"><a class="btn btn-red" href="#/reception">' + icon('clipboard', 18) + 'Réceptionner un véhicule</a><a class="btn btn-ghost" href="#/crm?new">' + icon('plus', 18) + 'Prospect</a></div></div>' +
    '<div class="grid g4 kpis">' + kpis.map(([h, k, v, s]) => '<a class="kpi" href="' + h + '"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span><span class="s">' + esc(s) + '</span></a>').join('') + '</div>' +
    '<div class="grid g2">' +
    (showS || true ? '<section class="card"><h2>Relances et tâches du jour <a href="#/crm">CRM</a></h2>' + dueList(due) + '</section>' : '') +
    (showA ? '<section class="card"><h2>Atelier en cours <a href="#/atelier">Tous les OR</a></h2>' + (orList ? '<div class="list">' + orList + '</div>' : '<div class="empty">Aucun OR en cours.</div>') + '</section>' : '<section class="card"><h2>Pipeline commercial <a href="#/crm">Voir</a></h2>' + pipeHtml + '</section>') +
    '<section class="card"><h2>Agenda, 7 prochains jours <a href="#/calendrier">Calendrier</a></h2>' + agendaHtml + '</section>' +
    (showS ? '<section class="card"><h2>Préparations stock à l\'atelier <a href="#/stock">Stock</a></h2><p class="small muted" style="margin:-6px 0 10px">Les heures, pièces et travaux externes de l\'atelier entrent dans le coût de revient.</p>' + prepHtml + '</section>' : '') +
    (showA ? '<section class="card"><h2>Alertes inventaire <a href="#/inventaire">Inventaire</a></h2>' + lowHtml + '</section>' : '') +
    (showS && showA ? '<section class="card"><h2>Pipeline commercial <a href="#/crm">Voir</a></h2>' + pipeHtml + '</section>' : '') +
    '</div>';

  return { title: 'Tableau de bord', html, mount: bindDue };
}
