import {REGIONS,MAPS,TERRAINS,UNIT_TYPES,getMap,getTerritories,createGame,ownedIds,enemiesOf,placeTroops,attackRound,blitz,fortify,setPhase,endTurn,aiTurn,validateState,canPlayerAttack,territoryProduction,productionTotal,buyReinforcements,upgradeGame,TACTICAL_CARDS,tacticalCardCost,isConnectionBlocked,playTacticalCard,resolvePendingCardDraw,buyMarketItem,generateMarket,MARKET_CATALOG,calculateInfluence,checkObjectives,OBJECTIVES_CATALOG,COMMANDERS,COMMANDER_IDS,FRONT_STATES,FRONT_STATE_LABELS,getFrontState,isTerritoryInWarFront,getTerritoryIntel,getTerritoryVisibility,approximateTroops,EVENT_CATALOG} from './engine.mjs';

const $=s=>document.querySelector(s),els={map:$('#map'),players:$('#players'),regions:$('#regions'),round:$('#round'),phaseTitle:$('#phaseTitle'),turnLabel:$('#turnLabel'),reinforcements:$('#reinforcements'),reinforceBox:$('#reinforceBox'),orderTitle:$('#orderTitle'),orderText:$('#orderText'),turnStatus:$('#turnStatus'),economyBox:$('#economyBox'),marketBox:$('#marketBox'),cardsBox:$('#cardsBox'),terrainPanel:$('#terrainPanel'),selection:$('#selectionInfo'),battle:$('#battleResult'),controls:$('#actionControls'),phaseBtn:$('#phaseBtn'),log:$('#log'),startModal:$('#startModal'),helpModal:$('#helpModal'),diceModal:$('#diceModal'),aiModal:$('#aiModal'),defenseModal:$('#defenseModal'),endModal:$('#endModal'),summaryBtn:$('#summaryBtn'),mapGuide:$('#mapGuide'),mapTooltip:$('#mapTooltip'),mapName:$('#mapName'),modeBadge:$('#modeBadge'),routesBtn:$('#routesBtn'),toast:$('#toast'),eventBanner:$('#eventBanner')};
let state=null,pendingAiState=null,difficulty='normal',selectedFrom=null,selectedTo=null,selectedDice=3,selectedUnit='infantry',toastTimer=null,aiBusy=false,rolling=false,routesAll=false,hoverId=null,aiResolve=null,defenseResolve=null,cardTargeting=null;
const SAVE='fronteras-acero-save-v3';
const ts=()=>state?getTerritories(state):MAPS.frontier.territories,tById=id=>ts().find(t=>t.id===id);
const regionShort=k=>({north:'NORTE',west:'OESTE',crown:'CORONA',ember:'BRASA',sun:'SOL',isles:'JADE'}[k]);
function save(){if(state)localStorage.setItem(SAVE,JSON.stringify({state:pendingAiState||state,difficulty}))}
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE));const restored=upgradeGame(d?.state);if(!restored||validateState(restored).length)return false;state=restored;difficulty=d.difficulty||'normal';return true}catch{return false}}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2500)}
const mobileLayout=()=>window.matchMedia('(max-width: 1000px)').matches;
function openMobileOrders(){if(!mobileLayout())return;document.body.classList.add('order-open');$('#mobileOrdersBtn').setAttribute('aria-expanded','true');$('#orderCard').scrollTop=0;$('#closeOrderSheet').focus()}
function closeMobileOrders(){document.body.classList.remove('order-open');$('#mobileOrdersBtn').setAttribute('aria-expanded','false')}
function updateMobileOrders(){if(!state)return;const label=state.winner!==null?'Resumen final':state.phase==='reinforce'?`${state.pendingReinforcements} refuerzos por colocar`:state.phase==='attack'?(selectedTo?'Ataque preparado':selectedFrom?'Elige objetivo':'Preparar ataque'):state.phase==='fortify'?'Maniobra o pasar':'Cerrar turno';$('#mobileOrdersLabel').textContent=label}
function updateMobileMapOverlay(){const head=document.querySelector('.map-head'),toolbar=document.querySelector('.map-toolbar');head.style.left='';head.style.right='';head.style.width='';toolbar.style.left=''}

function initMap(mapId='frontier'){
  const map=MAPS[mapId]||MAPS.frontier,T=map.territories;els.map.innerHTML=`<image class="map-art" href="./map-${map.id}.webp" x="0" y="0" width="1000" height="760" preserveAspectRatio="xMidYMid slice"/><rect class="map-art-shade" x="0" y="0" width="1000" height="760"/>`;
  const wrap=document.querySelector('.map-wrap');wrap.scrollLeft=0;wrap.classList.remove('overview');$('#mapOverviewBtn').setAttribute('aria-pressed','false');$('#mapOverviewBtn').textContent='⌕';
  const drawn=new Set();for(const t of T)for(const n of t.n){const k=[t.id,n].sort().join('-');if(drawn.has(k))continue;drawn.add(k);const b=T.find(x=>x.id===n),cross=t.region!==b.region?' cross':'';els.map.insertAdjacentHTML('beforeend',`<line class="connection${cross}" data-a="${t.id}" data-b="${n}" x1="${t.x*10}" y1="${t.y*8}" x2="${b.x*10}" y2="${b.y*8}"/>`)}
  for(const t of T){const x=t.x*10,y=t.y*8,r=50,points=Array.from({length:6},(_,i)=>{const a=-Math.PI/2+i*Math.PI/3;return`${(x+Math.cos(a)*r).toFixed(1)},${(y+Math.sin(a)*r).toFixed(1)}`}).join(' ');els.map.insertAdjacentHTML('beforeend',`<g class="territory" id="terr-${t.id}" data-id="${t.id}" tabindex="0" role="button"><polygon class="territory-shape" points="${points}" style="--region:${REGIONS[t.region].color}44"/><text class="territory-region" x="${x}" y="${y-25}">${regionShort(t.region)}</text><text class="territory-label" x="${x}" y="${y-7}">${t.name}</text><text class="terrain-mark" x="${x-35}" y="${y+24}">${TERRAINS[t.terrain].icon}</text><rect class="army-disc" x="${x-24}" y="${y+3}" width="48" height="31" rx="16"/><text class="unit-mark" x="${x-8}" y="${y+25}">♟</text><text class="army-count" x="${x+11}" y="${y+25}">1</text></g>`)}
  els.map.onclick=e=>{const g=e.target.closest('.territory');if(g)territoryClick(g.dataset.id,e.shiftKey)};els.map.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.territory')){e.preventDefault();territoryClick(e.target.closest('.territory').dataset.id)}};els.map.onpointerover=e=>{const g=e.target.closest('.territory');if(g){hoverId=g.dataset.id;updateHover(g.dataset.id,e)}};els.map.onpointermove=e=>{if(hoverId)positionTooltip(e)};els.map.onpointerout=e=>{if(e.target.closest('.territory')&&!e.relatedTarget?.closest?.('.territory')){hoverId=null;els.mapTooltip.classList.add('hidden');renderMap()}};els.mapName.textContent=map.name;updateConnections();updateMobileMapOverlay();
}
function positionTooltip(e){const box=document.querySelector('.map-wrap').getBoundingClientRect();els.mapTooltip.style.left=`${Math.min(e.clientX-box.left+14,box.width-230)}px`;els.mapTooltip.style.top=`${Math.max(90,e.clientY-box.top-70)}px`}
function updateHover(id,e){
  if(!state)return;
  const t=tById(id),d=state.territories[id],p=state.players[d.owner],terrain=TERRAINS[t.terrain],unit=UNIT_TYPES[d.unitType];
  const intel=getTerritoryIntel(state,id,0,difficulty);
  const isSabotaged=state.sabotagedTerritories?.[id]>=state.turn;
  const isSpied=intel.isSpied;

  let intelRow='';
  if(intel.visibility==='full'){
    intelRow=isSpied?`<div class="tip-row tip-spied"><span>Inteligencia</span><strong style="color:#6fe4dc">👁 Revelado por Espía</strong></div>`:d.owner===0?`<div class="tip-row tip-owned"><span>Territorio propio</span><strong style="color:#4ecdc4">✓ Guarnición bajo tu mando</strong></div>`:`<div class="tip-row tip-full"><span>Frontera directa</span><strong style="color:#64ae8b">✓ Visión completa</strong></div>`;
  }else if(intel.visibility==='partial'){
    intelRow=`<div class="tip-row tip-partial"><span>Niebla continental</span><strong style="color:#f7b731">⚠️ Info parcial (Distancia 2)</strong></div>`;
  }else{
    intelRow=`<div class="tip-row tip-hidden"><span>Niebla profunda</span><strong style="color:#95a5a6">🌫️ Tierras lejanas (infiltra Espía)</strong></div>`;
  }
  let eventRow='';if(state.activeEvent&&state.activeEvent.region===t.region){const ev=EVENT_CATALOG[state.activeEvent.type];eventRow=`<div class="tip-row tip-event-active"><span>Zona de desastre</span><strong style="color:#ff5e57">${ev?.icon||'⚡'} ${ev?.name||'Desastre'} activo</strong></div>`}else if(state.announcedEvent&&state.announcedEvent.region===t.region){const ev=EVENT_CATALOG[state.announcedEvent.type];eventRow=`<div class="tip-row tip-event-warn"><span>Alerta temprana</span><strong style="color:#f7b731">⚠️ ${ev?.icon||'⚠️'} ${ev?.name||'Amenaza'} (Ronda ${state.announcedEvent.triggerRound})</strong></div>`}

  const troopsText=intel.visibility==='full'?d.troops:intel.visibility==='partial'?`~${intel.troopsDisplay} (estimadas)`:'? Desconocida';
  const prodText=intel.visibility==='full'?`+$${territoryProduction(state,id)}${isSabotaged?' (⚡ Saboteado)':''}`:intel.visibility==='partial'?'Aprox. región':'? Oculta';
  const unitText=state.rulesMode==='terrain'?(intel.visibility==='full'?`${unit.icon} ${unit.name}`:'? Oculta por niebla'):'';

  const ownerName=intel.visibility==='hidden'?'Desconocido':p.name,ownerColor=intel.visibility==='hidden'?'#95a5a6':p.color;
  els.mapTooltip.innerHTML=`<b>${t.name}</b>
    <div class="tip-row"><span>Propietario</span><strong style="color:${ownerColor}">${ownerName}</strong></div>
    <div class="tip-row"><span>Tropas</span><strong>${troopsText}</strong></div>
    <div class="tip-row"><span>Producción</span><strong>${prodText}</strong></div>
    ${state.rulesMode==='terrain'?`<div class="tip-row"><span>Terreno</span><strong>${terrain.icon} ${terrain.name}</strong></div><div class="tip-row"><span>Unidad</span><strong>${unitText}</strong></div>`:''}
    ${eventRow}
    ${intelRow}
    <div class="tip-adj">Conecta con ${t.n.length} territorios</div>`;
  els.mapTooltip.classList.remove('hidden');positionTooltip(e);renderMap();
}
function updateConnections(){
  document.querySelectorAll('.connection').forEach(l=>{
    const a=l.dataset.a,b=l.dataset.b;
    const isBlocked=isConnectionBlocked(state,a,b);
    l.classList.toggle('blocked',isBlocked);const isEventBlocked=isBlocked&&state?.blockedConnections?.some(bc=>((bc.a===a&&bc.b===b)||(bc.a===b&&bc.b===a))&&bc.expiresTurn>=state.turn&&['earthquake','tsunami','tempest'].includes(bc.cause));l.classList.toggle('blocked-event',!!isEventBlocked);
    const related=selectedFrom&&(a===selectedFrom||b===selectedFrom),hovered=hoverId&&(a===hoverId||b===hoverId);
    l.classList.toggle('visible',!!(related||hovered||isBlocked));
    l.classList.toggle('show-all',routesAll);
  });
  els.routesBtn.textContent=routesAll?'Rutas: todas':'Rutas: al seleccionar';
  els.routesBtn.setAttribute('aria-pressed',String(routesAll));
}

