import { db, save, find, uid, today, clientName, vehicleTitle, docTotals, paidAmount, invoiceStatus } from '../store.js';
import { esc, money, num, fdate, chip, icon, table, openForm, toast, waLink } from '../ui.js';
import { go, refresh, query } from '../nav.js';

export function documents() {
  const q = query();
  const kind = q.get('k') || 'devis';
  const co = q.get('co') || '';
  const list = (kind === 'devis' ? db.quotes : db.invoices).filter((d) => !co || d.company === co).slice().sort((a, b) => b.date.localeCompare(a.date));
  const html =
    '<div class="page-head"><div><h1>Devis et factures</h1><div class="sub">Un devis naît de l\'ordre de réparation, la facture reprend le réalisé. Les factures de vente véhicule viennent des commandes.</div></div></div>' +
    '<div class="tabs" role="tablist">' + [['devis', 'Devis (' + db.quotes.length + ')'], ['facture', 'Factures (' + db.invoices.length + ')']].map(([k, l]) => '<button class="tab" type="button" role="tab" data-k="' + k + '" aria-selected="' + (kind === k) + '">' + l + '</button>').join('') + '</div>' +
    '<div class="filters" role="group" aria-label="Société">' + [['', 'Les deux sociétés'], ['atelier', 'Atelier'], ['showroom', 'Showroom']].map(([k, l]) => '<button class="fchip" type="button" data-co="' + k + '" aria-pressed="' + (co === k) + '">' + l + '</button>').join('') + '</div>' +
    '<section class="card">' + table(list, [
      { label: 'Référence', render: (d) => '<span class="mono">' + esc(d.ref) + '</span>' },
      { label: 'Client', render: (d) => esc(clientName(d.clientId)) },
      { label: 'Société', render: (d) => d.company === 'atelier' ? 'Atelier' : 'Showroom' },
      { label: 'Date', render: (d) => fdate(d.date) },
      { label: 'Total TTC', cls: 'right', render: (d) => '<span class="mono">' + money(docTotals(d).ttc) + '</span>' },
      { label: 'Statut', render: (d) => chip(kind === 'devis' ? d.status : invoiceStatus(d)) }
    ], { rowHref: (d) => '#/doc/' + kind + '/' + d.id, empty: 'Aucun document.' }) + '</section>';
  return {
    title: 'Devis et factures', html,
    mount(root) {
      root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => go('#/documents?k=' + b.dataset.k + (co ? '&co=' + co : ''))));
      root.querySelectorAll('[data-co]').forEach((b) => b.addEventListener('click', () => go('#/documents?k=' + kind + (b.dataset.co ? '&co=' + b.dataset.co : ''))));
    }
  };
}

