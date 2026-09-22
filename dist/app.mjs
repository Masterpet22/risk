import {REGIONS,TERRITORIES,createGame,ownedIds,enemiesOf,placeTroops,attackRound,blitz,fortify,setPhase,endTurn,aiTurn,validateState} from './engine.mjs';

const $=s=>document.querySelector(s), els={map:$('#map'),players:$('#players'),regions:$('#regions'),round:$('#round'),phaseTitle:$('#phaseTitle'),turnLabel:$('#turnLabel'),reinforcements:$('#reinforcements'),reinforceBox:$('#reinforceBox'),orderTitle:$('#orderTitle'),orderText:$('#orderText'),selection:$('#selectionInfo'),battle:$('#battleResult'),controls:$('#actionControls'),phaseBtn:$('#phaseBtn'),log:$('#log'),startModal:$('#startModal'),helpModal:$('#helpModal'),toast:$('#toast')};
let state=null,difficulty='normal',selectedFrom=null,selectedTo=null,toastTimer=null,aiBusy=false;
const SAVE='fronteras-acero-save-v1';

const regionShapes={north:'M90 80 L610 55 L650 210 L500 260 L315 220 L115 245 Z',west:'M45 250 L320 225 L365 515 L175 615 L55 520 Z',crown:'M315 225 L650 210 L665 530 L360 515 Z',ember:'M70 525 L365 515 L520 720 L115 710 Z',sun:'M520 515 L820 500 L900 710 L520 720 Z',isles:'M665 105 L900 120 L965 555 L820 660 L665 530 Z'};

function save(){if(state)localStorage.setItem(SAVE,JSON.stringify({state,difficulty}));}
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE));if(!d?.state||validateState(d.state).length)return false;state=d.state;difficulty=d.difficulty||'normal';return true;}catch{return false;}}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200);}

function initMap(){
  els.map.innerHTML=`<defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse class="sea-ring" cx="500" cy="380" rx="470" ry="335"/><ellipse class="sea-ring" cx="500" cy="380" rx="410" ry="285"/>`;
  for(const [key,path] of Object.entries(regionShapes))els.map.insertAdjacentHTML('beforeend',`<path d="${path}" fill="${REGIONS[key].color}14" stroke="${REGIONS[key].color}2e" stroke-width="2"/>`);
  const drawn=new Set();for(const t of TERRITORIES)for(const n of t.n){const k=[t.id,n].sort().join('-');if(drawn.has(k))continue;drawn.add(k);const b=TERRITORIES.find(x=>x.id===n);els.map.insertAdjacentHTML('beforeend',`<line class="connection" x1="${t.x*10}" y1="${t.y*8}" x2="${b.x*10}" y2="${b.y*8}"/>`)}
  for(const t of TERRITORIES){
    const x=t.x*10,y=t.y*8, r=48;
    const points=Array.from({length:8},(_,i)=>{const a=Math.PI*2*i/8+0.18;const rr=r*(i%2?1:.88);return `${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`}).join(' ');
    els.map.insertAdjacentHTML('beforeend',`<g class="territory" id="terr-${t.id}" data-id="${t.id}" tabindex="0" role="button" aria-label="${t.name}"><polygon class="territory-shape" points="${points}" style="--region:${REGIONS[t.region].color}"/><text class="territory-label" x="${x}" y="${y-19}">${t.name}</text><circle class="army-disc" cx="${x}" cy="${y+11}" r="20"/><path class="army-icon" d="M${x-4} ${y+11}h8v10h-8zM${x-7} ${y+6}h14l-3-6h-8z"/><text class="army-count" x="${x+17}" y="${y+18}">1</text></g>`);
  }
  els.map.addEventListener('click',e=>{const g=e.target.closest('.territory');if(g)territoryClick(g.dataset.id,e.shiftKey)});
  els.map.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.territory')){e.preventDefault();territoryClick(e.target.closest('.territory').dataset.id)}});
}

