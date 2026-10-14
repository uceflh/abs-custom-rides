// Demo seed. Every name, number and plate below is fictitious.
// Dates are relative to "today" so the demo always looks current.

function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Bump when the seed changes so devices that already opened the demo get the new data.
export const SEED_VERSION = 2;

export const STAGES_LEAD =['Nouveau', 'Qualifié', 'Consultation', 'Offre', 'Gagné', 'Perdu'];
export const STAGES_OR = ['Réception', 'Inspection', 'Devis', 'Approbation', 'Travaux', 'Contrôle sortie', 'Facturé', 'Livré'];
export const VEHICLE_STATUS = ['En sourcing', 'En préparation', 'Disponible', 'Réservé', 'Vendu'];
export const VEHICLE_CATEGORIES = ['Classique', 'Voiture', 'Moto', 'Quad / Buggy', 'Nautique', 'Engin'];
export const ORDER_STATUS = ['Réservé', 'Acompte reçu', 'Papiers en cours', 'Prêt à livrer', 'Livré'];
export const EVENT_TYPES = ['RDV atelier', 'Réservation restauration', 'Essai', 'Livraison', 'Visite showroom', 'Événement'];
export const INSPECTION_ZONES = ['Carrosserie', 'Peinture', 'Châssis et soubassement', 'Vitrage', 'Éclairage', 'Pneus et jantes', 'Freins', 'Moteur', 'Boîte et embrayage', 'Direction et suspension', 'Électricité', 'Intérieur et sellerie', 'Climatisation', 'Échappement'];

function inspection(base, overrides, extra) {
  const checks = INSPECTION_ZONES.map((zone) => ({ zone, state: 'OK', note: '' }));
  Object.entries(overrides || {}).forEach(([zone, v]) => {
    const c = checks.find((x) => x.zone === zone);
    if (c) { c.state = v[0]; c.note = v[1] || ''; }
  });
  return Object.assign({ checks, damages: [], accident: '', remarks: '', photos: 0, signedBy: '' }, base, extra || {});
}

