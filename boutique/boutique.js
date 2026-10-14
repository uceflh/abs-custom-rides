import { db, publicVehicles, soldVehicles, vehicleTitle, addInquiry, onExternalChange } from '../js/store.js';
import { VEHICLE_CATEGORIES } from '../js/data.js';
import { vehicleArt } from '../js/vehicle-art.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;
const body = document.body;
const view = document.getElementById('view');
const dock = document.getElementById('dock');
const hd = document.getElementById('hd');
const sheet = document.getElementById('sheet');
const burger = document.getElementById('burger');

// ---------- helpers ----------
const nf = new Intl.NumberFormat('fr-FR');
const num = (n) => nf.format(+n || 0).replace(/ /g, ' ');
const price = (v) => (+v.price > 0 ? num(v.price) + ' MAD' : 'Prix sur demande');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// wrap digits before escaping, otherwise the digits inside entities like &#39; get wrapped too
const dg = (x) => String(x == null ? '' : x).split(/(\d+)/).map((p, i) => (i % 2 ? '<span class="dg">' + p + '</span>' : esc(p))).join('');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function jump(y) {
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  root.style.scrollBehavior = prev;
}
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const STATUS = { 'Disponible': ['Disponible', 'ok'], 'Réservé': ['Réservé', 'res'], 'En préparation': ['Bientôt disponible', 'soon'] };
const CAT_LABEL = { 'Classique': 'Classiques', 'Voiture': 'Voitures', 'Moto': 'Motos', 'Quad / Buggy': 'Quads et buggies', 'Nautique': 'Nautique', 'Engin': 'Engins' };
const SITE = 'ABS Custom Rides';