function render(){if(!state)return;const p=state.players[state.current];els.round.textContent=state.turn;els.reinforcements.textContent=state.pendingReinforcements;els.reinforceBox.style.display=state.phase==='reinforce'?'block':'none';els.turnLabel.textContent=p.human?'TU TURNO':`TURNO DE ${p.name.toUpperCase()}`;renderPlayers();renderRegions();renderMap();renderPanel();renderLog();save();}
function renderPlayers(){els.players.innerHTML=state.players.map(p=>{const ids=ownedIds(state,p.id),troops=ids.reduce((s,id)=>s+state.territories[id].troops,0);return `<div class="player ${state.current===p.id?'active':''} ${!p.alive?'eliminated':''}" style="--pc:${p.color}"><div class="player-top"><i class="player-color"></i><span class="player-name">${p.name}</span>${state.current===p.id&&p.alive?'<span class="turn-badge">EN TURNO</span>':''}</div><div class="player-stats"><span><strong>${ids.length}</strong> territorios</span><span><strong>${troops}</strong> tropas</span></div></div>`}).join('')}
function renderRegions(){els.regions.innerHTML=Object.entries(REGIONS).map(([k,r])=>`<div class="region-row" style="--rc:${r.color}"><i class="region-swatch"></i><span>${r.name}</span><strong>+${r.bonus}</strong></div>`).join('')}
function renderMap(){for(const t of TERRITORIES){const d=state.territories[t.id],p=state.players[d.owner],g=$(`#terr-${t.id}`);g.style.setProperty('--owner',p.color);g.classList.toggle('owned',d.owner===state.current);g.classList.toggle('selected',t.id===selectedFrom||t.id===selectedTo);g.classList.toggle('target',selectedFrom&&state.phase==='attack'&&enemiesOf(state,selectedFrom).includes(t.id));g.querySelector('.army-count').textContent=d.troops;g.setAttribute('aria-label',`${t.name}, ${d.troops} tropas, ${p.name}`)}}
function renderLog(){els.log.innerHTML=state.log.slice(0,7).map(l=>`<div class="log-item" style="--lc:${l.p===null?'#788896':state.players[l.p]?.color||'#788896'}"><i class="log-dot"></i><span>${l.text}</span></div>`).join('')}

