import { db, onExternalChange, clientName, vehicleTitle, today } from './store.js';
import { esc, icon, toast } from './ui.js';
import { scope, setScope } from './nav.js';
import { dashboard } from './views/dashboard.js';
import { crm, leadView, clients, clientView, sourcing } from './views/crm.js';
import { stock, vehicleView, orders, orderView } from './views/showroom.js';
import { compta } from './views/compta.js';
import { atelierBoard, orView, reception } from './views/atelier.js';
import { documents, docView } from './views/docs.js';
import { inventory } from './views/inventory.js';
import { calendar } from './views/calendar.js';
import { settingsView } from './views/settings.js';

const routes = [
  [/^\/$/, dashboard],
  [/^\/crm$/, crm], [/^\/lead\/(\w+)$/, leadView], [/^\/clients$/, clients], [/^\/client\/(\w+)$/, clientView], [/^\/sourcing$/, sourcing],
  [/^\/stock$/, stock], [/^\/vehicule\/(\w+)$/, vehicleView], [/^\/commandes$/, orders], [/^\/commande\/(\w+)$/, orderView],
  [/^\/compta$/, compta],
  [/^\/atelier$/, atelierBoard], [/^\/or\/(\w+)$/, orView], [/^\/reception$/, reception],
  [/^\/documents$/, documents], [/^\/doc\/(devis|facture)\/(\w+)$/, docView],
  [/^\/inventaire$/, inventory], [/^\/calendrier$/, calendar], [/^\/parametres$/, settingsView]
];

const NAV = [
  { group: 'Général', key: 'all', items: [['/', 'Tableau de bord', 'home'], ['/calendrier', 'Calendrier', 'calendar']] },
  { group: 'Showroom', key: 'showroom', items: [['/crm', 'CRM et relances', 'users', 'relances'], ['/clients', 'Clients', 'users'], ['/sourcing', 'Recherches sur mesure', 'target'], ['/stock', 'Stock véhicules', 'car'], ['/commandes', 'Commandes et livraisons', 'truck'], ['/compta', 'Comptabilité', 'chart']] },
  { group: 'Atelier', key: 'atelier', items: [['/atelier', 'Ordres de réparation', 'wrench', 'or'], ['/reception', 'Nouvelle réception', 'clipboard'], ['/documents', 'Devis et factures', 'file'], ['/inventaire', 'Inventaire', 'box', 'stock']] }
];

const side = document.getElementById('side');
const view = document.getElementById('view');
const scrim = document.getElementById('scrim');
const menuBtn = document.getElementById('menuBtn');
menuBtn.innerHTML = icon('menu');
document.getElementById('qIcon').outerHTML = icon('search', 18);

function badges() {
  const t = today();
  return {
    relances: db.leads.filter((l) => !['Gagné', 'Perdu'].includes(l.stage) && l.next && l.next.date && l.next.date <= t).length + db.tasks.filter((k) => !k.done && k.date <= t).length,
    or: db.workOrders.filter((w) => !['Facturé', 'Livré'].includes(w.stage)).length,
    stock: db.inventory.filter((i) => i.category !== 'Outillage' && i.qty <= i.min).length
  };
}

function renderSide(path) {
  const b = badges();
  const sc = scope();
  side.classList.toggle('dim', sc !== 'all');
  side.innerHTML =
    '<a class="side-brand" href="index.html" aria-label="Garage OS, ABS Custom Rides"><img class="side-logo" src="brand/logo-compact-dark.png" alt="ABS Custom Rides" width="800" height="309"><small>Garage OS</small></a>' +
    '<div class="switch" role="group" aria-label="Société">' +
    [['all', 'Tout'], ['showroom', 'Showroom'], ['atelier', 'Atelier']].map(([k, l]) => '<button type="button" data-scope="' + k + '" aria-pressed="' + (sc === k) + '">' + l + '</button>').join('') + '</div>' +
    NAV.map((g) => '<nav class="nav-group' + (sc !== 'all' && g.key !== 'all' && g.key !== sc ? ' off' : '') + '" aria-label="' + g.group + '"><h3>' + g.group + '</h3>' +
      g.items.map(([href, label, ic, badge]) => {
        const on = href === '/' ? path === '/' : path === href || path.startsWith(href + '/') || (href === '/atelier' && path.startsWith('/or/')) || (href === '/stock' && path.startsWith('/vehicule/')) || (href === '/crm' && path.startsWith('/lead/')) || (href === '/clients' && path.startsWith('/client/')) || (href === '/commandes' && path.startsWith('/commande/')) || (href === '/documents' && path.startsWith('/doc/'));
        const n = badge ? b[badge] : 0;
        return '<a class="nav-link' + (on ? ' on' : '') + '" href="#' + href + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(ic, 18) + '<span>' + label + '</span>' + (n ? '<span class="badge">' + n + '</span>' : '') + '</a>';
      }).join('') + '</nav>').join('') +
    '<div class="side-foot">' +
    '<a class="nav-link" href="boutique/">' + icon('globe', 18) + '<span>Site client</span></a>' +
    '<a class="nav-link" href="index.html">' + icon('back', 18) + '<span>Site de présentation</span></a>' +
    '<a class="nav-link' + (path === '/parametres' ? ' on' : '') + '" href="#/parametres">' + icon('settings', 18) + '<span>Paramètres</span></a></div>';
}