const svg = (p, w = 18) => `<svg class="ic" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  left: svg('<path d="m15 6-6 6 6 6"/>'),
  right: svg('<path d="m9 6 6 6-6 6"/>'),
  out: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>', 16),
  chat: svg('<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.5a8.4 8.4 0 1 1 15.6-4.4Z"/>')
};

function lotNo(v) {
  const i = publicVehicles().findIndex((x) => x.id === v.id);
  return String(i + 1).padStart(2, '0');
}
function badge(v, plain = false) {
  const [label, cls] = STATUS[v.status] || [v.status, 'ok'];
  return `<span class="badge badge-${cls}${cls === 'res' && !plain ? ' stamp' : ''}">${esc(label)}</span>`;
}
const shield = (n) => `<svg class="shield" viewBox="0 0 48 52" aria-hidden="true"><use href="#shield"/><text x="24" y="38">${n}</text></svg>`;
const stampDate = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
function whatsapp() {
  const raw = db.settings && typeof db.settings.whatsapp === 'string' ? db.settings.whatsapp.trim() : '';
  return raw.replace(/\D/g, '');
}

// ---------- pieces ----------
function card(v, i = 0) {
  return `<div class="lot-wrap">` + lotLink(v, i) + `</div>`;
}
function lotLink(v, i = 0) {
  return `<a class="lot tilt reveal" href="#/vehicule/${esc(v.id)}" data-cursor="view" style="--d:${Math.min(i, 5) * 90}ms">
    <div class="lot-stage">
      <span class="lot-no mono" aria-hidden="true">N° ${lotNo(v)}</span>
      ${badge(v)}
      ${vehicleArt(v, { animate: true })}
    </div>
    <div class="lot-meta">
      <p class="lot-ref mono">Lot ${lotNo(v)} · ${esc(v.ref)}</p>
      <p class="lot-make">${esc(v.make)}</p>
      <h3 class="lot-model">${dg(v.model)}</h3>
      <p class="lot-sub">${esc(v.year)} · ${num(v.mileage)} ${esc(v.unit)} · ${esc(v.energy)}</p>
      <p class="lot-price"><span>${price(v)}</span>${I.arrow}</p>
    </div>
  </a>`;
}

function soldCard(v, i) {
  return `<div class="lot lot-sold reveal" style="--d:${i * 90}ms">
    <div class="lot-stage">${vehicleArt(v)}<span class="badge badge-sold stamp">Vendu</span></div>
    <div class="lot-meta">
      <p class="lot-make">${esc(v.make)}</p>
      <h3 class="lot-model">${dg(v.model)}</h3>
      <p class="lot-sub">${esc(v.year)} · ${esc(CAT_LABEL[v.category] || v.category)}</p>
    </div>
  </div>`;
}

function rail(items, label) {
  return `<div class="rail-wrap">
    <div class="rail" tabindex="0" role="region" aria-label="${esc(label)}">${items}</div>
    <div class="wrap rail-foot">
      <div class="rail-bar" aria-hidden="true"><i></i></div>
      <div class="rail-nav">
        <button class="rbtn" type="button" data-rail="-1" aria-label="Défiler vers la gauche">${I.left}</button>
        <button class="rbtn" type="button" data-rail="1" aria-label="Défiler vers la droite">${I.right}</button>
      </div>
    </div>
  </div>`;
}

function marquee() {
  const words = ['Classiques', 'Youngtimers', '4x4 de caractère', 'Motos', 'Quads et buggies', 'Jet skis', 'Restauration', 'Restomod', 'Recherche sur mesure'];
  const row = words.map((w) => `<span>${w}</span>`).join('');
  return `<div class="mq" aria-hidden="true"><div class="mq-track">${row}${row}</div></div>`;
}

function pageHead(eyebrow, title, lead, extra = '') {
  return `<section class="phead">
    <div class="wrap">
      <p class="eyebrow mono reveal">${eyebrow}</p>
      <h1 class="h-xl split" tabindex="-1">${title}</h1>
      ${lead ? `<p class="lead reveal" style="--d:.45s">${lead}</p>` : ''}
      ${extra}
    </div>
  </section>`;
}

const PILLARS = [
  ['Confiance', 'Chaque véhicule est inspecté, documenté et présenté tel qu\'il est. Ce que nous savons, vous le savez.'],
  ['Histoire', 'Un carnet, des factures, des propriétaires. Nous retraçons le parcours de chaque véhicule avant de le proposer.'],
  ['La chasse', 'Au Maroc, en Europe et au-delà. Certains véhicules demandent des mois de recherche. Nous prenons ce temps.'],
  ['La sélection', 'Nous écartons plus de véhicules que nous n\'en présentons. La collection reste courte, volontairement.']
];

const STEPS_SOURCING = [
  ['Le brief', 'Modèle, années, teinte, état, budget, délai. Un échange d\'une demi-heure suffit pour cadrer la recherche.'],
  ['La chasse', 'Collectionneurs, marchands, maisons de vente. Nous activons notre réseau et filtrons sans complaisance.'],
  ['L\'inspection', 'Chaque candidat est vu, photographié et vérifié. Vous recevez un rapport avant toute décision.'],
  ['Le rapatriement', 'Transport, dédouanement, homologation et carte grise. Les papiers sont notre affaire.'],
  ['Les clés', 'Remise au showroom de Tanger, ou livraison là où le véhicule doit vivre.']
];

// ---------- forms ----------
function fld(o) {
  const id = 'f-' + o.name;
  const mark = o.req ? ' <span class="req" aria-hidden="true">*</span>' : (o.opt ? ' <span class="opt">facultatif</span>' : '');
  const desc = id + '-err' + (o.hint ? ' ' + id + '-hint' : '');
  const common = `id="${id}" name="${o.name}" aria-describedby="${desc}"${o.req ? ' aria-required="true"' : ''}${o.auto ? ` autocomplete="${o.auto}"` : ''}${o.msg ? ` data-msg="${esc(o.msg)}"` : ''}`;
  let c;
  if (o.type === 'textarea') c = `<textarea ${common} rows="${o.rows || 4}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}>${esc(o.value || '')}</textarea>`;
  else if (o.type === 'select') c = `<div class="sel"><select ${common}>${o.options.map(([val, lab]) => `<option value="${esc(val)}"${String(val) === String(o.value == null ? '' : o.value) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select></div>`;
  else c = `<input ${common} type="${o.type || 'text'}"${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.min ? ` min="${o.min}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''} value="${esc(o.value || '')}">`;
  return `<div class="field${o.wide ? ' f-wide' : ''}${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${o.label}${mark}</label>${o.hint ? `<p class="hint" id="${id}-hint">${o.hint}</p>` : ''}${c}<p class="err" id="${id}-err"></p></div>`;
}

function who(withPlace = true) {
  return fld({ name: 'name', label: 'Nom et prénom', req: true, auto: 'name', wide: true }) +
    `<p class="f-note f-wide">Téléphone ou e-mail : l'un des deux suffit.</p>` +
    fld({ name: 'phone', label: 'Téléphone ou WhatsApp', type: 'tel', auto: 'tel', inputmode: 'tel', ph: '+212' }) +
    fld({ name: 'email', label: 'E-mail', type: 'email', auto: 'email', inputmode: 'email' }) +
    (withPlace ? fld({ name: 'city', label: 'Ville', auto: 'address-level2', opt: true }) + fld({ name: 'country', label: 'Pays', auto: 'country-name', opt: true }) : '');
}

const SLOTS = [['Matin', 'Matin'], ['Après-midi', 'Après-midi'], ['Fin de journée', 'Fin de journée']];

const TICKET = { auto: 'Demande de dossier', vehicule: 'Demande de dossier', visite: 'Rendez-vous showroom', sourcing: 'Dossier de recherche', restauration: 'Fiche atelier' };
function formBlock({ kind, title, intro, inner, submit, mode }) {
  return `<div class="fwrap" data-form>
    <div class="f-ticket mono" aria-hidden="true"><span>${TICKET[kind] || 'Demande'}</span><span>${stampDate()}</span></div>
    <form class="form" data-kind="${kind}"${mode ? ` data-mode="${mode}"` : ''} novalidate>
      <div class="f-head f-wide"><h2 class="h-md" tabindex="-1">${title}</h2>${intro ? `<p>${intro}</p>` : ''}</div>
      ${inner}
      <div class="f-foot f-wide">
        <button class="btn btn-red btn-lg btn-block magnetic" type="submit">${submit} ${I.arrow}</button>
        <p class="f-priv">Vos coordonnées servent uniquement à vous répondre. Elles ne sont jamais partagées.</p>
      </div>
    </form>
  </div>`;
}

function doneBlock(kind) {
  const sub = {
    vehicule: 'Un membre de l\'équipe vous répond personnellement, avec le dossier du véhicule.',
    visite: 'Nous confirmons le créneau avec vous et préparons le véhicule avant votre arrivée.',
    sourcing: 'Nous relisons votre brief et vous appelons pour en préciser les contours.',
    restauration: 'Le chef d\'atelier vous rappelle pour confirmer le créneau et préparer l\'inspection.'
  }[kind] || '';
  return `<div class="done" role="status">
    <svg class="done-ic" viewBox="0 0 64 64" width="60" height="60" aria-hidden="true"><circle cx="32" cy="32" r="30" pathLength="1"/><path d="M20 33l8 8 16-17" pathLength="1"/></svg>
    <h2 class="h-md" tabindex="-1">Demande reçue. Nous revenons vers vous sous 24 h.</h2>
    <p class="done-sub">${sub}</p>
    <div class="demo-note">
      <p><b>Démo&nbsp;:</b> cette demande vient d'apparaître dans le CRM de la plateforme.</p>
      <a class="link" href="../app.html#/crm">Ouvrir le CRM de la plateforme ${I.out}</a>
    </div>
    <button class="btn btn-ghost" type="button" data-again>Envoyer une autre demande</button>
  </div>`;
}

function validate(fm) {
  const bad = [];
  fm.querySelectorAll('.field.bad').forEach((f) => f.classList.remove('bad'));
  fm.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  fm.querySelectorAll('.err').forEach((e) => { e.textContent = ''; });
  const el = (n) => fm.elements[n];
  const val = (n) => (el(n) ? String(el(n).value).trim() : '');
  const shown = (x) => x && x.offsetParent !== null;
  const mark = (n, msg) => {
    const x = el(n);
    if (!x) return;
    x.setAttribute('aria-invalid', 'true');
    x.closest('.field').classList.add('bad');
    if (msg) fm.querySelector('#f-' + n + '-err').textContent = msg;
    if (!bad.includes(x)) bad.push(x);
  };
  if (val('name').length < 2) mark('name', 'Indiquez votre nom.');
  const ph = val('phone'), em = val('email');
  if (!ph && !em) {
    mark('phone', 'Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.');
    mark('email', '');
  } else {
    if (ph && ph.replace(/\D/g, '').length < 6) mark('phone', 'Ce numéro semble incomplet.');
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) mark('email', 'Cette adresse e-mail semble incomplète.');
  }
  fm.querySelectorAll('[aria-required="true"]').forEach((x) => {
    if (x.name === 'name' || !shown(x)) return;
    if (!String(x.value).trim()) mark(x.name, x.dataset.msg || 'Ce champ est requis.');
    else if (x.type === 'date' && x.value < todayISO()) mark(x.name, 'Choisissez une date à partir d\'aujourd\'hui.');
  });
  return bad;
}