function render(persist=true){if(!state)return;const p=state.players[state.current];els.round.textContent=state.turn;els.reinforcements.textContent=state.pendingReinforcements;els.reinforceBox.style.display=state.phase==='reinforce'?'block':'none';els.summaryBtn.classList.toggle('hidden',state.winner===null);els.turnLabel.textContent=state.winner!==null?'CAMPAÑA TERMINADA':p.human?'TU TURNO':`TURNO DE ${p.name.toUpperCase()}`;els.mapName.textContent=getMap(state).name;els.modeBadge.textContent=state.rulesMode==='terrain'?'TERRENO':'CLÁSICO';renderFlow();renderPlayers();renderRegions();renderEventBanner();renderMap();renderGuide();renderPanel();renderLog();updateMobileOrders();if(persist)save()}
function renderFlow(){const order=['reinforce','attack','fortify','close'],idx=state.phase==='gameover'?4:Math.max(0,order.indexOf(state.phase));document.querySelectorAll('.flow-step').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx)})}
function renderEventBanner(){if(!els.eventBanner)return;if(state.activeEvent){const ev=EVENT_CATALOG[state.activeEvent.type]||{name:'Desastre',icon:'⚡',desc:'Fuerza natural devastadora'};const regName=REGIONS[state.activeEvent.region]?.name||state.activeEvent.region;els.eventBanner.className='event-banner event-banner-active';els.eventBanner.innerHTML=`<span class="event-tag">¡DESASTRE ACTIVO!</span><span class="event-banner-content"><strong>${ev.icon} ${ev.name}</strong> en la región <b>${regName}</b>. Causó bajas inmediatas y bloqueó rutas de tránsito hasta la Ronda ${state.activeEvent.expiresRound}.</span>`}else if(state.announcedEvent){const ev=EVENT_CATALOG[state.announcedEvent.type]||{name:'Amenaza',icon:'⚠️',desc:'Fuerza natural en desarrollo'};const regName=REGIONS[state.announcedEvent.region]?.name||state.announcedEvent.region;els.eventBanner.className='event-banner event-banner-announced';els.eventBanner.innerHTML=`<span class="event-tag">⚠️ ALERTA TEMPRANA</span><span class="event-banner-content"><strong>${ev.icon} ${ev.name} inminente</strong> en la región <b>${regName}</b>. Impacto previsto para la <b>Ronda ${state.announcedEvent.triggerRound}</b> (${ev.desc}). ¡Prepárate o repliega tus tropas!</span>`}else{els.eventBanner.className='event-banner hidden';els.eventBanner.innerHTML=''}}
function renderPlayers(){
  els.players.innerHTML=state.players.map(p=>{
    const ids=ownedIds(state,p.id),troops=ids.reduce((s,id)=>s+state.territories[id].troops,0);
    const cardCount=Array.isArray(p.cards)?p.cards.length:p.cards;
    const hasTempDef=state.tempDefense?.[p.id]>=state.turn;
    const objCount=(p.completedObjectives||[]).length;
    const cmd=COMMANDERS[p.commander]||COMMANDERS.conqueror;
    const isHuman=p.id===0;
    const frontToHuman=!isHuman&&p.alive?getFrontState(state,0,p.id):null;
    const frontLabel=frontToHuman?FRONT_STATE_LABELS[frontToHuman]:null;
    const visibility=!isHuman?ids.map(tid=>getTerritoryVisibility(state,tid,0,difficulty)):[];
    const hasHidden=visibility.includes('hidden'),hasPartial=visibility.includes('partial');
    const troopsStr=hasHidden?'?':hasPartial?`≈${ids.reduce((sum,tid)=>{const v=getTerritoryVisibility(state,tid,0,difficulty);if(v==='full')return sum+state.territories[tid].troops;const r=approximateTroops(state.territories[tid].troops);return sum+(r==='1-2'?2:r==='3-5'?4:r==='6-9'?8:10)},0)}`:`${troops}`;
    const terrStr=hasHidden?'?':`${ids.length}`,moneyStr=hasHidden?'?':`$${p.money}`,prodStr=hasHidden?'?':`+$${productionTotal(state,p.id)}`;
    return`<div class="player ${state.current===p.id?'active':''} ${!p.alive?'eliminated':''}" style="--pc:${p.color}">
      <div class="player-top">
        <i class="player-color"></i>
        <span class="player-name">${p.name}</span>
        <span class="commander-badge" title="${cmd.name}: ${cmd.desc}">${cmd.icon} ${cmd.name.replace('El ','')}</span>
        ${hasTempDef?'<span class="temp-def-badge" title="Defensa temporal activa (+1 dado defensivo)">🛡 +1 Def</span>':''}
        ${state.current===p.id&&p.alive?'<span class="turn-badge">EN TURNO</span>':''}
      </div>
      <div class="player-stats">
        <span><strong>${terrStr}</strong> terr.</span>
        <span title="${hasHidden?'Datos ocultos por la niebla continental':hasPartial?'Estimación basada en inteligencia parcial':''}"><strong class="${hasHidden||hasPartial?'approx-stat':''}">${troopsStr}</strong> tropas</span>
        <span><strong>${cardCount}</strong> cartas</span>
        <span><strong class="inf-score">${p.influence||0}</strong> inf.</span>
      </div>
      <div class="player-money">
        Tesoro <strong>${moneyStr}</strong> · Prod. <strong>${prodStr}</strong>${objCount>0?` · <b class="obj-badge" title="${(p.completedObjectives||[]).map(id=>OBJECTIVES_CATALOG.find(o=>o.id===id)?.name||id).join(', ')}">${objCount} obj.</b>`:''}
        ${frontLabel?`<div class="front-status-row"><span class="front-badge front-${frontToHuman}" title="Frente con ${p.name}: ${frontLabel.name}">${frontLabel.icon} Frente: ${frontLabel.name}</span></div>`:''}
      </div>
    </div>`;
  }).join('');
}
function renderRegions(){els.regions.innerHTML=Object.entries(REGIONS).map(([k,r])=>{const regionTerrs=ts().filter(t=>t.region===k),fullyVisible=regionTerrs.every(t=>getTerritoryVisibility(state,t.id,0,difficulty)==='full'),owner=fullyVisible?state.players.find(p=>regionTerrs.every(t=>state.territories[t.id].owner===p.id)):null;return`<div class="region-row" style="--rc:${r.color}"><i class="region-swatch"></i><span>${r.name}${owner?` · ${owner.name}`:''}</span><strong>+${r.bonus}</strong></div>`}).join('')}
function renderMap(){
  for(const t of ts()){
    const d=state.territories[t.id],p=state.players[d.owner],g=$(`#terr-${t.id}`);
    if(!g)continue;
    const intel=getTerritoryIntel(state,t.id,0,difficulty);
    g.style.setProperty('--owner',intel.visibility==='hidden'?'#526a7b':p.color);
    g.style.setProperty('--terrain',TERRAINS[t.terrain].color);
    g.style.setProperty('--unit',UNIT_TYPES[d.unitType].color);
    g.classList.toggle('owned',d.owner===state.current);
    g.classList.toggle('selected',t.id===selectedFrom||t.id===selectedTo);
    g.classList.toggle('target',selectedFrom&&state.phase==='attack'&&enemiesOf(state,selectedFrom).includes(t.id));
    g.classList.toggle('dimmed',!!hoverId&&hoverId!==t.id&&!t.n.includes(hoverId));

    g.classList.toggle('intel-full',intel.visibility==='full');
    g.classList.toggle('intel-partial',intel.visibility==='partial');
    g.classList.toggle('intel-hidden',intel.visibility==='hidden');
    g.classList.toggle('spied',!!intel.isSpied);

    const isSabotaged=state.sabotagedTerritories?.[t.id]>=state.turn;
    g.classList.toggle('sabotaged',!!isSabotaged);g.classList.toggle('event-threatened',state.announcedEvent?.region===t.region);g.classList.toggle('event-active',state.activeEvent?.region===t.region);

    if(cardTargeting){
      if(cardTargeting.cardId==='spy'||cardTargeting.cardId==='sabotage')g.classList.toggle('card-valid-target',d.owner!==state.current);
      else if(cardTargeting.cardId==='blockade'){
        if(!cardTargeting.from)g.classList.toggle('card-valid-target',true);
        else g.classList.toggle('card-valid-target',t.n.includes(cardTargeting.from));
      }
    }else{
      g.classList.remove('card-valid-target');
    }

    const countEl=g.querySelector('.army-count');
    countEl.textContent=intel.troopsDisplay;
    countEl.classList.toggle('army-range',intel.visibility==='partial');
    countEl.classList.toggle('army-hidden',intel.visibility==='hidden');

    const unitEl=g.querySelector('.unit-mark');
    if(intel.visibility==='full'){
      unitEl.textContent=state.rulesMode==='terrain'?UNIT_TYPES[d.unitType].icon:'♟';
    }else{
      unitEl.textContent='?';
    }

    const terrMarkEl=g.querySelector('.terrain-mark');
    terrMarkEl.style.display=(state.rulesMode==='terrain'&&intel.visibility!=='hidden')?'block':'none';

    let descr=`${t.name}, `;
    if(intel.visibility==='full')descr+=`${d.troops} tropas, ${p.name}`;
    else if(intel.visibility==='partial')descr+=`aprox. ${intel.troopsDisplay} tropas, ${p.name}`;
    else descr+='fuerza y propietario desconocidos';
    g.setAttribute('aria-label',descr);
  }
  updateConnections();
}
function renderLog(){els.log.innerHTML=state.log.slice(0,8).map(l=>`<div class="log-item" style="--lc:${l.p===null?'#788896':state.players[l.p]?.color||'#788896'}"><i class="log-dot"></i><span>${l.text}</span></div>`).join('')}
function setGuide(step,title,text){els.mapGuide.innerHTML=`<span>${step}</span><strong>${title}</strong><small>${text}</small>`}
function renderGuide(){if(state.winner!==null){setGuide('✓','Mapa conquistado',`Ganador: ${state.players[state.winner].name}. Abre el resumen final cuando quieras.`);return}if(!state.players[state.current].human){setGuide('…',`${state.players[state.current].name} está jugando`,'Al terminar verás un informe de sus combates.');return}if(state.phase==='reinforce')setGuide('1','Pulsa tus territorios luminosos',`Coloca las ${state.pendingReinforcements} tropas restantes.`);else if(state.phase==='attack'&&!selectedFrom)setGuide('1','Elige el territorio atacante','Al pasar el cursor solo se iluminan sus rutas reales.');else if(state.phase==='attack'&&!selectedTo)setGuide('2','Elige un vecino enemigo','Los objetivos válidos tienen borde rojo.');else if(state.phase==='attack')setGuide('3','Configura y lanza los dados',state.rulesMode==='terrain'?'La ventaja de unidad o terreno suma +1 al dado mayor.':'El modo clásico no aplica modificadores.');else if(state.phase==='fortify'&&!selectedFrom)setGuide('1','Elige el origen de la maniobra','Debe tener al menos 2 tropas. También puedes pasar.');else if(state.phase==='fortify'&&!selectedTo)setGuide('2','Elige el destino propio','Puede conectarse por una ruta continua propia.');else if(state.phase==='fortify')setGuide('3','Confirma cuántas tropas mover','Siempre quedará al menos una en el origen.');else setGuide('4','Revisa el cierre',state.conqueredThisTurn?'Recibes una carta táctica.':'No conquistaste: no recibes carta.')}

