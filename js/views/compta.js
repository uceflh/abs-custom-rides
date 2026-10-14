import { db, save, uid, today, clientName, docTotals } from '../store.js';
import { esc, money, fdate, chip, icon, table, openForm, toast } from '../ui.js';
import { go, refresh, query, scope } from '../nav.js';

const CATS = ['Achat véhicule', 'Pièces', 'Sous-traitance', 'Loyer', 'Salaires', 'Énergie', 'Marketing', 'Transport', 'Assurance', 'Frais bancaires', 'Autre'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function entries(co) {
  const rows = [];
  const want = (c) => co === 'all' || c === co;
  if (want('atelier')) db.invoices.filter((f) => f.company === 'atelier').forEach((f) => (f.payments || []).forEach((p) => rows.push({ date: p.date, type: 'Recette', company: 'atelier', label: 'Règlement ' + f.ref + ', ' + clientName(f.clientId), ttc: +p.amount, tva: docTotals(f).ttc ? +p.amount * docTotals(f).tva / docTotals(f).ttc : 0, mode: p.mode })));
  if (want('showroom')) {
    db.orders.forEach((o) => o.payments.forEach((p) => rows.push({ date: p.date, type: 'Recette', company: 'showroom', label: 'Vente ' + o.ref + ', ' + clientName(o.clientId), ttc: +p.amount, tva: 0, mode: p.mode })));
    db.invoices.filter((f) => f.company === 'showroom' && !f.orderId).forEach((f) => (f.payments || []).forEach((p) => rows.push({ date: p.date, type: 'Recette', company: 'showroom', label: 'Règlement ' + f.ref, ttc: +p.amount, tva: 0, mode: p.mode })));
  }
  db.expenses.filter((e) => want(e.company)).forEach((e) => rows.push({ date: e.date, type: 'Dépense', company: e.company, label: e.label, cat: e.category, ttc: e.ht * (1 + e.tva / 100), tva: e.ht * e.tva / 100, supplier: e.supplier }));
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function compta() {
  const q = query();
  const co = q.get('co') || (scope() === 'all' ? 'all' : scope());
  const rows = entries(co);
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.toISOString().slice(0, 7), label: MONTHS[d.getMonth()] }); }
  const from = months[0].key + '-01';
  const inPeriod = rows.filter((r) => r.date >= from && r.date <= today());
  months.forEach((m) => {
    m.rec = inPeriod.filter((r) => r.type === 'Recette' && r.date.startsWith(m.key)).reduce((a, r) => a + r.ttc, 0);
    m.dep = inPeriod.filter((r) => r.type === 'Dépense' && r.date.startsWith(m.key)).reduce((a, r) => a + r.ttc, 0);
  });
  const rec = months.reduce((a, m) => a + m.rec, 0);
  const dep = months.reduce((a, m) => a + m.dep, 0);
  const curKey = months[5].key;
  const tvaCol = rows.filter((r) => r.type === 'Recette' && r.date.startsWith(curKey)).reduce((a, r) => a + r.tva, 0) +
    (co !== 'atelier' ? db.invoices.filter((f) => f.company === 'showroom' && f.date.startsWith(curKey)).reduce((a, f) => a + docTotals(f).tva, 0) : 0);
  const tvaDed = rows.filter((r) => r.type === 'Dépense' && r.date.startsWith(curKey)).reduce((a, r) => a + r.tva, 0);
  const max = Math.max(1, ...months.map((m) => Math.max(m.rec, m.dep)));

  // grouped bars, values labelled so the chart reads without a legend lookup
  const W = 720, H = 240, pad = 30, gw = (W - pad * 2) / months.length, bw = Math.min(30, gw / 3);
  const k = (v) => Math.round(v / 1000);
  const svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 34) + '" role="img" aria-label="Recettes et dépenses par mois, 6 derniers mois" style="width:100%;height:auto">' +
    [0.25, 0.5, 0.75, 1].map((f) => '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - (H - 20) * f) + '" y2="' + (H - (H - 20) * f) + '" stroke="#C6B18A" stroke-width="1"/>').join('') +
    months.map((m, i) => {
      const x = pad + i * gw + gw / 2;
      const hr = (H - 20) * m.rec / max, hd = (H - 20) * m.dep / max;
      return '<rect x="' + (x - bw - 2) + '" y="' + (H - hr) + '" width="' + bw + '" height="' + hr + '" rx="4" fill="#2E5B57" stroke="#221D18" stroke-width="1.5"/>' +
        '<rect x="' + (x + 2) + '" y="' + (H - hd) + '" width="' + bw + '" height="' + hd + '" rx="4" fill="#C8932E" stroke="#221D18" stroke-width="1.5"/>' +
        '<text x="' + (x - bw / 2 - 2) + '" y="' + (H - hr - 6) + '" fill="#2E5B57" font-size="11" font-weight="700" text-anchor="middle" font-family="Courier Prime, monospace">' + k(m.rec) + 'k</text>' +
        '<text x="' + (x + bw / 2 + 2) + '" y="' + (H - hd - 6) + '" fill="#845A12" font-size="11" font-weight="700" text-anchor="middle" font-family="Courier Prime, monospace">' + k(m.dep) + 'k</text>' +
        '<text x="' + x + '" y="' + (H + 22) + '" fill="#4B4137" font-size="12" text-anchor="middle" font-family="Oswald, sans-serif" letter-spacing="1">' + m.label + '</text>';
    }).join('') + '</svg>';

  const html =
    '<div class="page-head"><div><h1>Comptabilité</h1><div class="sub">Trésorerie encaissée et dépenses TTC, par société. Base de travail pour l\'expert-comptable.</div></div>' +
    '<div class="actions"><button class="btn btn-ghost" type="button" id="csv">' + icon('file', 18) + 'Export CSV</button><button class="btn btn-red" type="button" id="addExp">' + icon('plus', 18) + 'Dépense</button></div></div>' +
    '<div class="filters" role="group" aria-label="Société">' + [['all', 'Consolidé'], ['showroom', 'Showroom'], ['atelier', 'Atelier']].map(([kk, l]) => '<button class="fchip" type="button" data-co="' + kk + '" aria-pressed="' + (co === kk) + '">' + l + '</button>').join('') + '</div>' +
    '<div class="grid g4 kpis">' +
    '<div class="kpi"><span class="k">Encaissé, 6 mois</span><span class="v">' + money(rec) + '</span><span class="s">TTC</span></div>' +
    '<div class="kpi"><span class="k">Dépenses, 6 mois</span><span class="v">' + money(dep) + '</span><span class="s">TTC, achats véhicules inclus</span></div>' +
    '<div class="kpi"><span class="k">Solde de trésorerie</span><span class="v ' + (rec - dep >= 0 ? 'margin-pos' : 'margin-neg') + '">' + money(rec - dep) + '</span><span class="s">sur la période</span></div>' +
    '<div class="kpi"><span class="k">TVA du mois</span><span class="v">' + money(tvaCol - tvaDed) + '</span><span class="s">collectée ' + money(tvaCol) + ' · déductible ' + money(tvaDed) + '</span></div></div>' +
    '<section class="card"><h2>Recettes et dépenses par mois <span class="row small muted" style="gap:14px;font-weight:400"><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:#2E5B57;border:1px solid #221D18;display:inline-block"></i>Recettes</span><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:#C8932E;border:1px solid #221D18;display:inline-block"></i>Dépenses</span></span></h2>' + svg + '</section>' +
    '<section class="card"><h2>Écritures récentes</h2>' + table(rows.slice(0, 40), [
      { label: 'Date', render: (r) => fdate(r.date) },
      { label: 'Type', render: (r) => chip(r.type, r.type === 'Recette' ? 'green' : 'red') },
      { label: 'Société', render: (r) => r.company === 'atelier' ? 'Atelier' : 'Showroom' },
      { label: 'Libellé', render: (r) => esc(r.label) + (r.cat ? ' <span class="faint small">' + esc(r.cat) + '</span>' : '') },
      { label: 'TVA', cls: 'right', render: (r) => '<span class="mono">' + money(r.tva) + '</span>' },
      { label: 'Montant TTC', cls: 'right', render: (r) => '<span class="mono ' + (r.type === 'Recette' ? 'margin-pos' : '') + '">' + (r.type === 'Recette' ? '+' : '-') + money(r.ttc) + '</span>' }
    ]) + '<p class="small faint" style="margin:12px 0 0">Ventes de véhicules d\'occasion au régime de la marge : TVA calculée sur la marge, à valider avec l\'expert-comptable.</p></section>';

  return {
    title: 'Comptabilité', html,
    mount(root) {
      root.querySelectorAll('[data-co]').forEach((b) => b.addEventListener('click', () => go('#/compta?co=' + b.dataset.co)));
      root.querySelector('#addExp').addEventListener('click', () => openForm('Nouvelle dépense', [
        { name: 'company', label: 'Société', type: 'select', options: [{ value: 'showroom', label: 'Showroom' }, { value: 'atelier', label: 'Atelier' }], value: co === 'all' ? 'atelier' : co, half: true },
        { name: 'date', label: 'Date', type: 'date', value: today(), half: true },
        { name: 'category', label: 'Catégorie', type: 'select', options: CATS, half: true },
        { name: 'supplier', label: 'Fournisseur', half: true },
        { name: 'label', label: 'Libellé', required: true },
        { name: 'ht', label: 'Montant HT (MAD)', type: 'number', required: true, half: true },
        { name: 'tva', label: 'Taux de TVA', type: 'select', options: [{ value: 20, label: '20 %' }, { value: 14, label: '14 %' }, { value: 10, label: '10 %' }, { value: 7, label: '7 %' }, { value: 0, label: 'Exonéré' }], value: 20, half: true }
      ], (d) => { db.expenses.push({ id: uid('e'), ...d, tva: +d.tva }); save(); toast('Dépense enregistrée'); refresh(); }));
      root.querySelector('#csv').addEventListener('click', () => {
        const lines = [['Date', 'Type', 'Société', 'Libellé', 'TVA', 'Montant TTC']].concat(rows.map((r) => [r.date, r.type, r.company, r.label, r.tva.toFixed(2), r.ttc.toFixed(2)]));
        const csv = lines.map((l) => l.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
        a.download = 'compta-' + co + '-' + today() + '.csv';
        a.click();
        toast('Export CSV téléchargé');
      });
    }
  };
}