function submitForm(fm) {
  const bad = validate(fm);
  if (bad.length) { bad[0].focus(); return; }
  const d = {};
  new FormData(fm).forEach((val, k) => { d[k] = String(val).trim(); });
  const kind = fm.dataset.kind === 'auto' ? (fm.dataset.mode || 'vehicule') : fm.dataset.kind;
  const base = { kind, name: d.name, phone: d.phone, email: d.email, city: d.city || '', country: d.country || '' };
  const join = (...xs) => xs.filter(Boolean).join(' ');
  let p;
  if (kind === 'vehicule') p = { ...base, vehicleId: d.vehicleId || '', message: join(d.intent === 'attente' ? 'Lot réservé : souhaite être prévenu si la réservation est levée.' : 'Dossier complet demandé.', d.message) };
  else if (kind === 'visite') p = { ...base, vehicleId: d.vehicleId || '', date: d.date, message: join('Visite showroom, créneau : ' + (d.slot || 'à convenir') + '.', d.message) };
  else if (kind === 'sourcing') p = { ...base, brief: d.brief, budget: +d.budget || 0, message: join(d.brief, d.timing ? 'Échéance : ' + d.timing + '.' : '', d.message) };
  else p = { ...base, project: d.car ? d.car + ' (' + (d.work || 'Restauration') + ')' : (d.work || 'Restauration'), date: d.date, message: join((d.work || 'Restauration') + '.', d.car ? 'Véhicule : ' + d.car + '.' : '', d.message) };
  try { addInquiry(p); } catch (e) {
    fm.querySelector('.f-priv').textContent = 'La demande n\'a pas pu être enregistrée sur cet appareil. Réessayez dans un instant.';
    return;
  }
  hold = true;
  const wrap = fm.closest('[data-form]');
  wrap.innerHTML = doneBlock(kind);
  const h = wrap.querySelector('h2');
  h.focus({ preventScroll: true });
  wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  dock.classList.add('away');
}

// ---------- views ----------
function home() {
  const vs = publicVehicles();
  const hero = vs.find((v) => v.category === 'Classique' && v.status === 'Disponible') || vs[0];
  const sold = soldVehicles();
  return {
    t: SITE + ' · Véhicules de collection, Tanger',
    h: `
    <section class="hero">
      <div class="hero-bg" aria-hidden="true"><span class="hero-year" data-par=".22">66</span></div>
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow mono reveal">Classiques et collection</p>
          <h1 class="h-xl split" tabindex="-1">Les plus beaux véhicules du monde, trouvés et ramenés au Maroc.</h1>
          <div class="hero-sub">
            <p class="lead reveal" style="--d:.55s">Nous ne vendons pas du stock. Nous transmettons des histoires.</p>
            <div class="cta-row reveal" style="--d:.7s">
              <a class="btn btn-red btn-lg magnetic" href="#/collection">Découvrir la collection ${I.arrow}</a>
              <a class="btn btn-ghost btn-lg magnetic" href="#/sur-mesure">Confier une recherche</a>
            </div>
          </div>
        </div>
        <figure class="hero-art hero-photo">
          <div class="hero-stage hero-print" data-par="-.06">
            <span class="hero-plate-no mono" aria-hidden="true">À la une</span>
            <picture>
              <source type="image/webp" srcset="../media/hero/karmann-ghia-1600.webp 1600w, ../media/hero/karmann-ghia-900.webp 900w" sizes="(min-width: 900px) 58vw, 100vw">
              <img src="../media/hero/karmann-ghia-1600.jpg" srcset="../media/hero/karmann-ghia-1600.jpg 1600w, ../media/hero/karmann-ghia-900.jpg 900w" sizes="(min-width: 900px) 58vw, 100vw" width="1600" height="1066" fetchpriority="high" alt="Volkswagen Karmann Ghia cabriolet beige, capote baissée, garé à l'ombre des arbres">
            </picture>
          </div>
          <figcaption class="hero-cap reveal" style="--d:1.4s">
            <span class="mono">À la une</span>
            <span class="hero-cap-t">Volkswagen Karmann Ghia Cabriolet</span>
            <a class="hero-cap-p mono" href="#/collection">Voir la collection ${I.arrow}</a>
          </figcaption>
        </figure>
      </div>
      <div class="scroll-cue mono" aria-hidden="true"><i></i>Défiler</div>
    </section>
    ${marquee()}
    <section class="sec">
      <div class="wrap sec-head">
        <p class="eyebrow mono reveal">La sélection · ${vs.length} lots</p>
        <h2 class="h-lg reveal">Chaque véhicule a été choisi. Aucun n'a été simplement acheté.</h2>
        <a class="link reveal" href="#/collection">Voir toute la collection ${I.arrow}</a>
      </div>
      ${rail(vs.map(card).join(''), 'Sélection de véhicules')}
    </section>
    <section class="sec sec-cream">
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow mono reveal">Notre manière</p>
          <h2 class="h-lg reveal">Quatre principes, et aucun raccourci.</h2>
        </div>
        <div class="pillars">${PILLARS.map(([t, p], i) => `<article class="pcard reveal" style="--d:${i * 90}ms"><span class="num mono">N° 0${i + 1}</span><h3>${t}</h3><p>${p}</p></article>`).join('')}</div>
      </div>
    </section>
    <section class="sec sec-hunt">
      <div class="wrap split-2">
        <div>
          <p class="eyebrow mono reveal">Recherche sur mesure</p>
          <h2 class="h-lg reveal">Dites-nous le véhicule de vos rêves. Nous le trouvons.</h2>
          <p class="lead reveal">Vous décrivez, nous cherchons, vous décidez. Un seul interlocuteur, du premier échange à la remise des clés.</p>
          <a class="btn btn-red btn-lg magnetic reveal" href="#/sur-mesure">Confier une recherche ${I.arrow}</a>
        </div>
        <ol class="steps steps-v">${STEPS_SOURCING.map(([t, p], i) => `<li class="reveal" style="--d:${i * 80}ms">${shield('0' + (i + 1))}<div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol>
      </div>
    </section>
    <section class="sec sec-paper">
      <div class="wrap split-2 atelier-teaser">
        <div>
          <p class="eyebrow mono reveal">L'atelier</p>
          <h2 class="h-lg reveal">Restaurer sans effacer l'histoire.</h2>
          <img class="sticker reveal" src="../brand/sticker-pickup.png" alt="" width="610" height="362" loading="lazy">
        </div>
        <div>
          <p class="lead lead-ink reveal">Restauration complète, restomod, mécanique et préparation. Chaque intervention est photographiée, chiffrée et consignée dans le dossier du véhicule.</p>
          <ul class="tags reveal"><li>Restauration</li><li>Restomod</li><li>Mécanique</li><li>Carrosserie et peinture</li><li>Sellerie</li><li>Tuning</li></ul>
          <a class="btn btn-ink btn-lg magnetic reveal" href="#/atelier">Découvrir l'atelier ${I.arrow}</a>
        </div>
      </div>
    </section>
    ${sold.length ? `<section class="sec">
      <div class="wrap sec-head">
        <p class="eyebrow mono reveal">Récemment confiés</p>
        <h2 class="h-lg reveal">Ils ont trouvé leur garage.</h2>
        <p class="muted reveal">Par discrétion, nous ne citons jamais nos clients.</p>
      </div>
      ${rail(sold.map(soldCard).join(''), 'Véhicules récemment confiés')}
    </section>` : ''}
    <section class="sec ig-sec" data-ig hidden>
      <div class="wrap ig-head">
        <div>
          <p class="eyebrow mono">Sur Instagram</p>
          <h2 class="h-lg">Le showroom, en ce moment.</h2>
        </div>
        <a class="btn btn-ghost magnetic" href="https://www.instagram.com/abs_custom_rides/" target="_blank" rel="noopener">@abs_custom_rides ${I.arrow}</a>
      </div>
      <div class="ig-rail" role="list" aria-label="Dernières publications Instagram">${IG_FILES.map((f) => `<a class="ig-card" role="listitem" href="https://www.instagram.com/abs_custom_rides/" target="_blank" rel="noopener"><span class="ig-frame"><img src="../media/instagram/${f}" alt="Publication Instagram d'ABS Custom Rides" width="480" height="640"></span></a>`).join('')}</div>
    </section>
    <section class="sec sec-quote">
      <div class="wrap">
        <p class="quote reveal">Certains véhicules vous emmènent quelque part. <em>D'autres vous emmènent ailleurs.</em></p>
        <div class="cta-row reveal">
          <a class="btn btn-red btn-lg magnetic" href="#/contact">Réserver une visite du showroom ${I.arrow}</a>
          <a class="btn btn-ghost btn-lg magnetic" href="#/maison">La Maison</a>
        </div>
      </div>
    </section>`
  };
}

const filt = { cat: 'Tous', st: 'Tous' };
function gridHTML() {
  const vs = publicVehicles().filter((v) => (filt.cat === 'Tous' || v.category === filt.cat) && (filt.st === 'Tous' || v.status === filt.st));
  if (!vs.length) {
    return `<div class="empty"><p class="h-md">Aucun véhicule dans cette sélection pour le moment.</p><p>Le véhicule que vous cherchez n'est peut-être pas encore arrivé. Nous pouvons le trouver pour vous.</p><a class="btn btn-red magnetic" href="#/sur-mesure">Confier une recherche ${I.arrow}</a></div>`;
  }
  return vs.map(card).join('');
}
function collection() {
  const vs = publicVehicles();
  const cats = VEHICLE_CATEGORIES.filter((c) => vs.some((v) => v.category === c));
  if (!cats.includes(filt.cat)) filt.cat = 'Tous';
  const chip = (group, val, label, n) => `<button class="chip" type="button" data-${group}="${esc(val)}" aria-pressed="${filt[group] === val}">${esc(label)}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`;
  const sts = [['Tous', 'Tous les statuts'], ['Disponible', 'Disponible'], ['En préparation', 'Bientôt disponible'], ['Réservé', 'Réservé']];
  return {
    t: 'La collection · ' + SITE,
    h: pageHead('La collection · ' + vs.length + ' lots', 'Une collection courte, choisie un véhicule à la fois.', 'Chaque lot est inspecté, documenté et présenté avec son histoire. Prix et disponibilités sont tenus à jour par l\'équipe, en temps réel.') + `
    <section class="sec sec-tight">
      <div class="wrap">
        <div class="filters">
          <div class="chips" role="group" aria-label="Catégorie">${chip('cat', 'Tous', 'Tout', vs.length)}${cats.map((c) => chip('cat', c, CAT_LABEL[c] || c, vs.filter((v) => v.category === c).length)).join('')}</div>
          <div class="chips chips-sm" role="group" aria-label="Statut">${sts.map(([v, l]) => chip('st', v, l)).join('')}</div>
        </div>
        <div class="grid" id="grid" aria-live="polite">${gridHTML()}</div>
      </div>
    </section>
    <section class="sec sec-cream sec-cta">
      <div class="wrap split-2">
        <h2 class="h-lg reveal">Le véhicule que vous cherchez n'est pas ici.</h2>
        <div><p class="lead lead-ink reveal">Pas encore. La plupart de nos plus beaux véhicules n'ont jamais été exposés : ils ont été cherchés pour quelqu'un.</p>
        <a class="btn btn-ink btn-lg magnetic reveal" href="#/sur-mesure">Confier une recherche ${I.arrow}</a></div>
      </div>
    </section>`
  };
}

