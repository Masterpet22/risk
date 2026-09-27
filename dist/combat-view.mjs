/**
 * @file combat-view.mjs
 * @description Módulo de presentación visual para la resolución de combates (P0.1).
 * Renderiza los dados atacantes y defensores con desglose de bonificaciones,
 * el detalle de modificadores tácticos de combate y las figuras SVG
 * proporcionales al despliegue real de tropas.
 */

export function diceMarkup(values,raw=[]){return values.map((value,index)=>{const base=raw[index],hasBonus=base!==undefined&&value!==base,difference=value-(base??value);return hasBonus?`<i class="big-die die-with-bonus" title="Tirada base: ${base} + bonificación: ${difference} = ${value}"><span class="die-num">${value}</span><small class="die-calc-tag">${base} +${difference}</small></i>`:`<i class="big-die"><span class="die-num">${value}</span></i>`}).join('')}

export function comparisonMarkup(round){
  const attackerBonuses=round.bonus?.attackerReasons||[],defenderBonuses=round.bonus?.defenderReasons||[];
  return attackerBonuses.length||defenderBonuses.length?`<div class="combat-bonuses-detail">${attackerBonuses.length?`<div class="bonus-detail-item attacker">⚔ <strong>Atacante:</strong> dado base ${round.rawAttackerDice?.[0]??round.attackerDice?.[0]} + ${round.bonus.attacker} (${attackerBonuses.join(', ')}) = <strong>${round.attackerDice?.[0]}</strong>.</div>`:''}${defenderBonuses.length?`<div class="bonus-detail-item defender">🛡 <strong>Defensor:</strong> dado base ${round.rawDefenderDice?.[0]??round.defenderDice?.[0]} + ${round.bonus.defender} (${defenderBonuses.join(', ')}) = <strong>${round.defenderDice?.[0]}</strong>.</div>`:''}</div>`:'';
}

export function soldierFigures(count){const layouts={1:[[0,-2]],2:[[-9,1],[9,1]],3:[[-14,3],[0,-4],[14,3]]},points=layouts[Math.max(1,Math.min(3,count))]||layouts[1];return points.map(([x,y])=>`<g transform="translate(${x} ${y})"><circle cy="-10" r="4"/><path d="M-5-4h10l3 13H-8zM-4 8l-2 8m10-8 2 8"/></g>`).join('')}

export function roundTone(round,defending){const ownLosses=defending?round.defenderLosses:round.attackerLosses,enemyLosses=defending?round.attackerLosses:round.defenderLosses;return ownLosses<enemyLosses?'victory':ownLosses>enemyLosses?'defeat':'neutral'}
