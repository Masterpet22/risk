import {REGIONS,MAPS,TERRAINS,UNIT_TYPES,getMap,getRegion,getTerritories,createGame,ownedIds,enemiesOf,placeTroops,undoReinforcement,finishReinforcement,attackRound,probeTerritory,blitz,fortify,setPhase,endTurn,aiTurn,canPlayerAttack,territoryProduction,productionTotal,buyReinforcements,TACTICAL_CARDS,tacticalCardCost,isConnectionBlocked,playTacticalCard,resolveCounterReaction,resolvePendingCardDraw,buyMarketItem,generateMarket,MARKET_CATALOG,calculateInfluence,influenceBreakdown,checkObjectives,chooseObjective,objectiveProgress,OBJECTIVES_CATALOG,COMMANDERS,COMMANDER_IDS,FRONT_STATES,FRONT_STATE_LABELS,getFrontState,isTerritoryInWarFront,getTerritoryIntel,getTerritoryVisibility,approximateTroops,EVENT_CATALOG,frontKey} from './engine.mjs?v=17';
import {startTelemetryCampaign,ensureTelemetryCampaign,observeTelemetryState,recordCardPlayed,recordCardDiscarded,recordOfferBought,finishTelemetryCampaign,telemetrySummary,exportTelemetry,clearTelemetry} from './telemetry.mjs?v=1';
import {saveCampaign,loadCampaign,hasSavedCampaign} from './campaign-storage.mjs?v=1';
import {routeGeometry} from './map-routes.mjs?v=1';
import {createLiveAnnouncer,restoreFocus,escapeHtml} from './ui-accessibility.mjs?v=1';
import {openStrategicModal as showStrategicModal} from './modal-service.mjs?v=1';
import {diceMarkup,comparisonMarkup,soldierFigures,roundTone} from './combat-view.mjs?v=1';
import {clampMoveAmount,movementPreview} from './order-controls.mjs?v=1';

const $=s=>document.querySelector(s),els={map:$('#map'),players:$('#players'),regions:$('#regions'),round:$('#round'),phaseTitle:$('#phaseTitle'),turnLabel:$('#turnLabel'),reinforcements:$('#reinforcements'),reinforceBox:$('#reinforceBox'),orderTitle:$('#orderTitle'),orderText:$('#orderText'),turnStatus:$('#turnStatus'),economyBox:$('#economyBox'),cardsBox:$('#cardsBox'),terrainPanel:$('#terrainPanel'),selection:$('#selectionInfo'),battle:$('#battleResult'),controls:$('#actionControls'),phaseBtn:$('#phaseBtn'),log:$('#log'),startModal:$('#startModal'),helpModal:$('#helpModal'),diceModal:$('#diceModal'),aiModal:$('#aiModal'),defenseModal:$('#defenseModal'),endModal:$('#endModal'),summaryBtn:$('#summaryBtn'),mapGuide:$('#mapGuide'),mapTooltip:$('#mapTooltip'),routesBtn:$('#routesBtn'),toast:$('#toast'),eventBanner:$('#eventBanner'),announcements:$('#gameAnnouncements')};
let state=null,pendingAiState=null,difficulty='normal',selectedFrom=null,selectedTo=null,inspectedTerritory=null,selectedDice=3,selectedMove=1,selectedUnit='infantry',toastTimer=null,aiBusy=false,rolling=false,routesAll=false,hoverId=null,aiResolve=null,defenseResolve=null,cardTargeting=null,skipAiRequested=false,reactionPromptActive=false;
let objectivesModalHtml='',marketModalHtml='',chronicleModalHtml='',frontsModalHtml='',eventModalData=null;
let lastRenderedPhase=null;
let helpReturnFocus=null,diceReturnFocus=null,aiReturnFocus=null,defenseReturnFocus=null,endReturnFocus=null;
const TUTORIAL_KEY='fronteras-acero-tutorial-v1';
let tutorialActive=false,tutorialCurrent=null;
const tutorialSteps=[
  {id:'recruit',title:'Recluta y corrige',text:'Pulsa un territorio propio para colocar tropas. Si te equivocas, usa “Deshacer” antes de comenzar el combate.',target:'#orderCard',when:()=>state?.phase==='reinforce'},
  {id:'influence',title:'Entiende tu Influencia',text:'Pulsa tu total de Influencia para ver cuánto aporta cada fuente y cuánto falta para ganar.',target:'.metric-influence-btn',when:()=>state?.phase==='reinforce'},
  {id:'objectives',title:'Consulta tus objetivos',text:'La bandera abre tus objetivos y su progreso sin ocupar espacio permanente en el tablero.',target:'#objectivesMapBtn',when:()=>state?.phase==='reinforce'},
  {id:'fronts',title:'Lee los Frentes regionales',text:'Cada región registra su propia tensión. Una guerra en el norte no convierte automáticamente los demás límites en guerra.',target:'#frontsMapBtn',when:()=>state?.phase==='reinforce'},
  {id:'market',title:'Compra con intención',text:'Tesoro contiene la compra básica de +3 tropas. El Mercado reúne ofertas rotatorias, cartas y efectos.',target:'#marketModalBtn',when:()=>state?.phase==='reinforce'},
  {id:'attack-origin',title:'Elige quién ataca',text:'Selecciona un territorio propio con al menos 2 tropas. Sus objetivos válidos quedarán destacados.',target:'#map',when:()=>state?.phase==='attack'&&!selectedFrom},
  {id:'attack-target',title:'Elige un vecino enemigo',text:'Ahora selecciona un territorio enemigo conectado. Las rutas visibles corresponden al origen elegido.',target:'#map',when:()=>state?.phase==='attack'&&!!selectedFrom&&!selectedTo},
  {id:'attack-dice',title:'Sondea o compromete tropas',text:'Sondeo revela la guarnición con 1 dado y nunca conquista. Atacar es opcional; puedes pasar a Maniobra.',target:'#actionControls',when:()=>state?.phase==='attack'&&!!selectedTo},
  {id:'fortify',title:'Maniobra con vista previa',text:'Elige origen y destino propios; ajusta con −/+, escribe una cantidad o usa 1, Mitad y Máximo.',target:'#orderCard',when:()=>state?.phase==='fortify'},
  {id:'cards',title:'Cartas tácticas',text:'Las cartas se ganan conquistando. Sus iconos muestran la mano y el detalle aparece al pasar o enfocar.',target:'#cardsSection',when:()=>state?.phase==='close'},
  {id:'terrain-events',title:'Eventos del terreno',text:'En Modo terreno, este acceso anuncia terremotos, tsunamis o temporales antes de que se activen.',target:'#eventBanner',terrainOnly:true,when:()=>state?.rulesMode==='terrain'&&!!(state?.announcedEvent||state?.activeEvent)}
];
function tutorialStatus(){try{return{version:1,seen:[],dismissed:false,completed:false,...JSON.parse(localStorage.getItem(TUTORIAL_KEY)||'{}')}}catch{return{version:1,seen:[],dismissed:false,completed:false}}}
function saveTutorialStatus(status){localStorage.setItem(TUTORIAL_KEY,JSON.stringify(status))}
function clearTutorialFocus(){document.querySelectorAll('.tutorial-focus').forEach(element=>element.classList.remove('tutorial-focus'))}
function positionTutorialCoach(target){
  const coach=$('#tutorialCoach');if(!coach||!target)return;
  const place=()=>{const rect=target.getBoundingClientRect(),box=coach.getBoundingClientRect(),pad=10;if(window.innerWidth<=760){coach.style.left='12px';coach.style.right='12px';coach.style.top='auto';coach.style.bottom='76px';return}let left=rect.right+12,top=rect.top;if(target.id==='map'){left=rect.right-box.width-14;top=rect.bottom-box.height-58}else if(left+box.width>window.innerWidth-pad)left=rect.left-box.width-12;left=Math.max(pad,Math.min(left,window.innerWidth-box.width-pad));top=Math.max(pad,Math.min(top,window.innerHeight-box.height-pad));coach.style.left=`${left}px`;coach.style.right='auto';coach.style.top=`${top}px`;coach.style.bottom='auto'};
  requestAnimationFrame(place);
}
function renderTutorial(){
  const coach=$('#tutorialCoach');if(!coach)return;clearTutorialFocus();
  const status=tutorialStatus();tutorialActive=tutorialActive||(!status.dismissed&&!status.completed);
  if(!tutorialActive||!state||!state.players[state.current]?.human){coach.classList.add('hidden');return}
  if(tutorialCurrent&&!tutorialSteps.find(step=>step.id===tutorialCurrent)?.when())tutorialCurrent=null;
  const available=tutorialSteps.filter(step=>(!step.terrainOnly||state.rulesMode==='terrain')&&!status.seen.includes(step.id)&&step.when());
  const step=available.find(item=>item.id===tutorialCurrent)||available[0];
  if(!step){coach.classList.add('hidden');return}
  const target=$(step.target);if(!target||target.classList.contains('hidden')){coach.classList.add('hidden');return}
  const changed=tutorialCurrent!==step.id;tutorialCurrent=step.id;target.classList.add('tutorial-focus');
  $('#tutorialTitle').textContent=step.title;$('#tutorialText').textContent=step.text;
  const relevant=tutorialSteps.filter(item=>!item.terrainOnly||state.rulesMode==='terrain');
  $('#tutorialProgress').textContent=`${Math.min(relevant.length,status.seen.length+1)} de ${relevant.length}`;
  coach.classList.remove('hidden');
  if(changed&&['market','cards'].includes(step.id))target.scrollIntoView({block:'nearest',behavior:'smooth'});
  positionTutorialCoach(target);
}
function advanceTutorial(){const status=tutorialStatus();if(tutorialCurrent&&!status.seen.includes(tutorialCurrent))status.seen.push(tutorialCurrent);const required=tutorialSteps.filter(step=>!step.terrainOnly||state?.rulesMode==='terrain');status.completed=required.every(step=>status.seen.includes(step.id));saveTutorialStatus(status);tutorialCurrent=null;if(status.completed)tutorialActive=false;renderTutorial()}
function skipTutorial(){const status=tutorialStatus();status.dismissed=true;saveTutorialStatus(status);tutorialActive=false;tutorialCurrent=null;clearTutorialFocus();$('#tutorialCoach')?.classList.add('hidden');showToast('Tutorial omitido. Puedes reiniciarlo desde Ayuda.')}
function restartTutorial(){saveTutorialStatus({version:1,seen:[],dismissed:false,completed:false});tutorialActive=true;tutorialCurrent=null;els.helpModal.classList.add('hidden');renderTutorial();restoreFocus($('#nextTutorialBtn'),'#mobileOrdersBtn');showToast('Tutorial contextual reiniciado')}
const ts=()=>state?getTerritories(state):MAPS.frontier.territories,tById=id=>ts().find(t=>t.id===id);
const regionShort=(map,key)=>getRegion(map,key).short||getRegion(map,key).name.toUpperCase();
function save(){if(state)saveCampaign(pendingAiState||state,difficulty)}
function load(){const restored=loadCampaign();if(!restored)return false;state=restored.state;difficulty=restored.difficulty;return true}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2500)}
const announce=createLiveAnnouncer(els.announcements);
const mobileLayout=()=>window.matchMedia('(max-width: 1200px)').matches;
function openMobileOrders(){if(!mobileLayout())return;document.body.classList.add('order-open');$('#mobileOrdersBtn').setAttribute('aria-expanded','true');$('#orderCard').scrollTop=0;setTimeout(()=>{if(document.body.classList.contains('order-open'))$('#closeOrderSheet').focus()},360)}
function closeMobileOrders(){const wasOpen=document.body.classList.contains('order-open');document.body.classList.remove('order-open');$('#mobileOrdersBtn').setAttribute('aria-expanded','false');if(wasOpen)restoreFocus($('#mobileOrdersBtn'))}
function updateMobileOrders(){if(!state)return;const label=state.winner!==null?'Resumen final':state.phase==='reinforce'?`${state.pendingReinforcements} refuerzos por colocar`:state.phase==='attack'?(selectedTo?'Ataque preparado':selectedFrom?'Elige objetivo':'Preparar ataque'):state.phase==='fortify'?'Maniobra o pasar':'Cerrar turno';$('#mobileOrdersLabel').textContent=label}
function updateControlAccessibility(){
  if(!state)return;
  const heading=$('#contextActionHeading')?.textContent||'Orden actual',phaseButton=els.phaseBtn,mobileButton=$('#mobileOrdersBtn');
  if(phaseButton){phaseButton.setAttribute('aria-label',`${phaseButton.textContent.trim()}. ${heading}${phaseButton.disabled?'. Acción no disponible todavía':''}`);phaseButton.setAttribute('aria-describedby','turnStatus')}
  if(mobileButton)mobileButton.setAttribute('aria-label',`${mobileButton.getAttribute('aria-expanded')==='true'?'Cerrar':'Abrir'} órdenes. ${$('#mobileOrdersLabel')?.textContent||heading}`);
  const market=$('#marketModalBtn');if(market)market.setAttribute('aria-label',`Abrir Mercado táctico. Tesoro disponible: $${state.players[state.current]?.money||0}`);
  document.querySelectorAll('.zoom-btn').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('active'))));
}
function updateMobileMapOverlay(){const head=document.querySelector('.map-head')||document.querySelector('.map-floating-header'),toolbar=document.querySelector('.map-toolbar')||document.querySelector('.map-floating-footer');if(head&&head.style){head.style.left='';head.style.right='';head.style.width=''}if(toolbar&&toolbar.style){toolbar.style.left=''}}

