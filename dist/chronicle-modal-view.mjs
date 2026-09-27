/**
 * @file chronicle-modal-view.mjs
 * @description Módulo de presentación para la Crónica de campaña y el registro rápido (P1.3).
 * Clasifica los mensajes del historial (combate, economía, eventos, campaña) y construye
 * el contenido HTML para la barra lateral y el modal filtrable de eventos por ronda.
 */

import {escapeHtml} from './ui-accessibility.mjs?v=1';

export function chronicleCategory(text) {
  const value = String(text).toLowerCase();
  if (/conquist|atac|combate|baja|elimin|defend|frente|guerra/.test(value)) return 'combat';
  if (/compr|mercado|producci|\$|fondos|refuerzo|subsidio/.test(value)) return 'economy';
  if (/evento|terremoto|tsunami|temporal|alerta|geol|desastre|rutas cortadas/.test(value)) return 'events';
  return 'campaign';
}

export function chronicleListMarkup(entries = [], players = []) {
  let lastRound = null;
  return entries.map(item => {
    const round = Number(item.turn) || 1;
    const heading = round !== lastRound ? `<div class="chronicle-round">Ronda ${round}</div>` : '';
    lastRound = round;
    const player = item.p === null || item.p === undefined ? null : players[item.p];
    const category = chronicleCategory(item.text);
    return `${heading}<div class="chronicle-entry category-${category}" style="--chronicle-color:${player?.color || '#788896'}"><i></i><div><small>${player ? escapeHtml(player.name) : 'Campaña'} · R${round}</small><p>${escapeHtml(item.text)}</p></div></div>`;
  }).join('');
}

export function chronicleModalMarkup(entries = [], players = []) {
  const list = chronicleListMarkup(entries, players);
  return `<div class="chronicle-modal"><div class="chronicle-filters"><button class="active" data-chronicle-filter="all">Todos</button><button data-chronicle-filter="combat">Combate</button><button data-chronicle-filter="economy">Economía</button><button data-chronicle-filter="events">Eventos</button></div><div class="chronicle-list">${list || '<p class="chronicle-empty">La campaña todavía no tiene acontecimientos.</p>'}</div></div>`;
}

export function sidebarLogMarkup(entries = [], players = []) {
  return entries.slice(0, 8).map(l => `<div class="log-item" style="--lc:${l.p === null ? '#788896' : players[l.p]?.color || '#788896'}"><i class="log-dot"></i><span>${escapeHtml(l.text)}</span></div>`).join('');
}
