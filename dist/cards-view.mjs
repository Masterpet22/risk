/**
 * @file cards-view.mjs
 * @description Módulo de presentación visual para las cartas tácticas y recompensas (P1.4 / P2).
 * Renderiza la mano de cartas tácticas del jugador, la barra de selección de objetivo,
 * el selector de recompensas de conquista y el diálogo de descarte por mano llena.
 */

export function cardsHeadMarkup(count, limit){
  return `<div class="cards-head"><span>CARTAS TÁCTICAS</span><strong>${count} / ${limit}</strong></div>`;
}

export function cardTargetingBarMarkup(cardDef, originName=''){
  if(!cardDef)return '';
  const fromText=originName?` (desde ${originName})`:'';
  return `<div class="card-targeting-bar"><span>🎯 Seleccionando objetivo para <b>${cardDef.name}</b>${fromText}</span><button id="cancelTargetingBtn" class="cancel-card-btn">Cancelar</button></div>`;
}

export function cardRewardChoiceMarkup(choices, catalog){
  if(!choices?.length)return '';
  const options=choices.map(cId=>{
    const c=catalog[cId];
    if(!c)return '';
    return `<button class="reward-choice-btn" data-reward-card="${cId}"><b>${c.icon} ${c.name}</b><small>${c.desc}</small></button>`;
  }).join('');
  return `<div class="card-discard-box card-reward-choice"><strong>🏆 Elige tu recompensa</strong><p>Conquistaste este turno. Escoge una de estas dos cartas:</p><div class="discard-options">${options}</div></div>`;
}

export function cardDiscardChoiceMarkup(cards, drawnCard, limit, catalog){
  if(!drawnCard)return '';
  const cardButtons=cards.map(cId=>{
    const c=catalog[cId];
    if(!c)return '';
    return `<button class="discard-btn" data-discard="${cId}">Descartar ${c.icon} ${c.name}</button>`;
  }).join('');
  const discardDrawn=`<button class="discard-btn discard-new" data-discard="${drawnCard.id}">Descartar la elegida (${drawnCard.name})</button>`;
  return `<div class="card-discard-box"><strong>⚠️ Mano llena (${limit} cartas)</strong><p>Elegiste <b>${drawnCard.icon} ${drawnCard.name}</b>. Decide qué carta descartar:</p><div class="discard-options">${cardButtons}${discardDrawn}</div></div>`;
}

export function cardItemMarkup(cId, catalog, {isSelected=false}={}){
  const c=catalog[cId];
  if(!c)return '';
  const isReactive=c.type==='reaction',costStr=isReactive?'Reacción sin coste':'Uso sin coste';
  const actionMarkup=isReactive
    ? '<span class="card-passive-badge">Elegible</span>'
    : `<button class="play-card-btn" data-card="${cId}" aria-label="Jugar ${c.name}">${isSelected?'Seleccionando…':'Jugar'}</button>`;
  return `<article class="card-item ${isSelected?'active-targeting':''}" tabindex="0" aria-label="${c.name}. ${c.desc}. ${costStr}"><span class="card-icon" aria-hidden="true">${c.icon}</span><div class="card-copy"><div class="card-name-row"><strong class="card-title">${c.name}</strong><span class="card-cost">${costStr}</span></div><p class="card-desc">${c.desc}</p></div><div class="card-action">${actionMarkup}</div></article>`;
}

export function cardsBoxMarkup({player, handLimit, cardTargeting=null, pendingCardDraw=null, catalog={}, originTerritoryName=''}){
  if(!player?.human){
    return cardsHeadMarkup(player?.cards?.length||0, handLimit);
  }
  const count=player.cards?.length||0;
  const head=cardsHeadMarkup(count, handLimit);
  let targetingNotice='';
  if(cardTargeting){
    const cDef=catalog[cardTargeting.cardId];
    targetingNotice=cardTargetingBarMarkup(cDef, originTerritoryName);
  }
  let rewardNotice='',discardNotice='';
  if(pendingCardDraw&&pendingCardDraw.pid===player.id){
    if(pendingCardDraw.stage==='choose'){
      rewardNotice=cardRewardChoiceMarkup(pendingCardDraw.choices, catalog);
    }else if(pendingCardDraw.card){
      const drawn=catalog[pendingCardDraw.card];
      discardNotice=cardDiscardChoiceMarkup(player.cards, drawn, handLimit, catalog);
    }
  }
  const cardsHtml=count===0
    ? `<div class="empty-hand">No tienes cartas tácticas en mano (máximo ${handLimit}). Se roban al conquistar territorios.</div>`
    : `<div class="cards-list">${player.cards.map(cId=>cardItemMarkup(cId, catalog, {isSelected:cardTargeting?.cardId===cId})).join('')}</div>`;
  return `${head}${targetingNotice}${rewardNotice}${discardNotice}${cardsHtml}`;
}