export function docView(kind, id) {
  const isQ = kind === 'devis';
  const d = find(isQ ? 'quotes' : 'invoices', id);
  if (!d) return { title: 'Document', html: '<div class="empty">Document introuvable.</div>' };
  const co = db.settings.companies[d.company];
  const c = find('clients', d.clientId) || {};
  const w = d.woId ? find('workOrders', d.woId) : null;
  const o = d.orderId ? find('orders', d.orderId) : null;
  const v = o ? find('vehicles', o.vehicleId) : null;
  const tt = docTotals(d);
  const paid = isQ ? 0 : paidAmount(d);
  const st = isQ ? d.status : invoiceStatus(d);
  const until = new Date(d.date + 'T12:00:00'); until.setDate(until.getDate() + (d.validDays || 30));

  const doc =
    '<article class="doc" aria-label="' + (isQ ? 'Devis ' : 'Facture ') + esc(d.ref) + '">' +
    '<div class="doc-top"><div class="co"><b>' + esc(co.name) + '</b><br>' + esc(co.activity) + '<br>' + esc(co.address) + '<br>' + esc(co.phone) + ' · ' + esc(co.email) + '</div>' +
    '<div style="text-align:right"><h1>' + (isQ ? 'DEVIS' : 'FACTURE') + '</h1><div class="mono">' + esc(d.ref) + '</div><div>Date : ' + fdate(d.date) + '</div>' + (isQ ? '<div>Valable jusqu\'au ' + fdate(until.toISOString()) + '</div>' : '') + '</div></div>' +
    '<div class="doc-top"><div>' + (w ? '<b>Véhicule</b><br>' + esc(w.vehicle.make + ' ' + w.vehicle.model + ', ' + w.vehicle.year) + '<br>Immatriculation : ' + esc(w.vehicle.plate || 'n/d') + '<br>Châssis : ' + esc(w.vehicle.vin || 'n/d') + '<br>Kilométrage : ' + num(w.inspection.mileage) + ' km<br>OR : ' + esc(w.ref) : v ? '<b>Véhicule</b><br>' + esc(vehicleTitle(v)) + '<br>Châssis : ' + esc(v.vin || 'n/d') + '<br>Kilométrage : ' + num(v.mileage) + ' ' + esc(v.unit) + '<br>Commande : ' + esc(o.ref) : '') + '</div>' +
    '<div class="to"><b>' + esc(c.name || '') + '</b><br>' + esc(c.city || '') + (c.country ? ', ' + esc(c.country) : '') + '<br>' + esc(c.phone || '') + '<br>' + esc(c.email || '') + (c.type === 'Professionnel' ? '<br>ICE client : [ICE CLIENT]' : '') + '</div></div>' +
    '<table><thead><tr><th>Désignation</th><th>Type</th><th class="r">Qté</th><th class="r">PU HT</th><th class="r">Total HT</th></tr></thead><tbody>' +
    d.lines.map((l) => '<tr><td>' + esc(l.label) + '</td><td>' + esc(l.kind) + '</td><td class="r">' + num(l.qty) + '</td><td class="r">' + money(l.unitPrice) + '</td><td class="r">' + money(l.qty * l.unitPrice) + '</td></tr>').join('') + '</tbody></table>' +
    (tt.regime === 'marge'
      ? '<div class="totals"><div><span>Prix de vente TTC</span><span>' + money(tt.ttc) + '</span></div><div><span>dont TVA sur marge</span><span>' + money(tt.tva) + '</span></div>' + (!isQ ? '<div><span>Déjà réglé</span><span>' + money(paid) + '</span></div><div class="g"><span>Reste à payer</span><span>' + money(tt.ttc - paid) + '</span></div>' : '') + '</div><p style="margin:0;font-size:11px;color:#666">Vente de véhicule d\'occasion soumise au régime de la marge. Mention et calcul à valider avec l\'expert-comptable.</p>'
      : '<div class="totals"><div><span>Total HT</span><span>' + money(tt.ht) + '</span></div><div><span>TVA ' + db.settings.tva + ' %</span><span>' + money(tt.tva) + '</span></div><div class="g"><span>Total TTC</span><span>' + money(tt.ttc) + '</span></div>' + (!isQ && paid ? '<div><span>Déjà réglé</span><span>' + money(paid) + '</span></div><div><b>Reste à payer</b><b>' + money(Math.max(0, tt.ttc - paid)) + '</b></div>' : '') + '</div>') +
    (d.notes ? '<p style="margin:0">' + esc(d.notes) + '</p>' : '') +
    (isQ ? '<div style="display:flex;justify-content:space-between;gap:24px;margin-top:8px"><div>Bon pour accord, date et signature du client :' + (d.approvedAt ? '<br><span class="stamp">APPROUVÉ LE ' + fdate(d.approvedAt) + '</span><br><small>' + esc(d.approvedBy) + '</small>' : '<div style="height:70px;border:1px dashed #BBB;border-radius:6px;margin-top:6px;width:260px"></div>') + '</div></div>'
      : (st === 'Payée' ? '<div><span class="stamp">PAYÉE</span></div>' : '') + (d.payments || []).map((p) => '<div style="font-size:12px;color:#555">Règlement du ' + fdate(p.date) + ' : ' + money(p.amount) + ' (' + esc(p.mode) + ')</div>').join('')) +
    '<div class="legal">' + esc(co.name) + ' · ' + esc(co.address) + ' · ICE ' + esc(co.ice) + ' · IF ' + esc(co.if) + ' · RC ' + esc(co.rc) + ' · Patente ' + esc(co.tp) + '<br>Document généré par Garage OS, démonstration. Mentions légales à faire valider par l\'expert-comptable.</div></article>';

  const msg = 'Bonjour ' + (c.name || '') + ', voici ' + (isQ ? 'le devis ' : 'la facture ') + d.ref + ' d\'un montant de ' + money(tt.ttc) + ' TTC.';
  const html =
    '<div class="no-print"><a class="crumb" href="' + (w ? '#/or/' + w.id + '?tab=devis' : o ? '#/commande/' + o.id : '#/documents') + '">' + icon('back', 14) + (w ? w.ref : o ? o.ref : 'Documents') + '</a>' +
    '<div class="page-head"><div><h1>' + (isQ ? 'Devis ' : 'Facture ') + esc(d.ref) + '</h1><div class="sub">' + esc(c.name || '') + ' · ' + money(tt.ttc) + ' TTC</div></div>' +
    '<div class="actions">' + chip(st) + '<button class="btn btn-ghost" type="button" id="print">' + icon('print', 18) + 'Imprimer ou PDF</button>' +
    (c.phone ? '<a class="btn btn-ghost" target="_blank" rel="noopener" href="' + esc(waLink(c.phone, msg)) + '">' + icon('chat', 18) + 'WhatsApp</a>' : '') +
    (isQ && d.status === 'Brouillon' ? '<button class="btn btn-ghost" type="button" id="sent">Marquer envoyé</button>' : '') +
    (isQ && w && ['Brouillon', 'Envoyé'].includes(d.status) ? '<a class="btn btn-red" href="#/or/' + w.id + '?tab=devis">' + icon('check', 18) + 'Enregistrer l\'approbation</a>' : '') +
    (!isQ && st !== 'Payée' ? '<button class="btn btn-red" type="button" id="pay">' + icon('check', 18) + 'Encaisser</button>' : '') + '</div></div></div>' +
    '<div class="doc-wrap">' + doc + '</div>';

  return {
    title: d.ref, html,
    mount(root) {
      root.querySelector('#print').addEventListener('click', () => window.print());
      const s = root.querySelector('#sent');
      if (s) s.addEventListener('click', () => { d.status = 'Envoyé'; if (w && w.stage === 'Devis') w.stage = 'Approbation'; save(); toast('Devis marqué envoyé'); refresh(); });
      const p = root.querySelector('#pay');
      if (p) p.addEventListener('click', () => openForm('Encaissement', [
        { name: 'amount', label: 'Montant (MAD)', type: 'number', required: true, value: Math.max(0, Math.round((tt.ttc - paid) * 100) / 100), half: true },
        { name: 'mode', label: 'Mode', type: 'select', options: ['Virement', 'Chèque', 'Espèces', 'Carte'], half: true },
        { name: 'date', label: 'Date', type: 'date', value: today() }
      ], (x) => {
        d.payments = d.payments || []; d.payments.push(x);
        if (w && invoiceStatus(d) === 'Payée' && w.stage === 'Facturé') w.stage = 'Livré';
        save(); toast('Encaissement enregistré'); refresh();
      }));
    }
  };
}
