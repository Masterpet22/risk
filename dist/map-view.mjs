/**
 * @file map-view.mjs
 * @description Módulo de presentación visual y geometría para el mapa interactivo (P0.1 / P1.1 / P5.1).
 * Genera la geometría hexagonal de territorios, el marcado SVG de nodos,
 * el cálculo de estados visuales de niebla de guerra, frentes de combate y
 * las clases reactivas de rutas estratégicas.
 */

export function hexPoints(x, y, r=50){
  return Array.from({length:6},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI/3;
    return `${(x+Math.cos(a)*r).toFixed(1)},${(y+Math.sin(a)*r).toFixed(1)}`;
  }).join(' ');
}

export function territorySvgMarkup(t, {regionShort='', regionColor='#335577', terrainIcon='🏔'}={}){
  const x=t.x*10, y=t.y*8, points=hexPoints(x, y);
  return `<g class="territory" id="terr-${t.id}" data-id="${t.id}" tabindex="0" role="button">`+
    `<polygon class="territory-shape" points="${points}" style="--region:${regionColor}44"/>`+
    `<text class="territory-region" x="${x}" y="${y-25}">${regionShort}</text>`+
    `<text class="territory-label" x="${x}" y="${y-7}">${t.name}</text>`+
    `<text class="terrain-mark" x="${x-35}" y="${y+24}">${terrainIcon}</text>`+
    `<rect class="army-disc" x="${x-24}" y="${y+3}" width="48" height="31" rx="16"/>`+
    `<text class="troop-mark" x="${x-8}" y="${y+25}">♟</text>`+
    `<text class="army-count" x="${x+11}" y="${y+25}">1</text>`+
    `</g>`;
}

export function computeTerritoryVisuals({
  t, territoryData, player, intel, isCurrentOwner=false,
  isSelected=false, isTarget=false, isDimmed=false,
  isSabotaged=false, isThreatened=false, isActiveEvent=false,
  cardValidTarget=false, rulesMode='classic', terrainColor='#555'
}){
  const ownerColor = intel.visibility === 'hidden' ? '#526a7b' : player.color;
  const classes = {
    owned: isCurrentOwner,
    selected: isSelected,
    target: isTarget,
    dimmed: isDimmed,
    'intel-full': intel.visibility === 'full',
    'intel-partial': intel.visibility === 'partial',
    'intel-hidden': intel.visibility === 'hidden',
    spied: !!intel.isSpied,
    sabotaged: !!isSabotaged,
    'event-threatened': !!isThreatened,
    'event-active': !!isActiveEvent,
    'card-valid-target': !!cardValidTarget
  };

  let ariaLabel = `${t.name}, `;
  if(intel.visibility === 'full'){
    ariaLabel += `${territoryData.troops} tropas, ${player.name}`;
  }else if(intel.visibility === 'partial'){
    ariaLabel += `aprox. ${intel.troopsDisplay} tropas, ${player.name}`;
  }else{
    ariaLabel += 'fuerza y propietario desconocidos';
  }

  return {
    ownerColor,
    terrainColor,
    classes,
    troopsDisplay: intel.troopsDisplay,
    isRange: intel.visibility === 'partial',
    isHidden: intel.visibility === 'hidden',
    troopMark: intel.visibility === 'full' ? '♟' : '?',
    showTerrain: rulesMode === 'terrain' && intel.visibility !== 'hidden',
    ariaLabel
  };
}

export function computeConnectionVisuals({
  a, b, ownerA, ownerB, regions=[], getFrontState, frontLabels={},
  isBlocked=false, isEventBlocked=false,
  selectedFrom=null, hoverId=null, routesAll=false,
  isAttackRoute=false, isManeuverRoute=false,
  reverseAttack=false, reverseManeuver=false
}){
  const severity={war:3,conflict:2,tense:1,stable:0};
  const frontState = ownerA === undefined || ownerB === undefined || ownerA === ownerB
    ? 'stable'
    : regions.map(reg=>getFrontState(ownerA, ownerB, reg)).sort((x,y)=>severity[y]-severity[x])[0] || 'stable';
  const frontColor = frontLabels[frontState]?.color || frontLabels.stable?.color || '#5da4cb';

  const related = selectedFrom && (a === selectedFrom || b === selectedFrom);
  const hovered = hoverId && (a === hoverId || b === hoverId);

  const classes = {
    blocked: isBlocked,
    'blocked-event': !!isEventBlocked,
    visible: !!(related || hovered || isBlocked),
    'show-all': routesAll,
    'route-flow-attack': !!isAttackRoute,
    'route-flow-maneuver': !!isManeuverRoute,
    'route-flow-reverse': !!(reverseAttack || reverseManeuver)
  };

  return {
    frontState,
    frontColor,
    classes
  };
}