function initMap(mapId='frontier'){
  const map=MAPS[mapId]||MAPS.frontier,T=map.territories;els.map.innerHTML=`<image class="map-art" href="./map-${map.id}.webp" x="0" y="0" width="1000" height="760" preserveAspectRatio="xMidYMid slice"/><rect class="map-art-shade" x="0" y="0" width="1000" height="760"/>`;
  const wrap=document.querySelector('.map-wrap');wrap.scrollLeft=0;wrap.classList.remove('overview');$('#mapOverviewBtn').setAttribute('aria-pressed','false');$('#mapOverviewBtn').textContent='⌕';
  const drawn=new Set();for(const t of T)for(const n of t.n){const k=[t.id,n].sort().join('-');if(drawn.has(k))continue;drawn.add(k);const b=T.find(x=>x.id===n),cross=t.region!==b.region?' cross':'',route=routeGeometry(t,b,T);els.map.insertAdjacentHTML('beforeend',`<path class="connection${cross}" data-a="${t.id}" data-b="${n}" data-routed="${route.curved}" d="${route.d}"/>`)}
  for(const t of T){const x=t.x*10,y=t.y*8,r=50,points=Array.from({length:6},(_,i)=>{const a=-Math.PI/2+i*Math.PI/3;return`${(x+Math.cos(a)*r).toFixed(1)},${(y+Math.sin(a)*r).toFixed(1)}`}).join(' ');els.map.insertAdjacentHTML('beforeend',`<g class="territory" id="terr-${t.id}" data-id="${t.id}" tabindex="0" role="button"><polygon class="territory-shape" points="${points}" style="--region:${REGIONS[t.region].color}44"/><text class="territory-region" x="${x}" y="${y-25}">${regionShort(map,t.region)}</text><text class="territory-label" x="${x}" y="${y-7}">${t.name}</text><text class="terrain-mark" x="${x-35}" y="${y+24}">${TERRAINS[t.terrain].icon}</text><rect class="army-disc" x="${x-24}" y="${y+3}" width="48" height="31" rx="16"/><text class="unit-mark" x="${x-8}" y="${y+25}">♟</text><text class="army-count" x="${x+11}" y="${y+25}">1</text></g>`)}
  els.map.onclick=e=>{const g=e.target.closest('.territory');if(g)territoryClick(g.dataset.id,e.shiftKey)};els.map.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.territory')){e.preventDefault();territoryClick(e.target.closest('.territory').dataset.id)}};els.map.onpointerover=e=>{const g=e.target.closest('.territory');if(g&&hoverId!==g.dataset.id){hoverId=g.dataset.id;updateHover(g.dataset.id)}};els.map.onpointerout=e=>{if(e.target.closest('.territory')&&!e.relatedTarget?.closest?.('.territory')){hoverId=null;renderMap()}};updateConnections();updateMobileMapOverlay();
}
function updateHover(id){
  if(!state)return;
  inspectedTerritory=id;
  renderTerritoryInspect(id);
  renderMap();
}
function updateConnections(){
  document.querySelectorAll('.connection').forEach(l=>{
    const a=l.dataset.a,b=l.dataset.b;
    const ownerA=state?.territories?.[a]?.owner,ownerB=state?.territories?.[b]?.owner;
    const regions=[...new Set([tById(a)?.region,tById(b)?.region].filter(Boolean))];
    const severity={war:3,conflict:2,tense:1,stable:0};
    const frontState=ownerA===undefined||ownerB===undefined||ownerA===ownerB?'stable':regions.map(region=>getFrontState(state,ownerA,ownerB,region)).sort((x,y)=>severity[y]-severity[x])[0]||'stable';
    const frontColor=FRONT_STATE_LABELS[frontState]?.color||FRONT_STATE_LABELS.stable.color;
    l.dataset.frontState=frontState;
    l.style.setProperty('--front-color',frontColor);
    const isBlocked=isConnectionBlocked(state,a,b);
    l.classList.toggle('blocked',isBlocked);const isEventBlocked=state?.rulesMode==='terrain'&&isBlocked&&state?.blockedConnections?.some(bc=>((bc.a===a&&bc.b===b)||(bc.a===b&&bc.b===a))&&bc.expiresTurn>=state.turn&&['earthquake','tsunami','tempest'].includes(bc.cause));l.classList.toggle('blocked-event',!!isEventBlocked);
    const related=selectedFrom&&(a===selectedFrom||b===selectedFrom),hovered=hoverId&&(a===hoverId||b===hoverId);
    l.classList.toggle('visible',!!(related||hovered||isBlocked));
    l.classList.toggle('show-all',routesAll);
  });
  els.routesBtn.textContent=routesAll?'Rutas: todas':'Rutas: al seleccionar';
  els.routesBtn.setAttribute('aria-pressed',String(routesAll));
}

function render(persist=true){if(!state)return;const phaseChanged=lastRenderedPhase!==state.phase,p=state.players[state.current];observeTelemetryState(state);els.round.textContent=state.turn;els.reinforcements.textContent=state.pendingReinforcements;els.reinforceBox.style.display=state.phase==='reinforce'?'flex':'none';els.summaryBtn.classList.toggle('hidden',state.winner===null);els.turnLabel.textContent=state.winner!==null?'CAMPAÑA TERMINADA':p.human?'TU TURNO':`TURNO DE ${p.name.toUpperCase()}`;renderFlow();renderPlayers();renderRegions();renderEventBanner();renderMap();renderFronts();renderGuide();renderPanel();renderLog();updateMobileOrders();updateControlAccessibility();renderTutorial();lastRenderedPhase=state.phase;if(phaseChanged)requestAnimationFrame(()=>{const panel=document.querySelector('.right-panel');if(panel)panel.scrollTop=0});if(persist)save()}
function renderFlow(){const order=['reinforce','attack','fortify','close'],idx=state.phase==='gameover'?4:Math.max(0,order.indexOf(state.phase));document.querySelectorAll('.flow-step').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx)})}
function renderEventBanner(){
  if(!els.eventBanner)return;
  if(!state||state.rulesMode!=='terrain'){
    els.eventBanner.className='event-banner hidden';
    els.eventBanner.innerHTML='';
    eventModalData=null;
    return;
  }
  const eventKey = state.activeEvent ? ('active-' + state.turn + '-' + state.activeEvent.type) : state.announcedEvent ? ('ann-' + state.turn + '-' + state.announcedEvent.type) : null;
  if(!eventKey){
    els.eventBanner.className='event-banner hidden';
    els.eventBanner.innerHTML='';
    eventModalData=null;
    return;
  }
  if(state.activeEvent){
    const ev=EVENT_CATALOG[state.activeEvent.type]||{name:'Desastre',icon:'⚡',desc:'Fuerza natural devastadora'};
    const regName=getRegion(state,state.activeEvent.region).name;
    els.eventBanner.className='event-banner event-banner-active';
    els.eventBanner.innerHTML='<button class="map-corner-btn event-map-btn" id="openEventAlert" type="button" aria-label="Ver desastre activo"><span aria-hidden="true">' + (ev.icon||'⚡') + '</span><small>ACTIVO</small></button>';
    eventModalData={icon:'error',title:(ev.icon||'⚡')+' '+ev.name,html:'<p><strong>Desastre activo en '+regName+'.</strong></p><p>'+ev.desc+'</p><p>Sus efectos permanecen hasta la ronda '+state.activeEvent.expiresRound+'.</p>'};
  }else if(state.announcedEvent){
    const ev=EVENT_CATALOG[state.announcedEvent.type]||{name:'Amenaza',icon:'⚠️',desc:'Fuerza natural en desarrollo'};
    const regName=getRegion(state,state.announcedEvent.region).name;
    els.eventBanner.className='event-banner event-banner-announced';
    els.eventBanner.innerHTML='<button class="map-corner-btn event-map-btn" id="openEventAlert" type="button" aria-label="Ver alerta de la ronda '+state.announcedEvent.triggerRound+'"><span aria-hidden="true">⚠️</span><small>R'+state.announcedEvent.triggerRound+'</small></button>';
    eventModalData={icon:'warning',title:(ev.icon||'⚠️')+' '+ev.name+' inminente',html:'<p><strong>Alerta en la región '+regName+'.</strong></p><p>'+ev.desc+'</p><p>Impacto previsto para la ronda '+state.announcedEvent.triggerRound+'.</p>'};
  }
  const alertBtn=els.eventBanner.querySelector('#openEventAlert');
  if(alertBtn)alertBtn.onclick=openEventModal;
}