function renderPanel(){
  const human=state.players[state.current].human;els.battle.innerHTML='';els.controls.innerHTML='';els.selection.innerHTML='';
  if(state.phase==='gameover'){const won=state.winner===0;els.phaseTitle.textContent=won?'Victoria total':'La campaña ha terminado';els.orderTitle.textContent=won?'El continente es tuyo':'Has sido derrotado';els.orderText.textContent=won?'Todos los estandartes enemigos han caído.':'Tus últimos territorios fueron conquistados.';els.selection.innerHTML=`<div class="victory"><h3>${won?'¡Victoria!':'Fin de la partida'}</h3><p>${won?'La historia recordará tu campaña.':'Puedes iniciar una nueva campaña y ajustar tu estrategia.'}</p></div>`;els.phaseBtn.textContent='Nueva partida';els.phaseBtn.disabled=false;return;}
  if(!human){els.phaseTitle.textContent='Consejo enemigo';els.orderTitle.textContent=`${state.players[state.current].name} está actuando`;els.orderText.textContent='La inteligencia rival evalúa sus fronteras y despliega sus tropas.';els.phaseBtn.textContent='Procesando…';els.phaseBtn.disabled=true;return;}
  els.phaseBtn.disabled=false;
  if(state.phase==='reinforce'){
    els.phaseTitle.textContent='Despliega refuerzos';els.orderTitle.textContent=`${state.pendingReinforcements} tropas disponibles`;els.orderText.textContent='Pulsa territorios propios para colocar una tropa. Mantén pulsado Shift para colocar hasta cinco.';els.phaseBtn.textContent='Coloca todos los refuerzos';els.phaseBtn.disabled=true;
  }else if(state.phase==='attack'){
    els.phaseTitle.textContent='Abre un frente';els.orderTitle.textContent=selectedFrom?'Elige un territorio enemigo':'Selecciona el origen';els.orderText.textContent='Ataca solo a territorios conectados. Debes dejar al menos una tropa defendiendo el origen.';els.phaseBtn.textContent='Pasar a fortificación';
    if(selectedFrom){const a=state.territories[selectedFrom],tn=TERRITORIES.find(t=>t.id===selectedFrom);els.selection.innerHTML=`<div class="selection-item"><span>Origen · ${tn.name}</span><strong>${a.troops} tropas</strong></div>`}
    if(selectedTo)renderAttackControls();
  }else if(state.phase==='fortify'){
    els.phaseTitle.textContent='Asegura tus fronteras';els.orderTitle.textContent=selectedFrom?'Elige el destino':'Movimiento final';els.orderText.textContent='Mueve tropas entre dos territorios propios conectados, o termina el turno.';els.phaseBtn.textContent='Terminar turno';
    if(selectedFrom){const a=state.territories[selectedFrom],tn=TERRITORIES.find(t=>t.id===selectedFrom);els.selection.innerHTML=`<div class="selection-item"><span>Origen · ${tn.name}</span><strong>${a.troops} tropas</strong></div>`}
    if(selectedTo)renderFortifyControls();
  }
}
function renderAttackControls(){const a=state.territories[selectedFrom],d=state.territories[selectedTo],an=TERRITORIES.find(t=>t.id===selectedFrom).name,dn=TERRITORIES.find(t=>t.id===selectedTo).name;els.selection.innerHTML=`<div class="selection-item"><span>${an}</span><strong>${a.troops} tropas</strong></div><div class="selection-item"><span>${dn}</span><strong>${d.troops} tropas</strong></div>`;els.controls.innerHTML=`<button class="primary-btn" id="rollBtn">Lanzar dados</button><button class="secondary-btn" id="blitzBtn">Ataque rápido</button>`;$('#rollBtn').onclick=()=>doAttack(false);$('#blitzBtn').onclick=()=>doAttack(true)}
function renderFortifyControls(){const max=state.territories[selectedFrom].troops-1;if(max<1)return;els.controls.innerHTML=`<label>Tropas a mover: <strong id="moveVal">1</strong><input id="moveRange" type="range" min="1" max="${max}" value="1"></label><button class="primary-btn" id="moveBtn">Mover tropas</button>`;$('#moveRange').oninput=e=>$('#moveVal').textContent=e.target.value;$('#moveBtn').onclick=()=>{if(fortify(state,selectedFrom,selectedTo,+$('#moveRange').value)){selectedFrom=selectedTo=null;render();runAiTurns()}else showToast('Los territorios deben estar unidos por dominios propios')}}