function detail(id) {
  const v = publicVehicles().find((x) => x.id === id);
  if (!v) {
    const s = soldVehicles().find((x) => x.id === id);
    if (s) {
      return {
        t: 'Véhicule confié · ' + SITE,
        h: pageHead('Récemment confié', 'Ce véhicule a trouvé son garage.', esc(vehicleTitle(s)) + '. Par discrétion, nous n\'en disons pas plus. Nous pouvons chercher un véhicule comparable pour vous.',
          `<div class="cta-row reveal" style="--d:.6s"><a class="btn btn-red btn-lg magnetic" href="#/sur-mesure">Chercher un équivalent ${I.arrow}</a><a class="btn btn-ghost btn-lg magnetic" href="#/collection">Voir la collection</a></div>`) +
          `<section class="sec sec-tight"><div class="wrap"><div class="vd-stage vd-stage-sold">${vehicleArt(s, { animate: true })}<span class="badge badge-sold stamp">Vendu</span></div></div></section>`
      };
    }
    return notFound('Ce lot n\'est plus présenté.');
  }
  const reserved = v.status === 'Réservé';
  const wa = whatsapp();
  const waText = encodeURIComponent('Bonjour, je souhaite en savoir plus sur le lot ' + v.ref + ' : ' + vehicleTitle(v) + '.');
  const waBtn = wa
    ? `<a class="btn btn-ghost btn-lg" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">${I.chat} Écrire sur WhatsApp</a>`
    : `<button class="btn btn-ghost btn-lg" type="button" data-mode="vehicule" data-wa>${I.chat} Écrire sur WhatsApp</button>`;
  const specs = [
    ['Référence', v.ref], ['Année', v.year], [v.unit === 'h' ? 'Utilisation' : 'Kilométrage', num(v.mileage) + ' ' + (v.unit || '')],
    ['Moteur', v.engine], ['Puissance', v.power], ['Boîte', v.gearbox], ['Énergie', v.energy],
    ['Teinte extérieure', v.colorExt], ['Intérieur', v.colorInt], ['Places', v.seats], ['Origine', v.origin],
    ['Propriétaires', v.owners], ['Numéros concordants', v.matching ? 'Oui' : 'Non'], ['Statut', (STATUS[v.status] || [v.status])[0]]
  ].filter(([, x]) => x !== '' && x != null);
  const others = publicVehicles().filter((x) => x.id !== v.id);
  const formInner = (reserved ? '' : `<fieldset class="seg f-wide"><legend class="sr-only">Type de demande</legend>
      <label><input type="radio" name="mode" value="vehicule" checked><span>Dossier complet</span></label>
      <label><input type="radio" name="mode" value="visite"><span>Visite showroom</span></label>
    </fieldset>`) +
    `<input type="hidden" name="vehicleId" value="${esc(v.id)}">` + (reserved ? '<input type="hidden" name="intent" value="attente">' : '') + who() +
    (reserved ? '' : fld({ name: 'date', label: 'Date souhaitée', type: 'date', req: true, min: todayISO(), cls: 'only-visite', msg: 'Choisissez une date de visite.' }) +
      fld({ name: 'slot', label: 'Créneau', type: 'select', options: SLOTS, cls: 'only-visite' })) +
    fld({ name: 'message', label: 'Votre message', type: 'textarea', opt: true, wide: true, ph: 'Questions, livraison, reprise éventuelle' });
  return {
    t: vehicleTitle(v) + ' · ' + SITE,
    dock: v,
    h: `
    <section class="vd">
      <div class="wrap">
        <nav class="crumbs mono" aria-label="Fil d'Ariane"><a href="#/collection">Collection</a><span aria-hidden="true">/</span><span>Lot ${lotNo(v)}</span></nav>
        <div class="vd-grid">
          <div class="vd-stage">
            <span class="lot-no mono" aria-hidden="true">N° ${lotNo(v)}</span>
            ${badge(v)}
            ${vehicleArt(v, { animate: true, label: vehicleTitle(v) })}
          </div>
          <div class="vd-info">
            <p class="vd-ref mono reveal">Lot ${lotNo(v)} · ${esc(v.ref)} · ${esc(v.category)}</p>
            <p class="vd-make reveal">${esc(v.make)}</p>
            <h1 class="h-lg split" tabindex="-1">${esc(v.model)}</h1>
            <p class="vd-facts reveal" style="--d:.35s"><span>${esc(v.year)}</span><span>${num(v.mileage)} ${esc(v.unit)}</span><span>${esc(v.energy)}</span><span>${esc(v.gearbox)}</span></p>
            <div class="vd-price reveal" style="--d:.45s"><span class="mono">${price(v)}</span>${badge(v, true)}</div>
            ${reserved ? '<p class="vd-note reveal" style="--d:.5s">Ce lot est réservé. Nous pouvons vous prévenir si la réservation est levée, ou chercher un équivalent.</p>' : ''}
            <div class="vd-ctas reveal" style="--d:.55s">
              <button class="btn btn-red btn-lg magnetic" type="button" data-mode="vehicule">Demander le dossier complet ${I.arrow}</button>
              ${reserved ? `<a class="btn btn-ghost btn-lg" href="#/sur-mesure">Chercher un équivalent</a>` : `<button class="btn btn-ghost btn-lg" type="button" data-mode="visite">Réserver une visite</button>`}
              ${waBtn}
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="sec sec-cream">
      <div class="wrap story">
        <div class="reveal"><p class="eyebrow mono">Histoire</p><p class="story-t">${esc(v.history)}</p></div>
        <div class="reveal" style="--d:.12s"><p class="eyebrow mono">Pourquoi ce véhicule</p><p class="story-q">${dg(v.why)}</p></div>
      </div>
    </section>
    <section class="sec">
      <div class="wrap">
        <div class="sec-head"><p class="eyebrow mono reveal">Fiche</p><h2 class="h-md reveal">Ce que nous savons de ce véhicule.</h2></div>
        <dl class="specs">${specs.map(([k, x], i) => `<div class="reveal" style="--d:${(i % 6) * 50}ms"><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>
        ${(v.options || []).length ? `<div class="opts-wrap reveal"><p class="eyebrow mono">Options et équipements</p><ul class="tags tags-dark">${v.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
      </div>
    </section>
    <section class="sec sec-form" id="demande">
      <div class="wrap narrow">
        ${formBlock({
          kind: reserved ? 'vehicule' : 'auto', mode: 'vehicule',
          title: reserved ? 'Être prévenu pour ce lot' : 'Ce véhicule vous intéresse',
          intro: reserved ? 'Laissez vos coordonnées. Nous vous prévenons si la réservation est levée.' : 'Le dossier complet réunit l\'historique, les factures disponibles, le rapport d\'inspection et une série de photos détaillées. La visite se fait sur rendez-vous, véhicule préparé.',
          inner: formInner, submit: 'Envoyer la demande'
        })}
      </div>
    </section>
    ${others.length ? `<section class="sec sec-tight sec-more">
      <div class="wrap sec-head"><p class="eyebrow mono reveal">Dans la collection</p><h2 class="h-md reveal">D'autres lots</h2></div>
      ${rail(others.map(card).join(''), 'Autres véhicules de la collection')}
    </section>` : ''}`
  };
}

function surMesure() {
  return {
    t: 'Recherche sur mesure · ' + SITE,
    h: pageHead('Recherche sur mesure', 'Dites-nous le véhicule de vos rêves. Nous le trouvons.', 'Les plus beaux véhicules du monde, trouvés et ramenés au Maroc. Vous décrivez, nous cherchons, vous décidez.') + `
    <section class="sec sec-tight">
      <div class="wrap"><ol class="steps steps-h">${STEPS_SOURCING.map(([t, p], i) => `<li class="reveal" style="--d:${i * 80}ms">${shield('0' + (i + 1))}<div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol></div>
    </section>
    <section class="sec sec-cream sec-band">
      <div class="wrap"><p class="quote quote-ink reveal">La chasse fait partie du plaisir. <em>Nous la menons pour vous, sans raccourci.</em></p></div>
    </section>
    <section class="sec sec-form">
      <div class="wrap narrow">${formBlock({
        kind: 'sourcing', title: 'Votre brief', intro: 'Quelques lignes suffisent. Nous vous rappelons pour préciser le reste.', submit: 'Confier la recherche',
        inner: fld({ name: 'brief', label: 'Le véhicule recherché', type: 'textarea', req: true, wide: true, rows: 5, ph: 'Modèle, années, teinte, état, options', msg: 'Décrivez le véhicule recherché, même en quelques mots.' }) +
          fld({ name: 'budget', label: 'Budget indicatif', type: 'select', options: [['', 'À définir ensemble'], ['100000', 'Jusqu\'à 150 000 MAD'], ['225000', '150 000 à 300 000 MAD'], ['450000', '300 000 à 600 000 MAD'], ['800000', '600 000 MAD à 1 million'], ['1500000', 'Au-delà d\'un million de MAD']] }) +
          fld({ name: 'timing', label: 'Échéance', type: 'select', options: [['', 'Sans urgence'], ['dans les 3 mois', 'Dans les 3 mois'], ['dans les 6 mois', 'Dans les 6 mois'], ['dans l\'année', 'Dans l\'année']] }) +
          who() + fld({ name: 'message', label: 'Autre précision', type: 'textarea', opt: true, wide: true, rows: 3 })
      })}</div>
    </section>`
  };
}

function atelier() {
  const services = [
    ['Restauration complète', 'Démontage, châssis, carrosserie, mécanique, sellerie. Un chantier long, mené étape par étape.'],
    ['Restomod', 'L\'allure d\'origine, une mécanique d\'aujourd\'hui : freinage, injection, climatisation, confort.'],
    ['Mécanique et préparation', 'Remise en route, fiabilisation, entretien de collection et préparation avant vente.'],
    ['Carrosserie et peinture', 'Tôlerie, traitement anticorrosion, teintes d\'origine retrouvées au code près.'],
    ['Sellerie', 'Cuirs, tissus et moquettes, dans le respect de la finition d\'époque.'],
    ['Tuning', 'Préparations esthétiques et mécaniques, sur mesure et avec mesure.']
  ];
  const process = [
    ['Réception et inspection', 'Inspection en quatorze points, photos à l\'appui. Vous savez exactement d\'où l\'on part.'],
    ['Devis détaillé', 'Main-d\'œuvre, pièces, sous-traitance : chaque ligne est expliquée avant le premier coup de clé.'],
    ['Travaux documentés', 'Chaque étape est photographiée et consignée dans le dossier du véhicule.'],
    ['Contrôle de sortie', 'Essai, contrôle final, remise du dossier complet avec le véhicule.']
  ];
  const works = ['Restauration complète', 'Restomod', 'Mécanique et préparation', 'Carrosserie et peinture', 'Sellerie', 'Tuning', 'Diagnostic'];
  return {
    t: 'Atelier et restauration · ' + SITE,
    h: pageHead('L\'atelier · Tanger', 'Restaurer sans effacer l\'histoire.', 'Restauration complète, restomod, mécanique et préparation. Nous travaillons sur nos véhicules comme sur les vôtres : lentement, et dossier ouvert.') + `
    <section class="sec sec-cream">
      <div class="wrap">
        <div class="sec-head"><p class="eyebrow mono reveal">Savoir-faire</p><h2 class="h-lg reveal">Ce que nous faisons à l'atelier.</h2></div>
        <div class="pillars pillars-3">${services.map(([t, p], i) => `<article class="pcard reveal" style="--d:${(i % 3) * 90}ms"><span class="num mono">N° 0${i + 1}</span><h3>${t}</h3><p>${p}</p></article>`).join('')}</div>
      </div>
    </section>
    <section class="sec">
      <div class="wrap">
        <div class="sec-head"><p class="eyebrow mono reveal">Méthode</p><h2 class="h-lg reveal">Quatre étapes, un seul dossier.</h2></div>
        <ol class="steps steps-h steps-4">${process.map(([t, p], i) => `<li class="reveal" style="--d:${i * 80}ms">${shield('0' + (i + 1))}<div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol>
      </div>
    </section>
    <section class="sec sec-form">
      <div class="wrap narrow">${formBlock({
        kind: 'restauration', title: 'Réserver un créneau atelier', intro: 'Indiquez votre véhicule et la date de dépôt souhaitée. Le chef d\'atelier vous rappelle pour confirmer.', submit: 'Demander le créneau',
        inner: fld({ name: 'car', label: 'Votre véhicule', wide: true, opt: true, ph: 'Marque, modèle, année' }) +
          fld({ name: 'work', label: 'Type d\'intervention', type: 'select', options: works.map((w) => [w, w]) }) +
          fld({ name: 'date', label: 'Date de dépôt souhaitée', type: 'date', req: true, min: todayISO(), msg: 'Choisissez une date de dépôt.' }) +
          who() + fld({ name: 'message', label: 'Le projet en quelques mots', type: 'textarea', opt: true, wide: true, ph: 'État actuel, attentes, délais' })
      })}</div>
    </section>`
  };
}

function maison() {
  const values = [
    ['L\'intégrité avant l\'inventaire', 'Nous préférons manquer une vente que présenter un véhicule dont nous doutons.'],
    ['La discrétion par défaut', 'Nos clients ne sont jamais cités. Leurs véhicules non plus, sauf s\'ils le souhaitent.'],
    ['La passion', 'Nous sommes d\'abord des passionnés. Le métier est venu ensuite.'],
    ['L\'expertise tranquille', 'Pas de superlatifs. Des faits, des factures, des numéros.'],
    ['Le temps long', 'La relation commence à l\'achat : entretien, restauration, revente. Nous restons là.']
  ];
  const offer = [
    ['Showroom', 'À Tanger, sur rendez-vous. Les véhicules sont préparés avant votre visite.'],
    ['Recherche sur mesure', 'Le véhicule que vous cherchez, trouvé, inspecté et ramené au Maroc.'],
    ['Atelier', 'Restauration, restomod, mécanique, préparation et tuning.'],
    ['Livraison et démarches', 'Transport, dédouanement, homologation et carte grise.'],
    ['Classic Tour', 'Des sorties entre propriétaires, sur les routes du Nord.']
  ];
  return {
    t: 'La Maison · ' + SITE,
    h: pageHead('La Maison', 'Nous ne vendons pas du stock. Nous transmettons des histoires.', 'ABS Custom Rides est une maison tangéroise dédiée aux véhicules qui ont une histoire. Devenir le curateur de confiance des véhicules d\'exception au Maroc : c\'est notre ambition, et elle se mérite un véhicule à la fois.') + `
    <section class="sec sec-tight">
      <div class="wrap">
        <div class="ratio reveal" aria-label="Répartition de la collection">
          <div class="ratio-bar"><span style="--w:80%"><b>80 %</b> Classiques et collection</span><span style="--w:20%"><b>20 %</b> Le reste</span></div>
          <p class="muted">Le reste : quelques voitures récentes, motos, quads, buggies et jet skis. Choisis avec la même exigence.</p>
        </div>
      </div>
    </section>
    <section class="sec sec-cream">
      <div class="wrap">
        <div class="sec-head"><p class="eyebrow mono reveal">Nos valeurs</p><h2 class="h-lg reveal">Ce qui ne se négocie pas.</h2></div>
        <ol class="values">${values.map(([t, p], i) => `<li class="reveal" style="--d:${i * 70}ms"><span class="num mono">0${i + 1}</span><h3>${t}</h3><p>${p}</p></li>`).join('')}</ol>
      </div>
    </section>
    <section class="sec">
      <div class="wrap">
        <div class="sec-head"><p class="eyebrow mono reveal">La Maison en pratique</p><h2 class="h-lg reveal">Un seul interlocuteur, du premier échange à la remise des clés.</h2></div>
        <ol class="steps steps-h">${offer.map(([t, p], i) => `<li class="reveal" style="--d:${i * 80}ms">${shield('0' + (i + 1))}<div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol>
      </div>
    </section>
    <section class="sec sec-quote">
      <div class="wrap">
        <p class="quote reveal">Certains véhicules vous emmènent quelque part. <em>D'autres vous emmènent ailleurs.</em></p>
        <div class="cta-row reveal"><a class="btn btn-red btn-lg magnetic" href="#/collection">Voir la collection ${I.arrow}</a><a class="btn btn-ghost btn-lg magnetic" href="#/contact">Nous rendre visite</a></div>
      </div>
    </section>`
  };
}

function contact(arg, q) {
  const vs = publicVehicles();
  const pre = q.get('v') || '';
  return {
    t: 'Contact et visite · ' + SITE,
    h: pageHead('Contact', 'Le showroom se visite sur rendez-vous.', 'Prenez le temps. Nous préparons les véhicules qui vous intéressent avant votre arrivée.') + `
    <section class="sec sec-tight sec-form">
      <div class="wrap contact-grid">
        <aside class="cinfo reveal">
          <div><p class="eyebrow mono">Showroom et atelier</p><p>[Adresse]<br>Tanger, Maroc</p></div>
          <div><p class="eyebrow mono">Téléphone</p><p>[Téléphone]</p></div>
          <div><p class="eyebrow mono">Horaires</p><p>[Horaires]<br>Sur rendez-vous</p></div>
          <div><p class="eyebrow mono">Réponse</p><p>Sous 24 h, par la personne qui vous recevra.</p></div>
        </aside>
        ${formBlock({
          kind: 'visite', title: 'Réserver une visite', intro: 'Choisissez une date. Nous confirmons le créneau avec vous.', submit: 'Demander la visite',
          inner: who() +
            fld({ name: 'date', label: 'Date souhaitée', type: 'date', req: true, min: todayISO(), msg: 'Choisissez une date de visite.' }) +
            fld({ name: 'slot', label: 'Créneau', type: 'select', options: SLOTS }) +
            fld({ name: 'vehicleId', label: 'Un véhicule en particulier', type: 'select', wide: true, value: pre, options: [['', 'Aucun en particulier'], ...vs.map((v) => [v.id, 'Lot ' + lotNo(v) + ' · ' + vehicleTitle(v)])] }) +
            fld({ name: 'message', label: 'Votre message', type: 'textarea', opt: true, wide: true })
        })}
      </div>
    </section>`
  };
}

function notFound(msg) {
  return {
    t: 'Page introuvable · ' + SITE,
    h: pageHead('Introuvable', msg || 'Cette page n\'existe pas.', 'La collection, elle, est toujours là.', `<div class="cta-row reveal" style="--d:.6s"><a class="btn btn-red btn-lg magnetic" href="#/collection">Voir la collection ${I.arrow}</a><a class="btn btn-ghost btn-lg magnetic" href="#/">Accueil</a></div>`)
  };
}

const ROUTES = { home, collection, vehicule: detail, 'sur-mesure': surMesure, atelier, maison, contact };

// ---------- router ----------
function parse() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : '', q: new URLSearchParams(qs || '') };
}

let first = true;
let token = 0;
let hold = false;
let dockIO = null;

async function render({ transition = true, keepScroll = false } = {}) {
  const r = parse();
  const t = ++token;
  hold = false;
  closeSheet(false);
  if (transition && !first && !reduce) {
    view.classList.add('out');
    await wait(240);
    if (t !== token) return;
  }
  const fn = ROUTES[r.name];
  const out = fn ? fn(r.arg, r.q) : notFound();
  const y = window.scrollY;
  view.innerHTML = out.h;
  document.title = out.t;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === r.name || (r.name === 'vehicule' && a.dataset.nav === 'collection');
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  setupDock(out.dock);
  jump(keepScroll ? y : 0);
  enhance(view);
  requestAnimationFrame(() => view.classList.remove('out'));
  if (!first && !keepScroll) {
    const h1 = view.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  }
  first = false;
}

function setupDock(v) {
  if (dockIO) { dockIO.disconnect(); dockIO = null; }
  if (!v) { dock.hidden = true; dock.innerHTML = ''; body.classList.remove('has-dock'); return; }
  const reserved = v.status === 'Réservé';
  const wa = whatsapp();
  dock.innerHTML = `<div class="dock-in">
    <div class="dock-p"><span class="mono">Lot ${lotNo(v)}</span><b class="mono">${price(v)}</b></div>
    ${wa ? `<a class="btn btn-ghost btn-icon" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp">${I.chat}</a>` : `<button class="btn btn-ghost btn-icon" type="button" data-mode="vehicule" data-wa aria-label="Écrire sur WhatsApp">${I.chat}</button>`}
    ${reserved ? '' : `<button class="btn btn-ghost btn-dock" type="button" data-mode="visite">Visite</button>`}
    <button class="btn btn-red btn-dock" type="button" data-mode="vehicule">Dossier</button>
  </div>`;
  dock.hidden = false;
  dock.classList.remove('away');
  body.classList.add('has-dock');
  const targets = [view.querySelector('.vd-ctas'), view.querySelector('#demande')].filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    const seen = new Map();
    dockIO = new IntersectionObserver((es) => {
      es.forEach((e) => seen.set(e.target, e.isIntersecting));
      dock.classList.toggle('away', hold || [...seen.values()].some(Boolean));
    }, { threshold: 0.05 });
    targets.forEach((t) => dockIO.observe(t));
  }
}

// ---------- enhancements ----------
let revealIO = null;
// Photos fetched from the public Instagram profile by tools/fetch-instagram.sh.
// Missing files are dropped; the section stays hidden until one image loads.
const IG_FILES = Array.from({ length: 11 }, (_, i) => 'ig-' + String(i + 1).padStart(2, '0') + '.jpg');
function initInstagram(scope) {
  const sec = scope.querySelector('[data-ig]');
  if (!sec) return;
  sec.querySelectorAll('img').forEach((img) => {
    const done = () => {
      if (img.naturalWidth) sec.hidden = false;
      else img.closest('.ig-card').remove();
    };
    if (img.complete) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });
}
const pending = new Set();
function enhance(scope) {
  initInstagram(scope);
  scope.querySelectorAll('.split').forEach((el) => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${dg(w)}</span></span>`).join(' ');
    requestAnimationFrame(() => setTimeout(() => el.classList.add('in'), reduce ? 0 : 80));
  });
  const els = scope.querySelectorAll('.reveal:not(.in)');
  if (reduce || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); }
  else {
    if (!revealIO) {
      revealIO = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { const el = e.target; el.classList.add('in'); pending.delete(el); revealIO.unobserve(el); setTimeout(() => el.classList.add('settled'), 1700); }
      }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    }
    els.forEach((el) => { revealIO.observe(el); pending.add(el); });
  }
  scope.querySelectorAll('.rail').forEach((r) => {
    const bar = r.parentElement.querySelector('.rail-bar i');
    const upd = () => {
      const max = r.scrollWidth - r.clientWidth;
      if (bar) bar.style.transform = 'scaleX(' + Math.max(0.08, max > 0 ? (r.scrollLeft + r.clientWidth) / r.scrollWidth : 1) + ')';
    };
    r.addEventListener('scroll', upd, { passive: true });
    upd();
  });
  scope.querySelectorAll('form[data-mode]').forEach((fm) => {
    const checked = fm.querySelector('input[name="mode"]:checked');
    if (checked) fm.dataset.mode = checked.value;
  });
  pars = [...document.querySelectorAll('[data-par]')];
  onScroll();
}

