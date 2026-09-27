/**
 * @file combat-view.mjs
 * @description Módulo de presentación visual para la resolución de combates (P0.1).
 * Renderiza los dados atacantes y defensores con desglose de bonificaciones,
 * el detalle de modificadores tácticos de combate y las figuras SVG
 * proporcionales al despliegue real de tropas.
 */

export function diceMarkup(values,raw=[],isDefender=false,comparedCount=Infinity){
  return values.map((value,index)=>{
    const base=raw[index],hasBonus=base!==undefined&&value!==base,difference=value-(base??value);
    const isDiscarded=index>=comparedCount;
    const discardedClass=isDiscarded?' die-discarded':'';
    const defenderClass=isDefender?' defender':'';
    const bonusClass=hasBonus?' die-with-bonus':'';
    const badgeMarkup=hasBonus?`<span class="die-badge" title="Tirada base: ${base} + bonificación: ${difference} = ${value}">+${difference}<small class="die-calc-tag sr-only" style="display:none">${base} +${difference}</small></span>`:'';
    return`<i class="big-die${defenderClass}${bonusClass}${discardedClass}" data-index="${index}"><span class="die-num">${value}</span>${badgeMarkup}</i>`;
  }).join('');
}

export function matchupMarkup(round){
  const vsBadge=`<div class="vs-badge"><div class="vs-slashes"><span></span><span></span><span></span></div><span class="vs-v">V</span><span class="vs-s">S</span></div>`;
  if(!round||!round.attackerDice?.length||!round.defenderDice?.length)return`<div class="vs-container">${vsBadge}</div>`;
  const a0=round.attackerDice[0],d0=round.defenderDice[0],win0=a0>d0,winnerVal0=win0?a0:d0;
  const rightArrows=`<div class="matchup-indicators"><svg width="38" height="6" viewBox="0 0 38 6" fill="none"><path d="M0 3h34m0 0l-3-3m3 3l-3 3" stroke="#ff7b72" stroke-width="1.8" stroke-linecap="round"/></svg><span class="matchup-winner-tag winner-defender">${winnerVal0} wins</span><svg width="38" height="6" viewBox="0 0 38 6" fill="none"><path d="M0 3h34m0 0l-3-3m3 3l-3 3" stroke="#ff7b72" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
  const leftArrows=`<div class="matchup-indicators"><svg width="38" height="6" viewBox="0 0 38 6" fill="none"><path d="M38 3H4m0 0l3-3m-3 3l3 3" stroke="#38d9c8" stroke-width="1.8" stroke-linecap="round"/></svg><span class="matchup-winner-tag winner-attacker">${winnerVal0} wins</span><svg width="38" height="6" viewBox="0 0 38 6" fill="none"><path d="M38 3H4m0 0l3-3m-3 3l3 3" stroke="#38d9c8" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
  return`<div class="vs-container">${win0?leftArrows:''}${vsBadge}${!win0?rightArrows:''}</div>`;
}

export function casualtyBarMarkup(lossesA,lossesD,roundLabel=''){
  const labelSuffix=roundLabel?` <small class="casualty-round">(${roundLabel})</small>`:'';
  return`<div class="battle-casualty-bar"><strong class="casualty-label">Bajas:</strong> <span class="casualty-val">-${lossesA} Atacante | ${lossesD===0?'0':`-${lossesD}`} Defensor</span>${labelSuffix}</div>`;
}

export function comparisonMarkup(round){
  const attackerBonuses=round.bonus?.attackerReasons||[],defenderBonuses=round.bonus?.defenderReasons||[];
  return attackerBonuses.length||defenderBonuses.length?`<div class="combat-bonuses-detail">${attackerBonuses.length?`<div class="bonus-detail-item attacker">⚔ <strong>Atacante:</strong> dado base ${round.rawAttackerDice?.[0]??round.attackerDice?.[0]} + ${round.bonus.attacker} (${attackerBonuses.join(', ')}) = <strong>${round.attackerDice?.[0]}</strong>.</div>`:''}${defenderBonuses.length?`<div class="bonus-detail-item defender">🛡 <strong>Defensor:</strong> dado base ${round.rawDefenderDice?.[0]??round.defenderDice?.[0]} + ${round.bonus.defender} (${defenderBonuses.join(', ')}) = <strong>${round.defenderDice?.[0]}</strong>.</div>`:''}</div>`:'';
}

export function soldierFigures(count){const layouts={1:[[0,-2]],2:[[-9,1],[9,1]],3:[[-14,3],[0,-4],[14,3]]},points=layouts[Math.max(1,Math.min(3,count))]||layouts[1];return points.map(([x,y])=>`<g transform="translate(${x} ${y})"><circle cy="-10" r="4"/><path d="M-5-4h10l3 13H-8zM-4 8l-2 8m10-8 2 8"/></g>`).join('')}

export function roundTone(round,defending){const ownLosses=defending?round.defenderLosses:round.attackerLosses,enemyLosses=defending?round.attackerLosses:round.defenderLosses;return ownLosses<enemyLosses?'victory':ownLosses>enemyLosses?'defeat':'neutral'}