export function seed() {
  const clients = [
    { id: 'c1', name: 'Driss Benali', phone: '+212 600 000 101', email: 'd.benali@exemple.ma', city: 'Tanger', country: 'Maroc', type: 'Particulier', tier: 'A', source: 'Showroom', interests: 'Mercedes, Porsche', notes: 'Collectionneur, 6 véhicules. Préfère être appelé en fin de journée.', createdAt: day(-420) },
    { id: 'c2', name: 'Faisal Al Mansouri', phone: '+971 50 000 0102', email: 'faisal.m@exemple.ae', city: 'Dubaï', country: 'Émirats arabes unis', type: 'Particulier', tier: 'A', source: 'Instagram', interests: 'Mercedes SL, Ferrari', notes: 'Recherche sur mesure en cours. Échanges en anglais, WhatsApp uniquement.', createdAt: day(-38) },
    { id: 'c3', name: 'Mehdi Alaoui', phone: '+212 600 000 103', email: 'mehdi.alaoui@exemple.ma', city: 'Casablanca', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Instagram', interests: 'Porsche, youngtimers', notes: 'Premier véhicule de collection.', createdAt: day(-55) },
    { id: 'c4', name: 'Philippe Martin', phone: '+33 6 00 00 01 04', email: 'p.martin@exemple.fr', city: 'Lyon', country: 'France', type: 'Particulier', tier: 'B', source: 'Site web', interests: 'Alfa Romeo', notes: 'Membre d\'un club Alfa Romeo. Demande l\'historique complet et les numéros.', createdAt: day(-12) },
    { id: 'c5', name: 'Yasmine El Idrissi', phone: '+212 600 000 105', email: 'yasmine.e@exemple.ma', city: 'Tanger', country: 'Maroc', type: 'Particulier', tier: 'C', source: 'WhatsApp', interests: 'Jet ski, buggy', notes: '', createdAt: day(-1) },
    { id: 'c6', name: 'Omar Tazi', phone: '+212 600 000 106', email: 'omar.tazi@exemple.ma', city: 'Tétouan', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Recommandation', interests: 'Toyota Land Cruiser', notes: 'Client atelier, recommandé par D. Benali.', createdAt: day(0) },
    { id: 'c7', name: 'Sofia Berrada', phone: '+212 600 000 107', email: 'sofia.b@exemple.ma', city: 'Rabat', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Instagram', interests: 'Petites italiennes', notes: 'A acheté la SEAT 600, entretien chez nous.', createdAt: day(-140) },
    { id: 'c8', name: 'Hans Becker', phone: '+49 151 0000 0108', email: 'h.becker@exemple.de', city: 'Munich', country: 'Allemagne', type: 'Particulier', tier: 'A', source: 'Recommandation', interests: 'BMW classiques', notes: 'Envoie sa voiture par camion pour une restauration carrosserie.', createdAt: day(-20) },
    { id: 'c9', name: 'Nadia Chraibi', phone: '+212 600 000 109', email: 'n.chraibi@exemple.ma', city: 'Tanger', country: 'Maroc', type: 'Particulier', tier: 'A', source: 'Showroom', interests: 'Range Rover, Land Rover', notes: 'A acheté le Range Rover Classic. Intéressée par un second véhicule.', createdAt: day(-90) },
    { id: 'c10', name: 'Rachid Amrani', phone: '+212 600 000 110', email: 'r.amrani@exemple.ma', city: 'Marrakech', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Instagram', interests: 'Defender', notes: '', createdAt: day(-9) },
    { id: 'c11', name: 'Ilyas Bennani', phone: '+212 600 000 111', email: 'ilyas.b@exemple.ma', city: 'Fès', country: 'Maroc', type: 'Particulier', tier: 'B', source: 'Instagram', interests: 'Motos touring', notes: '', createdAt: day(-3) },
    { id: 'c12', name: 'Société Atlas Events', phone: '+212 539 00 01 12', email: 'contact@atlas-events.exemple.ma', city: 'Tanger', country: 'Maroc', type: 'Professionnel', tier: 'C', source: 'Recommandation', interests: 'Location pour tournages', notes: 'ICE client : [ICE CLIENT]', createdAt: day(-70) }
  ];

  const technicians = [
    { id: 't1', name: 'Karim', role: 'Chef mécanicien' },
    { id: 't2', name: 'Yassine', role: 'Carrossier peintre' },
    { id: 't3', name: 'Hamza', role: 'Électricien auto' },
    { id: 't4', name: 'Anas', role: 'Préparateur' }
  ];

  const vehicles = [
    { id: 'v1', ref: 'STK-0031', category: 'Classique', make: 'Alfa Romeo', model: 'GT Junior 1300', year: 1968, vin: 'AR1530000', plate: 'WW 12345', mileage: 87400, unit: 'km', energy: 'Essence', engine: '1.3 L 4 cylindres double arbre', power: '89 ch', gearbox: 'Manuelle 5', colorExt: 'Rosso Alfa', colorInt: 'Simili noir', seats: 4, options: ['Jantes Campagnolo', 'Volant Hellebore', 'Autoradio d\'époque'], origin: 'Italie', owners: 3, matching: true, history: 'Première main italienne jusqu\'en 1994. Restauration mécanique en 2019, factures conservées.', why: 'Rare en Rosso d\'origine, numéros concordants, dossier complet.', status: 'Disponible', location: 'Showroom', purchase: { date: day(-80), price: 142000, sellerType: 'Particulier', from: 'Particulier, Turin' }, costs: [{ label: 'Transport Turin vers Tanger', amount: 4500, cat: 'Transport' }, { label: 'Dédouanement', amount: 3200, cat: 'Douane' }, { label: 'Carte grise et contrôle', amount: 1200, cat: 'Administratif' }], price: 205000, minPrice: 192000, createdAt: day(-80) },
    { id: 'v2', ref: 'STK-0034', category: 'Classique', make: 'Land Rover', model: 'Defender 110 200Tdi', year: 1994, vin: 'SALLDHMF7AA000000', plate: 'WW 23456', mileage: 214000, unit: 'km', energy: 'Diesel', engine: '2.5 L 200Tdi turbo diesel', power: '107 ch', gearbox: 'Manuelle 5', colorExt: 'Coniston Green', colorInt: 'Tissu gris', seats: 7, options: ['Galerie de toit', 'Treuil avant', 'Marchepieds'], origin: 'Royaume-Uni', owners: 4, matching: true, history: 'Ancien véhicule de ferme écossais, châssis sain.', why: 'Base saine pour une préparation sobre, sans corrosion structurelle.', status: 'En préparation', location: 'Atelier', purchase: { date: day(-30), price: 180000, sellerType: 'Professionnel', from: 'Négociant, Bristol' }, costs: [{ label: 'Transport camion', amount: 2500, cat: 'Transport' }, { label: 'Homologation et carte grise', amount: 2400, cat: 'Administratif' }], price: 245000, minPrice: 232000, createdAt: day(-30) },
    { id: 'v3', ref: 'STK-0028', category: 'Classique', make: 'Mercedes-Benz', model: '300 D (W123)', year: 1982, vin: 'WDB1231301A000000', plate: 'WW 34567', mileage: 312000, unit: 'km', energy: 'Diesel', engine: '3.0 L 5 cylindres OM617', power: '88 ch', gearbox: 'Automatique 4', colorExt: 'Beige Ivoire', colorInt: 'MB-Tex brun', seats: 5, options: ['Toit ouvrant', 'Appuie-têtes arrière'], origin: 'Maroc', owners: 2, matching: true, history: 'Deux propriétaires à Rabat, carnet d\'entretien tamponné.', why: 'Increvable, intérieur d\'origine très bien conservé.', status: 'Disponible', location: 'Showroom', purchase: { date: day(-110), price: 68000, sellerType: 'Particulier', from: 'Particulier, Rabat' }, costs: [{ label: 'Carte grise', amount: 900, cat: 'Administratif' }], price: 89000, minPrice: 82000, createdAt: day(-110) },
    { id: 'v4', ref: 'STK-0029', category: 'Voiture', make: 'Porsche', model: '944 S2 Cabriolet', year: 1991, vin: 'WP0ZZZ94ZMN000000', plate: 'WW 45678', mileage: 128000, unit: 'km', energy: 'Essence', engine: '3.0 L 4 cylindres 16 soupapes', power: '211 ch', gearbox: 'Manuelle 5', colorExt: 'Guards Red', colorInt: 'Cuir noir', seats: 2, options: ['Capote électrique', 'Sièges chauffants', 'Jantes Design 90'], origin: 'Allemagne', owners: 3, matching: true, history: 'Courroies et pompe à eau faites en 2025.', why: 'Cabriolet rare, kilométrage cohérent et documenté.', status: 'Réservé', location: 'Showroom', purchase: { date: day(-95), price: 172000, sellerType: 'Particulier', from: 'Particulier, Stuttgart' }, costs: [{ label: 'Transport', amount: 4800, cat: 'Transport' }, { label: 'Dédouanement', amount: 6100, cat: 'Douane' }, { label: 'Carte grise', amount: 1300, cat: 'Administratif' }], price: 235000, minPrice: 222000, createdAt: day(-95) },
    { id: 'v5', ref: 'STK-0035', category: 'Classique', make: 'Mercedes-Benz', model: '280 SE (W108)', year: 1971, vin: '', plate: '', mileage: 143000, unit: 'km', energy: 'Essence', engine: '2.8 L 6 cylindres en ligne', power: '160 ch', gearbox: 'Automatique 4', colorExt: 'Bleu nuit', colorInt: 'Cuir crème', seats: 5, options: ['Toit ouvrant', 'Climatisation Behr'], origin: 'Allemagne', owners: 2, matching: false, history: 'Inspection prévue sur place la semaine prochaine.', why: 'Configuration recherchée par deux clients.', status: 'En sourcing', location: 'Allemagne', purchase: { date: '', price: 0, sellerType: 'Particulier', from: 'Particulier, Hambourg (en négociation)' }, costs: [], price: 0, minPrice: 0, createdAt: day(-6) },
    { id: 'v6', ref: 'STK-0026', category: 'Moto', make: 'Honda', model: 'Gold Wing GL1500 SE', year: 1995, vin: '1HFSC2207SA000000', plate: 'WW 56789', mileage: 61000, unit: 'km', energy: 'Essence', engine: '1.5 L flat 6', power: '100 ch', gearbox: 'Manuelle 5 + marche arrière', colorExt: 'Bordeaux', colorInt: '', seats: 2, options: ['Valises latérales', 'Top case', 'Régulateur'], origin: 'Espagne', owners: 2, matching: true, history: 'Entretien concession Honda Málaga.', why: 'État exceptionnel, carénages sans fêlure.', status: 'Disponible', location: 'Showroom', purchase: { date: day(-60), price: 52000, sellerType: 'Particulier', from: 'Particulier, Málaga' }, costs: [{ label: 'Transport ferry', amount: 1800, cat: 'Transport' }, { label: 'Carte grise', amount: 700, cat: 'Administratif' }], price: 72000, minPrice: 66000, createdAt: day(-60) },
    { id: 'v7', ref: 'STK-0022', category: 'Classique', make: 'Range Rover', model: 'Classic 3.9 V8 Vogue', year: 1990, vin: 'SALLHAMJ3LA000000', plate: 'WW 67890', mileage: 168000, unit: 'km', energy: 'Essence', engine: '3.9 L V8', power: '185 ch', gearbox: 'Automatique 4', colorExt: 'Vert Ardennes', colorInt: 'Cuir beige', seats: 5, options: ['Toit ouvrant', 'Jantes Boost'], origin: 'Royaume-Uni', owners: 3, matching: true, history: '', why: '', status: 'Vendu', location: 'Livré', purchase: { date: day(-150), price: 158000, sellerType: 'Professionnel', from: 'Négociant, Londres' }, costs: [{ label: 'Transport', amount: 3900, cat: 'Transport' }, { label: 'Carte grise', amount: 1600, cat: 'Administratif' }], price: 198000, minPrice: 190000, soldPrice: 195000, soldTo: 'c9', soldDate: day(-62), createdAt: day(-150) },
    { id: 'v8', ref: 'STK-0036', category: 'Quad / Buggy', make: 'Polaris', model: 'RZR XP 1000', year: 2021, vin: '3NSVDE999MF000000', plate: '', mileage: 2100, unit: 'km', energy: 'Essence', engine: '1.0 L bicylindre', power: '110 ch', gearbox: 'Automatique CVT', colorExt: 'Gris et rouge', colorInt: '', seats: 2, options: ['Arceau renforcé', 'Rampe LED', 'Treuil'], origin: 'Maroc', owners: 1, matching: true, history: 'Utilisé en loisir, entretien à jour.', why: 'Faible kilométrage, équipé.', status: 'Disponible', location: 'Dépôt', purchase: { date: day(-25), price: 128000, sellerType: 'Particulier', from: 'Particulier, Agadir' }, costs: [{ label: 'Transport plateau', amount: 2200, cat: 'Transport' }], price: 165000, minPrice: 155000, createdAt: day(-25) },
    { id: 'v9', ref: 'STK-0037', category: 'Nautique', make: 'Sea-Doo', model: 'GTX 170', year: 2022, vin: 'YDV00000L122', plate: '', mileage: 85, unit: 'h', energy: 'Essence', engine: '1.6 L 3 cylindres Rotax', power: '170 ch', gearbox: 'iBR', colorExt: 'Blanc et bleu', colorInt: '', seats: 3, options: ['Remorque', 'Housse'], origin: 'Espagne', owners: 1, matching: true, history: '', why: '', status: 'Disponible', location: 'Dépôt', purchase: { date: day(-18), price: 76000, sellerType: 'Particulier', from: 'Particulier, Marbella' }, costs: [{ label: 'Transport', amount: 1500, cat: 'Transport' }], price: 98000, minPrice: 92000, createdAt: day(-18) },
    { id: 'v10', ref: 'STK-0030', category: 'Classique', make: 'SEAT', model: '600 D', year: 1970, vin: '', plate: 'WW 78901', mileage: 54000, unit: 'km', energy: 'Essence', engine: '0.77 L 4 cylindres', power: '29 ch', gearbox: 'Manuelle 4', colorExt: 'Crème', colorInt: 'Simili rouge', seats: 4, options: [], origin: 'Espagne', owners: 4, matching: false, history: '', why: '', status: 'Vendu', location: 'Livré', purchase: { date: day(-170), price: 38000, sellerType: 'Particulier', from: 'Particulier, Séville' }, costs: [{ label: 'Transport', amount: 1600, cat: 'Transport' }], price: 52000, minPrice: 48000, soldPrice: 50000, soldTo: 'c7', soldDate: day(-140), createdAt: day(-170) }
  ];

  const leads = [
    { id: 'l1', clientId: 'c2', title: 'Mercedes 280 SL Pagode, boîte auto, teinte claire', vehicleId: '', stage: 'Consultation', tier: 'A', budget: 1100000, createdAt: day(-38), next: { date: day(0), label: 'Envoyer les deux propositions de sourcing' }, history: [{ date: day(-38), type: 'Instagram', note: 'Message privé après le reel « Watch me inspect ».' }, { date: day(-35), type: 'WhatsApp', note: 'Brief reçu : 1967 à 1971, boîte auto, budget confirmé.' }, { date: day(-14), type: 'Appel', note: 'Point sur les pistes Allemagne et Belgique.' }] },
    { id: 'l2', clientId: 'c3', title: 'Porsche 944 S2 Cabriolet', vehicleId: 'v4', stage: 'Gagné', tier: 'B', budget: 240000, createdAt: day(-55), next: { date: day(6), label: 'Livraison à Casablanca' }, history: [{ date: day(-55), type: 'Instagram', note: 'Demande de prix sur la publication.' }, { date: day(-41), type: 'Visite', note: 'Essai au showroom.' }, { date: day(-20), type: 'Visite', note: 'Accord à 235 000, acompte versé.' }] },
    { id: 'l3', clientId: 'c4', title: 'Alfa Romeo GT Junior 1968', vehicleId: 'v1', stage: 'Consultation', tier: 'B', budget: 210000, createdAt: day(-12), next: { date: day(2), label: 'Relance J+7 après le dossier photos' }, history: [{ date: day(-12), type: 'Email', note: 'Demande via le site, questions sur les numéros.' }, { date: day(-5), type: 'Email', note: 'Envoi du dossier photos et des factures.' }] },
    { id: 'l4', clientId: 'c10', title: 'Land Rover Defender 110', vehicleId: 'v2', stage: 'Qualifié', tier: 'B', budget: 250000, createdAt: day(-9), next: { date: day(1), label: 'Proposer un essai à la fin de la préparation' }, history: [{ date: day(-9), type: 'Instagram', note: 'Intéressé par la préparation en cours.' }] },
    { id: 'l5', clientId: 'c5', title: 'Jet ski Sea-Doo et buggy pour l\'été', vehicleId: 'v9', stage: 'Nouveau', tier: 'C', budget: 0, createdAt: day(-1), next: { date: day(0), label: 'Rappeler, demande reçue sur WhatsApp' }, history: [{ date: day(-1), type: 'WhatsApp', note: 'Demande de disponibilité.' }] },
    { id: 'l6', clientId: 'c11', title: 'Honda Gold Wing GL1500', vehicleId: 'v6', stage: 'Nouveau', tier: 'B', budget: 70000, createdAt: day(-3), next: { date: day(-1), label: 'Envoyer la vidéo de démarrage' }, history: [{ date: day(-3), type: 'Instagram', note: 'Demande de vidéo moteur.' }] },
    { id: 'l7', clientId: 'c9', title: 'Second véhicule : Defender ou Series III', vehicleId: '', stage: 'Qualifié', tier: 'A', budget: 300000, createdAt: day(-10), next: { date: day(4), label: 'Présenter le Defender en fin de préparation' }, history: [{ date: day(-10), type: 'Appel', note: 'Appel de courtoisie J+60, intéressée par un 4x4.' }] },
    { id: 'l8', clientId: 'c12', title: 'Mercedes W123 pour tournage', vehicleId: 'v3', stage: 'Offre', tier: 'C', budget: 85000, createdAt: day(-16), next: { date: day(3), label: 'Relance offre J+21' }, history: [{ date: day(-16), type: 'Email', note: 'Demande d\'achat pour une production.' }, { date: day(-8), type: 'Email', note: 'Offre envoyée à 86 000.' }] }
  ];

  const tasks = [
    { id: 'k1', date: day(0), label: 'Appel de courtoisie J+60, Range Rover Classic', clientId: 'c9', kind: 'Fidélisation', done: false },
    { id: 'k2', date: day(0), label: 'Faire valider le supplément sellerie', clientId: 'c1', kind: 'Atelier', done: false },
    { id: 'k3', date: day(1), label: 'Envoyer les photos d\'avancement de la BMW', clientId: 'c8', kind: 'Atelier', done: false },
    { id: 'k4', date: day(5), label: 'Anniversaire d\'achat : SEAT 600', clientId: 'c7', kind: 'Fidélisation', done: false }
  ];

  const orders = [
    { id: 'o1', ref: 'CMD-2026-014', clientId: 'c3', vehicleId: 'v4', date: day(-20), price: 235000, status: 'Papiers en cours', payments: [{ date: day(-20), amount: 50000, mode: 'Virement' }], delivery: { date: day(6), mode: 'Livraison plateau', address: 'Casablanca, Maarif' }, checklist: [{ label: 'Bon de commande signé', done: true }, { label: 'Acompte encaissé', done: true }, { label: 'Déclaration de cession NARSA', done: true }, { label: 'Dossier mutation déposé', done: false }, { label: 'Contrôle final atelier', done: false }, { label: 'Nettoyage et plein', done: false }, { label: 'Solde encaissé', done: false }], notes: '' },
    { id: 'o2', ref: 'CMD-2026-011', clientId: 'c9', vehicleId: 'v7', date: day(-70), price: 195000, status: 'Livré', payments: [{ date: day(-70), amount: 40000, mode: 'Chèque' }, { date: day(-62), amount: 155000, mode: 'Virement' }], delivery: { date: day(-62), mode: 'Retrait showroom', address: '' }, checklist: [{ label: 'Bon de commande signé', done: true }, { label: 'Acompte encaissé', done: true }, { label: 'Déclaration de cession NARSA', done: true }, { label: 'Dossier mutation déposé', done: true }, { label: 'Contrôle final atelier', done: true }, { label: 'Nettoyage et plein', done: true }, { label: 'Solde encaissé', done: true }], notes: '' },
    { id: 'o3', ref: 'CMD-2026-007', clientId: 'c7', vehicleId: 'v10', date: day(-146), price: 50000, status: 'Livré', payments: [{ date: day(-140), amount: 50000, mode: 'Virement' }], delivery: { date: day(-140), mode: 'Livraison plateau', address: 'Rabat, Agdal' }, checklist: [{ label: 'Bon de commande signé', done: true }, { label: 'Solde encaissé', done: true }], notes: '' }
  ];

  const L = (task, hours, tech, offset) => ({ date: day(offset), tech, task, hours });
  const P = (label, kind, qty, unitCost, unitPrice, itemId) => ({ label, kind, qty, unitCost, unitPrice, itemId: itemId || '' });

  const workOrders = [
    {
      id: 'w1', ref: 'OR-2026-0142', type: 'Restauration', clientId: 'c1', stockVehicleId: '',
      vehicle: { make: 'Mercedes-Benz', model: '280 SL Pagode (W113)', year: 1969, plate: 'WW 11223', vin: 'WDB1130441A000000', color: 'Blanc papyrus' },
      receivedAt: day(-15), promisedAt: day(45), stage: 'Travaux', progress: 62,
      requested: ['Restauration carrosserie complète, traitement corrosion', 'Peinture teinte d\'origine', 'Réfection freins et trains roulants', 'Sellerie cuir complète (sous-traitée)', 'Rechromage des pare-chocs'],
      jobs: [{ label: 'Démontage et inventaire', done: true }, { label: 'Décapage et traitement corrosion', done: true }, { label: 'Soudure plancher arrière', done: true }, { label: 'Freins et trains roulants', done: true }, { label: 'Apprêt et ponçage', done: false }, { label: 'Peinture', done: false }, { label: 'Remontage et sellerie', done: false }, { label: 'Réglages et essai routier', done: false }],
      inspection: inspection({ mileage: 64210, fuel: '1/4', signedBy: 'Driss Benali', photos: 18 }, { 'Carrosserie': ['Défaut', 'Choc ancien aile avant gauche'], 'Peinture': ['Défaut', 'Ternie, microfissures capot'], 'Châssis et soubassement': ['Défaut', 'Corrosion plancher arrière'], 'Pneus et jantes': ['À surveiller', 'Pneus de 2011'], 'Intérieur et sellerie': ['Défaut', 'Cuir craquelé'], 'Climatisation': ['À surveiller', 'Non équipée'] }, { damages: [{ zone: 'Aile avant gauche', desc: 'Trace de choc ancienne, réparation non documentée' }], accident: 'Choc avant gauche ancien, non déclaré par le précédent propriétaire.', remarks: 'Le client souhaite conserver le volant d\'origine.' }),
      labor: [L('Démontage, inventaire des pièces', 8, 't1', -14), L('Décapage caisse, traitement corrosion', 9.5, 't2', -13), L('Soudure plancher arrière', 7.5, 't1', -11), L('Réfection freins avant et arrière', 6, 't1', -8), L('Apprêt et ponçage', 8.5, 't2', -6), L('Contrôle faisceau électrique', 3, 't3', -4), L('Apprêt, deuxième passe', 3.5, 't2', -1)],
      parts: [P('Kit joints de portes W113', 'Pièce', 1, 2400, 3200, 'i1'), P('Disques et plaquettes avant W113', 'Pièce', 1, 3500, 4600, 'i2'), P('Huile moteur 20W50', 'Fluide', 6, 70, 90, 'i11'), P('Apprêt époxy', 'Consommable', 3, 480, 650, 'i17'), P('Liquide de frein DOT 4', 'Fluide', 2, 70, 90, 'i13'), P('Tôles de plancher arrière', 'Pièce', 1, 5200, 6800, ''), P('Papier abrasif P400', 'Consommable', 2, 120, 160, 'i18')],
      external: [{ label: 'Sellerie cuir complète', supplier: 'Atelier de sellerie (fictif)', cost: 9000, price: 11000, status: 'En cours' }, { label: 'Rechromage pare-chocs', supplier: 'Chromage Tanger (fictif)', cost: 4200, price: 5200, status: 'Terminé' }],
      quoteId: 'q1', invoiceId: '', exit: null, notes: ''
    },
    {
      id: 'w2', ref: 'OR-2026-0144', type: 'Préparation stock', clientId: '', stockVehicleId: 'v2',
      vehicle: { make: 'Land Rover', model: 'Defender 110 200Tdi', year: 1994, plate: 'WW 23456', vin: 'SALLDHMF7AA000000', color: 'Coniston Green' },
      receivedAt: day(-24), promisedAt: day(8), stage: 'Travaux', progress: 40,
      requested: ['Révision complète moteur et boîtes', 'Remplacement amortisseurs', 'Reprise peinture galerie et pare-chocs', 'Nettoyage et préparation vente'],
      jobs: [{ label: 'Révision moteur', done: true }, { label: 'Vidanges ponts et boîtes', done: true }, { label: 'Amortisseurs', done: false }, { label: 'Peinture galerie', done: false }, { label: 'Préparation esthétique', done: false }],
      inspection: inspection({ mileage: 214000, fuel: '1/2', signedBy: 'Showroom', photos: 12 }, { 'Peinture': ['À surveiller', 'Rayures galerie'], 'Direction et suspension': ['Défaut', 'Amortisseurs fatigués'], 'Intérieur et sellerie': ['À surveiller', 'Siège conducteur usé'] }),
      labor: [L('Révision moteur, courroie', 7, 't1', -20), L('Vidanges ponts, boîte, transfert', 4, 't4', -18), L('Diagnostic électrique', 2.5, 't3', -10)],
      parts: [P('Kit courroie 200Tdi', 'Pièce', 1, 1350, 1800, 'i5'), P('Huile 10W40', 'Fluide', 7, 60, 80, 'i12'), P('Huile de pont 80W90', 'Fluide', 6, 55, 75, 'i15'), P('Filtres (huile, gasoil, air)', 'Pièce', 1, 620, 850, '')],
      external: [{ label: 'Amortisseurs Bilstein, montage', supplier: 'Fournisseur 4x4 (fictif)', cost: 4800, price: 4800, status: 'Commandé' }],
      quoteId: '', invoiceId: '', exit: null, notes: 'OR interne : les coûts remontent dans le coût de revient du STK-0034.'
    },
    {
      id: 'w3', ref: 'OR-2026-0118', type: 'Préparation stock', clientId: '', stockVehicleId: 'v1',
      vehicle: { make: 'Alfa Romeo', model: 'GT Junior 1300', year: 1968, plate: 'WW 12345', vin: 'AR1530000', color: 'Rosso Alfa' },
      receivedAt: day(-74), promisedAt: day(-50), stage: 'Livré', progress: 100,
      requested: ['Révision carburateurs', 'Freins complets', 'Polissage et préparation'],
      jobs: [{ label: 'Carburateurs', done: true }, { label: 'Freins', done: true }, { label: 'Polissage', done: true }],
      inspection: inspection({ mileage: 87350, fuel: '1/4', signedBy: 'Showroom', photos: 9 }, { 'Freins': ['Défaut', 'Étriers grippés'], 'Peinture': ['À surveiller', 'Voile léger'] }),
      labor: [L('Révision carburateurs Weber', 9, 't1', -72), L('Freins complets', 8, 't1', -68), L('Polissage carrosserie', 12, 't4', -60), L('Réglage allumage', 3, 't3', -55)],
      parts: [P('Kit révision Weber 40 DCOE', 'Pièce', 2, 900, 1200, 'i9'), P('Étriers reconditionnés', 'Pièce', 4, 1100, 1450, ''), P('Liquide de frein DOT 4', 'Fluide', 2, 70, 90, 'i13'), P('Pâte à polir et lustrer', 'Consommable', 2, 260, 340, '')],
      external: [{ label: 'Rectification disques', supplier: 'Usinage Tanger (fictif)', cost: 1600, price: 1600, status: 'Terminé' }],
      quoteId: '', invoiceId: '', exit: { date: day(-50), mileage: 87390, notes: 'Prête à la vente, essai routier sans remarque.', checks: [] }, notes: ''
    },
    {
      id: 'w4', ref: 'OR-2026-0145', type: 'Restauration', clientId: 'c8', stockVehicleId: '',
      vehicle: { make: 'BMW', model: '2002 tii', year: 1973, plate: 'M AB 1973 (DE)', vin: '2760000', color: 'Inka orange' },
      receivedAt: day(-6), promisedAt: day(75), stage: 'Devis', progress: 5,
      requested: ['Restauration carrosserie et peinture', 'Traitement corrosion bas de caisse et passages de roues'],
      jobs: [{ label: 'Inspection détaillée et photos', done: true }, { label: 'Devis', done: false }],
      inspection: inspection({ mileage: 142800, fuel: '1/4', signedBy: 'Transporteur pour H. Becker', photos: 32 }, { 'Carrosserie': ['Défaut', 'Bas de caisse perforés'], 'Châssis et soubassement': ['Défaut', 'Corrosion passages de roues arrière'], 'Peinture': ['Défaut', 'Repeinte, teinte non d\'origine'], 'Vitrage': ['À surveiller', 'Joint de pare-brise sec'] }, { damages: [{ zone: 'Porte arrière droite', desc: 'Enfoncement léger' }], remarks: 'Véhicule arrivé par camion depuis Munich. Clés et carnet remis par le transporteur.' }),
      labor: [L('Inspection détaillée, photos, mesures', 3, 't2', -5)],
      parts: [], external: [], quoteId: 'q2', invoiceId: '', exit: null, notes: ''
    },
    {
      id: 'w5', ref: 'OR-2026-0146', type: 'Réparation', clientId: 'c6', stockVehicleId: '',
      vehicle: { make: 'Toyota', model: 'Land Cruiser HDJ80', year: 1996, plate: 'WW 99887', vin: 'JT111HJ8000000000', color: 'Blanc' },
      receivedAt: day(0), promisedAt: day(4), stage: 'Inspection', progress: 0,
      requested: ['Embrayage qui patine', 'Bruit au freinage avant'],
      jobs: [],
      inspection: inspection({ mileage: 386500, fuel: '3/4', signedBy: 'Omar Tazi', photos: 6 }, { 'Boîte et embrayage': ['Défaut', 'Patine en 4e et 5e'], 'Freins': ['À surveiller', 'Bruit avant droit'], 'Carrosserie': ['À surveiller', 'Rayure portière arrière gauche'] }, { damages: [{ zone: 'Portière arrière gauche', desc: 'Rayure longue, existante à l\'arrivée' }] }),
      labor: [], parts: [], external: [], quoteId: '', invoiceId: '', exit: null, notes: ''
    },
    {
      id: 'w6', ref: 'OR-2026-0140', type: 'Entretien', clientId: 'c7', stockVehicleId: '',
      vehicle: { make: 'SEAT', model: '600 D', year: 1970, plate: 'WW 78901', vin: '', color: 'Crème' },
      receivedAt: day(-9), promisedAt: day(1), stage: 'Contrôle sortie', progress: 95,
      requested: ['Révision annuelle', 'Faisceau éclairage arrière'],
      jobs: [{ label: 'Vidange et réglages', done: true }, { label: 'Faisceau arrière', done: true }, { label: 'Essai routier', done: false }],
      inspection: inspection({ mileage: 55900, fuel: '1/2', signedBy: 'Sofia Berrada', photos: 5 }, { 'Éclairage': ['Défaut', 'Feux arrière intermittents'] }),
      labor: [L('Vidange, réglage culbuteurs', 2.5, 't1', -8), L('Remplacement faisceau arrière', 4, 't3', -6)],
      parts: [P('Huile moteur 20W50', 'Fluide', 3, 70, 90, 'i11'), P('Bougies Bosch W7DC', 'Pièce', 4, 35, 55, 'i4'), P('Faisceau arrière', 'Pièce', 1, 650, 900, '')],
      external: [], quoteId: 'q3', invoiceId: '', exit: null, notes: ''
    },
    {
      id: 'w7', ref: 'OR-2026-0137', type: 'Entretien', clientId: 'c9', stockVehicleId: '',
      vehicle: { make: 'Range Rover', model: 'Classic 3.9 V8 Vogue', year: 1990, plate: 'WW 67890', vin: 'SALLHAMJ3LA000000', color: 'Vert Ardennes' },
      receivedAt: day(-28), promisedAt: day(-25), stage: 'Livré', progress: 100,
      requested: ['Révision des 30 jours offerte', 'Contrôle suspension pneumatique'],
      jobs: [{ label: 'Révision', done: true }, { label: 'Suspension', done: true }],
      inspection: inspection({ mileage: 168900, fuel: '1/2', signedBy: 'Nadia Chraibi', photos: 4 }, {}),
      labor: [L('Révision et contrôle suspension', 3.5, 't1', -27)],
      parts: [P('Huile 10W40', 'Fluide', 6, 60, 80, 'i12'), P('Filtre à huile', 'Pièce', 1, 90, 140, '')],
      external: [], quoteId: 'q4', invoiceId: 'f1', exit: { date: day(-25), mileage: 168920, notes: 'RAS, suspension conforme.', checks: [] }, notes: ''
    }
  ];

  const QL = (label, kind, qty, unitPrice) => ({ label, kind, qty, unitPrice });

  const quotes = [
    { id: 'q1', ref: 'DV-2026-0087', company: 'atelier', clientId: 'c1', woId: 'w1', date: day(-13), validDays: 30, status: 'Approuvé', approvedAt: day(-11), approvedBy: 'Driss Benali', lines: [QL('Main d\'œuvre carrosserie et mécanique', 'Main d\'œuvre', 80, 350), QL('Pièces et fluides (estimation)', 'Pièce', 1, 32000), QL('Peinture teinte d\'origine, matières', 'Pièce', 1, 12000), QL('Sellerie cuir complète', 'Sous-traitance', 1, 11000), QL('Rechromage pare-chocs', 'Sous-traitance', 1, 5200)], notes: 'Acompte de 30 % à l\'approbation.' },
    { id: 'q2', ref: 'DV-2026-0091', company: 'atelier', clientId: 'c8', woId: 'w4', date: day(-3), validDays: 30, status: 'Envoyé', lines: [QL('Main d\'œuvre tôlerie et peinture', 'Main d\'œuvre', 140, 350), QL('Tôles de réparation bas de caisse et passages', 'Pièce', 1, 14500), QL('Peinture Inka orange, matières', 'Pièce', 1, 15000), QL('Joints de vitrage', 'Pièce', 1, 3800)], notes: 'Transport retour vers Munich non inclus.' },
    { id: 'q3', ref: 'DV-2026-0089', company: 'atelier', clientId: 'c7', woId: 'w6', date: day(-9), validDays: 30, status: 'Approuvé', approvedAt: day(-9), approvedBy: 'Sofia Berrada', lines: [QL('Main d\'œuvre', 'Main d\'œuvre', 6.5, 350), QL('Huile, bougies, faisceau', 'Pièce', 1, 1390)], notes: '' },
    { id: 'q4', ref: 'DV-2026-0084', company: 'atelier', clientId: 'c9', woId: 'w7', date: day(-28), validDays: 30, status: 'Approuvé', approvedAt: day(-28), approvedBy: 'Nadia Chraibi', lines: [QL('Révision des 30 jours (offerte)', 'Main d\'œuvre', 3.5, 0), QL('Huile et filtre', 'Pièce', 1, 620)], notes: 'Main d\'œuvre offerte, geste commercial après achat.' }
  ];

  const invoices = [
    { id: 'f1', ref: 'FA-2026-0203', company: 'atelier', clientId: 'c9', woId: 'w7', orderId: '', date: day(-25), lines: [QL('Révision des 30 jours (offerte)', 'Main d\'œuvre', 3.5, 0), QL('Huile 10W40, 6 L', 'Pièce', 6, 80), QL('Filtre à huile', 'Pièce', 1, 140)], payments: [{ date: day(-25), amount: 744, mode: 'Carte' }], notes: '' },
    { id: 'f2', ref: 'FA-2026-0198', company: 'showroom', clientId: 'c9', woId: '', orderId: 'o2', date: day(-62), regime: 'marge', lines: [QL('Range Rover Classic 3.9 V8 Vogue 1990, STK-0022', 'Véhicule', 1, 195000)], payments: [{ date: day(-70), amount: 40000, mode: 'Chèque' }, { date: day(-62), amount: 155000, mode: 'Virement' }], notes: '' },
    { id: 'f3', ref: 'FA-2026-0151', company: 'showroom', clientId: 'c7', woId: '', orderId: 'o3', date: day(-140), regime: 'marge', lines: [QL('SEAT 600 D 1970, STK-0030', 'Véhicule', 1, 50000)], payments: [{ date: day(-140), amount: 50000, mode: 'Virement' }], notes: '' }
  ];

  // past atelier invoices so the accounting chart has history
  const pastClients = ['c1', 'c7', 'c9', 'c12', 'c6', 'c3'];
  const pastAmounts = [[6800, 12400, 3900, 21000], [8800, 4600, 15200], [5400, 9900, 18600, 2700], [11800, 7300, 4200], [16400, 3300, 9100, 6900]];
  let n = 160;
  pastAmounts.forEach((month, mi) => {
    month.forEach((amt, j) => {
      const offset = -150 + mi * 30 + j * 6;
      n += 7;
      invoices.push({ id: 'fp' + mi + j, ref: 'FA-2026-0' + n, company: 'atelier', clientId: pastClients[(mi + j) % pastClients.length], woId: '', orderId: '', date: day(offset), lines: [QL('Entretien et réparation', 'Main d\'œuvre', 1, Math.round(amt * 0.45)), QL('Pièces et fluides', 'Pièce', 1, Math.round(amt * 0.55))], payments: [{ date: day(offset), amount: Math.round(amt * 1.2), mode: j % 2 ? 'Virement' : 'Carte' }], notes: '' });
    });
  });

  // invoice numbers must follow dates without gaps going backwards
  invoices.sort((a, b) => a.date.localeCompare(b.date)).forEach((f, i) => { f.ref = 'FA-2026-' + String(101 + i * 3).padStart(4, '0'); });

  const expenses = [];
  const E = (company, offset, category, label, ht, tva, supplier) => expenses.push({ id: 'e' + expenses.length, company, date: day(offset), category, label, ht, tva: tva == null ? 20 : tva, supplier: supplier || '' });
  for (let m = 0; m < 6; m++) {
    const o = -150 + m * 30;
    E('showroom', o + 1, 'Loyer', 'Loyer showroom', 18000, 0, 'Bailleur');
    E('atelier', o + 1, 'Loyer', 'Loyer atelier', 12000, 0, 'Bailleur');
    E('showroom', o + 3, 'Marketing', 'Production photo et vidéo', 4500, 20, 'Agence de contenu');
    E('atelier', o + 5, 'Énergie', 'Électricité et eau', 2600 + m * 120, 14, 'Amendis');
    E('atelier', o + 8, 'Pièces', 'Achats pièces et consommables', 9000 + (m % 3) * 2100, 20, 'Fournisseurs divers');
    E('showroom', o + 25, 'Salaires', 'Salaires showroom', 22000, 0, '');
    E('atelier', o + 25, 'Salaires', 'Salaires atelier', 31000, 0, '');
  }
  vehicles.forEach((v) => {
    if (v.purchase.date) E('showroom', Math.round((new Date(v.purchase.date) - new Date(day(0))) / 864e5), 'Achat véhicule', 'Achat ' + v.make + ' ' + v.model + ' (' + v.ref + ')', v.purchase.price, 0, v.purchase.from);
  });

  const I = (id, sku, name, category, compat, location, qty, unit, min, cost, price, supplier) => ({ id, sku, name, category, compat, location, qty, unit, min, cost, price, supplier });
  const T = (id, sku, name, location, state, holder, lastCheck) => ({ id, sku, name, category: 'Outillage', compat: '', location, qty: 1, unit: 'u', min: 0, cost: 0, price: 0, supplier: '', state, holder, lastCheck: day(lastCheck) });
  const inventory = [
    I('i1', 'P-W113-JP', 'Kit joints de portes W113', 'Pièce', 'Mercedes W113', 'Rayon A1', 1, 'u', 1, 2400, 3200, 'Spécialiste Mercedes classiques'),
    I('i2', 'P-W113-FR', 'Disques et plaquettes avant W113', 'Pièce', 'Mercedes W113', 'Rayon A1', 0, 'u', 1, 3500, 4600, 'Spécialiste Mercedes classiques'),
    I('i3', 'P-W123-FH', 'Filtre à huile OM617', 'Pièce', 'Mercedes W123', 'Rayon A2', 6, 'u', 3, 90, 140, 'Distributeur pièces auto'),
    I('i4', 'P-BOS-W7DC', 'Bougies Bosch W7DC', 'Pièce', 'Multiples', 'Rayon A3', 14, 'u', 8, 35, 55, 'Distributeur pièces auto'),
    I('i5', 'P-DEF-CR', 'Kit courroie 200Tdi', 'Pièce', 'Land Rover 200Tdi', 'Rayon B1', 0, 'u', 1, 1350, 1800, 'Fournisseur 4x4'),
    I('i6', 'P-HDJ-EMB', 'Kit embrayage HDJ80', 'Pièce', 'Toyota HDJ80', 'Rayon B2', 1, 'u', 1, 3900, 5200, 'Fournisseur 4x4'),
    I('i7', 'P-DEF-AM', 'Amortisseurs Bilstein Defender', 'Pièce', 'Land Rover Defender', 'Rayon B1', 0, 'u', 2, 1200, 1600, 'Fournisseur 4x4'),
    I('i8', 'P-ALF-JC', 'Joint de culasse Alfa 1300', 'Pièce', 'Alfa Romeo 105', 'Rayon A4', 2, 'u', 1, 420, 600, 'Spécialiste Alfa Romeo'),
    I('i9', 'P-WEB-40', 'Kit révision Weber 40 DCOE', 'Pièce', 'Multiples', 'Rayon A4', 3, 'u', 2, 900, 1200, 'Spécialiste carburation'),
    I('i10', 'P-UNI-BAT', 'Batterie 12 V 70 Ah', 'Pièce', 'Multiples', 'Rayon C1', 2, 'u', 2, 950, 1300, 'Distributeur pièces auto'),
    I('i11', 'F-HM-2050', 'Huile moteur 20W50', 'Fluide', 'Moteurs anciens', 'Fûts', 38, 'L', 20, 70, 90, 'Lubrifiants'),
    I('i12', 'F-HM-1040', 'Huile moteur 10W40', 'Fluide', 'Multiples', 'Fûts', 24, 'L', 20, 60, 80, 'Lubrifiants'),
    I('i13', 'F-LF-DOT4', 'Liquide de frein DOT 4', 'Fluide', 'Multiples', 'Armoire fluides', 3, 'L', 4, 70, 90, 'Lubrifiants'),
    I('i14', 'F-LR-G12', 'Liquide de refroidissement', 'Fluide', 'Multiples', 'Armoire fluides', 18, 'L', 10, 40, 60, 'Lubrifiants'),
    I('i15', 'F-HP-8090', 'Huile de pont et boîte 80W90', 'Fluide', 'Multiples', 'Fûts', 9, 'L', 10, 55, 75, 'Lubrifiants'),
    I('i16', 'C-GR-LIT', 'Graisse au lithium', 'Consommable', '', 'Armoire fluides', 4, 'kg', 2, 85, 120, 'Lubrifiants'),
    I('i17', 'C-APR-EPX', 'Apprêt époxy', 'Consommable', '', 'Cabine peinture', 5, 'L', 4, 480, 650, 'Fournisseur peinture'),
    I('i18', 'C-ABR-P400', 'Papier abrasif P400', 'Consommable', '', 'Cabine peinture', 6, 'paquet', 5, 120, 160, 'Fournisseur peinture'),
    I('i19', 'C-MAS-POL', 'Mastic polyester', 'Consommable', '', 'Cabine peinture', 2, 'kg', 3, 160, 220, 'Fournisseur peinture'),
    I('i20', 'C-VER-2K', 'Vernis 2K', 'Consommable', '', 'Cabine peinture', 7, 'L', 4, 390, 520, 'Fournisseur peinture'),
    I('i21', 'C-GAN-NIT', 'Gants nitrile', 'Consommable', '', 'Magasin', 9, 'boîte', 6, 65, 0, 'Fournitures atelier'),
    I('i22', 'C-SOU-MIG', 'Fil de soudure MIG 0,8', 'Consommable', '', 'Magasin', 1, 'bobine', 2, 240, 0, 'Fournitures atelier'),
    T('o1', 'O-PONT-2C', 'Pont élévateur 2 colonnes', 'Baie 1', 'Disponible', '', -40),
    T('o2', 'O-PONT-4C', 'Pont élévateur 4 colonnes', 'Baie 2', 'En utilisation', 'Karim', -40),
    T('o3', 'O-DIAG', 'Valise de diagnostic', 'Bureau atelier', 'En utilisation', 'Hamza', -12),
    T('o4', 'O-MIG', 'Poste à souder MIG', 'Tôlerie', 'Disponible', '', -60),
    T('o5', 'O-COMP', 'Compresseur 500 L', 'Local technique', 'Disponible', '', -20),
    T('o6', 'O-CAB', 'Cabine de peinture', 'Cabine peinture', 'En maintenance', '', -95),
    T('o7', 'O-HVLP', 'Pistolet peinture HVLP', 'Cabine peinture', 'Disponible', '', -15),
    T('o8', 'O-DYNA', 'Clé dynamométrique 40 à 200 Nm', 'Servante 1', 'Disponible', '', -110),
    T('o9', 'O-CLIM', 'Station de recharge clim', 'Baie 3', 'Disponible', '', -30)
  ];

  const at = (offset, h, m) => day(offset) + 'T' + String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0');
  const events = [
    { id: 'ev1', start: at(0, 9), end: at(0, 10), title: 'Réception Land Cruiser HDJ80', type: 'RDV atelier', clientId: 'c6', woId: 'w5', notes: '' },
    { id: 'ev2', start: at(0, 15), end: at(0, 15, 45), title: 'Visio : Alfa GT Junior, détails des numéros', type: 'Visite showroom', clientId: 'c4', woId: '', notes: '' },
    { id: 'ev3', start: at(1, 11), end: at(1, 12), title: 'Restitution SEAT 600', type: 'Livraison', clientId: 'c7', woId: 'w6', notes: '' },
    { id: 'ev4', start: at(2, 10), end: at(2, 11), title: 'Essai Gold Wing', type: 'Essai', clientId: 'c11', woId: '', notes: '' },
    { id: 'ev5', start: at(3, 9), end: at(3, 17), title: 'Inspection sourcing 280 SE à Hambourg', type: 'Événement', clientId: '', woId: '', notes: 'Déplacement' },
    { id: 'ev6', start: at(6, 14), end: at(6, 16), title: 'Livraison Porsche 944 à Casablanca', type: 'Livraison', clientId: 'c3', woId: '', notes: '' },
    { id: 'ev7', start: at(9, 9), end: at(9, 10), title: 'Arrivée Mercedes 190 SL, restauration', type: 'Réservation restauration', clientId: 'c1', woId: '', notes: 'Créneau réservé, carrosserie à partir du 1er du mois.' },
    { id: 'ev8', start: at(12, 8), end: at(12, 13), title: 'Classic Tour : Tanger vers Cap Spartel', type: 'Événement', clientId: '', woId: '', notes: 'Clients et propriétaires invités.' },
    { id: 'ev9', start: at(16, 10), end: at(16, 11), title: 'Réservation restauration : Citroën DS 21', type: 'Réservation restauration', clientId: 'c12', woId: '', notes: '' },
    { id: 'ev10', start: at(-2, 10), end: at(-2, 11), title: 'Essai Defender (avant préparation)', type: 'Essai', clientId: 'c10', woId: '', notes: '' },
    { id: 'ev11', start: at(4, 16), end: at(4, 17), title: 'Présentation Defender à N. Chraibi', type: 'Visite showroom', clientId: 'c9', woId: '', notes: '' },
    { id: 'ev12', start: at(22, 9), end: at(22, 10), title: 'Arrivée BMW 2002 : démarrage tôlerie', type: 'Réservation restauration', clientId: 'c8', woId: 'w4', notes: 'Sous réserve d\'approbation du devis.' }
  ];

  const sourcing = [
    { id: 's1', clientId: 'c2', brief: 'Mercedes 280 SL Pagode, 1967 à 1971, boîte automatique, teinte claire, intérieur cuir', budget: 1100000, deadline: day(60), status: 'En chasse', candidates: [{ desc: '280 SL 1969, papyrus, auto', country: 'Allemagne', price: 920000, verdict: 'À inspecter' }, { desc: '280 SL 1970, argent, auto', country: 'Belgique', price: 1050000, verdict: 'Écarté : numéros non concordants' }] },
    { id: 's2', clientId: 'c1', brief: 'Porsche 911 2.7, 1974 à 1977, historique complet', budget: 900000, deadline: day(120), status: 'Brief reçu', candidates: [] },
    { id: 's3', clientId: 'c9', brief: 'Land Rover Series III ou Defender 90, état d\'usage', budget: 300000, deadline: day(45), status: 'Proposition', candidates: [{ desc: 'Defender 110 1994 (STK-0034), stock interne', country: 'Maroc', price: 245000, verdict: 'Proposé' }] }
  ];

  const settings = {
    tva: 20,
    laborRate: 350,
    laborCostRate: 160,
    quoteValidity: 30,
    whatsapp: '',
    companies: {
      showroom: { name: 'ABS Custom Rides', activity: 'Showroom, vente de véhicules de collection', address: 'Tanger, Maroc', phone: '[Téléphone]', email: '[Email]', ice: '[ICE]', if: '[IF]', rc: '[RC Tanger]', tp: '[Patente]' },
      atelier: { name: 'ABS Custom Rides Atelier', activity: 'Réparation, restauration et préparation', address: 'Tanger, Maroc', phone: '[Téléphone]', email: '[Email]', ice: '[ICE]', if: '[IF]', rc: '[RC Tanger]', tp: '[Patente]' }
    }
  };

  return { version: SEED_VERSION, settings, clients, technicians, vehicles, leads, tasks, orders, workOrders, quotes, invoices, expenses, inventory, events, sourcing };
}