function renderTabbar(path) {
  const items = [['/', 'Accueil', 'home'], ['/crm', 'CRM', 'users'], ['/stock', 'Stock', 'car'], ['/atelier', 'Atelier', 'wrench'], ['/calendrier', 'Agenda', 'calendar']];
  document.getElementById('tabbar').innerHTML = items.map(([href, label, ic]) => {
    const on = href === '/' ? path === '/' : path.startsWith(href) || (href === '/atelier' && (path.startsWith('/or/') || path === '/reception')) || (href === '/stock' && path.startsWith('/vehicule/')) || (href === '/crm' && (path.startsWith('/lead/') || path.startsWith('/client')));
    return '<a href="#' + href + '" class="' + (on ? 'on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(ic, 22) + '<span>' + label + '</span></a>';
  }).join('');
}

function closeMenu() { side.classList.remove('open'); scrim.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => { const o = side.classList.toggle('open'); scrim.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); });
scrim.addEventListener('click', closeMenu);

side.addEventListener('click', (e) => {
  const s = e.target.closest('[data-scope]');
  if (s) { setScope(s.dataset.scope); render(); return; }
  if (e.target.closest('a')) closeMenu();
});

let lastPath = null;
function render() {
  const path = ((location.hash || '#/').slice(1) || '/').split('?')[0];
  let out = null;
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { out = fn(...m.slice(1)); break; }
  }
  if (!out) out = { title: 'Introuvable', html: '<div class="empty">Cette page n\'existe pas. <a href="#/">Retour au tableau de bord</a></div>' };
  renderSide(path);
  renderTabbar(path);
  const changed = path !== lastPath;
  const y = window.scrollY;
  view.innerHTML = out.html;
  if (changed) { view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter'); window.scrollTo(0, 0); }
  else window.scrollTo(0, y);
  document.title = out.title + ' · Garage OS';
  if (out.mount) out.mount(view);
  lastPath = path;
}

// clickable table rows / cards
view.addEventListener('click', (e) => {
  const call = e.target.closest('[data-demo-call]');
  if (call) { toast('Démo : appel désactivé, le numéro ' + call.dataset.demoCall + ' est fictif'); return; }
  if (e.target.closest('a, button, input, select, textarea, label')) return;
  const row = e.target.closest('[data-href]');
  if (row) location.hash = row.dataset.href;
});
view.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const row = e.target.closest('[data-href]');
  if (row && e.target === row) location.hash = row.dataset.href;
});

// global search
const q = document.getElementById('q');
const qRes = document.getElementById('qRes');
q.addEventListener('input', () => {
  const s = q.value.trim().toLowerCase();
  if (s.length < 2) { qRes.classList.remove('open'); return; }
  const hit = (txt) => String(txt || '').toLowerCase().includes(s);
  const res = [];
  db.clients.forEach((c) => { if (hit(c.name) || hit(c.phone) || hit(c.city)) res.push(['#/client/' + c.id, c.name, 'Client · ' + c.city]); });
  db.vehicles.forEach((v) => { if (hit(v.ref) || hit(vehicleTitle(v)) || hit(v.plate)) res.push(['#/vehicule/' + v.id, vehicleTitle(v), 'Stock · ' + v.ref + ' · ' + v.status]); });
  db.workOrders.forEach((w) => { if (hit(w.ref) || hit(w.vehicle.make + ' ' + w.vehicle.model) || hit(w.vehicle.plate)) res.push(['#/or/' + w.id, w.ref + ' · ' + w.vehicle.make + ' ' + w.vehicle.model, 'Atelier · ' + w.stage + (w.clientId ? ' · ' + clientName(w.clientId) : ' · interne')]); });
  db.quotes.forEach((d) => { if (hit(d.ref)) res.push(['#/doc/devis/' + d.id, d.ref, 'Devis · ' + clientName(d.clientId)]); });
  db.invoices.forEach((d) => { if (hit(d.ref)) res.push(['#/doc/facture/' + d.id, d.ref, 'Facture · ' + clientName(d.clientId)]); });
  qRes.innerHTML = res.length ? res.slice(0, 12).map(([h, t, d]) => '<a href="' + h + '"><span>' + esc(t) + '</span><span class="small muted">' + esc(d) + '</span></a>').join('') : '<div class="empty">Aucun résultat</div>';
  qRes.classList.add('open');
});
qRes.addEventListener('click', (e) => { if (e.target.closest('a')) { qRes.classList.remove('open'); q.value = ''; } });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) qRes.classList.remove('open'); });

// coming back from the customer site via the back button: reload to pick up new leads
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
window.addEventListener('hashchange', render);
window.addEventListener('app:refresh', render);
onExternalChange(render);
render();