const openStrategicModal=options=>showStrategicModal(options,{onUnavailable:()=>showToast('No se pudo abrir el detalle')});
function openEventModal(){if(eventModalData)openStrategicModal(eventModalData)}
function openObjectivesModal(){if(objectivesModalHtml)openStrategicModal({title:'🚩 Objetivos',html:objectivesModalHtml,didOpen:popup=>{popup.querySelectorAll('[data-objective-choice]').forEach(button=>button.onclick=()=>{const result=chooseObjective(state,state.current,button.dataset.objectiveKind,button.dataset.objectiveChoice);if(!result.ok)return showToast(result.reason);render();window.Swal?.close();showToast('Objetivo elegido: '+(OBJECTIVES_CATALOG.find(o=>o.id===result.objectiveId)?.name||result.objectiveId))})}})}
function openInfluenceModal(pid=0){
  const p=state?.players?.[pid];
  if(!p?.human)return;
  const b=influenceBreakdown(state,pid),pct=Math.min(100,(b.total/b.target)*100);
  const diplomat=b.objectives.multiplier>1?`<div class="influence-row influence-bonus"><span>Bonificación de El Diplomático <small>+40% sobre objetivos</small></span><strong>+${b.objectives.bonusPoints}</strong></div>`:'';
  openStrategicModal({title:'✦ Desglose de Influencia',width:520,html:`<div class="influence-breakdown">
    <div class="influence-total"><div><small>${escapeHtml(p.name)}</small><strong>${b.total} / ${b.target}</strong></div><span>Faltan ${b.remaining} para la victoria</span></div>
    <div class="influence-progress"><i style="width:${pct}%"></i></div>
    <div class="influence-row"><span>Presencia territorial <small>${b.territories.capped}/${b.territories.cap} territorios puntuables</small></span><strong>+${b.territories.points}</strong></div>
    <div class="influence-row"><span>Regiones completas <small>${b.regions.capped}/${b.regions.cap} × 3</small></span><strong>+${b.regions.points}</strong></div>
    <div class="influence-row"><span>Objetivos completados <small>${b.objectives.count} objetivos</small></span><strong>+${b.objectives.basePoints}</strong></div>
    ${diplomat}
    <div class="influence-row influence-final"><span>Total calculado ahora</span><strong>${b.total}</strong></div>
    <p class="influence-hint">Producción y tropas aumentan tu capacidad de actuar, pero no conceden Influencia. La principal ruta hacia la Hegemonía son los objetivos.</p>
  </div>`});
}
function chronicleCategory(text){
  const value=String(text).toLowerCase();
  if(/conquist|atac|combate|baja|elimin|defend|frente|guerra/.test(value))return'combat';
  if(/compr|mercado|producci|\$|tesoro|refuerzo|subsidio/.test(value))return'economy';
  if(/evento|terremoto|tsunami|temporal|alerta|geol|desastre|rutas cortadas/.test(value))return'events';
  return'campaign';
}
function openChronicleModal(){
  if(!chronicleModalHtml)return;
  openStrategicModal({title:'▤ Crónica de campaña',width:680,html:chronicleModalHtml,didOpen:popup=>{
    const entries=[...popup.querySelectorAll('.chronicle-entry')];
    popup.querySelectorAll('[data-chronicle-filter]').forEach(btn=>btn.onclick=()=>{
      const filter=btn.dataset.chronicleFilter;
      popup.querySelectorAll('[data-chronicle-filter]').forEach(item=>item.classList.toggle('active',item===btn));
      entries.forEach(entry=>entry.hidden=filter!=='all'&&!entry.classList.contains(`category-${filter}`));
      popup.querySelectorAll('.chronicle-round').forEach(round=>{const next=[];let node=round.nextElementSibling;while(node&&!node.classList.contains('chronicle-round')){if(node.classList.contains('chronicle-entry'))next.push(node);node=node.nextElementSibling}round.hidden=!next.some(entry=>!entry.hidden)});
    });
  }});
}
function regionalFrontData(a,b,region){return state.fronts?.[frontKey(a,b,region)]||{state:'stable',lastHostilityTurn:0,battlesThisTurn:0}}
function renderFronts(){
  const button=$('#frontsMapBtn');
  if(!button||!state)return;
  const human=state.players.find(p=>p.human)||state.players[0];
  const severity={war:3,conflict:2,tense:1,stable:0};
  const rows=[];
  for(const rival of state.players.filter(p=>p.alive&&p.id!==human.id))for(const region of Object.keys(REGIONS)){
    const data=regionalFrontData(human.id,rival.id,region),label=FRONT_STATE_LABELS[data.state]||FRONT_STATE_LABELS.stable;
    const touches=getTerritories(state).some(t=>t.region===region&&[human.id,rival.id].includes(state.territories[t.id].owner)&&t.n.some(n=>[human.id,rival.id].includes(state.territories[n].owner)&&state.territories[n].owner!==state.territories[t.id].owner));
    if(data.state!=='stable'||touches)rows.push({rival,region,data,label});
  }
  rows.sort((a,b)=>severity[b.data.state]-severity[a.data.state]||getRegion(state,a.region).name.localeCompare(getRegion(state,b.region).name));
  const active=rows.filter(row=>row.data.state!=='stable').length;
  frontsModalHtml=`<div class="fronts-modal"><div class="front-legend">
    ${FRONT_STATES.map(key=>{const item=FRONT_STATE_LABELS[key];return`<span class="front-legend-item front-${key}"><i style="--front:${item.color}"></i>${item.name}</span>`}).join('')}
  </div><p class="front-explainer">Cada región mantiene una tensión independiente entre comandantes. Las rutas toman el nivel más alto de las regiones que conectan; una ruta bloqueada conserva una marca adicional.</p>
  <div class="front-list">${rows.map(({rival,region,data,label})=>`<div class="front-summary front-${data.state}"><span class="front-rival-dot" style="--rival:${rival.color}"></span><div><strong>${escapeHtml(getRegion(state,region).name)} · ${escapeHtml(human.name)} ↔ ${escapeHtml(rival.name)}</strong><small>${data.lastHostilityTurn?`Última hostilidad: ronda ${data.lastHostilityTurn}`:'Contacto estable'}${data.battlesThisTurn?` · ${data.battlesThisTurn} combate${data.battlesThisTurn===1?'':'s'} este turno`:''}</small></div><b style="--front:${label.color}">${label.icon} ${label.name}</b></div>`).join('')||'<p class="chronicle-empty">No hay contacto regional con rivales.</p>'}</div>
  <p class="front-cooling">Sondear o usar operaciones encubiertas tensa una región; combatir y conquistar la escala. Sin hostilidades, se enfría un nivel por ronda.</p></div>`;
  button.classList.remove('hidden');
  button.classList.toggle('has-active-fronts',active>0);
  button.setAttribute('aria-label',`Ver Frentes de Guerra; ${active} activos`);
  const badge=$('#frontsMapBadge');if(badge)badge.textContent=String(active);
}
function openFrontsModal(){if(frontsModalHtml)openStrategicModal({title:'⚔ Frentes de Guerra',width:650,html:frontsModalHtml})}
function renderPlayers(){
  const aliveCount = state.players.filter(p => p.alive).length;
  const aliveBadge = $('#alivePlayersCount');
  if (aliveBadge) aliveBadge.textContent = aliveCount + ' activos';

  els.players.innerHTML = state.players.map((p, idx) => {
    const ids = ownedIds(state, p.id);
    const isHuman = p.human;
    const troops = ids.reduce((sum, tid) => sum + state.territories[tid].troops, 0);
    const cardCount = Array.isArray(p.cards) ? p.cards.length : 0;
    const cmd = COMMANDERS[p.commander] || COMMANDERS.conqueror;
    const frontToHuman = (!isHuman && state.players[0]) ? getFrontState(state, 0, p.id) : null;
    const visibility = !isHuman ? ids.map(tid => getTerritoryVisibility(state, tid, 0, difficulty)) : [];
    const hasHidden = visibility.includes('hidden'), hasPartial = visibility.includes('partial');
    const troopsStr = hasHidden ? '?' : hasPartial ? ('≈' + ids.reduce((sum, tid) => {
      const v = getTerritoryVisibility(state, tid, 0, difficulty);
      if (v === 'full') return sum + state.territories[tid].troops;
      const r = approximateTroops(state.territories[tid].troops);
      return sum + (r === '1-2' ? 2 : r === '3-5' ? 4 : r === '6-9' ? 8 : 10);
    }, 0)) : ('' + troops);
    const terrStr = hasHidden ? '?' : ('' + ids.length);
    const isActive = state.current === p.id && p.alive;
    const statusText = !p.alive ? 'Derrotado' : isActive ? 'EN TURNO' : 'Esperando';

    return '<div class="player ' + (isActive ? 'active' : '') + ' ' + (!p.alive ? 'eliminated' : '') + '" data-player-id="' + p.id + '" style="--pc:' + p.color + '" tabindex="0" role="button" aria-haspopup="dialog" aria-label="Ver detalles de ' + p.name + '">' +
      '<div class="player-top">' +
        '<div class="player-brand-wrap">' +
          '<span class="player-avatar" title="' + cmd.name + ': ' + cmd.desc + '">' + cmd.icon + '</span>' +
          '<span class="player-name">' + p.name + '</span>' +
        '</div>' +
        '<span class="player-status-tag">' + statusText + '</span>' +
      '</div>' +
      '<div class="player-metrics-grid">' +
        '<div class="metric-col"><strong>' + terrStr + '</strong><small>territorios</small></div>' +
        '<div class="metric-col"><strong class="' + (hasHidden || hasPartial ? 'approx-stat' : '') + '">' + troopsStr + '</strong><small>tropas</small></div>' +
        '<div class="metric-col"><strong>' + cardCount + '</strong><small>cartas</small></div>' +
        (isHuman?'<button class="metric-col metric-influence-btn" data-influence-player="'+p.id+'" type="button" aria-label="Ver desglose de Influencia"><strong class="inf-val">'+calculateInfluence(state,p.id)+'</strong><small>influencia · ver</small></button>':'<div class="metric-col"><strong class="inf-val">'+(p.influence||0)+'</strong><small>influencia</small></div>') +
      '</div>' +
    '</div>';
  }).join('');

  els.players.querySelectorAll('.player').forEach(card => {
    const pid = +card.dataset.playerId;
    card.onpointerenter = (e) => {
      if (e.pointerType === 'touch') return;
      showCommanderPopover(pid, card);
    };
    card.onpointerleave = (e) => {
      if (e.pointerType === 'touch') return;
      hideCommanderPopover();
    };
    card.onclick = (e) => {
      e.stopPropagation();
      toggleCommanderPopover(pid, card);
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCommanderPopover(pid, card);
      }
    };
  });
  els.players.querySelectorAll('.metric-influence-btn').forEach(button=>button.onclick=e=>{e.stopPropagation();openInfluenceModal(+button.dataset.influencePlayer)});
}

function showCommanderPopover(pid, anchorEl) {
  const popover = $('#commanderPopover');
  if (!popover || !state || !state.players[pid]) return;

  const p = state.players[pid];
  const cmd = COMMANDERS[p.commander] || COMMANDERS.conqueror;
  const ids = ownedIds(state, p.id);
  const isHuman = p.human;
  const troops = ids.reduce((sum, tid) => sum + state.territories[tid].troops, 0);
  const visibility = !isHuman ? ids.map(tid => getTerritoryVisibility(state, tid, 0, difficulty)) : [];
  const hasHidden = visibility.includes('hidden'), hasPartial = visibility.includes('partial');
  const troopsStr = hasHidden ? '?' : hasPartial ? ('≈' + ids.reduce((sum, tid) => {
    const v = getTerritoryVisibility(state, tid, 0, difficulty);
    if (v === 'full') return sum + state.territories[tid].troops;
    const r = approximateTroops(state.territories[tid].troops);
    return sum + (r === '1-2' ? 2 : r === '3-5' ? 4 : r === '6-9' ? 8 : 10);
  }, 0)) : ('' + troops);
  const terrStr = hasHidden ? '?' : ('' + ids.length);
  const isActive = state.current === p.id && p.alive;
  const statusText = !p.alive ? 'Derrotado' : isActive ? 'EN TURNO' : 'Esperando';

  const frontPeers=state.players.filter(other=>other.alive&&other.id!==p.id).map(other=>({other,state:getFrontState(state,p.id,other.id)}));
  const frontDetail = '<div class="popover-fronts"><span class="popover-section-label">Frentes de Guerra</span>' + frontPeers.map(({other,state:frontState})=>{
    const label=FRONT_STATE_LABELS[frontState]||FRONT_STATE_LABELS.stable;
    return '<div class="popover-front-row"><span>con '+escapeHtml(other.name)+'</span><strong class="front-tag-'+frontState+'">'+label.icon+' '+label.name+'</strong></div>';
  }).join('') + '</div>';

  popover.innerHTML = '<div class="popover-card" style="--cmd-color:' + p.color + ';">' +
    '<div class="popover-hero">' +
      '<div class="popover-avatar">' + cmd.icon + '</div>' +
      '<div class="popover-hero-text">' +
        '<div class="popover-title-row">' +
          '<strong class="popover-name">' + p.name + '</strong>' +
          '<span class="popover-status-badge ' + (isActive ? 'active' : '') + '">' + statusText + '</span>' +
        '</div>' +
        '<span class="popover-cmd-name">' + cmd.name + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="popover-doctrine">' +
      '<span class="popover-section-label">Doctrina Asimétrica</span>' +
      '<p class="popover-doctrine-desc">' + cmd.desc + '</p>' +
    '</div>' +
    '<div class="popover-stats-grid">' +
      '<div class="popover-stat-cell"><span>Territorios</span><strong>' + terrStr + '</strong></div>' +
      '<div class="popover-stat-cell"><span>Tropas</span><strong>' + troopsStr + '</strong></div>' +
      '<div class="popover-stat-cell"><span>Tesoro</span><strong class="gold-val">$' + (p.money || 0) + '</strong></div>' +
      '<div class="popover-stat-cell"><span>Cartas</span><strong>' + (p.cards?.length || 0) + ' / 3</strong></div>' +
      '<div class="popover-stat-cell"><span>Influencia</span><strong class="gold-val">' + (isHuman?calculateInfluence(state,p.id):(p.influence||0)) + ' pts</strong></div>' +
      '<div class="popover-stat-cell"><span>Objetivos</span><strong>' + (p.completedObjectives || []).length + ' hechos</strong></div>' +
    '</div>' +
    frontDetail +
  '</div>';

  popover.classList.remove('hidden');

  const anchorRect = anchorEl.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  // Position flip/shift logic
  let left = anchorRect.right + 12;
  let top = anchorRect.top;

  // Flip horizontally if out of viewport
  if (left + popRect.width > window.innerWidth - 12) {
    left = anchorRect.left - popRect.width - 12;
  }
  // Center if still out of bounds (e.g. mobile)
  if (left < 10) {
    left = Math.max(10, (window.innerWidth - popRect.width) / 2);
  }

  // Shift vertically if out of viewport
  if (top + popRect.height > window.innerHeight - 12) {
    top = Math.max(12, window.innerHeight - popRect.height - 12);
  }

  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
}

function hideCommanderPopover() {
  const popover = $('#commanderPopover');
  if (popover) popover.classList.add('hidden');
}

function toggleCommanderPopover(pid, anchorEl) {
  const popover = $('#commanderPopover');
  if (!popover) return;
  if (!popover.classList.contains('hidden') && popover.dataset.activePid === String(pid)) {
    hideCommanderPopover();
    delete popover.dataset.activePid;
  } else {
    popover.dataset.activePid = String(pid);
    showCommanderPopover(pid, anchorEl);
  }
}