// ---------- scroll: header state + parallax ----------
let pars = [];
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = window.scrollY;
    hd.classList.toggle('scrolled', y > 8);
    pending.forEach((el) => {
      if (!el.isConnected) { pending.delete(el); return; }
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.92 && r.left < innerWidth) { pending.delete(el); el.classList.add('in'); setTimeout(() => el.classList.add('settled'), 1700); }
    });
    if (reduce || y > innerHeight * 1.5) return;
    pars.forEach((el) => { el.style.transform = 'translate3d(0,' + (y * +el.dataset.par).toFixed(1) + 'px,0)'; });
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

// ---------- menu sheet ----------
function openSheet() {
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('open'));
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Fermer le menu');
  body.classList.add('lock');
  const a = sheet.querySelector('a');
  if (a) a.focus({ preventScroll: true });
}
function closeSheet(restore = true) {
  if (sheet.hidden) return;
  sheet.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Ouvrir le menu');
  body.classList.remove('lock');
  setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, reduce ? 0 : 320);
  if (restore) burger.focus({ preventScroll: true });
}
burger.addEventListener('click', () => (sheet.hidden || !sheet.classList.contains('open') ? openSheet() : closeSheet()));
sheet.addEventListener('click', (e) => { if (e.target.closest('a')) closeSheet(false); });
document.addEventListener('keydown', (e) => {
  if (sheet.hidden) return;
  if (e.key === 'Escape') { closeSheet(); return; }
  if (e.key === 'Tab') {
    const f = [burger, ...sheet.querySelectorAll('a')];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
document.getElementById('skip').addEventListener('click', () => view.focus());

// ---------- delegated interactions ----------
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && view.contains(chip)) {
    if (chip.dataset.cat != null) filt.cat = chip.dataset.cat;
    if (chip.dataset.st != null) filt.st = chip.dataset.st;
    view.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat != null ? c.dataset.cat === filt.cat : c.dataset.st === filt.st)));
    const grid = view.querySelector('#grid');
    grid.classList.add('swap');
    setTimeout(() => { grid.innerHTML = gridHTML(); enhance(grid); grid.classList.remove('swap'); }, reduce ? 0 : 180);
    return;
  }
  const rb = e.target.closest('[data-rail]');
  if (rb) {
    const r = rb.closest('.rail-wrap').querySelector('.rail');
    r.scrollBy({ left: +rb.dataset.rail * r.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
    return;
  }
  const m = e.target.closest('[data-mode]');
  if (m && m.tagName !== 'FORM') {
    const sec = view.querySelector('#demande');
    if (!sec) return;
    const fm = sec.querySelector('form');
    if (fm) {
      const radio = fm.querySelector(`input[name="mode"][value="${m.dataset.mode}"]`);
      if (radio) { radio.checked = true; fm.dataset.mode = m.dataset.mode; }
      if (m.hasAttribute('data-wa') && fm.elements.message && !fm.elements.message.value) {
        fm.elements.message.value = 'Je préfère être recontacté sur WhatsApp.';
      }
      const h = fm.querySelector('h2');
      if (h) h.focus({ preventScroll: true });
    }
    sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  if (e.target.closest('[data-again]')) {
    render({ transition: false, keepScroll: true }).then(() => {
      const f = view.querySelector('[data-form]');
      if (f) f.scrollIntoView({ block: 'center' });
    });
  }
});

view.addEventListener('change', (e) => {
  if (e.target.name === 'mode') e.target.form.dataset.mode = e.target.value;
});
view.addEventListener('input', (e) => {
  const fm = e.target.form;
  if (!fm) return;
  fm.dataset.dirty = '1';
  const f = e.target.closest('.field');
  if (f && f.classList.contains('bad')) {
    f.classList.remove('bad');
    e.target.removeAttribute('aria-invalid');
    const er = f.querySelector('.err');
    if (er) er.textContent = '';
  }
});
view.addEventListener('submit', (e) => {
  const fm = e.target.closest('form[data-kind]');
  if (!fm) return;
  e.preventDefault();
  submitForm(fm);
});

// ---------- pointer: spotlight, cursor, magnetic, tilt ----------
window.addEventListener('pointermove', (e) => {
  root.style.setProperty('--mx', e.clientX + 'px');
  root.style.setProperty('--my', e.clientY + 'px');
}, { passive: true });

if (fine && !reduce) {
  body.classList.add('has-cursor');
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  let mag = null, tilt = null;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
    const t = e.target.closest ? e.target : null;
    const m = t && t.closest('.magnetic');
    // magnetic drives the individual translate property and tilt drives rotate,
    // so CSS keeps transform for the hover lift and the press into the shadow
    if (mag && mag !== m) mag.style.translate = '';
    mag = m;
    if (m) {
      const r = m.getBoundingClientRect();
      m.style.translate = `${((mx - r.left - r.width / 2) * 0.16).toFixed(1)}px ${((my - r.top - r.height / 2) * 0.24).toFixed(1)}px`;
    }
    const host = t && t.closest('.lot-wrap');
    const tl = host ? host.querySelector('.tilt') : t && t.closest('.tilt');
    if (tilt && tilt !== tl) tilt.style.rotate = '';
    tilt = tl;
    if (tl) {
      const r = (host || tl).getBoundingClientRect();
      const px = (mx - r.left) / r.width - 0.5;
      tl.style.rotate = `${(px * -1.6).toFixed(2)}deg`;
    }
  });
  (function loop() {
    rx += (mx - rx) * 0.17; ry += (my - ry) * 0.17;
    ring.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    ring.classList.toggle('view', !!(t.closest('[data-cursor="view"]') || t.closest('.lot-wrap')));
    ring.classList.toggle('hover', !!t.closest('a, button, label, select, [data-hover]'));
    const dark = !!t.closest('.ft, .mq, .sec-paper');
    ring.classList.toggle('on-dark', dark);
    dot.classList.toggle('on-dark', dark);
  });
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; });
}

// ---------- boot ----------
// Back from the platform (bfcache): reload so prices and statuses are current.
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
window.addEventListener('hashchange', () => render());
onExternalChange(() => {
  const busy = hold || !sheet.hidden || [...view.querySelectorAll('form')].some((f) => f.dataset.dirty) ||
    (document.activeElement && view.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));
  if (!busy) render({ transition: false, keepScroll: true });
});
render({ transition: false });
window.addEventListener('load', () => body.classList.add('loaded'));