function renderCards(){
  const p=state.players[state.current];
  if(!p.human){
    els.cardsBox.innerHTML=`<div class="cards-head"><span>CARTAS TÁCTICAS</span><strong>${p.cards.length} / 3</strong></div>`;
    return;
  }
  let targetingNotice='';
  if(cardTargeting){
    const cDef=TACTICAL_CARDS[cardTargeting.cardId];
    targetingNotice=`<div class="card-targeting-bar"><span>🎯 Seleccionando objetivo para <b>${cDef.name}</b>${cardTargeting.from?` (desde ${tById(cardTargeting.from).name})`:''}</span><button id="cancelTargetingBtn" class="cancel-card-btn">Cancelar</button></div>`;
  }
  let discardNotice='';
  if(state.pendingCardDraw&&state.pendingCardDraw.pid===state.current){
    const drawn=TACTICAL_CARDS[state.pendingCardDraw.card];
    discardNotice=`<div class="card-discard-box"><strong>⚠️ Mano llena (3 cartas)</strong><p>Has robado <b>${drawn.icon} ${drawn.name}</b>. Elige qué carta descartar:</p><div class="discard-options">${p.cards.map(cId=>{const c=TACTICAL_CARDS[cId];return`<button class="discard-btn" data-discard="${cId}">Descartar ${c.icon} ${c.name}</button>`}).join('')}<button class="discard-btn discard-new" data-discard="${drawn.id}">Descartar la nueva (${drawn.name})</button></div></div>`;
  }
  const cardsHtml=p.cards.length===0?`<div class="empty-hand">No tienes cartas tácticas en mano (máximo 3). Se roban al conquistar territorios.</div>`:`<div class="cards-list">${p.cards.map(cId=>{
    const c=TACTICAL_CARDS[cId],cost=tacticalCardCost(state,cId,p.id),canAfford=p.money>=cost,isReactive=c.type==='reaction',costStr=cost===0?(isReactive?'Reactiva':'Gratis'):`$${cost}`,isSelected=cardTargeting?.cardId===cId;
    return`<div class="card-item ${isSelected?'active-targeting':''}"><div class="card-item-top"><span class="card-title">${c.icon} ${c.name}</span><span class="card-cost">${costStr}</span></div><p class="card-desc">${c.desc}</p><div class="card-action">${isReactive?'<span class="card-passive-badge">Protección automática</span>':`<button class="play-card-btn" data-card="${cId}" ${canAfford?'':'disabled'}>${isSelected?'Seleccionando…':`Jugar (${costStr})`}</button>`}</div></div>`;
  }).join('')}</div>`;

  els.cardsBox.innerHTML=`<div class="cards-head"><span>CARTAS TÁCTICAS</span><strong>${p.cards.length} / 3</strong></div>${targetingNotice}${discardNotice}${cardsHtml}`;

  if($('#cancelTargetingBtn'))$('#cancelTargetingBtn').onclick=()=>{cardTargeting=null;render()};
  document.querySelectorAll('.discard-btn').forEach(btn=>{
    btn.onclick=()=>{
      resolvePendingCardDraw(state,btn.dataset.discard);
      render();
      showToast('Carta descartada. Mano actualizada.');
    };
  });
  document.querySelectorAll('.play-card-btn').forEach(btn=>{
    btn.onclick=()=>{
      const cId=btn.dataset.card;
      if(cId==='mobilize'){
        const res=playTacticalCard(state,'mobilize',null,state.current);
        if(res.ok){showToast('Movilización activada: maniobra adicional disponible');render()}else showToast(res.reason);
      }else if(cId==='blockade'){
        cardTargeting={cardId:'blockade',from:null};
        showToast('Pulsa el primer territorio de la conexión a bloquear');
        render();closeMobileOrders();
      }else if(cId==='sabotage'){
        cardTargeting={cardId:'sabotage'};
        showToast('Pulsa el territorio enemigo a sabotear');
        render();closeMobileOrders();
      }else if(cId==='spy'){
        cardTargeting={cardId:'spy'};
        showToast('Pulsa el territorio enemigo a espiar');
        render();closeMobileOrders();
      }
    };
  });
}
function renderEconomy(){
  const p=state.players[state.current],income=productionTotal(state,p.id),alreadyBought=p.reinforcementsBoughtRound===state.turn,canBuy=p.human&&state.phase==='reinforce'&&p.money>=10&&!alreadyBought;
  const main=OBJECTIVES_CATALOG.find(o=>o.id===p.mainObjective),temporary=OBJECTIVES_CATALOG.find(o=>o.id===p.temporaryObjective);
  const objectives=p.human?`<div class="active-objectives"><div><span>OBJETIVO PRINCIPAL</span><b>${main?`${main.icon} ${main.name}`:'✓ Completados'}</b>${main?`<small>${main.desc} · +${main.value} inf.</small>`:''}</div><div><span>OBJETIVO TEMPORAL</span><b>${temporary?`${temporary.icon} ${temporary.name}`:'✓ Completados'}</b>${temporary?`<small>${temporary.desc} · +${temporary.value} inf.</small>`:''}</div></div>`:'';
  els.economyBox.innerHTML=`<div class="economy-head"><span>TESORO</span><strong>$${p.money}</strong></div><small>Producción actual: +$${income} al inicio del turno.</small>${objectives}${p.human&&state.phase==='reinforce'?`<button id="buyTroopsBtn" class="secondary-btn" ${canBuy?'':'disabled'}>${alreadyBought?'Compra de emergencia usada':'+3 refuerzos · $10'}</button>`:''}`;
  const button=$('#buyTroopsBtn');if(button)button.onclick=()=>{if(buyReinforcements(state)){render();showToast('Compraste 3 refuerzos por $10')}}
}
function renderMarket(){
  if(!els.marketBox)return;
  if(!state.market?.offers){
    els.marketBox.innerHTML='';
    return;
  }
  const p=state.players[state.current];
  const nextRotationRound=(state.market.cycle+1)*3+1;
  const roundsLeft=nextRotationRound-state.turn;
  const hasTempDef=state.tempDefense?.[p.id]>=state.turn;

  const offersHtml=state.market.offers.map(offer=>{
    const alreadyBought=offer.boughtBy?.includes(p.id);
    const canAfford=p.money>=offer.cost;
    const isFullCards=offer.type==='card'&&p.cards.length>=3;
    const canBuy=p.human&&state.phase==='reinforce'&&!alreadyBought&&canAfford&&!isFullCards;

    let buttonOrBadge='';
    if(alreadyBought){
      buttonOrBadge=`<span class="market-badge bought">Adquirido</span>`;
    }else if(p.human&&state.phase==='reinforce'){
      const reasonDisabled=!canAfford?`Requiere $${offer.cost}`:isFullCards?'Mano llena (máx 3)':`Comprar ${offer.name}`;
      buttonOrBadge=`<button class="secondary-btn market-buy-btn" data-offer="${offer.id}" ${canBuy?'':'disabled'} title="${reasonDisabled}">Comprar · $${offer.cost}</button>`;
    }else{
      buttonOrBadge=`<span class="market-price-tag">$${offer.cost}</span>`;
    }

    return `<div class="market-offer ${alreadyBought?'offer-bought':''}">
      <div class="market-offer-info">
        <span class="market-offer-icon">${offer.icon||'📦'}</span>
        <div>
          <div class="market-offer-title"><b>${offer.name}</b></div>
          <small class="market-offer-desc">${offer.desc}</small>
        </div>
      </div>
      <div class="market-offer-action">
        ${buttonOrBadge}
      </div>
    </div>`;
  }).join('');

  els.marketBox.innerHTML=`
    <div class="market-head">
      <div class="market-head-title">
        <span>MERCADO TÁCTICO</span>
        <small class="market-cycle-pill">Rota en R${nextRotationRound} (${roundsLeft} ronda${roundsLeft>1?'s':''})</small>
      </div>
      ${hasTempDef?`<span class="temp-def-active-pill">🛡 Defensa +1 activa</span>`:''}
    </div>
    <div class="market-offers-list">${offersHtml}</div>
  `;

  els.marketBox.querySelectorAll('.market-buy-btn').forEach(btn=>{
    btn.onclick=()=>{
      const offerId=btn.dataset.offer;
      const res=buyMarketItem(state,offerId,state.current);
      if(res.ok){
        showToast(`Adquiriste: ${res.offer.name}`);
        render();
      }else{
        showToast(res.reason||'No se pudo realizar la compra');
      }
    };
  });
}
function bonusPreview(from,to){
  if(!from||!to)return '';
  const a=state.territories[from],d=state.territories[to];
  const hasTempDef=state.tempDefense?.[d.owner]>=state.turn;
  const isConqueror=state.players[a.owner]?.commander==='conqueror'&&!state.attackMadeThisTurn;
  const isGuardian=state.players[d.owner]?.commander==='guardian'&&isTerritoryInWarFront(state,to);
  const attReasons=[];
  const defReasons=[];
  if(state.rulesMode==='terrain'){
    const terrain=TERRAINS[tById(to).terrain],au=UNIT_TYPES[a.unitType],du=UNIT_TYPES[d.unitType];
    if(au.beats===d.unitType)attReasons.push(`${au.name} tiene ventaja`);
    if(du.beats===a.unitType)defReasons.push('ventaja de unidad');
    if(terrain.unit===d.unitType)defReasons.push('afinidad de terreno');
  }
  if(isConqueror)attReasons.push('doctrina El Conquistador (primer ataque)');
  if(hasTempDef)defReasons.push('defensa temporal activa');
  if(isGuardian)defReasons.push('doctrina El Guardián (frente en guerra)');

  const attText=attReasons.length?`⚔ Atacante: +${attReasons.length} (${attReasons.join(' + ')}).`:'Atacante: sin bono.';
  const defText=defReasons.length?`🛡 Defensor: +${defReasons.length} (${defReasons.join(' + ')}).`:'Defensor: sin bono.';
  return `<div class="bonus-note">${attText}<br>${defText}</div>`;
}
function renderTerrainPanel(){if(state.rulesMode!=='terrain'){els.terrainPanel.classList.add('hidden');return}els.terrainPanel.classList.remove('hidden');const canChoose=state.phase==='reinforce'&&state.players[state.current].human;els.terrainPanel.innerHTML=`<h3>Rueda de ventaja · +1 al dado mayor</h3><div class="unit-wheel"><b>◆ Infantería</b> vence a <b>✦ Artillería</b> vence a <b>♞ Caballería</b> vence a <b>◆ Infantería</b></div>${canChoose?`<div class="unit-selector">${Object.entries(UNIT_TYPES).map(([k,u])=>`<button data-unit="${k}" class="${selectedUnit===k?'active':''}" style="--unit-color:${u.color}">${u.icon} ${u.name}</button>`).join('')}</div><div class="bonus-note">La unidad elegida se asignará al territorio que refuerces. Bosque favorece Infantería; Montaña, Artillería; Llanura, Caballería.</div>`:bonusPreview(selectedFrom,selectedTo)}`;document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{selectedUnit=b.dataset.unit;renderTerrainPanel()})}
function renderPanel(){const human=state.players[state.current].human;els.battle.innerHTML='';els.controls.innerHTML='';els.selection.innerHTML='';renderEconomy();renderMarket();renderCards();renderTerrainPanel();if(state.phase==='gameover'){const won=state.winner===0;const vType=state.victoryType;let title='Victoria total',orderTitle='El mapa es tuyo',orderText='Todos los estandartes enemigos han caído.';if(vType==='influence'){title=won?'Hegemonía alcanzada':'Hegemonía enemiga';orderTitle=won?'150+ puntos de Influencia':`${state.players[state.winner].name} dominó por Influencia`;orderText=won?'Mantuviste tu hegemonía continental al cierre de ronda.':`${state.players[state.winner].name} superó los 150 puntos de Influencia.`;}else if(vType==='round_limit'){title=won?'Victoria por Puntos':'Campaña concluida';orderTitle=won?'Mayor Influencia en Ronda 40':`${state.players[state.winner].name} venció en Ronda 40`;orderText=won?`Alcanzaste la ronda 40 con la mayor Influencia continental (${state.players[0].influence} pts).`:`${state.players[state.winner].name} obtuvo la mayor Influencia al concluir la ronda 40 (${state.players[state.winner].influence} pts).`;}else{title=won?'Victoria total':'Campaña terminada';orderTitle=won?'El mapa es tuyo':'Has sido derrotado';orderText=won?'Todos los estandartes enemigos han caído.':'Tus últimos territorios fueron conquistados.';}els.phaseTitle.textContent=title;els.orderTitle.textContent=orderTitle;els.orderText.textContent=orderText;els.turnStatus.innerHTML=won?`<strong>Objetivo cumplido.</strong> ¡Victoria por ${vType==='influence'?'Hegemonía de Influencia':vType==='round_limit'?'puntuación en Ronda 40':'Dominio territorial'}!`:'Puedes revisar el mapa o ver el resumen final.';els.phaseBtn.textContent='Nueva partida';els.phaseBtn.disabled=false;return}if(!human){els.phaseTitle.textContent='Turno enemigo';els.orderTitle.textContent=`${state.players[state.current].name} está actuando`;els.orderText.textContent='Al terminar se mostrará un resumen de refuerzos, combates y conquistas.';els.turnStatus.innerHTML='<strong>Espera:</strong> tu turno comenzará automáticamente.';els.phaseBtn.textContent='Procesando…';els.phaseBtn.disabled=true;return}els.phaseBtn.disabled=false;
  if(state.phase==='reinforce'){els.phaseTitle.textContent='Paso 1 · Reclutamiento';els.orderTitle.textContent=`${state.pendingReinforcements} tropas por desplegar`;els.orderText.textContent=state.rulesMode==='terrain'?`Unidad elegida: ${UNIT_TYPES[selectedUnit].name}. Pulsa un territorio propio.`:'Pulsa un territorio propio para añadir tropas.';els.turnStatus.innerHTML='<strong>Objetivo:</strong> coloca todas las tropas; después comienza el combate.';els.phaseBtn.textContent='Coloca todos los refuerzos';els.phaseBtn.disabled=true}
  else if(state.phase==='attack'){const possible=canPlayerAttack(state);els.phaseTitle.textContent='Paso 2 · Combate';els.orderTitle.textContent=selectedTo?'Ataque preparado':selectedFrom?'Elige el objetivo':'Declara un ataque';els.orderText.textContent='Origen propio → ruta iluminada → enemigo → dados → resultado.';els.turnStatus.innerHTML=state.attackMadeThisTurn?'<strong>Tirada obligatoria cumplida.</strong> Puedes seguir o pasar.':possible?'<strong>Ataque obligatorio pendiente.</strong> Resuelve una tirada.':'<strong>Sin ataques legales.</strong> Puedes continuar.';els.phaseBtn.textContent=state.attackMadeThisTurn||!possible?'Finalizar combate →':'Debes atacar';els.phaseBtn.disabled=possible&&!state.attackMadeThisTurn;if(selectedFrom){const a=state.territories[selectedFrom];els.selection.innerHTML=`<div class="selection-item"><span>Origen · ${tById(selectedFrom).name}</span><strong>${a.troops} tropas</strong></div>`}if(selectedTo)renderAttackControls()}
  else if(state.phase==='fortify'){els.phaseTitle.textContent='Paso 3 · Maniobra';els.orderTitle.textContent=selectedTo?'Movimiento preparado':selectedFrom?'Elige el destino':'Fortifica o pasa';els.orderText.textContent='Mueve tropas por una ruta propia continua o pasa.';els.turnStatus.innerHTML=state.extraFortifies>0?'<strong>Movilización activa:</strong> puedes realizar una maniobra adicional.':'<strong>Opcional:</strong> un movimiento máximo.';els.phaseBtn.textContent='Pasar maniobra → cierre';if(selectedFrom){els.selection.innerHTML=`<div class="selection-item"><span>Origen · ${tById(selectedFrom).name}</span><strong>${state.territories[selectedFrom].troops} tropas</strong></div>`}if(selectedTo)renderFortifyControls()}
  else{els.phaseTitle.textContent='Paso 4 · Cierre';if(state.pendingCardDraw){els.orderTitle.textContent='Mano llena (3 cartas)';els.orderText.textContent='Elige qué carta descartar en el panel de cartas tácticas.';els.turnStatus.innerHTML='<strong>Descarte obligatorio:</strong> debes descartar una carta para continuar.';els.phaseBtn.textContent='Descarta una carta';els.phaseBtn.disabled=true}else{const p=state.players[state.current];els.orderTitle.textContent=state.conqueredThisTurn?'Carta táctica robada':'Cierre de turno';els.orderText.textContent=state.conqueredThisTurn?'Conquistaste: recibiste 1 carta táctica.':'No conquistaste en este turno.';els.turnStatus.innerHTML=`<strong>Influencia:</strong> ${p.influence} pts · <strong>Objetivos:</strong> ${(p.completedObjectives||[]).length} cumplidos · ${p.cards.length} cartas en mano.`;els.phaseBtn.textContent='Pasar al siguiente jugador →';els.phaseBtn.disabled=false}}
}
function renderAttackControls(){const a=state.territories[selectedFrom],d=state.territories[selectedTo],max=Math.min(3,a.troops-1);selectedDice=Math.min(selectedDice,max);els.selection.innerHTML=`<div class="selection-item"><span>Atacante · ${tById(selectedFrom).name}</span><strong>${a.troops} · ${state.rulesMode==='terrain'?UNIT_TYPES[a.unitType].name:''}</strong></div><div class="selection-item"><span>Defensor · ${tById(selectedTo).name}</span><strong>${d.troops} · ${state.rulesMode==='terrain'?UNIT_TYPES[d.unitType].name:''}</strong></div>`;els.controls.innerHTML=`<label>Dados del atacante (máximo ${max})</label><div class="dice-choice">${[1,2,3].filter(n=>n<=max).map(n=>`<button data-dice="${n}" class="${n===selectedDice?'active':''}">${n} dado${n>1?'s':''}</button>`).join('')}</div>${bonusPreview(selectedFrom,selectedTo)}<button class="primary-btn" id="rollBtn">🎲 Lanzar una ronda</button><button class="secondary-btn" id="blitzBtn">Ataque rápido</button>`;document.querySelectorAll('[data-dice]').forEach(b=>b.onclick=()=>{selectedDice=+b.dataset.dice;renderPanel()});$('#rollBtn').onclick=()=>doAttack(false);$('#blitzBtn').onclick=()=>doAttack(true)}
function renderFortifyControls(){const max=state.territories[selectedFrom].troops-1;if(max<1)return;els.selection.innerHTML+=`<div class="selection-item"><span>Destino · ${tById(selectedTo).name}</span><strong>${state.territories[selectedTo].troops}</strong></div>`;els.controls.innerHTML=`<label>Tropas a mover: <strong id="moveVal">1</strong><input id="moveRange" type="range" min="1" max="${max}" value="1"></label><button class="primary-btn" id="moveBtn">Confirmar movimiento → cierre</button>`;$('#moveRange').oninput=e=>$('#moveVal').textContent=e.target.value;$('#moveBtn').onclick=()=>{if(fortify(state,selectedFrom,selectedTo,+$('#moveRange').value)){selectedFrom=selectedTo=null;render();closeMobileOrders()}else showToast('No existe una ruta propia continua')}}

