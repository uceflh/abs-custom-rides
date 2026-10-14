import { db, save, find, uid, today } from '../store.js';
import { esc, money, num, fdate, chip, icon, table, openForm, toast } from '../ui.js';
import { go, refresh, query } from '../nav.js';

const TABS = [['Pièce', 'Pièces'], ['Fluide', 'Fluides'], ['Consommable', 'Consommables'], ['Outillage', 'Outillage'], ['alertes', 'Alertes']];

function itemForm(it) {
  const isNew = !it;
  it = it || {};
  openForm(isNew ? 'Nouvel article' : 'Modifier ' + it.name, [
    { name: 'category', label: 'Catégorie', type: 'select', options: ['Pièce', 'Fluide', 'Consommable', 'Outillage'], value: it.category, half: true },
    { name: 'sku', label: 'Référence interne', value: it.sku, half: true },
    { name: 'name', label: 'Désignation', required: true, value: it.name },
    { name: 'compat', label: 'Compatibilité (modèles)', value: it.compat, half: true },
    { name: 'location', label: 'Emplacement', value: it.location, half: true },
    { name: 'qty', label: 'Quantité', type: 'number', step: '0.5', value: it.qty ?? 1, half: true },
    { name: 'unit', label: 'Unité', type: 'select', options: ['u', 'L', 'kg', 'boîte', 'paquet', 'bobine'], value: it.unit, half: true },
    { name: 'min', label: 'Seuil d\'alerte', type: 'number', value: it.min ?? 1, half: true },
    { name: 'supplier', label: 'Fournisseur', value: it.supplier, half: true },
    { name: 'cost', label: 'Coût unitaire HT', type: 'number', value: it.cost, half: true },
    { name: 'price', label: 'Prix de vente HT', type: 'number', value: it.price, half: true }
  ], (d) => {
    if (isNew) { db.inventory.push(Object.assign({ id: uid('i'), state: 'Disponible', holder: '', lastCheck: today() }, d)); toast('Article ajouté'); }
    else { Object.assign(it, d); toast('Article mis à jour'); }
    save(); refresh();
  });
}

export function inventory() {
  const tab = query().get('t') || 'Pièce';
  const items = db.inventory;
  const low = items.filter((i) => i.category !== 'Outillage' && i.qty <= i.min);
  const value = items.filter((i) => i.category !== 'Outillage').reduce((a, i) => a + i.qty * i.cost, 0);
  const tools = items.filter((i) => i.category === 'Outillage');
  let content;
  if (tab === 'Outillage') {
    content = table(tools, [
      { label: 'Outil', render: (i) => '<b>' + esc(i.name) + '</b> <span class="mono faint small">' + esc(i.sku) + '</span>' },
      { label: 'Emplacement', render: (i) => esc(i.location) },
      { label: 'État', render: (i) => chip(i.state) },
      { label: 'Utilisé par', render: (i) => esc(i.holder || '') },
      { label: 'Dernier contrôle', render: (i) => fdate(i.lastCheck) },
      { label: 'Changer', render: (i) => '<select class="inp" style="min-height:34px;padding:4px 8px;width:auto" data-tool="' + i.id + '" aria-label="État de ' + esc(i.name) + '">' + ['Disponible', 'En utilisation', 'En maintenance'].map((s) => '<option' + (s === i.state ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>' }
    ]);
  } else {
    const list = tab === 'alertes' ? low : items.filter((i) => i.category === tab);
    content = table(list, [
      { label: 'Article', render: (i) => '<b>' + esc(i.name) + '</b><br><span class="mono faint small">' + esc(i.sku) + '</span>' },
      { label: 'Compatibilité', render: (i) => esc(i.compat || '') },
      { label: 'Emplacement', render: (i) => esc(i.location) },
      { label: 'Stock', cls: 'right', render: (i) => '<span class="row" style="justify-content:flex-end;gap:6px"><button class="icon-btn" style="width:32px;height:32px" type="button" data-dec="' + i.id + '" aria-label="Retirer une unité">' + icon('minus', 14) + '</button><span class="mono ' + (i.qty <= i.min ? 'margin-neg' : '') + '" style="min-width:56px;text-align:center">' + num(i.qty) + ' ' + esc(i.unit) + '</span><button class="icon-btn" style="width:32px;height:32px" type="button" data-inc="' + i.id + '" aria-label="Ajouter une unité">' + icon('plus', 14) + '</button></span>' },
      { label: 'Seuil', cls: 'right', render: (i) => '<span class="mono">' + num(i.min) + '</span>' },
      { label: 'Coût HT', cls: 'right', render: (i) => '<span class="mono">' + money(i.cost) + '</span>' },
      { label: 'Valeur', cls: 'right', render: (i) => '<span class="mono">' + money(i.qty * i.cost) + '</span>' },
      { label: '', render: (i) => '<button class="btn btn-ghost btn-sm" type="button" data-edit="' + i.id + '">Modifier</button>' }
    ], { empty: tab === 'alertes' ? 'Aucun article sous le seuil.' : 'Aucun article.' });
  }
  const html =
    '<div class="page-head"><div><h1>Inventaire atelier</h1><div class="sub">Pièces, fluides, consommables et outillage. Les pièces utilisées sur un OR sont déduites automatiquement.</div></div>' +
    '<div class="actions"><button class="btn btn-red" type="button" id="newI">' + icon('plus', 18) + 'Article</button></div></div>' +
    '<div class="grid g4 kpis"><div class="kpi"><span class="k">Valeur du stock</span><span class="v">' + money(value) + '</span><span class="s">au coût d\'achat HT</span></div>' +
    '<div class="kpi"><span class="k">Références</span><span class="v">' + items.filter((i) => i.category !== 'Outillage').length + '</span><span class="s">pièces, fluides, consommables</span></div>' +
    '<a class="kpi" href="#/inventaire?t=alertes"><span class="k">Sous le seuil</span><span class="v ' + (low.length ? 'margin-neg' : '') + '">' + low.length + '</span><span class="s">à commander</span></a>' +
    '<a class="kpi" href="#/inventaire?t=Outillage"><span class="k">Outillage</span><span class="v">' + tools.length + '</span><span class="s">' + tools.filter((t) => t.state === 'En maintenance').length + ' en maintenance</span></a></div>' +
    '<div class="tabs" role="tablist">' + TABS.map(([k, l]) => '<button class="tab" type="button" role="tab" data-t="' + k + '" aria-selected="' + (tab === k) + '">' + l + (k === 'alertes' && low.length ? ' (' + low.length + ')' : '') + '</button>').join('') + '</div>' +
    '<section class="card">' + content + '</section>';
  return {
    title: 'Inventaire', html,
    mount(root) {
      root.querySelector('#newI').addEventListener('click', () => itemForm());
      root.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => go('#/inventaire?t=' + b.dataset.t)));
      root.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { find('inventory', b.dataset.inc).qty += 1; save(); refresh(); }));
      root.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { const i = find('inventory', b.dataset.dec); i.qty = Math.max(0, i.qty - 1); save(); refresh(); }));
      root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => itemForm(find('inventory', b.dataset.edit))));
      root.querySelectorAll('[data-tool]').forEach((s) => s.addEventListener('change', () => { const i = find('inventory', s.dataset.tool); i.state = s.value; i.holder = s.value === 'En utilisation' ? (i.holder || 'Atelier') : ''; save(); toast('État mis à jour'); refresh(); }));
    }
  };
}