function territoryClick(id,shift=false){if(!state||aiBusy||state.winner!==null||!state.players[state.current].human)return;const d=state.territories[id];
  if(state.phase==='reinforce'){if(d.owner!==state.current)return showToast('Solo puedes reforzar territorios propios');const amount=Math.min((shift?5:1),state.pendingReinforcements);placeTroops(state,id,amount);render();return;}
  if(state.phase==='attack'){
    if(d.owner===state.current){if(d.troops<2)return showToast('Necesitas al menos 2 tropas para atacar');selectedFrom=id;selectedTo=null;render();return;}
    if(selectedFrom&&enemiesOf(state,selectedFrom).includes(id)){selectedTo=id;render();return;}showToast('Ese territorio no limita con el origen');
  }else if(state.phase==='fortify'){
    if(d.owner!==state.current)return showToast('Solo puedes fortificar dominios propios');if(!selectedFrom){if(d.troops<2)return showToast('No hay tropas disponibles para mover');selectedFrom=id;}else if(id===selectedFrom){selectedFrom=null;selectedTo=null;}else selectedTo=id;render();
  }
}
function doAttack(fast){const result=fast?blitz(state,selectedFrom,selectedTo):attackRound(state,selectedFrom,selectedTo);if(!result.ok)return;const r=fast?result.rounds.at(-1):result;els.battle.innerHTML=`<div class="dice-row"><span>Ataque</span>${r.attackerDice.map(x=>`<i class="die">${x}</i>`).join('')}</div><div class="dice-row"><span>Defensa</span>${r.defenderDice.map(x=>`<i class="die def">${x}</i>`).join('')}</div><div class="result-caption">Pérdidas: ${fast?result.rounds.reduce((s,x)=>s+x.attackerLosses,0):r.attackerLosses} tuyas · ${fast?result.rounds.reduce((s,x)=>s+x.defenderLosses,0):r.defenderLosses} enemigas</div>`;if(r.conquered){selectedFrom=selectedTo;selectedTo=null;}renderMap();renderPlayers();renderLog();save();setTimeout(()=>{if(state.winner!==null)render();else renderPanel()},900)}

els.phaseBtn.onclick=()=>{if(!state)return;if(state.phase==='gameover'){openStart();return}if(state.phase==='attack'){setPhase(state,'fortify');selectedFrom=selectedTo=null;render()}else if(state.phase==='fortify'){endTurn(state);selectedFrom=selectedTo=null;render();runAiTurns()}};
async function runAiTurns(){if(!state||state.winner!==null||state.players[state.current].human)return;aiBusy=true;while(state.winner===null&&!state.players[state.current].human){render();await new Promise(r=>setTimeout(r,520));aiTurn(state,state.current,difficulty);render();await new Promise(r=>setTimeout(r,420));}aiBusy=false;render()}
function startNew(){state=createGame({players:+$('#playerCount').value,seed:Date.now(),human:true});difficulty=$('#difficulty').value;selectedFrom=selectedTo=null;els.startModal.classList.add('hidden');render();showToast('Campaña iniciada')}
function openStart(){els.startModal.classList.remove('hidden');$('#continueBtn').hidden=!localStorage.getItem(SAVE)}
$('#startBtn').onclick=startNew;$('#continueBtn').onclick=()=>{if(load()){els.startModal.classList.add('hidden');render();runAiTurns()}};$('#newBtn').onclick=openStart;$('#helpBtn').onclick=()=>els.helpModal.classList.remove('hidden');$('#closeHelp').onclick=$('#gotItBtn').onclick=()=>els.helpModal.classList.add('hidden');
window.addEventListener('beforeunload',save);

function registerWebMCP(){const c=document.modelContext;if(!c?.registerTool)return;try{c.registerTool({name:'get_campaign_state',title:'Consultar campaña',description:'Devuelve el turno, fase, jugadores y territorios de la campaña actual.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>state?{turn:state.turn,phase:state.phase,currentPlayer:state.players[state.current].name,winner:state.winner===null?null:state.players[state.winner].name,territories:TERRITORIES.map(t=>({name:t.name,owner:state.players[state.territories[t.id].owner].name,troops:state.territories[t.id].troops}))}:{status:'no_game'}});c.registerTool({name:'start_new_campaign',title:'Iniciar campaña',description:'Inicia una campaña nueva con entre 2 y 4 ejércitos.',inputSchema:{type:'object',properties:{players:{type:'integer',minimum:2,maximum:4},difficulty:{type:'string',enum:['fácil','normal','difícil']}},required:['players','difficulty'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:({players,difficulty:d})=>{state=createGame({players,human:true});difficulty=d;els.startModal.classList.add('hidden');render();return{status:'started',players,difficulty:d}}})}catch(e){console.warn('WebMCP no disponible',e)}}

initMap();if(localStorage.getItem(SAVE))$('#continueBtn').hidden=false;registerWebMCP();
