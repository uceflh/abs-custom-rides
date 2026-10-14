import { db, save, reset, uid } from '../store.js';
import { esc, money, icon, openForm, toast, confirmBox } from '../ui.js';
import { refresh } from '../nav.js';

export function settingsView() {
  const s = db.settings;
  const coCard = (key, label) => {
    const c = s.companies[key];
    return '<section class="card"><h2>' + label + ' <button class="btn btn-ghost btn-sm" type="button" data-co="' + key + '">' + icon('edit', 16) + 'Modifier</button></h2><dl class="dl">' +
      [['Raison sociale', c.name], ['Activité', c.activity], ['Adresse', c.address], ['Téléphone', c.phone], ['Email', c.email], ['ICE', c.ice], ['IF', c.if], ['RC', c.rc], ['Patente', c.tp]].map(([k, v]) => '<dt>' + k + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl></section>';
  };
  const html =
    '<div class="page-head"><div><h1>Paramètres</h1><div class="sub">Sociétés, mentions légales des documents, taux et équipe.</div></div></div>' +
    '<div class="grid g2">' + coCard('showroom', 'Société showroom') + coCard('atelier', 'Société atelier') +
    '<section class="card"><h2>Taux et documents <button class="btn btn-ghost btn-sm" type="button" id="rates">' + icon('edit', 16) + 'Modifier</button></h2><dl class="dl">' +
    '<dt>TVA</dt><dd>' + s.tva + ' %</dd><dt>Taux horaire facturé</dt><dd>' + money(s.laborRate) + ' HT</dd><dt>Coût horaire interne</dt><dd>' + money(s.laborCostRate) + '</dd><dt>Validité des devis</dt><dd>' + s.quoteValidity + ' jours</dd><dt>WhatsApp du site client</dt><dd>' + esc(s.whatsapp || 'Non renseigné') + '</dd></dl>' +
    '<p class="small faint" style="margin:12px 0 0">Valeurs de démonstration. Taux horaire et mentions à confirmer avec la direction et l\'expert-comptable.</p></section>' +
    '<section class="card"><h2>Équipe atelier <button class="btn btn-ghost btn-sm" type="button" id="addTech">' + icon('plus', 16) + 'Technicien</button></h2><div class="list">' +
    db.technicians.map((t) => '<div class="li"><span class="mark" style="width:32px;height:32px;font-size:12px">' + esc(t.name.charAt(0)) + '</span><span class="grow"><span class="t">' + esc(t.name) + '</span><span class="d">' + esc(t.role) + '</span></span></div>').join('') + '</div></section>' +
    '<section class="card span2"><h2>Données de démonstration</h2><p class="muted" style="margin:0 0 12px">Les données sont enregistrées sur cet appareil uniquement. Réinitialiser remet la démo dans son état d\'origine.</p><button class="btn btn-ghost" type="button" id="reset">' + icon('trash', 18) + 'Réinitialiser la démo</button></section></div>';
  return {
    title: 'Paramètres', html,
    mount(root) {
      root.querySelectorAll('[data-co]').forEach((b) => b.addEventListener('click', () => {
        const c = s.companies[b.dataset.co];
        openForm('Société ' + b.dataset.co, [
          { name: 'name', label: 'Raison sociale', value: c.name, required: true }, { name: 'activity', label: 'Activité', value: c.activity },
          { name: 'address', label: 'Adresse', value: c.address }, { name: 'phone', label: 'Téléphone', value: c.phone, half: true }, { name: 'email', label: 'Email', value: c.email, half: true },
          { name: 'ice', label: 'ICE (15 chiffres)', value: c.ice, half: true }, { name: 'if', label: 'Identifiant fiscal', value: c.if, half: true },
          { name: 'rc', label: 'Registre du commerce', value: c.rc, half: true }, { name: 'tp', label: 'Patente', value: c.tp, half: true }
        ], (d) => { Object.assign(c, d); save(); toast('Société mise à jour'); refresh(); });
      }));
      root.querySelector('#rates').addEventListener('click', () => openForm('Taux et documents', [
        { name: 'tva', label: 'TVA (%)', type: 'number', value: s.tva, half: true }, { name: 'laborRate', label: 'Taux horaire HT', type: 'number', value: s.laborRate, half: true },
        { name: 'laborCostRate', label: 'Coût horaire interne', type: 'number', value: s.laborCostRate, half: true }, { name: 'quoteValidity', label: 'Validité devis (jours)', type: 'number', value: s.quoteValidity, half: true },
        { name: 'whatsapp', label: 'Numéro WhatsApp affiché sur le site client', type: 'tel', value: s.whatsapp, hint: 'Laisser vide pour la démo : les boutons ouvrent alors le formulaire.' }
      ], (d) => { Object.assign(s, d); save(); toast('Paramètres enregistrés'); refresh(); }));
      root.querySelector('#addTech').addEventListener('click', () => openForm('Nouveau technicien', [{ name: 'name', label: 'Prénom', required: true, half: true }, { name: 'role', label: 'Rôle', half: true }], (d) => { db.technicians.push({ id: uid('t'), ...d }); save(); toast('Technicien ajouté'); refresh(); }));
      root.querySelector('#reset').addEventListener('click', () => confirmBox('Réinitialiser la démo', 'Toutes les modifications faites sur cet appareil seront effacées.', () => { reset(); toast('Démo réinitialisée'); location.hash = '#/'; refresh(); }, 'Réinitialiser'));
    }
  };
}