function territoryClick(id,shift=false){
  if(!state||aiBusy||rolling||state.winner!==null||!state.players[state.current].human)return;
  const d=state.territories[id];
  if(cardTargeting){
    if(cardTargeting.cardId==='spy'||cardTargeting.cardId==='sabotage'){
      if(d.owner===state.current)return showToast('Debes elegir un territorio enemigo');
      const cardName=TACTICAL_CARDS[cardTargeting.cardId].name;
      const res=playTacticalCard(state,cardTargeting.cardId,id,state.current);
      if(res.ok){
        if(res.countered)showToast(res.message);
        else showToast(`${cardName} ejecutado sobre ${tById(id).name}`);
        cardTargeting=null;
        render();
        if(mobileLayout())openMobileOrders();
      }else showToast(res.reason||'Error al jugar carta');
      return;
    }
    if(cardTargeting.cardId==='blockade'){
      if(!cardTargeting.from){
        cardTargeting.from=id;
        showToast(`Territorio 1 (${tById(id).name}) seleccionado. Pulsa un vecino.`);
        render();
        return;
      }
      if(id===cardTargeting.from){
        cardTargeting.from=null;
        showToast('Selección de bloqueo cancelada');
        render();
        return;
      }
      if(!tById(cardTargeting.from).n.includes(id))return showToast('Deben ser territorios conectados');
      const res=playTacticalCard(state,'blockade',[cardTargeting.from,id],state.current);
      if(res.ok){
        showToast('Ruta bloqueada por 2 rondas.');
        cardTargeting=null;
        render();
        if(mobileLayout())openMobileOrders();
      }else showToast(res.reason||'Error al bloquear ruta');
      return;
    }
  }
  if(state.phase==='reinforce'){
    if(d.owner!==state.current)return showToast('Elige uno de tus territorios luminosos');
    placeTroops(state,id,Math.min(shift?5:1,state.pendingReinforcements),selectedUnit);
    render();
    return;
  }
  if(state.phase==='attack'){
    if(d.owner===state.current){
      if(d.troops<2)return showToast('Necesitas al menos 2 tropas');
      if(!enemiesOf(state,id).length)return showToast('No limita con enemigos');
      selectedFrom=id;selectedTo=null;selectedDice=Math.min(3,d.troops-1);render();return;
    }
    if(selectedFrom&&enemiesOf(state,selectedFrom).includes(id)){
      selectedTo=id;render();openMobileOrders();return;
    }
    showToast(selectedFrom?'El objetivo debe estar unido por una ruta iluminada':'Primero elige el origen');
  }else if(state.phase==='fortify'){
    if(d.owner!==state.current)return showToast('Solo puedes maniobrar entre territorios propios');
    if(!selectedFrom){if(d.troops<2)return showToast('El origen necesita 2 tropas');selectedFrom=id}
    else if(id===selectedFrom){selectedFrom=null;selectedTo=null}
    else selectedTo=id;
    render();
    if(selectedTo)openMobileOrders();
  }
}
function diceMarkup(values,raw=[]){return values.map((v,i)=>`<i class="big-die">${v}${raw[i]!==undefined&&v>raw[i]?'<small>+1</small>':''}</i>`).join('')}
function comparisonMarkup(r){return Array.from({length:Math.min(r.attackerDice.length,r.defenderDice.length)},(_,i)=>{const a=r.attackerDice[i],d=r.defenderDice[i],win=a>d;return`<div class="compare-row"><span>🎲 ${a}</span><b>${win?'vence a':'pierde ante'}</b><span>${d} 🎲</span><em>−1 ${win?'defensor':'atacante'}${a===d?' (empate)':''}</em></div>`}).join('')}
async function playAttackApproach(from,to){
  const origin=tById(from),target=tById(to);
  if(!origin||!target)return;
  const x1=origin.x*10,y1=origin.y*8,x2=target.x*10,y2=target.y*8;
  const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
  const midX=(x1+x2)/2,midY=(y1+y2)/2;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS='http://www.w3.org/2000/svg',layer=document.createElementNS(svgNS,'g');
  layer.classList.add('attack-march');layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<line class="attack-route" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><circle class="clash-ring" cx="${midX}" cy="${midY}" r="8"/><g class="marchers attacker"/><g class="marchers defender"/>`;
  const figures=`<g transform="translate(-14 2)"><circle cy="-10" r="4"/><path d="M-5-4h10l3 13H-8zM-4 8l-2 8m10-8 2 8"/></g><g transform="translate(0 -4)"><circle cy="-10" r="4"/><path d="M-5-4h10l3 13H-8zM-4 8l-2 8m10-8 2 8"/></g><g transform="translate(14 2)"><circle cy="-10" r="4"/><path d="M-5-4h10l3 13H-8zM-4 8l-2 8m10-8 2 8"/></g>`;
  const attacker=layer.querySelector('.attacker'),defender=layer.querySelector('.defender');
  attacker.innerHTML=figures;defender.innerHTML=figures;
  attacker.style.setProperty('--march-color',state.players[state.territories[from].owner].color);
  defender.style.setProperty('--march-color',state.players[state.territories[to].owner].color);
  els.map.append(layer);
  const duration=reduced?100:850;
  await new Promise(resolve=>{
    let start;
    function frame(now){
      start??=now;
      const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
      const ax=x1+(midX-ux*16-x1)*ease,ay=y1+(midY-uy*16-y1)*ease;
      const bx=x2+(midX+ux*16-x2)*ease,by=y2+(midY+uy*16-y2)*ease;
      attacker.setAttribute('transform',`translate(${ax} ${ay})`);
      defender.setAttribute('transform',`translate(${bx} ${by})`);
      if(t<1)requestAnimationFrame(frame);else resolve();
    }
    requestAnimationFrame(frame);
  });
  layer.classList.add('impact');
  await new Promise(resolve=>setTimeout(resolve,reduced?90:330));
  layer.remove();
}
let diceResolve=null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function setBattleTone(tone){
  const card=els.diceModal.querySelector('.dice-card');
  card.classList.remove('outcome-victory','outcome-defeat','outcome-neutral');
  card.classList.add(`outcome-${tone}`);
}
function roundTone(round,defending){
  const ownLosses=defending?round.defenderLosses:round.attackerLosses;
  const enemyLosses=defending?round.attackerLosses:round.defenderLosses;
  return ownLosses<enemyLosses?'victory':ownLosses>enemyLosses?'defeat':'neutral';
}
async function presentDiceRounds(rounds,{from,to,defending=false,fast=false}){
  if(!rounds.length)return;
  const title=$('#diceTitle'),comparison=$('#comparison'),close=$('#closeDice');
  $('#battleRoute').textContent=`${from} ataca ${to}`;
  close.classList.remove('visible');
  close.textContent=defending?'Ver resultado de la defensa':'Ver el mapa y continuar';
  els.diceModal.classList.remove('hidden');
  for(let i=0;i<rounds.length;i++){
    const round=rounds[i],label=`Tirada ${i+1} de ${rounds.length}`;
    setBattleTone('neutral');
    title.textContent=`${label} · dados en juego`;
    comparison.innerHTML='';
    const attackerCount=round.rawAttackerDice.length,defenderCount=round.rawDefenderDice.length;
    const draw=()=>{
      $('#attackerDice').innerHTML=Array.from({length:attackerCount},()=>`<i class="big-die rolling">${1+Math.floor(Math.random()*6)}</i>`).join('');
      $('#defenderDice').innerHTML=Array.from({length:defenderCount},()=>`<i class="big-die rolling">${1+Math.floor(Math.random()*6)}</i>`).join('');
    };
    draw();
    const ticker=setInterval(draw,95);
    await pause(420);
    clearInterval(ticker);
    $('#attackerDice').innerHTML=diceMarkup(round.attackerDice,round.rawAttackerDice);
    $('#defenderDice').innerHTML=diceMarkup(round.defenderDice,round.rawDefenderDice);
    title.textContent=label;
    setBattleTone(roundTone(round,defending));
    comparison.innerHTML=`${comparisonMarkup(round)}<div class="battle-summary">Pérdidas de esta tirada: ${round.attackerLosses} atacante · ${round.defenderLosses} defensor.${round.conquered?' Territorio conquistado.':''}</div>`;
    if(i<rounds.length-1)await pause(1100);
  }
  const totalA=rounds.reduce((sum,round)=>sum+round.attackerLosses,0);
  const totalD=rounds.reduce((sum,round)=>sum+round.defenderLosses,0);
  const conquered=rounds.at(-1).conquered;
  const finalTone=defending?(conquered?'defeat':'victory'):(conquered?'victory':fast?'defeat':roundTone(rounds.at(-1),false));
  setBattleTone(finalTone);
  title.textContent=defending?(conquered?'Perdiste el territorio':'Tu territorio resistió'):(conquered?'¡Territorio conquistado!':fast?'Ataque detenido':'Resultado de la tirada');
  comparison.insertAdjacentHTML('beforeend',`<div class="battle-total"><strong>${fast?`${rounds.length} ${rounds.length===1?'tirada':'tiradas'} · `:''}Resultado:</strong> ${totalA} bajas del atacante y ${totalD} del defensor.</div>`);
  close.classList.add('visible');close.focus();
  await new Promise(resolve=>{diceResolve=resolve});
}

function summaryHtml(){
  const map=getMap(state),winner=state.players[state.winner],campaign=state.campaign;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const standings=state.players.map(p=>({
    p,
    influence:p.influence||0,
    territories:ownedIds(state,p.id).length,
    troops:ownedIds(state,p.id).reduce((sum,id)=>sum+state.territories[id].troops,0),
    objCount:(p.completedObjectives||[]).length,
    stats:campaign?.complete?campaign.players[p.id]:null
  })).sort((a,b)=>b.influence-a.influence||b.territories-a.territories||b.troops-a.troops);

  const rows=standings.map(({p,influence,territories,troops,objCount,stats},i)=>{
    const cmd=COMMANDERS[p.commander]||COMMANDERS.conqueror;
    return `<tr class="${p.id===state.winner?'end-winner-row':''}">
    <td><span class="end-rank">${i+1}</span><i class="end-player-dot" style="--pc:${p.color}"></i>${escape(p.name)}${p.id===state.winner?' <b>Ganador</b>':''}</td>
    <td><span class="commander-badge-sm">${cmd.icon} ${cmd.name.replace('El ','')}</span></td>
    <td><b style="color:#ffd45f">${influence} pts</b></td>
    <td>${territories}</td>
    <td>${troops}</td>
    <td>$${p.money}</td>
    <td>${objCount}</td>
    ${campaign?.complete?`<td>${stats.conquests}</td><td>${stats.lost}</td>`:''}
  </tr>`;}).join('');

  const history=campaign?.complete?campaign.conquests.map((event,i)=>`<li><span>Ronda ${event.turn}</span><strong>${escape(state.players[event.attacker].name)}</strong> conquistó ${escape(tById(event.to).name)} desde ${escape(tById(event.from).name)} <small>· ${escape(state.players[event.defender].name)}</small></li>`).join(''):'';
  const vType=state.victoryType;
  const vBanner=vType==='influence'?'HEGEMONÍA POR INFLUENCIA':vType==='round_limit'?'LÍMITE DE CAMPAÑA (R40)':'MAPA DOMINADO';

  return `<div class="end-hero" style="background-image:linear-gradient(90deg,#061523f0,#06152377),url('./map-${map.id}.webp')">
    <span>${vBanner}</span>
    <strong>${escape(map.name)}</strong>
    <small>${state.rulesMode==='terrain'?'Modo terreno':'Modo clásico'} · ${state.turn} ${state.turn===1?'ronda':'rondas'} · ${state.players.length} comandantes</small>
  </div>
  <div class="end-kpis">
    <div><strong>${map.territories.length}</strong><span>territorios</span></div>
    <div><strong>${state.turn}</strong><span>rondas</span></div>
    <div><strong>${standings[0].influence}</strong><span>influencia ganadora</span></div>
    ${campaign?.complete?`<div><strong>${campaign.players.reduce((n,p)=>n+p.rolls,0)}</strong><span>tiradas</span></div>`:''}
  </div>
  <h3>Balance final</h3>
  <div class="end-table-wrap">
    <table class="end-table">
      <thead>
        <tr>
          <th>Comandante</th>
          <th>Doctrina</th>
          <th>Influencia</th>
          <th>Territorios</th>
          <th>Tropas</th>
          <th>Tesoro</th>
          <th>Objetivos</th>
          ${campaign?.complete?'<th>Conquistas</th><th>Bajas</th>':''}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  ${campaign?.complete?`<h3>Actividad de la campaña</h3><div class="end-activity">${standings.map(({p,stats})=>`<div><i class="end-player-dot" style="--pc:${p.color}"></i><strong>${escape(p.name)}</strong><span>${stats.rolls} tiradas · ${stats.defeated} rivales eliminados · ${stats.cards} cartas robadas</span></div>`).join('')}</div><details class="end-history"><summary>Historial completo de conquistas <span>${campaign.conquests.length}</span></summary><ol>${history||'<li>No hubo conquistas registradas.</li>'}</ol></details>`:`<p class="end-legacy">Esta partida comenzó antes del registro de estadísticas. El balance final muestra los datos disponibles del mapa.</p>`}`;
}
function showEndSummary(){
  if(!state||state.winner===null)return;
  const won=state.players[state.winner].human,winner=state.players[state.winner];
  els.endModal.querySelector('.end-card').classList.toggle('end-win',won);
  els.endModal.querySelector('.end-card').classList.toggle('end-loss',!won);
  $('#endEyebrow').textContent=won?'VICTORIA TOTAL':'CAMPAÑA TERMINADA';

  const vType=state.victoryType;
  let title='', subtitle='';
  if(vType==='influence'){
    title=won?'Hegemonía continental':'Hegemonía enemiga';
    subtitle=won?`Alcanzaste ${winner.influence} puntos de Influencia y aseguraste la hegemonía al término de la ronda.`:`${winner.name} alcanzó la hegemonía continental con ${winner.influence} puntos de Influencia.`;
  }else if(vType==='round_limit'){
    title='Límite de campaña (Ronda 40)';
    subtitle=won?`Concluida la ronda 40, obtuviste la victoria por mayor puntuación de Influencia (${winner.influence} pts).`:`Al concluir la ronda 40, ${winner.name} obtuvo la victoria por mayor Influencia (${winner.influence} pts).`;
  }else{
    title='Mapa conquistado';
    subtitle=won?`Conquistaste ${getMap(state).name}. Todos los territorios están bajo tu control.`:`${winner.name} conquistó ${getMap(state).name}. Tu ejército ha sido eliminado.`;
  }

  $('#endTitle').textContent=title;
  $('#endSubtitle').textContent=subtitle;
  $('#endSummary').innerHTML=summaryHtml();
  els.endModal.classList.remove('hidden');$('#viewEndMap').focus();
}
function closeEndSummary(){els.endModal.classList.add('hidden')}

async function doAttack(fast){
  if(rolling)return;
  closeMobileOrders();
  rolling=true;
  const from=selectedFrom,to=selectedTo;
  try{
    await playAttackApproach(from,to);
    const result=fast?blitz(state,from,to):attackRound(state,from,to,selectedDice);
    const rounds=fast?result.rounds:result.ok?[result]:[];
    if(!result.ok||!rounds.length)return;
    if(rounds.at(-1).conquered){selectedFrom=to;selectedTo=null}
    else if(state.territories[from].troops<2){selectedFrom=selectedTo=null}
    render();
    await presentDiceRounds(rounds,{from:tById(from).name,to:tById(to).name,fast});
    if(state.winner!==null)showEndSummary();
  }finally{rolling=false}
}

function showAiSummary(report){return new Promise(resolve=>{aiResolve=resolve;$('#aiTitle').textContent=`Turno de ${report.playerName}`;const battles=report.battles.slice(-4).map(b=>`<div class="ai-battle"><span>${b.from} → ${b.to}${b.conquered?' · conquistado':''}</span><span>${b.rounds} tirada${b.rounds===1?'':'s'} · pérdidas ${b.attackerLosses}/${b.defenderLosses}</span></div>`).join('');$('#aiSummary').innerHTML=`<div class="ai-kpis"><div class="ai-kpi"><strong>${report.reinforcements}</strong><span>REFUERZOS</span></div><div class="ai-kpi"><strong>${report.battles.length}</strong><span>ATAQUES</span></div><div class="ai-kpi"><strong>${report.conquests}</strong><span>CONQUISTAS</span></div></div>${battles||'<div class="battle-summary">No encontró un ataque favorable este turno.</div>'}${report.eliminated.length?`<div class="battle-summary">Eliminó a ${report.eliminated.join(', ')}.</div>`:''}`;els.aiModal.classList.remove('hidden');$('#closeAi').focus()})}
function closeAiSummary(){els.aiModal.classList.add('hidden');if(aiResolve){const resolve=aiResolve;aiResolve=null;resolve()}}
async function showDefenseAttack(battle){
  state=battle.beforeState;render(false);
  await playAttackApproach(battle.fromId,battle.toId);
  state=battle.afterState;render(false);
  await presentDiceRounds(battle.roundResults,{from:battle.from,to:battle.to,defending:true,fast:true});
  const remaining=state.territories[battle.toId].troops;
  const lost=battle.conquered;
  els.defenseModal.querySelector('.defense-card').classList.toggle('outcome-defeat',lost);
  els.defenseModal.querySelector('.defense-card').classList.toggle('outcome-victory',!lost);
  $('#defenseTitle').textContent=lost?'Has perdido un territorio':'Tu territorio resistió el ataque';
  $('#defenseRoute').textContent=`${battle.from} → ${battle.to}`;
  $('#defenseOutcome').innerHTML=`<strong>${battle.to}</strong><span>${lost?'Conquistado por el enemigo':`${remaining} tropa${remaining===1?'':'s'} restante${remaining===1?'':'s'}`}</span><small>Tu defensa perdió ${battle.defenderLosses} tropa${battle.defenderLosses===1?'':'s'}; el atacante perdió ${battle.attackerLosses}.</small>`;
  els.defenseModal.classList.remove('hidden');$('#continueDefense').focus();
  await new Promise(resolve=>{defenseResolve=resolve});
}
function closeDefense(){els.defenseModal.classList.add('hidden');if(defenseResolve){const resolve=defenseResolve;defenseResolve=null;resolve()}}
$('#continueDefense').onclick=closeDefense;$('#closeAi').onclick=closeAiSummary;$('#closeDice').onclick=()=>{els.diceModal.classList.add('hidden');if(diceResolve){const resolve=diceResolve;diceResolve=null;resolve()}};els.routesBtn.onclick=()=>{routesAll=!routesAll;updateConnections()};
$('#mobileOrdersBtn').onclick=()=>{if(state?.winner!==null&&state)showEndSummary();else openMobileOrders()};
$('#closeOrderSheet').onclick=closeMobileOrders;
$('#mobileSheetBackdrop').onclick=closeMobileOrders;
$('#panLeft').onclick=()=>document.querySelector('.map-wrap').scrollBy({left:-300,behavior:'smooth'});
$('#panRight').onclick=()=>document.querySelector('.map-wrap').scrollBy({left:300,behavior:'smooth'});
$('#mapOverviewBtn').onclick=()=>{const wrap=document.querySelector('.map-wrap'),overview=wrap.classList.toggle('overview');$('#mapOverviewBtn').setAttribute('aria-pressed',String(overview));$('#mapOverviewBtn').textContent=overview?'⊕':'⌕';if(overview)wrap.scrollTo({left:0,behavior:'smooth'});updateMobileMapOverlay()};
document.querySelector('.map-wrap').addEventListener('scroll',updateMobileMapOverlay,{passive:true});
window.addEventListener('resize',()=>{if(!mobileLayout())closeMobileOrders();updateMobileMapOverlay()});
els.phaseBtn.onclick=()=>{
  if(!state||rolling)return;
  if(state.phase==='gameover'){openStart();return}
  if(state.phase==='attack'){
    if(!setPhase(state,'fortify'))return showToast('Debes combatir al menos una vez');
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    closeMobileOrders();
  }else if(state.phase==='fortify'){
    setPhase(state,'close');
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    closeMobileOrders();
  }else if(state.phase==='close'){
    if(state.pendingCardDraw)return showToast('Debes descartar una carta antes de pasar el turno');
    const earned=state.conqueredThisTurn;
    endTurn(state);
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    closeMobileOrders();
    if(earned)showToast('Carta táctica robada');
    if(state.winner!==null){showEndSummary();return}
    runAiTurns();
  }
};
async function runAiTurns(){if(!state||state.winner!==null||state.players[state.current].human||aiBusy)return;aiBusy=true;try{while(state.winner===null&&!state.players[state.current].human){render();await new Promise(r=>setTimeout(r,650));const report=aiTurn(state,state.current,difficulty);pendingAiState=state;save();for(const battle of report.battles.filter(b=>b.defenderId===0)){await showDefenseAttack(battle)}state=pendingAiState;pendingAiState=null;render();if(report.ok)await showAiSummary(report)}}finally{if(pendingAiState){state=pendingAiState;pendingAiState=null}aiBusy=false;render();if(state.winner!==null)showEndSummary()}}
function chosen(name){return document.querySelector(`input[name="${name}"]:checked`)?.value}
function startNew(){state=createGame({players:+$('#playerCount').value,seed:Date.now(),human:true,mapId:chosen('mapChoice'),rulesMode:chosen('rulesMode'),playerCommander:chosen('commanderChoice')||'conqueror'});difficulty=$('#difficulty').value;selectedFrom=selectedTo=null;selectedUnit='infantry';closeMobileOrders();initMap(state.mapId);els.startModal.classList.add('hidden');closeEndSummary();render();showToast('Paso 1: coloca tus refuerzos')}
const START_BG_MAPS=['./map-frontier.webp','./map-archipelago.webp','./map-rift.webp'];function applyRandomStartBg(){const m=START_BG_MAPS[Math.floor(Math.random()*START_BG_MAPS.length)];if(els.startModal)els.startModal.style.setProperty('--start-bg-img',`url("${m}")`)}function openStart(){applyRandomStartBg();els.startModal.classList.remove('hidden');$('#continueBtn').hidden=!localStorage.getItem(SAVE)}
document.querySelectorAll('.option-card input').forEach(input=>input.onchange=()=>{document.querySelectorAll(`input[name="${input.name}"]`).forEach(x=>x.closest('.option-card').classList.toggle('active',x.checked))});$('#startBtn').onclick=startNew;$('#continueBtn').onclick=()=>{if(load()){initMap(state.mapId);els.startModal.classList.add('hidden');render();if(state.winner!==null)showEndSummary();else runAiTurns()}};$('#newBtn').onclick=openStart;els.summaryBtn.onclick=showEndSummary;$('#viewEndMap').onclick=closeEndSummary;$('#newFromEnd').onclick=()=>{closeEndSummary();openStart()};$('#helpBtn').onclick=()=>els.helpModal.classList.remove('hidden');$('#closeHelp').onclick=$('#gotItBtn').onclick=()=>els.helpModal.classList.add('hidden');window.addEventListener('beforeunload',save);

function registerWebMCP(){const c=document.modelContext;if(!c?.registerTool)return;try{c.registerTool({name:'get_campaign_state',title:'Consultar campaña',description:'Devuelve mapa, reglas, turno, fase y jugadores.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>state?{map:getMap(state).name,mode:state.rulesMode,turn:state.turn,phase:state.phase,currentPlayer:state.players[state.current].name,winner:state.winner===null?null:state.players[state.winner].name}:{status:'no_game'}})}catch(e){console.warn('WebMCP no disponible',e)}}
initMap('frontier');applyRandomStartBg();if(localStorage.getItem(SAVE))$('#continueBtn').hidden=false;registerWebMCP();
