/**
 * @file strategic-views.mjs
 * @description Módulo de vistas modales para sistemas estratégicos de información.
 * Genera el desglose interactivo de Influencia v2 (P1.2) con metas de Hegemonía
 * y la visualización de Frentes de Guerra regionales (P1.1) con su escala de tensión.
 */

import {escapeHtml} from './ui-accessibility.mjs?v=1';
import {FRONT_STATES, FRONT_STATE_LABELS, getRegion} from './engine.mjs?v=22';

export function influenceModalMarkup({player, breakdown, eligibility}) {
  const pct = Math.min(100, (breakdown.total / breakdown.target) * 100);
  const diplomat = breakdown.objectives.multiplier > 1
    ? `<div class="influence-row influence-bonus"><span>Bonificación de El Diplomático <small>+40% sobre objetivos</small></span><strong>+${breakdown.objectives.bonusPoints}</strong></div>`
    : '';

  return `<div class="influence-breakdown">
    <div class="influence-total"><div><small>${escapeHtml(player.name)}</small><strong>${breakdown.total} / ${breakdown.target}</strong></div><span>Faltan ${breakdown.remaining} para la victoria</span></div>
    <div class="influence-progress"><i style="width:${pct}%"></i></div>
    <div class="influence-row"><span>Presencia territorial <small>${breakdown.territories.capped}/${breakdown.territories.cap} territorios puntuables</small></span><strong>+${breakdown.territories.points}</strong></div>
    <div class="influence-row"><span>Regiones completas <small>${breakdown.regions.capped}/${breakdown.regions.cap} × 3</small></span><strong>+${breakdown.regions.points}</strong></div>
    <div class="influence-row"><span>Objetivos completados <small>${breakdown.objectives.count} objetivos</small></span><strong>+${breakdown.objectives.basePoints}</strong></div>
    ${diplomat}
    <div class="influence-row influence-final"><span>Total calculado ahora</span><strong>${breakdown.total}</strong></div>
    <div class="influence-row"><span>Objetivo principal completado</span><strong>${eligibility.hasMain ? '✓' : 'Pendiente'}</strong></div>
    <div class="influence-row"><span>Objetivo no militar completado</span><strong>${eligibility.hasNonMilitary ? '✓' : 'Pendiente'}</strong></div>
    <p class="influence-hint">La Hegemonía exige 60 puntos, un objetivo principal y uno no militar. Producción y tropas aumentan tu capacidad de actuar, pero no conceden Influencia.</p>
  </div>`;
}

export function frontsModalMarkup({rows = [], state, human}) {
  const legend = FRONT_STATES.map(key => {
    const item = FRONT_STATE_LABELS[key];
    return `<span class="front-legend-item front-${key}"><i style="--front:${item.color}"></i>${item.name}</span>`;
  }).join('');

  const list = rows.map(({rival, region, data, label}) => {
    const regionName = getRegion(state, region).name;
    const subtitle = data.lastHostilityTurn
      ? `Última hostilidad: ronda ${data.lastHostilityTurn}`
      : 'Contacto estable';
    const battles = data.battlesThisTurn
      ? ` · ${data.battlesThisTurn} combate${data.battlesThisTurn === 1 ? '' : 's'} este turno`
      : '';
    return `<div class="front-summary front-${data.state}"><span class="front-rival-dot" style="--rival:${rival.color}"></span><div><strong>${escapeHtml(regionName)} · ${escapeHtml(human.name)} ↔ ${escapeHtml(rival.name)}</strong><small>${subtitle}${battles}</small></div><b style="--front:${label.color}">${label.icon} ${label.name}</b></div>`;
  }).join('');

  return `<div class="fronts-modal"><div class="front-legend">
    ${legend}
  </div><p class="front-explainer">Cada región mantiene una tensión independiente entre comandantes. Las rutas toman el nivel más alto de las regiones que conectan; una ruta bloqueada conserva una marca adicional.</p>
  <div class="front-list">${list || '<p class="chronicle-empty">No hay contacto regional con rivales.</p>'}</div>
  <p class="front-cooling">Sondear o usar operaciones encubiertas tensa una región; combatir y conquistar la escala. Sin hostilidades, se enfría un nivel por ronda.</p></div>`;
}