function renderRegions(){els.regions.innerHTML=Object.entries(REGIONS).map(([k,base])=>{const r=getRegion(state,k),regionTerrs=ts().filter(t=>t.region===k),fullyVisible=regionTerrs.every(t=>getTerritoryVisibility(state,t.id,0,difficulty)==='full'),owner=fullyVisible?state.players.find(p=>regionTerrs.every(t=>state.territories[t.id].owner===p.id)):null;return`<div class="region-row" style="--rc:${base.color}"><i class="region-swatch"></i><span>${r.name}${owner?` · ${owner.name}`:''}</span><strong>+${base.bonus}</strong></div>`}).join('')}
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
    g.classList.toggle('sabotaged',!!isSabotaged);g.classList.toggle('event-threatened',state.rulesMode==='terrain'&&state.announcedEvent?.region===t.region);g.classList.toggle('event-active',state.rulesMode==='terrain'&&state.activeEvent?.region===t.region);

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
function renderLog(){
  const entries=Array.isArray(state.log)?state.log.slice(0,60):[];
  els.log.innerHTML=entries.slice(0,8).map(l=>`<div class="log-item" style="--lc:${l.p===null?'#788896':state.players[l.p]?.color||'#788896'}"><i class="log-dot"></i><span>${escapeHtml(l.text)}</span></div>`).join('');
  let lastRound=null;
  const list=entries.map(item=>{const round=Number(item.turn)||1,heading=round!==lastRound?`<div class="chronicle-round">Ronda ${round}</div>`:'';lastRound=round;const player=item.p===null||item.p===undefined?null:state.players[item.p],category=chronicleCategory(item.text);return`${heading}<div class="chronicle-entry category-${category}" style="--chronicle-color:${player?.color||'#788896'}"><i></i><div><small>${player?escapeHtml(player.name):'Campaña'} · R${round}</small><p>${escapeHtml(item.text)}</p></div></div>`}).join('');
  chronicleModalHtml=`<div class="chronicle-modal"><div class="chronicle-filters"><button class="active" data-chronicle-filter="all">Todos</button><button data-chronicle-filter="combat">Combate</button><button data-chronicle-filter="economy">Economía</button><button data-chronicle-filter="events">Eventos</button></div><div class="chronicle-list">${list||'<p class="chronicle-empty">La campaña todavía no tiene acontecimientos.</p>'}</div></div>`;
  const count=$('#chronicleCount');if(count)count.textContent=String(entries.length);
}
function setGuide(step,title,text){els.mapGuide.innerHTML=`<span>${step}</span><strong>${title}</strong><small>${text}</small>`}
function renderGuide(){if(state.winner!==null){setGuide('✓','Mapa conquistado',`Ganador: ${state.players[state.winner].name}. Abre el resumen final cuando quieras.`);return}if(!state.players[state.current].human){setGuide('…',`${state.players[state.current].name} está jugando`,'Al terminar verás un informe de sus combates.');return}if(state.phase==='reinforce')setGuide('1','Pulsa tus territorios luminosos',`Coloca las ${state.pendingReinforcements} tropas restantes.`);else if(state.phase==='attack'&&!selectedFrom)setGuide('1','Combate opcional','Elige un atacante o pasa directamente a Maniobra.');else if(state.phase==='attack'&&!selectedTo)setGuide('2','Elige un vecino enemigo','Podrás sondearlo antes de comprometer un ataque.');else if(state.phase==='attack')setGuide('3','Sondea o ataca',state.probeUsedThisTurn?'Ya usaste tu Sondeo; aún puedes atacar o pasar.':'Sondeo revela la guarnición, pero nunca conquista.');else if(state.phase==='fortify'&&!selectedFrom)setGuide('1','Elige el origen de la maniobra','Debe tener al menos 2 tropas. También puedes pasar.');else if(state.phase==='fortify'&&!selectedTo)setGuide('2','Elige el destino propio','Puede conectarse por una ruta continua propia.');else if(state.phase==='fortify')setGuide('3','Confirma cuántas tropas mover','Siempre quedará al menos una en el origen.');else setGuide('4','Revisa el cierre',state.conqueredThisTurn?'Recibes una carta táctica.':'No conquistaste: no recibes carta.')}

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
    const c=TACTICAL_CARDS[cId],cost=tacticalCardCost(state,cId,p.id),canAfford=p.money>=cost,isReactive=c.type==='reaction',costStr=cost===0?(isReactive?'Reacción':'Gratis'):`$${cost}`,isSelected=cardTargeting?.cardId===cId;
    return`<article class="card-item ${isSelected?'active-targeting':''}" tabindex="0" aria-label="${c.name}. ${c.desc}. ${costStr}"><span class="card-icon" aria-hidden="true">${c.icon}</span><div class="card-copy"><div class="card-name-row"><strong class="card-title">${c.name}</strong><span class="card-cost">${costStr}</span></div><p class="card-desc">${c.desc}</p></div><div class="card-action">${isReactive?'<span class="card-passive-badge">Elegible</span>':`<button class="play-card-btn" data-card="${cId}" ${canAfford?'':'disabled'} aria-label="Jugar ${c.name}">${isSelected?'Seleccionando…':'Jugar'}</button>`}</div></article>`;
  }).join('')}</div>`;

  els.cardsBox.innerHTML=`<div class="cards-head"><span>CARTAS TÁCTICAS</span><strong>${p.cards.length} / 3</strong></div>${targetingNotice}${discardNotice}${cardsHtml}`;

  if($('#cancelTargetingBtn'))$('#cancelTargetingBtn').onclick=()=>{cardTargeting=null;render()};
  document.querySelectorAll('.discard-btn').forEach(btn=>{
    btn.onclick=()=>{
      recordCardDiscarded(btn.dataset.discard);
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
        if(res.ok){recordCardPlayed(cId);showToast('Movilización activada: maniobra adicional disponible');render()}else showToast(res.reason);
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

let currentMapZoom = 100;
function setMapZoom(level) {
  currentMapZoom = level;
  const z = level / 100;
  const w = 1000 / z, h = 760 / z;
  const x = (1000 - w) / 2, y = (760 - h) / 2;
  if (els.map) {
    els.map.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
  }
  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.zoom === level);
    btn.setAttribute('aria-pressed',String(+btn.dataset.zoom===level));
  });
  announce(`Zoom del mapa: ${level} por ciento`);
}

function renderTerritoryInspect(id) {
  const container = $('#territoryInspectContent');
  if (!container) return;

  if (!state || !id || !state.territories[id]) {
    container.innerHTML = '<div class="territory-empty-state">' +
      '<span class="empty-icon">🗺️</span>' +
      '<p>Apunta o selecciona un territorio en el mapa para inspeccionarlo</p>' +
    '</div>';
    return;
  }
  const t = tById(id);
  const d = state.territories[id];
  const owner = state.players[d.owner];
  const terrainMode = state.rulesMode === 'terrain';
  const terrain = TERRAINS[t.terrain] || { name: 'Normal', icon: '📍', color: '#ffd45f' };
  const unit = UNIT_TYPES[d.unitType] || { name: 'Infantería', icon: '◆' };
  const intel = getTerritoryIntel(state, id, 0, difficulty);
  const vis = intel.visibility;
  const isSabotaged = state.sabotagedTerritories?.[id] >= state.turn;
  const troopsDisplay = vis === 'hidden' ? '? desconocidas' : vis === 'partial' ? ('≈' + intel.troopsDisplay + ' estimadas') : d.troops + ' tropas';
  const ownerName = vis === 'hidden' ? 'Desconocido' : owner.name;
  const ownerColor = vis === 'hidden' ? '#95a5a6' : owner.color;
  const productionText = vis === 'full' ? ('+$' + territoryProduction(state, id) + (isSabotaged ? ' · saboteado' : '')) : vis === 'partial' ? 'Aprox. regional' : 'Oculta por niebla';
  const unitText = vis === 'full' ? (unit.icon + ' ' + unit.name) : 'Oculta por niebla';
  const intelText = vis === 'full' ? (intel.isSpied ? '👁 Revelado por Espía' : d.owner === 0 ? '✓ Bajo tu mando' : '✓ Visión completa') : vis === 'partial' ? '⚠ Información parcial' : '🌫 Niebla profunda';
  let alertText = '';
  if (terrainMode && state.activeEvent?.region === t.region) {
    const ev = EVENT_CATALOG[state.activeEvent.type];
    alertText = (ev?.icon || '⚡') + ' ' + (ev?.name || 'Desastre') + ' activo';
  } else if (terrainMode && state.announcedEvent?.region === t.region) {
    const ev = EVENT_CATALOG[state.announcedEvent.type];
    alertText = '⚠ ' + (ev?.name || 'Amenaza') + ' · ronda ' + state.announcedEvent.triggerRound;
  }

  const mapImg = state.mapId === 'archipelago' ? './map-archipelago.webp' : state.mapId === 'rift' ? './map-rift.webp' : './map-frontier.webp';
  const regionName = t.region ? getRegion(state,t.region).name : 'Continental';
  const terrainIcon = terrainMode ? '<span class="terrain-huge-icon">' + terrain.icon + '</span>' : '';
  const territoryBadge = terrainMode ? (terrain.name + ' · ' + regionName) : regionName;
  const unitRow = terrainMode
    ? '<div class="territory-spec-row"><span class="spec-lbl">Unidad</span><span class="spec-val">' + unitText + '</span></div>'
    : '';
  const regionalFronts=(t.n||[]).map(tById).filter(neighbor=>neighbor&&neighbor.region!==t.region).map(neighbor=>{
    const neighborData=state.territories[neighbor.id],neighborIntel=getTerritoryIntel(state,neighbor.id,0,difficulty);
    if(neighborIntel.visibility==='hidden')return`<div class="territory-front-row"><span>${escapeHtml(neighbor.name)}</span><strong class="front-tag-unknown">? Sin confirmar</strong></div>`;
    const frontState=getFrontState(state,d.owner,neighborData.owner,t.region),label=FRONT_STATE_LABELS[frontState]||FRONT_STATE_LABELS.stable;
    const relation=d.owner===neighborData.owner?'Frontera propia':`${label.icon} ${label.name}`;
    return`<div class="territory-front-row"><span>${escapeHtml(neighbor.name)}</span><strong class="front-tag-${frontState}">${relation}</strong></div>`;
  }).join('');
  const frontsBlock=regionalFronts?`<div class="territory-fronts"><span class="spec-lbl">Fronteras regionales</span>${regionalFronts}</div>`:'';

  container.innerHTML = '<div class="territory-active-preview">' +
    '<div class="territory-header-row">' +
      '<div class="territory-thumb-art" style="background-image: url(' + mapImg + ');">' +
        terrainIcon +
      '</div>' +
      '<div class="territory-identity">' +
        '<h4 class="territory-specs-title">⚔️ ' + t.name + '</h4>' +
        '<span class="territory-sub-badge">' + territoryBadge + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="territory-data-table">' +
      '<div class="territory-spec-row"><span class="spec-lbl">Propietario</span><span class="spec-val" style="color:' + ownerColor + ';">● ' + ownerName + '</span></div>' +
      '<div class="territory-spec-row"><span class="spec-lbl">Guarnición</span><span class="spec-val">' + troopsDisplay + '</span></div>' +
      '<div class="territory-spec-row"><span class="spec-lbl">Producción</span><span class="spec-val">' + productionText + '</span></div>' +
      unitRow +
      '<div class="territory-spec-row"><span class="spec-lbl">Conexiones</span><span class="spec-val">' + (t.n?.length || 0) + ' rutas directas</span></div>' +
      '<div class="territory-spec-row intel-row"><span class="spec-lbl">Inteligencia</span><span class="spec-val">' + intelText + '</span></div>' +
      (alertText ? '<div class="territory-spec-row alert-row"><span class="spec-lbl">Alerta</span><span class="spec-val">' + alertText + '</span></div>' : '') +
      frontsBlock +
    '</div>' +
  '</div>';
}

function renderObjectives() {
  const button = $('#objectivesMapBtn');
  if (!button || !state) return;
  const p = state.players[state.current] || state.players[0];
  const main = OBJECTIVES_CATALOG.find(o => o.id === p.mainObjective);
  const temp = OBJECTIVES_CATALOG.find(o => o.id === p.temporaryObjective);
  const activeCard=(obj,label)=>'<div class="objective-item"><div class="obj-top"><span class="obj-title">'+obj.icon+' '+obj.name+'</span><span class="obj-progress-badge">'+objectiveProgress(state,p.id,obj.id).label+'</span></div><small class="obj-desc">'+obj.desc+' · +'+obj.value+' infl. · '+label+'</small></div>';
  const choiceCards=(kind,label)=>{
    const choices=p.objectiveChoices?.[kind]||[];
    if(!choices.length)return '<div class="objective-item"><div class="obj-top"><span class="obj-title">✓ '+label+'</span></div><small class="obj-desc">No hay otra misión disponible en esta etapa.</small></div>';
    return '<div class="objective-choice-group"><p><strong>Elige tu '+label.toLowerCase()+'</strong><br><small>Solo una opción quedará activa.</small></p>'+choices.map(id=>{const obj=OBJECTIVES_CATALOG.find(o=>o.id===id);return '<button type="button" class="objective-choice-btn" data-objective-kind="'+kind+'" data-objective-choice="'+id+'"><span>'+obj.icon+' <b>'+obj.name+'</b> · +'+obj.value+'</span><small>'+obj.desc+'</small></button>'}).join('')+'</div>';
  };
  const mainHtml=main?activeCard(main,'Objetivo principal'):p.mainObjectiveResolved?'<div class="objective-item"><div class="obj-top"><span class="obj-title">✓ Objetivo principal cumplido</span></div></div>':choiceCards('main','Objetivo principal');
  const tempResolved=p.temporaryObjectiveResolvedCycle===(state.objectiveCycle||0);
  const tempHtml=temp?activeCard(temp,'Misión del ciclo'):tempResolved?'<div class="objective-item"><div class="obj-top"><span class="obj-title">✓ Misión del ciclo cumplida</span></div><small class="obj-desc">Recibirás nuevas opciones al rotar el Mercado.</small></div>':choiceCards('temporary','Misión del ciclo');

  objectivesModalHtml = '<div class="objectives-box swal-objectives">'+mainHtml+tempHtml+'<p class="objective-system-note">La presencia aporta un máximo de 17 puntos. Para alcanzar la Hegemonía necesitas completar misiones de varias clases.</p></div>';
  button.classList.remove('hidden');
  button.setAttribute('aria-label','Ver objetivos de '+p.name);
  const badge=$('#objectivesMapBadge');
  if(badge)badge.textContent=(!main&&!p.mainObjectiveResolved)||(!temp&&!tempResolved)?'!':String((p.completedObjectives||[]).length)+'✓';
}

function renderEconomy(){
  const p = state.players[state.current], income = productionTotal(state, p.id);
  const alreadyBought = p.reinforcementsBoughtRound === state.turn;
  const canBuy = p.human && state.phase === 'reinforce' && p.money >= 10 && !alreadyBought;

  els.economyBox.innerHTML = '<div class="economy-head">' +
    '<span class="section-title"><span class="sec-icon">💰</span> TESORO</span>' +
    '<strong style="color: #ffd45f; font-size: 1.35rem; font-family: \'Marcellus\', serif;">$' + p.money + '</strong>' +
  '</div>' +
  '<small class="economy-production">Producción actual: <strong>+$' + income + '</strong> al inicio del turno.</small>' +
  (p.human && state.phase === 'reinforce' ? (
    '<div class="basic-purchase"><span class="basic-purchase-label">COMPRA BÁSICA · 1 POR RONDA</span><small>Reserva inmediata; no depende del Mercado.</small><button id="buyTroopsBtn" class="basic-buy-btn" ' + (canBuy ? '' : 'disabled') + '>' +
      (alreadyBought ? '✓ Compra básica utilizada' : '🏰 +3 refuerzos · $10') +
    '</button></div>'
  ) : '');

  const button = $('#buyTroopsBtn');
  if (button) button.onclick = () => {
    if (buyReinforcements(state)) {
      render();
      showToast('Compra básica: +3 refuerzos por $10');
    }
  };
  renderObjectives();
}
function renderMarket(){
  if(!state.market?.offers){
    marketModalHtml='';
    return;
  }
  const p=state.players[state.current];
  const nextRotationRound=(state.market.cycle+1)*3+1;
  const roundsLeft=nextRotationRound-state.turn;
  const hasTempDef=state.tempDefense?.[p.id]>=state.turn;

  const offersHtml=state.market.offers.map(offer=>{
    const alreadyBought=offer.boughtBy?.includes(p.id);
    const actualCost=Math.max(5,offer.cost-(p.commander==='strategist'?5:0));
    const canAfford=p.money>=actualCost;
    const isFullCards=offer.type==='card'&&p.cards.length>=3;
    const canBuy=p.human&&state.phase==='reinforce'&&!alreadyBought&&canAfford&&!isFullCards;

    let buttonOrBadge='';
    if(alreadyBought){
      buttonOrBadge=`<span class="market-badge bought">Adquirido</span>`;
    }else if(p.human&&state.phase==='reinforce'){
      const reasonDisabled=!canAfford?`Requiere $${actualCost}`:isFullCards?'Mano llena (máx 3)':`Comprar ${offer.name}`;
      buttonOrBadge=`<button class="secondary-btn market-buy-btn" data-offer="${offer.id}" ${canBuy?'':'disabled'} title="${reasonDisabled}">Comprar · $${actualCost}</button>`;
    }else{
      buttonOrBadge=`<span class="market-price-tag">$${actualCost}</span>`;
    }

    const typeMeta=offer.type==='troops'?['RESERVA','market-type-reserve']:offer.type==='card'?['CARTA','market-type-card']:['EFECTO','market-type-effect'];
    return `<div class="market-offer ${alreadyBought?'offer-bought':''}">
      <div class="market-offer-info">
        <span class="market-offer-icon">${offer.icon||'📦'}</span>
        <div>
          <div class="market-offer-title"><b>${offer.name}</b><span class="market-type-badge ${typeMeta[1]}">${typeMeta[0]}</span></div>
          <small class="market-offer-desc">${offer.desc}</small>
        </div>
      </div>
      <div class="market-offer-action">
        ${buttonOrBadge}
      </div>
    </div>`;
  }).join('');

  marketModalHtml=`
    <div class="market-box modal-market-box">
    <div class="market-head">
      <div class="market-head-title">
        <span>OFERTAS ROTATORIAS</span>
        </div>
      ${hasTempDef?`<span class="temp-def-active-pill">🛡 Defensa +1 activa</span>`:''}
    </div>
    <p class="market-separation-note">El Mercado ofrece cartas y ventajas especiales. La compra básica de +3 refuerzos está en Tesoro.</p>
    <div class="market-offers-list">${offersHtml}</div>
    <p class="market-rotation-note">Rota en la ronda ${nextRotationRound} · ${roundsLeft} ${roundsLeft===1?'ronda':'rondas'} restantes</p>
    </div>`;
  const launch=$('#marketModalBtn');
  if(launch)launch.innerHTML=`<span aria-hidden="true">🛒</span> Mercado táctico <small>$${p.money}</small>`;
}
function openMarketModal(){
  if(!marketModalHtml)return;
  openStrategicModal({
    title:'🛒 Mercado táctico',
    html:marketModalHtml,
    width:560,
    didOpen:popup=>popup.querySelectorAll('.market-buy-btn').forEach(btn=>{
      btn.onclick=()=>{
        const res=buyMarketItem(state,btn.dataset.offer,state.current);
        if(!res.ok){showToast(res.reason||'No se pudo realizar la compra');return}
        recordOfferBought(res.offer.id);
        window.Swal.close();
        showToast(`Adquiriste: ${res.offer.name}`);
        render();
        openMarketModal();
      };
    })
  });
}
function bonusPreview(from,to){
  if(!from||!to)return '';
  const a=state.territories[from],d=state.territories[to];
  const defenderIntel=getTerritoryIntel(state,to,0,difficulty),defenseKnown=defenderIntel.visibility==='full';
  const hasTempDef=defenseKnown&&state.tempDefense?.[d.owner]>=state.turn;
  const isConqueror=state.players[a.owner]?.commander==='conqueror'&&!state.attackMadeThisTurn;
  const isGuardian=defenseKnown&&state.players[d.owner]?.commander==='guardian'&&isTerritoryInWarFront(state,to);
  const attReasons=[];
  const defReasons=[];
  if(state.rulesMode==='terrain'){
    const terrain=TERRAINS[tById(to).terrain],au=UNIT_TYPES[a.unitType],du=UNIT_TYPES[d.unitType];
    if(defenseKnown&&au.beats===d.unitType)attReasons.push(`${au.name} tiene ventaja`);
    if(defenseKnown&&du.beats===a.unitType)defReasons.push('ventaja de unidad');
    if(defenseKnown&&terrain.unit===d.unitType)defReasons.push('afinidad de terreno');
  }
  if(isConqueror)attReasons.push('doctrina El Conquistador (primer ataque)');
  if(hasTempDef)defReasons.push('defensa temporal activa');
  if(isGuardian)defReasons.push('doctrina El Guardián (frente en guerra)');

  const attText=attReasons.length?`⚔ Atacante: +${attReasons.length} (${attReasons.join(' + ')}).`:'Atacante: sin bono.';
  const defText=!defenseKnown?'🛡 Bonos defensivos ocultos hasta revelar la guarnición.':defReasons.length?`🛡 Defensor: +${defReasons.length} (${defReasons.join(' + ')}).`:'Defensor: sin bono.';
  return `<div class="bonus-note">${attText}<br>${defText}</div>`;
}
function renderTerrainPanel(){if(state.rulesMode!=='terrain'){els.terrainPanel.classList.add('hidden');return}els.terrainPanel.classList.remove('hidden');const canChoose=state.phase==='reinforce'&&state.players[state.current].human;els.terrainPanel.innerHTML=`<h3>Rueda de ventaja · +1 al dado mayor</h3><div class="unit-wheel"><b>◆ Infantería</b> vence a <b>✦ Artillería</b> vence a <b>♞ Caballería</b> vence a <b>◆ Infantería</b></div>${canChoose?`<div class="unit-selector" role="group" aria-label="Unidad para los próximos refuerzos">${Object.entries(UNIT_TYPES).map(([k,u])=>`<button data-unit="${k}" class="${selectedUnit===k?'active':''}" aria-pressed="${selectedUnit===k}" style="--unit-color:${u.color}">${u.icon} ${u.name}</button>`).join('')}</div><div class="bonus-note">La unidad elegida se asignará al territorio que refuerces. Bosque favorece Infantería; Montaña, Artillería; Llanura, Caballería.</div>`:bonusPreview(selectedFrom,selectedTo)}`;document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{selectedUnit=b.dataset.unit;renderTerrainPanel();announce(`Unidad seleccionada: ${UNIT_TYPES[selectedUnit].name}`)})}
function renderPanel(){
  const human = state.players[state.current].human;
  els.battle.innerHTML = '';
  els.controls.innerHTML = '';
  els.selection.innerHTML = '';
  renderEconomy();
  renderMarket();
  renderCards();
  renderTerrainPanel();
  renderTerritoryInspect(selectedTo || selectedFrom || inspectedTerritory);

  const orderCard = $('#orderCard');
  if (orderCard) orderCard.dataset.phase = state.phase;

  const headingEl = $('#contextActionHeading') || els.orderTitle;
  const subEl = $('#contextActionSubtitle') || els.orderText;
  const badgeEl = $('#contextPhaseBadge');

  if (state.phase === 'gameover') {
    const won = state.winner === 0;
    const vType = state.victoryType;
    let title = won ? '¡Victoria Hegemónica!' : 'Campaña Concluida';
    let subtitle = won ? 'Todos los estandartes rivales han caído.' : 'Tus últimos territorios fueron conquistados.';
    if (badgeEl) badgeEl.textContent = won ? 'Victoria' : 'Derrota';
    headingEl.textContent = title;
    subEl.textContent = subtitle;
    els.turnStatus.innerHTML = won
      ? '<strong>Objetivo cumplido.</strong> ¡Victoria por ' + (vType==='influence'?'Hegemonía de Influencia':vType==='round_limit'?'puntuación en Ronda 40':'Dominio territorial') + '!'
      : 'Puedes revisar el mapa o ver el resumen final.';
    els.phaseBtn.textContent = 'Nueva partida';
    els.phaseBtn.disabled = false;
    return;
  }

  if (!human) {
    if (badgeEl) badgeEl.textContent = 'Turno IA';
    headingEl.textContent = state.players[state.current].name + ' está actuando';
    subEl.textContent = skipAiRequested ? 'Resolviendo el resto del turno sin animaciones.' : 'Procesando órdenes de combate y refuerzos.';
    els.turnStatus.innerHTML = skipAiRequested ? '<strong>Avance rápido activo.</strong>' : '<strong>Espera:</strong> puedes omitir la presentación de este turno.';
    els.phaseBtn.textContent = skipAiRequested ? 'Avance rápido activo…' : 'Saltar turno enemigo →';
    els.phaseBtn.disabled = skipAiRequested;
    return;
  }

  els.phaseBtn.disabled = false;

  if (state.phase === 'reinforce') {
    if (badgeEl) badgeEl.textContent = 'Reclutamiento';
    headingEl.textContent = state.pendingReinforcements > 0 
      ? (state.pendingReinforcements + ' tropas por desplegar')
      : 'Despliegue completado';
    subEl.textContent = state.rulesMode === 'terrain'
      ? ('Unidad elegida: ' + UNIT_TYPES[selectedUnit].name + '. Pulsa un territorio propio.')
      : 'Pulsa un territorio propio para añadir tropas.';
    els.turnStatus.innerHTML = '<strong>Objetivo:</strong> coloca todas las tropas; después comienza el combate.';
    els.phaseBtn.textContent = state.pendingReinforcements > 0 ? 'Coloca todos tus refuerzos' : 'Comenzar combate →';
    els.phaseBtn.disabled = state.pendingReinforcements > 0;
    const undoCount=state.reinforcementHistory?.length||0;
    if(undoCount){
      const last=state.reinforcementHistory.at(-1),lastName=tById(last.id)?.name||'territorio';
      els.controls.innerHTML=`<button class="secondary-btn undo-reinforcement-btn" id="undoReinforcementBtn">↶ Deshacer ${last.amount>1?`${last.amount} tropas`:'última tropa'} · ${lastName}</button><small class="undo-hint">${undoCount} ${undoCount===1?'colocación reversible':'colocaciones reversibles'}</small>`;
      $('#undoReinforcementBtn').onclick=()=>{const undone=undoReinforcement(state);if(undone){showToast(`${undone.amount} ${undone.amount===1?'tropa devuelta':'tropas devueltas'} a la reserva`);render()}};
    }
  }
  else if (state.phase === 'attack') {
    if (badgeEl) badgeEl.textContent = 'Combate';
    const possible = canPlayerAttack(state);
    if (selectedTo) {
      headingEl.textContent = 'Asalto preparado';
      subEl.textContent = 'Configura los dados y pulsa lanzar o ataque rápido.';
    } else if (selectedFrom) {
      headingEl.textContent = 'Atacando desde ' + tById(selectedFrom).name;
      subEl.textContent = 'Selecciona un territorio enemigo adyacente con borde rojo.';
    } else {
      headingEl.textContent = 'Fase de Combate';
      subEl.textContent = 'Elige un territorio propio con 2 o más tropas para atacar.';
    }
    els.turnStatus.innerHTML = state.attackMadeThisTurn
      ? '<strong>Combate resuelto.</strong> Puedes continuar o pasar a Maniobra.'
      : possible
      ? '<strong>Combate opcional:</strong> ataca, realiza un Sondeo o pasa sin combatir.'
      : '<strong>Sin ataques posibles:</strong> puedes avanzar a Maniobra.';
    els.phaseBtn.textContent = state.attackMadeThisTurn ? 'Terminar combate →' : 'Pasar combate → maniobra';
    els.phaseBtn.disabled = false;
    if (selectedFrom) {
      const a = state.territories[selectedFrom];
      els.selection.innerHTML = '<div class="selection-item"><span>Origen · ' + tById(selectedFrom).name + '</span><strong>' + a.troops + ' tropas</strong></div>';
    }
    if (selectedTo) renderAttackControls();
  }
  else if (state.phase === 'fortify') {
    if (badgeEl) badgeEl.textContent = 'Maniobra';
    if (selectedTo) {
      headingEl.textContent = 'Transferencia de tropas';
      subEl.textContent = 'Elige la cantidad de tropas y confirma el movimiento.';
    } else if (selectedFrom) {
      headingEl.textContent = 'Moviendo desde ' + tById(selectedFrom).name;
      subEl.textContent = 'Selecciona el territorio destino conectado.';
    } else {
      headingEl.textContent = 'Fase de Maniobra';
      subEl.textContent = 'Mueve tropas por una ruta continua o pasa al cierre.';
    }
    els.turnStatus.innerHTML = state.extraFortifies > 0
      ? '<strong>Movilización activa:</strong> puedes realizar una maniobra adicional.'
      : '<strong>Opcional:</strong> un movimiento por ronda o pasar.';
    els.phaseBtn.textContent = 'Pasar maniobra → cierre';
    if (selectedFrom) {
      els.selection.innerHTML = '<div class="selection-item"><span>Origen · ' + tById(selectedFrom).name + '</span><strong>' + state.territories[selectedFrom].troops + ' tropas</strong></div>';
    }
    if (selectedTo) renderFortifyControls();
  }
  else {
    if (badgeEl) badgeEl.textContent = 'Cierre';
    if (state.pendingCardDraw) {
      headingEl.textContent = 'Mano llena (3 cartas)';
      subEl.textContent = 'Elige qué carta descartar en tu mano táctica.';
      els.turnStatus.innerHTML = '<strong>Descarte obligatorio:</strong> debes descartar una carta para continuar.';
      els.phaseBtn.textContent = 'Descarta una carta';
      els.phaseBtn.disabled = true;
    } else {
      const p = state.players[state.current];
      headingEl.textContent = state.conqueredThisTurn ? '¡Carta táctica ganada!' : 'Fin de turno';
      subEl.textContent = state.conqueredThisTurn ? 'Conquistaste territorios: carta táctica añadida a tu mano.' : 'No conquistaste territorios en esta ronda.';
      els.turnStatus.innerHTML = '<strong>Influencia:</strong> ' + p.influence + ' pts · <strong>Objetivos:</strong> ' + (p.completedObjectives||[]).length + ' cumplidos.';
      els.phaseBtn.textContent = 'Pasar al siguiente jugador →';
      els.phaseBtn.disabled = false;
    }
  }
}
function renderAttackControls(){
  const a=state.territories[selectedFrom],d=state.territories[selectedTo],max=Math.min(3,a.troops-1),intel=getTerritoryIntel(state,selectedTo,0,difficulty),known=intel.visibility==='full';
  selectedDice=Math.min(selectedDice,max);
  const defenderTroops=known?`${d.troops} ${d.troops===1?'tropa':'tropas'}`:`≈${intel.troopsDisplay} tropas estimadas`;
  const defenderUnit=known&&state.rulesMode==='terrain'?` · ${UNIT_TYPES[d.unitType].name}`:'';
  const probeControl=!state.probeUsedThisTurn&&!known?'<button class="secondary-btn probe-btn" id="probeBtn" aria-label="Sondear con un soldado; revela la guarnición y no puede conquistar">🔭 Sondear · 1 dado, sin conquista</button>':known?'<div class="bonus-note">👁 Guarnición revelada para esta ronda.</div>':'<div class="bonus-note">Sondeo ya utilizado este turno.</div>';
  els.selection.innerHTML=`<div class="selection-item"><span>Atacante · ${tById(selectedFrom).name}</span><strong>${a.troops} ${a.troops===1?'tropa':'tropas'}${state.rulesMode==='terrain'?` · ${UNIT_TYPES[a.unitType].name}`:''}</strong></div><div class="selection-item"><span>Defensor · ${tById(selectedTo).name}</span><strong>${defenderTroops}${defenderUnit}</strong></div>`;
  els.controls.innerHTML=`${probeControl}<label id="soldierChoiceLabel">Soldados desplegados en esta ronda (máximo ${max})</label><div class="dice-choice soldier-choice" role="group" aria-labelledby="soldierChoiceLabel">${[1,2,3].filter(n=>n<=max).map(n=>`<button data-dice="${n}" class="${n===selectedDice?'active':''}" aria-pressed="${n===selectedDice}" aria-label="Desplegar ${n} ${n===1?'soldado y lanzar 1 dado':`soldados y lanzar ${n} dados`}"><span class="soldier-pips">${'♟'.repeat(n)}</span><strong>${n} ${n===1?'soldado':'soldados'}</strong><small>${n} ${n===1?'dado':'dados'}</small></button>`).join('')}</div><div class="deployment-preview"><span>⚔ Despliegue de esta ronda</span><strong>${selectedDice} ${selectedDice===1?'soldado':'soldados'} · ${selectedDice} ${selectedDice===1?'dado':'dados'}</strong><small>El territorio de origen conservará al menos una tropa.</small></div>${bonusPreview(selectedFrom,selectedTo)}<button class="primary-btn" id="rollBtn" aria-label="Lanzar una ronda con ${selectedDice} ${selectedDice===1?'soldado':'soldados'}">🎲 Lanzar una ronda con ${selectedDice}</button><button class="secondary-btn" id="blitzBtn" aria-label="Ataque rápido usando automáticamente el máximo de soldados permitido">Ataque rápido · máximo automático</button>`;
  document.querySelectorAll('[data-dice]').forEach(b=>b.onclick=()=>{selectedDice=+b.dataset.dice;renderPanel();updateControlAccessibility();announce(`${selectedDice} ${selectedDice===1?'soldado seleccionado, 1 dado':'soldados seleccionados, '+selectedDice+' dados'}`)});
  if($('#probeBtn'))$('#probeBtn').onclick=doProbe;
  $('#rollBtn').onclick=()=>doAttack(false);$('#blitzBtn').onclick=()=>doAttack(true);
}
function renderFortifyControls(){
  const origin=state.territories[selectedFrom],destination=state.territories[selectedTo],max=origin.troops-1;
  if(max<1)return;
  selectedMove=clampMoveAmount(selectedMove,max);
  els.selection.innerHTML+=`<div class="selection-item"><span>Destino · ${tById(selectedTo).name}</span><strong>${destination.troops} ${destination.troops===1?'tropa':'tropas'}</strong></div>`;
  els.controls.innerHTML=`<div class="move-picker"><label for="moveAmount">Tropas a mover</label><div class="move-stepper"><button type="button" data-move-delta="-1" aria-label="Mover una tropa menos">−</button><input id="moveAmount" type="number" inputmode="numeric" min="1" max="${max}" value="${selectedMove}" aria-label="Cantidad de tropas a mover"><button type="button" data-move-delta="1" aria-label="Mover una tropa más">+</button></div><div class="move-presets" role="group" aria-label="Cantidades rápidas"><button type="button" data-move-value="1" aria-label="Mover 1 tropa">1</button><button type="button" data-move-value="${Math.max(1,Math.ceil(max/2))}" aria-label="Mover la mitad disponible">Mitad</button><button type="button" data-move-value="${max}" aria-label="Mover el máximo disponible, ${max} tropas">Máximo</button></div><div class="move-preview" id="movePreview"></div></div><button class="primary-btn" id="moveBtn">Confirmar movimiento → ${state.extraFortifies>0?'otra maniobra':'cierre'}</button>`;
  const input=$('#moveAmount'),moveBtn=$('#moveBtn'),preview=$('#movePreview');
  const paintPreview=()=>{const content=movementPreview({originName:tById(selectedFrom).name,destinationName:tById(selectedTo).name,originTroops:origin.troops,destinationTroops:destination.troops,amount:selectedMove});preview.innerHTML=content.html;input.setAttribute('aria-valuetext',content.accessible)};
  const setAmount=(value,shouldAnnounce=false)=>{const amount=clampMoveAmount(value,max);if(amount===null){moveBtn.disabled=true;return}selectedMove=amount;input.value=selectedMove;moveBtn.disabled=false;paintPreview();if(shouldAnnounce)announce(input.getAttribute('aria-valuetext'))};
  document.querySelectorAll('[data-move-delta]').forEach(button=>button.onclick=()=>setAmount(selectedMove+(+button.dataset.moveDelta),true));
  document.querySelectorAll('[data-move-value]').forEach(button=>button.onclick=()=>setAmount(+button.dataset.moveValue,true));
  input.oninput=()=>setAmount(input.value,true);
  setAmount(selectedMove,false);
  moveBtn.onclick=()=>{if(fortify(state,selectedFrom,selectedTo,selectedMove)){selectedFrom=selectedTo=null;selectedMove=1;render();closeMobileOrders()}else showToast('No existe una ruta propia continua')};
}

function territoryClick(id,shift=false){
  if(!state||aiBusy||rolling||state.winner!==null||!state.players[state.current].human)return;
  if(state.pendingReactions?.some(reaction=>reaction.defenderId===state.current)){promptPendingCounterReactions();return}
  const d=state.territories[id];
  inspectedTerritory=id;
  renderTerritoryInspect(id);
  if(cardTargeting){
    if(cardTargeting.cardId==='spy'||cardTargeting.cardId==='sabotage'){
      if(d.owner===state.current)return showToast('Debes elegir un territorio enemigo');
      const cardName=TACTICAL_CARDS[cardTargeting.cardId].name;
      const res=playTacticalCard(state,cardTargeting.cardId,id,state.current);
      if(res.ok){
        recordCardPlayed(cardTargeting.cardId);
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
        recordCardPlayed('blockade');
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
    const amount=Math.min(shift?5:1,state.pendingReinforcements);placeTroops(state,id,amount,selectedUnit);
    render();
    announce(`${amount} ${amount===1?'tropa colocada':'tropas colocadas'} en ${tById(id).name}. Quedan ${state.pendingReinforcements} refuerzos.`);
    return;
  }
  if(state.phase==='attack'){
    if(d.owner===state.current){
      if(d.troops<2)return showToast('Necesitas al menos 2 tropas');
      if(!enemiesOf(state,id).length)return showToast('No limita con enemigos');
      selectedFrom=id;selectedTo=null;selectedDice=Math.min(3,d.troops-1);render();announce(`${tById(id).name} seleccionado como atacante, con ${d.troops} tropas.`);return;
    }
    if(selectedFrom&&enemiesOf(state,selectedFrom).includes(id)){
      selectedTo=id;render();announce(`${tById(id).name} seleccionado como objetivo, con ${d.troops} tropas.`);openMobileOrders();return;
    }
    showToast(selectedFrom?'El objetivo debe estar unido por una ruta iluminada':'Primero elige el origen');
  }else if(state.phase==='fortify'){
    if(d.owner!==state.current)return showToast('Solo puedes maniobrar entre territorios propios');
    if(!selectedFrom){if(d.troops<2)return showToast('El origen necesita 2 tropas');selectedFrom=id;selectedMove=1;announce(`${tById(id).name} seleccionado como origen de maniobra.`)}
    else if(id===selectedFrom){selectedFrom=null;selectedTo=null;selectedMove=1}
    else{selectedTo=id;selectedMove=1;announce(`${tById(id).name} seleccionado como destino de maniobra.`)}
    render();
    if(selectedTo)openMobileOrders();
  }
}
async function playAttackApproach(from,to,attackerCount=3,defenderCount=2){
  const origin=tById(from),target=tById(to);
  if(!origin||!target)return;
  const route=routeGeometry(origin,target,ts()),start=route.point(0),end=route.point(1),mid=route.point(.5);
  const x1=start.x,y1=start.y,x2=end.x,y2=end.y,midX=mid.x,midY=mid.y;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS='http://www.w3.org/2000/svg',layer=document.createElementNS(svgNS,'g');
  layer.classList.add('attack-march');layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<path class="attack-route" d="${route.d}"/><circle class="clash-ring" cx="${midX}" cy="${midY}" r="8"/><g class="marchers attacker"/><g class="marchers defender"/>`;
  const attacker=layer.querySelector('.attacker'),defender=layer.querySelector('.defender');
  attacker.innerHTML=soldierFigures(attackerCount);defender.innerHTML=soldierFigures(defenderCount);
  attacker.style.setProperty('--march-color',state.players[state.territories[from].owner].color);
  defender.style.setProperty('--march-color',state.players[state.territories[to].owner].color);
  els.map.append(layer);
  const duration=reduced?100:850;
  await new Promise(resolve=>{
    let start;
    function frame(now){
      start??=now;
      const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
      const ap=route.point(ease*.46),bp=route.point(1-ease*.46),ax=ap.x,ay=ap.y,bx=bp.x,by=bp.y;
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
async function presentDiceRounds(rounds,{from,to,defending=false,fast=false,attackerColor='#4ecdc4',defenderColor='#ff6b6b'}){
  if(!rounds.length)return;
  diceReturnFocus=document.activeElement;
  const title=$('#diceTitle'),comparison=$('#comparison'),close=$('#closeDice'),skip=$('#skipAiDice');
  els.diceModal.style.setProperty('--attacker-dice-color',attackerColor);
  els.diceModal.style.setProperty('--defender-dice-color',defenderColor);
  $('#battleRoute').textContent=rounds[0]?.probe?`${from} sondea ${to}`:`${from} ataca ${to}`;
  close.classList.remove('visible');
  skip.classList.add('hidden-control');
  close.textContent=defending?'Ver resultado de la defensa':'Ver el mapa y continuar';
  els.diceModal.classList.remove('hidden');
  for(let i=0;i<rounds.length;i++){
    const round=rounds[i],label=`Tirada ${i+1} de ${rounds.length}`;
    setBattleTone('neutral');
    title.textContent=`${label} · dados en juego`;
    comparison.innerHTML='';
    const attackerCount=round.rawAttackerDice.length,defenderCount=round.rawDefenderDice.length;
    $('#attackerForceLabel').textContent=`ATACANTE · ${attackerCount} ${attackerCount===1?'SOLDADO':'SOLDADOS'}`;
    $('#defenderForceLabel').textContent=`DEFENSOR · ${defenderCount} ${defenderCount===1?'SOLDADO':'SOLDADOS'}`;
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
    comparison.innerHTML=`<div class="deployed-summary"><span>${round.probe?'🔭 Sondeo':'⚔ Desplegados'}</span><strong>${attackerCount} ${attackerCount===1?'soldado atacante':'soldados atacantes'} · ${defenderCount} ${defenderCount===1?'defensor':'defensores'}</strong></div>${comparisonMarkup(round)}<div class="battle-summary">Pérdidas de esta tirada: ${round.attackerLosses} atacante · ${round.defenderLosses} defensor.${round.probe?` Guarnición revelada: <b>${round.revealedTroops} tropa${round.revealedTroops===1?'':'s'}</b>. El Sondeo nunca conquista.`:round.conquered?` Territorio conquistado: ${round.movedTroops} ${round.movedTroops===1?'soldado avanzó':'soldados avanzaron'}.`:''}</div>`;
    if(i<rounds.length-1)await pause(1100);
  }
  const totalA=rounds.reduce((sum,round)=>sum+round.attackerLosses,0);
  const totalD=rounds.reduce((sum,round)=>sum+round.defenderLosses,0);
  const conquered=rounds.at(-1).conquered;
  const finalTone=defending?(conquered?'defeat':'victory'):(conquered?'victory':fast?'defeat':roundTone(rounds.at(-1),false));
  setBattleTone(finalTone);
  const isProbe=!!rounds[0]?.probe;
  title.textContent=isProbe?'Sondeo completado':defending?(conquered?'Perdiste el territorio':'Tu territorio resistió'):(conquered?'¡Territorio conquistado!':fast?'Ataque detenido':'Resultado de la tirada');
  const moved=rounds.at(-1).movedTroops||0;
  comparison.insertAdjacentHTML('beforeend',`<div class="battle-total"><strong>${fast?`${rounds.length} ${rounds.length===1?'tirada':'tiradas'} · `:''}Resultado:</strong> ${totalA} bajas del atacante y ${totalD} del defensor.${conquered?` <b>${moved} ${moved===1?'soldado ocupa':'soldados ocupan'} el territorio.</b>`:''}</div>`);
  close.classList.add('visible');
  if(defending)skip.classList.remove('hidden-control');
  close.focus();
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
  finishTelemetryCampaign(state);
  endReturnFocus=document.activeElement;
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
function closeEndSummary(){els.endModal.classList.add('hidden');restoreFocus(endReturnFocus,'#summaryBtn');endReturnFocus=null}

async function doAttack(fast){
  if(rolling)return;
  closeMobileOrders();
  rolling=true;
  const from=selectedFrom,to=selectedTo;
  const attackerColor=state.players[state.territories[from].owner].color;
  const defenderColor=state.players[state.territories[to].owner].color;
  try{
    const deployed=fast?Math.min(3,state.territories[from].troops-1):selectedDice;
    const defenders=Math.min(2,state.territories[to].troops);
    await playAttackApproach(from,to,deployed,defenders);
    const result=fast?blitz(state,from,to):attackRound(state,from,to,selectedDice);
    const rounds=fast?result.rounds:result.ok?[result]:[];
    if(!result.ok||!rounds.length)return;
    if(rounds.at(-1).conquered){selectedFrom=to;selectedTo=null}
    else if(state.territories[from].troops<2){selectedFrom=selectedTo=null}
    await presentDiceRounds(rounds,{from:tById(from).name,to:tById(to).name,fast,attackerColor,defenderColor});
    render();
    if(state.winner!==null)showEndSummary();
  }finally{rolling=false}
}

async function doProbe(){
  if(rolling)return;
  closeMobileOrders();rolling=true;
  const from=selectedFrom,to=selectedTo,attackerColor=state.players[state.territories[from].owner].color,defenderColor=state.players[state.territories[to].owner].color;
  try{
    await playAttackApproach(from,to,1,1);
    const result=probeTerritory(state,from,to);
    if(!result.ok){showToast(result.reason||'No se pudo realizar el Sondeo');return}
    await presentDiceRounds([result],{from:tById(from).name,to:tById(to).name,attackerColor,defenderColor});
    if(state.territories[from].troops<2)selectedFrom=selectedTo=null;
    render();showToast(`Sondeo completado: ${tById(to).name} tiene ${result.revealedTroops} tropa${result.revealedTroops===1?'':'s'}`);
  }finally{rolling=false}
}

async function promptPendingCounterReactions(){
  if(reactionPromptActive||!state||!state.players[state.current]?.human)return;
  const reaction=state.pendingReactions?.find(item=>item.defenderId===state.current);
  if(!reaction)return;
  reactionPromptActive=true;
  try{
    const attacker=state.players[reaction.attackerId],card=TACTICAL_CARDS[reaction.cardId],target=tById(reaction.target);
    let useCounter=false;
    if(window.Swal){
      const answer=await window.Swal.fire({icon:'warning',title:'¿Usar Contrainteligencia?',html:`<p><strong>${escapeHtml(attacker.name)}</strong> intenta usar ${card.icon} <strong>${escapeHtml(card.name)}</strong> sobre <strong>${escapeHtml(target.name)}</strong>.</p><p>Si reaccionas, descartas Contrainteligencia y anulas el efecto. Si la conservas, la operación enemiga se resuelve.</p>`,showCancelButton:true,confirmButtonText:'Usar Contrainteligencia',cancelButtonText:'Conservar carta',allowOutsideClick:false,allowEscapeKey:false});
      useCounter=answer.isConfirmed;
    }else useCounter=window.confirm(`${attacker.name} usa ${card.name} sobre ${target.name}. ¿Gastar Contrainteligencia para anularlo?`);
    const result=resolveCounterReaction(state,reaction.id,useCounter,state.current);
    if(result.ok&&result.countered){recordCardPlayed('counter');showToast(`${card.name} neutralizado`)}
    else if(result.ok)showToast(`Conservaste Contrainteligencia; ${card.name} surtió efecto`);
    render();
  }finally{reactionPromptActive=false}
  if(state.pendingReactions?.some(item=>item.defenderId===state.current))await promptPendingCounterReactions();
}

function showAiSummary(report){return new Promise(resolve=>{aiReturnFocus=document.activeElement;aiResolve=resolve;$('#aiTitle').textContent=`Turno de ${report.playerName}`;const probes=(report.probes||[]).map(p=>`<div class="ai-battle"><span>🔭 ${p.from} → ${p.to}</span><span>Guarnición revelada: ${p.revealedTroops}</span></div>`).join('');const battles=report.battles.slice(-4).map(b=>`<div class="ai-battle"><span>${b.from} → ${b.to}${b.conquered?' · conquistado':''}</span><span>${b.rounds} tirada${b.rounds===1?'':'s'} · pérdidas ${b.attackerLosses}/${b.defenderLosses}</span></div>`).join('');$('#aiSummary').innerHTML=`<div class="ai-kpis"><div class="ai-kpi"><strong>${report.reinforcements}</strong><span>REFUERZOS</span></div><div class="ai-kpi"><strong>${report.battles.length}</strong><span>ATAQUES</span></div><div class="ai-kpi"><strong>${report.conquests}</strong><span>CONQUISTAS</span></div></div>${probes}${battles||'<div class="battle-summary">No encontró un ataque favorable este turno.</div>'}${report.eliminated.length?`<div class="battle-summary">Eliminó a ${report.eliminated.join(', ')}.</div>`:''}`;els.aiModal.classList.remove('hidden');$('#closeAi').focus()})}
function closeAiSummary(){els.aiModal.classList.add('hidden');restoreFocus(aiReturnFocus,'#mobileOrdersBtn');aiReturnFocus=null;if(aiResolve){const resolve=aiResolve;aiResolve=null;resolve()}}
async function showDefenseAttack(battle){
  state=battle.beforeState;render(false);
  const attackerColor=state.players[state.current].color;
  const defenderColor=state.players[battle.defenderId].color;
  const firstRound=battle.roundResults?.[0];
  await playAttackApproach(battle.fromId,battle.toId,firstRound?.rawAttackerDice?.length||3,firstRound?.rawDefenderDice?.length||2);
  state=battle.afterState;
  await presentDiceRounds(battle.roundResults,{from:battle.from,to:battle.to,defending:true,fast:true,attackerColor,defenderColor});
  render(false);
  if(skipAiRequested)return;
  const remaining=state.territories[battle.toId].troops;
  const lost=battle.conquered;
  els.defenseModal.querySelector('.defense-card').classList.toggle('outcome-defeat',lost);
  els.defenseModal.querySelector('.defense-card').classList.toggle('outcome-victory',!lost);
  $('#defenseTitle').textContent=lost?'Has perdido un territorio':'Tu territorio resistió el ataque';
  $('#defenseRoute').textContent=`${battle.from} → ${battle.to}`;
  $('#defenseOutcome').innerHTML=`<strong>${battle.to}</strong><span>${lost?'Conquistado por el enemigo':`${remaining} tropa${remaining===1?'':'s'} restante${remaining===1?'':'s'}`}</span><small>Tu defensa perdió ${battle.defenderLosses} tropa${battle.defenderLosses===1?'':'s'}; el atacante perdió ${battle.attackerLosses}.</small>`;
  defenseReturnFocus=document.activeElement;els.defenseModal.classList.remove('hidden');$('#continueDefense').focus();
  await new Promise(resolve=>{defenseResolve=resolve});
}
function closeDefense(){els.defenseModal.classList.add('hidden');restoreFocus(defenseReturnFocus,'#mobileOrdersBtn');defenseReturnFocus=null;if(defenseResolve){const resolve=defenseResolve;defenseResolve=null;resolve()}}
function closeDiceResult(){els.diceModal.classList.add('hidden');restoreFocus(diceReturnFocus,'#mobileOrdersBtn');diceReturnFocus=null;if(diceResolve){const resolve=diceResolve;diceResolve=null;resolve()}}
function requestAiSkip(close){skipAiRequested=true;close();showToast('Turnos enemigos en avance rápido')}
$('#continueDefense').onclick=closeDefense;
$('#skipAiDefense').onclick=()=>requestAiSkip(closeDefense);
$('#closeAi').onclick=closeAiSummary;
$('#skipAiSummary').onclick=()=>requestAiSkip(closeAiSummary);
$('#closeDice').onclick=closeDiceResult;
$('#skipAiDice').onclick=()=>requestAiSkip(closeDiceResult);
els.routesBtn.onclick=()=>{routesAll=!routesAll;updateConnections()};
$('#objectivesMapBtn').onclick=openObjectivesModal;
$('#frontsMapBtn').onclick=openFrontsModal;
$('#chronicleBtn').onclick=openChronicleModal;
$('#marketModalBtn').onclick=openMarketModal;
$('#mobileOrdersBtn').onclick=()=>{if(state?.winner!==null&&state)showEndSummary();else openMobileOrders()};
$('#closeOrderSheet').onclick=closeMobileOrders;
$('#mobileSheetBackdrop').onclick=closeMobileOrders;
$('#panLeft').onclick=()=>document.querySelector('.map-wrap').scrollBy({left:-300,behavior:'smooth'});
$('#panRight').onclick=()=>document.querySelector('.map-wrap').scrollBy({left:300,behavior:'smooth'});
$('#mapOverviewBtn').onclick=()=>{const wrap=document.querySelector('.map-wrap'),overview=wrap.classList.toggle('overview');$('#mapOverviewBtn').setAttribute('aria-pressed',String(overview));$('#mapOverviewBtn').textContent=overview?'⊕':'⌕';if(overview)wrap.scrollTo({left:0,behavior:'smooth'});updateMobileMapOverlay()};
document.querySelector('.map-wrap').addEventListener('scroll',updateMobileMapOverlay,{passive:true});
window.addEventListener('resize',()=>{if(!mobileLayout())closeMobileOrders();updateMobileMapOverlay();renderTutorial()});
els.phaseBtn.onclick=()=>{
  if(!state||rolling)return;
  if(!state.players[state.current].human){skipAiRequested=true;render();showToast('Turnos enemigos en avance rápido');return}
  if(state.pendingReactions?.some(reaction=>reaction.defenderId===state.current)){promptPendingCounterReactions();return}
  if(state.phase==='gameover'){openStart();return}
  if(state.phase==='reinforce'){
    if(!finishReinforcement(state))return showToast('Primero coloca todos tus refuerzos');
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    announce('Comienza la fase de Combate. Elige un territorio atacante.');
  }else if(state.phase==='attack'){
    setPhase(state,'fortify');
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    closeMobileOrders();
    announce('Comienza la fase de Maniobra. Puedes mover tropas o pasar.');
  }else if(state.phase==='fortify'){
    setPhase(state,'close');
    selectedFrom=selectedTo=cardTargeting=null;
    render();
    closeMobileOrders();
    announce('Comienza el Cierre del turno. Revisa tus cartas y confirma el pase.');
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
async function waitForAiPresentation(){for(let elapsed=0;elapsed<650&&!skipAiRequested;elapsed+=50)await pause(50)}
async function runAiTurns(){if(!state||state.winner!==null||state.players[state.current].human||aiBusy)return;aiBusy=true;try{while(state.winner===null&&!state.players[state.current].human){render();await waitForAiPresentation();const report=aiTurn(state,state.current,difficulty);pendingAiState=state;save();if(!skipAiRequested){for(const battle of report.battles.filter(b=>b.defenderId===0)){if(skipAiRequested)break;await showDefenseAttack(battle)}}state=pendingAiState;pendingAiState=null;render();if(report.ok&&!skipAiRequested)await showAiSummary(report)}}finally{if(pendingAiState){state=pendingAiState;pendingAiState=null}aiBusy=false;skipAiRequested=false;render();if(state.winner!==null)showEndSummary();else await promptPendingCounterReactions()}}
function chosen(name){return document.querySelector(`input[name="${name}"]:checked`)?.value}
function startNew(){state=createGame({players:+$('#playerCount').value,seed:Date.now(),human:true,mapId:chosen('mapChoice'),rulesMode:chosen('rulesMode'),playerCommander:chosen('commanderChoice')||'conqueror',playerColor:chosen('colorChoice')||'#4ecdc4'});difficulty=$('#difficulty').value;startTelemetryCampaign(state,difficulty);selectedFrom=selectedTo=inspectedTerritory=null;selectedMove=1;selectedUnit='infantry';skipAiRequested=false;closeMobileOrders();initMap(state.mapId);els.startModal.classList.add('hidden');closeEndSummary();render();restoreFocus(mobileLayout()?$('#mobileOrdersBtn'):els.phaseBtn);showToast('Paso 1: coloca tus refuerzos')}
const START_BG_MAPS=['./map-frontier.webp','./map-archipelago.webp','./map-rift.webp'];function applyRandomStartBg(){const m=START_BG_MAPS[Math.floor(Math.random()*START_BG_MAPS.length)];if(els.startModal)els.startModal.style.setProperty('--start-bg-img',`url("${m}")`)}function openStart(){applyRandomStartBg();els.startModal.classList.remove('hidden');$('#continueBtn').hidden=!hasSavedCampaign();restoreFocus($('#startBtn'))}
function telemetryList(values,labels={}){const entries=Object.entries(values||{}).sort((a,b)=>b[1]-a[1]);return entries.length?entries.slice(0,4).map(([key,value])=>`<span><b>${labels[key]||key}</b> ${value}</span>`).join(''):'<span>Sin datos todavía</span>'}
function renderTelemetryHelp(){const box=$('#telemetrySummary');if(!box)return;const summary=telemetrySummary(),cardLabels=Object.fromEntries(Object.entries(TACTICAL_CARDS).map(([id,card])=>[id,card.name])),offerLabels=Object.fromEntries(MARKET_CATALOG.map(offer=>[offer.id,offer.name])),commanderLabels=Object.fromEntries(Object.entries(COMMANDERS).map(([id,commander])=>[id,commander.name]));box.innerHTML=`<div class="telemetry-kpis"><div><strong>${summary.completed}</strong><span>campañas</span></div><div><strong>${summary.victories}</strong><span>victorias</span></div><div><strong>${Object.values(summary.cardsPlayed).reduce((a,b)=>a+b,0)}</strong><span>cartas jugadas</span></div></div><div class="telemetry-groups"><div><small>Comandantes elegidos</small>${telemetryList(summary.commanders,commanderLabels)}</div><div><small>Cartas utilizadas</small>${telemetryList(summary.cardsPlayed,cardLabels)}</div><div><small>Ofertas compradas</small>${telemetryList(summary.offersBought,offerLabels)}</div><div><small>Ofertas ignoradas</small>${telemetryList(summary.offersIgnored,offerLabels)}</div></div>`}
function downloadTelemetry(){const blob=new Blob([exportTelemetry()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='fronteras-acero-telemetria.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);showToast('Telemetría exportada como JSON')}
function deleteTelemetry(){clearTelemetry();if(state&&state.winner===null)ensureTelemetryCampaign(state,difficulty);renderTelemetryHelp();showToast('Telemetría local eliminada')}
function openHelp(){helpReturnFocus=document.activeElement;renderTelemetryHelp();els.helpModal.classList.remove('hidden');$('#closeHelp').focus()}
function closeHelp(){els.helpModal.classList.add('hidden');restoreFocus(helpReturnFocus,'#helpBtn');helpReturnFocus=null}
document.querySelectorAll('.option-card input').forEach(input=>input.onchange=()=>{document.querySelectorAll(`input[name="${input.name}"]`).forEach(x=>x.closest('.option-card').classList.toggle('active',x.checked))});$('#startBtn').onclick=startNew;$('#continueBtn').onclick=()=>{if(load()){if(state.winner===null)ensureTelemetryCampaign(state,difficulty);initMap(state.mapId);els.startModal.classList.add('hidden');render();restoreFocus(mobileLayout()?$('#mobileOrdersBtn'):els.phaseBtn);if(state.winner!==null)showEndSummary();else if(state.players[state.current].human)promptPendingCounterReactions();else runAiTurns()}};$('#newBtn').onclick=openStart;els.summaryBtn.onclick=showEndSummary;$('#viewEndMap').onclick=closeEndSummary;$('#newFromEnd').onclick=()=>{closeEndSummary();openStart()};$('#helpBtn').onclick=openHelp;$('#closeHelp').onclick=$('#gotItBtn').onclick=closeHelp;$('#nextTutorialBtn').onclick=advanceTutorial;$('#skipTutorialBtn').onclick=skipTutorial;$('#restartTutorialBtn').onclick=restartTutorial;$('#exportTelemetryBtn').onclick=downloadTelemetry;$('#clearTelemetryBtn').onclick=deleteTelemetry;window.addEventListener('beforeunload',save);document.addEventListener('selectstart',e=>e.preventDefault());
document.querySelectorAll('.color-choice input').forEach(input=>input.onchange=()=>document.querySelectorAll('.color-choice').forEach(label=>label.classList.toggle('active',label.querySelector('input').checked)));

function registerWebMCP(){const c=document.modelContext;if(!c?.registerTool)return;try{c.registerTool({name:'get_campaign_state',title:'Consultar campaña',description:'Devuelve mapa, reglas, turno, fase y jugadores.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>state?{map:getMap(state).name,mode:state.rulesMode,turn:state.turn,phase:state.phase,currentPlayer:state.players[state.current].name,winner:state.winner===null?null:state.players[state.winner].name}:{status:'no_game'}})}catch(e){console.warn('WebMCP no disponible',e)}}
initMap('frontier');applyRandomStartBg();if(hasSavedCampaign())$('#continueBtn').hidden=false;registerWebMCP();
document.querySelectorAll('.zoom-btn').forEach(btn => btn.onclick = () => setMapZoom(+btn.dataset.zoom));
if($('#saveQuickBtn')) $('#saveQuickBtn').onclick = () => { save(); showToast('💾 Partida guardada con éxito'); };


document.addEventListener('click', e => {
  if (!e.target.closest('.player') && !e.target.closest('#commanderPopover')) {
    hideCommanderPopover();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideCommanderPopover();
    if(document.body.classList.contains('order-open'))closeMobileOrders();
    else if(!els.helpModal.classList.contains('hidden'))closeHelp();
  }
});
