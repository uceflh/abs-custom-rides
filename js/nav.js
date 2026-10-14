// Navigation helpers shared by views (kept separate to avoid circular imports).
export function go(hash) {
  if (location.hash === hash) refresh();
  else location.hash = hash;
}
export function refresh() {
  window.dispatchEvent(new Event('app:refresh'));
}
export function query() {
  return new URLSearchParams((location.hash.split('?')[1]) || '');
}
// Current company filter: 'all' | 'showroom' | 'atelier'
export function scope() {
  try { return localStorage.getItem('abs-scope') || 'all'; } catch (e) { return 'all'; }
}
export function setScope(s) {
  try { localStorage.setItem('abs-scope', s); } catch (e) { /* ignore */ }
}
