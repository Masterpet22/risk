export const REGIONS={north:{name:'Norte',bonus:2,color:'#70b7c7'},west:{name:'Occidente',bonus:3,color:'#c89e68'},crown:{name:'Corona',bonus:3,color:'#aa83bd'},ember:{name:'Brasa',bonus:2,color:'#da7867'},sun:{name:'Sol',bonus:3,color:'#d6bd57'},isles:{name:'Jade',bonus:2,color:'#64ae8b'}};
export const TERRAINS={plain:{name:'Llanura',icon:'◌',unit:'cavalry',color:'#d6bd57'},forest:{name:'Bosque',icon:'♠',unit:'infantry',color:'#64ae8b'},mountain:{name:'Montaña',icon:'▲',unit:'artillery',color:'#9aa8b5'}};
export const UNIT_TYPES={infantry:{name:'Infantería',icon:'◆',beats:'artillery',color:'#4ecdc4'},artillery:{name:'Artillería',icon:'✦',beats:'cavalry',color:'#ff786d'},cavalry:{name:'Caballería',icon:'♞',beats:'infantry',color:'#f3c64f'}};

const IDS=['n1','n2','n3','n4','w1','w2','w3','w4','c1','c2','c3','c4','e1','e2','e3','e4','s1','s2','s3','s4','i1','i2','i3','i4'];
const REGIONS_BY_ID=Object.fromEntries(IDS.map(id=>[id,{n:'north',w:'west',c:'crown',e:'ember',s:'sun',i:'isles'}[id[0]]]));
function mapFrom(id,name,description,names,positions,edges,terrainOffset=0){
  const neighbors=Object.fromEntries(IDS.map(x=>[x,[]]));for(const [a,b] of edges){neighbors[a].push(b);neighbors[b].push(a)}
  return{id,name,description,territories:IDS.map((tid,i)=>({id:tid,name:names[i],region:REGIONS_BY_ID[tid],x:positions[i][0],y:positions[i][1],n:neighbors[tid],terrain:['plain','forest','mountain'][(i+terrainOffset)%3]}))};
}
const baseEdges=[['n1','n2'],['n1','w1'],['n2','n3'],['n2','w2'],['n3','n4'],['n3','c1'],['n4','c2'],['n4','i1'],['w1','w2'],['w1','w3'],['w2','w3'],['w2','c1'],['w3','w4'],['w3','c3'],['w4','e1'],['c1','c2'],['c1','c3'],['c2','c4'],['c2','i1'],['c3','c4'],['c3','e2'],['c4','e3'],['c4','s1'],['c4','i2'],['e1','e2'],['e2','e3'],['e2','s1'],['e3','e4'],['e3','s2'],['e4','s3'],['s1','s2'],['s1','i2'],['s2','s3'],['s2','s4'],['s3','s4'],['s4','i4'],['i1','i2'],['i2','i3'],['i3','i4']];
const islandEdges=[['n1','n2'],['n2','n3'],['n3','n4'],['n4','n1'],['w1','w2'],['w2','w3'],['w3','w4'],['w4','w1'],['c1','c2'],['c2','c3'],['c3','c4'],['c4','c1'],['e1','e2'],['e2','e3'],['e3','e4'],['e4','e1'],['s1','s2'],['s2','s3'],['s3','s4'],['s4','s1'],['i1','i2'],['i2','i3'],['i3','i4'],['i4','i1'],['n3','c1'],['n4','i1'],['w2','c1'],['w4','e1'],['c3','e2'],['c4','s1'],['c2','i4'],['e3','s4'],['s2','i3']];
const riftEdges=[['n1','n2'],['n2','n3'],['n3','n4'],['n1','w1'],['n2','w2'],['w1','w2'],['w1','w3'],['w2','w4'],['w3','w4'],['w2','c1'],['n4','c2'],['c1','c2'],['c1','c3'],['c2','c4'],['c3','c4'],['c3','e1'],['c4','e3'],['e1','e2'],['e2','e3'],['e3','e4'],['e2','s1'],['e4','s2'],['s1','s2'],['s1','s3'],['s2','s4'],['s3','s4'],['n4','i1'],['i1','i2'],['i2','i3'],['i3','i4'],['i4','s4'],['c2','i2'],['c4','s1']];
export const MAPS={
  frontier:mapFrom('frontier','Fronteras de Acero','Continente equilibrado con numerosas rutas centrales.',
    ['Bastión Boreal','Fiordo Gris','Paso del Lobo','Vigilia Blanca','Puerto Cuervo','Campos de Bronce','Bosque Ancestral','Risco del Ocaso','Valdoria','Ciudadela Real','Llanura Alta','Puente Carmesí','Bahía Ceniza','Forja del Sur','Delta Rojo','Cabo Ardiente','Arco Dorado','Dunas Reales','Oasis de Sal','Torre del Alba','Jade Norte','Estrecho Verde','Isla Tempestad','Puerto Esmeralda'],
    [[17,16],[30,12],[43,17],[56,12],[11,34],[25,30],[19,47],[9,58],[40,33],[54,29],[36,49],[51,46],[14,70],[30,66],[44,62],[37,79],[59,60],[55,76],[68,84],[73,69],[74,20],[78,41],[91,47],[88,68]],baseEdges,0),
  archipelago:mapFrom('archipelago','Archipiélago Quebrado','Seis islas defensivas conectadas por puentes estratégicos.',
    ['Faro Boreal','Roca Salina','Bahía Helada','Puerto Nimbo','Isla Cuervo','Arrecife Ámbar','Selva Umbría','Atolón Oeste','Trono Marino','Canal Real','Isla Alta','Puente Violeta','Cayo Ceniza','Isla Forja','Delta Ígneo','Cabo Rojo','Arco Solar','Duna Marina','Oasis Azul','Faro del Alba','Jade Alto','Canal Verde','Tempestad','Esmeralda'],
    [[18,15],[30,10],[42,15],[30,23],[10,38],[22,33],[18,49],[30,45],[42,35],[54,30],[48,47],[60,42],[28,66],[40,60],[51,69],[39,80],[63,64],[74,58],[82,70],[69,80],[75,14],[87,24],[91,39],[81,47]],islandEdges,1),
  rift:mapFrom('rift','La Gran Grieta','Dos frentes largos y pasos escasos que premian la planificación.',
    ['Muralla Norte','Paso Blanco','Cumbre Gris','Borde Helado','Guardia Oeste','Meseta Bronce','Bosque Bajo','Puerta del Ocaso','Corona Alta','Bastión Real','Valle Central','Cruce Carmesí','Entrada de Brasa','Forja Profunda','Garganta Roja','Cabo Sur','Umbral Dorado','Dunas Gemelas','Salinas','Torre Solar','Aguja Jade','Paso Verde','Filo Tormenta','Puerto Final'],
    [[12,14],[25,14],[38,14],[51,14],[11,35],[24,35],[11,51],[25,51],[39,35],[52,34],[39,51],[52,51],[20,69],[34,69],[48,69],[59,79],[66,58],[78,58],[69,75],[84,73],[70,15],[83,25],[88,42],[90,60]],riftEdges,2)
};
export const TERRITORIES=MAPS.frontier.territories;
export const PLAYER_COLORS=['#4ecdc4','#ff6b6b','#f7b731','#9b7ede'];
export const PLAYER_NAMES=['Tú','Legión Carmesí','Casa Áurea','Pacto Violeta'];
export const getMap=s=>MAPS[typeof s==='string'?s:s?.mapId]||MAPS.frontier;
export const getTerritories=s=>getMap(s).territories;
const terr=(s,id)=>getTerritories(s).find(t=>t.id===id);

export function makeRng(seed=Date.now()){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function createGame({players=3,seed=Date.now(),human=true,mapId='frontier',rulesMode='classic'}={}){
  const rng=makeRng(seed),map=getMap(mapId),order=shuffle(map.territories.map(t=>t.id),rng);
  const state={version:3,seed,mapId:map.id,rulesMode,turn:1,current:0,phase:'reinforce',winner:null,log:[],pendingReinforcements:0,attackMadeThisTurn:false,conqueredThisTurn:false,cardTradeLevel:0,
    players:Array.from({length:players},(_,i)=>({id:i,name:human&&i===0?'Tú':PLAYER_NAMES[i]||`Ejército ${i+1}`,color:PLAYER_COLORS[i],human:human&&i===0,alive:true,cards:0})),territories:{},rngState:Math.floor(rng()*0xffffffff)};
  order.forEach((id,i)=>state.territories[id]={owner:i%players,troops:1,unitType:['infantry','artillery','cavalry'][i%3]});
  const reserves=Math.max(8,14-Math.floor(map.territories.length/players));state.players.forEach(p=>{const owned=order.filter(id=>state.territories[id].owner===p.id);for(let k=0;k<reserves;k++)state.territories[owned[k%owned.length]].troops++});
  state.pendingReinforcements=reinforcementCount(state,0);addLog(state,`Campaña iniciada en ${map.name}.`,0);return state;
}
export const ownedIds=(s,p)=>getTerritories(s).filter(t=>s.territories[t.id].owner===p).map(t=>t.id);
export const enemiesOf=(s,id)=>terr(s,id).n.filter(n=>s.territories[n].owner!==s.territories[id].owner);
export const alliesOf=(s,id)=>terr(s,id).n.filter(n=>s.territories[n].owner===s.territories[id].owner);
export function reinforcementCount(state,pid){const count=ownedIds(state,pid).length;if(!count)return 0;let total=Math.max(3,Math.floor(count/3));for(const[key,r]of Object.entries(REGIONS)){const ids=getTerritories(state).filter(t=>t.region===key).map(t=>t.id);if(ids.length&&ids.every(id=>state.territories[id].owner===pid))total+=r.bonus}return total}
export function canPlayerAttack(state,pid=state.current){return ownedIds(state,pid).some(id=>state.territories[id].troops>=2&&enemiesOf(state,id).length>0)}
export function tradeCards(state,pid=state.current){const p=state.players[pid];if(state.phase!=='reinforce'||pid!==state.current||p.cards<3)return{ok:false,bonus:0};p.cards-=3;state.cardTradeLevel++;const seq=[4,6,8,10,12,15],bonus=state.cardTradeLevel<=seq.length?seq[state.cardTradeLevel-1]:15+(state.cardTradeLevel-seq.length)*5;state.pendingReinforcements+=bonus;addLog(state,`${p.name} canjeó 3 cartas por ${bonus} tropas.`,pid);return{ok:true,bonus}}
export function placeTroops(state,id,amount=1,unitType=null){if(state.phase!=='reinforce'||state.players[state.current].cards>=5||state.pendingReinforcements<amount||state.territories[id]?.owner!==state.current||amount<1)return false;state.territories[id].troops+=amount;if(state.rulesMode==='terrain'&&UNIT_TYPES[unitType])state.territories[id].unitType=unitType;state.pendingReinforcements-=amount;if(!state.pendingReinforcements){state.phase='attack';addLog(state,'Refuerzos desplegados. Comienza el combate.',state.current)}return true}
function nextRand(s){s.rngState=(Math.imul(1664525,s.rngState)+1013904223)>>>0;return s.rngState/4294967296}
function roll(s,n){return Array.from({length:n},()=>1+Math.floor(nextRand(s)*6)).sort((a,b)=>b-a)}
function addLog(s,text,p=null){s.log.unshift({text,p,turn:s.turn});if(s.log.length>60)s.log.length=60}
function battleBonuses(state,from,to){if(state.rulesMode!=='terrain')return{attacker:0,defender:0,attackerReasons:[],defenderReasons:[]};const a=state.territories[from],d=state.territories[to],terrain=terr(state,to).terrain,ar=[],dr=[];if(UNIT_TYPES[a.unitType].beats===d.unitType)ar.push(`${UNIT_TYPES[a.unitType].name} vence a ${UNIT_TYPES[d.unitType].name}`);if(UNIT_TYPES[d.unitType].beats===a.unitType)dr.push(`${UNIT_TYPES[d.unitType].name} vence a ${UNIT_TYPES[a.unitType].name}`);if(TERRAINS[terrain].unit===d.unitType)dr.push(`afinidad con ${TERRAINS[terrain].name.toLowerCase()}`);return{attacker:ar.length?1:0,defender:dr.length?1:0,attackerReasons:ar,defenderReasons:dr}}
function applyBonus(dice,bonus){const out=[...dice];if(out.length)out[0]+=bonus;return out}
export function attackRound(state,from,to,attackerDiceCount=null){const a=state.territories[from],d=state.territories[to];if(state.phase!=='attack'||!a||!d||a.owner!==state.current||d.owner===a.owner||a.troops<2||!terr(state,from).n.includes(to))return{ok:false};const max=Math.min(3,a.troops-1),chosen=attackerDiceCount===null?max:Number(attackerDiceCount);if(!Number.isInteger(chosen)||chosen<1||chosen>max)return{ok:false};const attacker=a.owner,defender=d.owner,rawA=roll(state,chosen),rawD=roll(state,Math.min(2,d.troops)),bonus=battleBonuses(state,from,to),ad=applyBonus(rawA,bonus.attacker),dd=applyBonus(rawD,bonus.defender);state.attackMadeThisTurn=true;let al=0,dl=0;for(let i=0;i<Math.min(ad.length,dd.length);i++){if(ad[i]>dd[i]){d.troops--;dl++}else{a.troops--;al++}}let conquered=false,eliminated=null;if(d.troops<=0){const moved=Math.max(1,Math.min(chosen,a.troops-1));d.owner=attacker;d.troops=moved;d.unitType=a.unitType;a.troops-=moved;conquered=true;state.conqueredThisTurn=true;addLog(state,`${terr(state,from).name} conquistó ${terr(state,to).name}.`,attacker);if(!ownedIds(state,defender).length){state.players[defender].alive=false;eliminated=defender;state.players[attacker].cards+=state.players[defender].cards;state.players[defender].cards=0;addLog(state,`${state.players[defender].name} fue eliminado.`,attacker)}checkWinner(state)}return{ok:true,from,to,attackerDice:ad,defenderDice:dd,rawAttackerDice:rawA,rawDefenderDice:rawD,bonus,attackerLosses:al,defenderLosses:dl,conquered,eliminated}}
export function blitz(state,from,to,maxRounds=50){const rounds=[];while(rounds.length<maxRounds&&state.winner===null&&state.territories[from]?.troops>1&&state.territories[to]?.owner!==state.current){const r=attackRound(state,from,to);if(!r.ok)break;rounds.push(r);if(r.conquered)break}return{ok:rounds.length>0,rounds,conquered:rounds.at(-1)?.conquered||false}}
function connectedOwned(state,start,target,pid){const q=[start],seen=new Set(q);while(q.length){const id=q.shift();if(id===target)return true;for(const n of terr(state,id).n)if(!seen.has(n)&&state.territories[n].owner===pid){seen.add(n);q.push(n)}}return false}
export function fortify(state,from,to,amount){const a=state.territories[from],b=state.territories[to];if(state.phase!=='fortify'||!a||!b||a.owner!==state.current||b.owner!==state.current||amount<1||a.troops<=amount||!connectedOwned(state,from,to,state.current))return false;const before=b.troops;a.troops-=amount;b.troops+=amount;if(state.rulesMode==='terrain'&&amount>=before)b.unitType=a.unitType;state.phase='close';addLog(state,`${amount} unidades se movieron a ${terr(state,to).name}.`,state.current);return true}
export function setPhase(state,phase){if(phase==='fortify'&&state.phase==='attack'&&(state.attackMadeThisTurn||!canPlayerAttack(state))){state.phase='fortify';return true}if(phase==='close'&&state.phase==='fortify'){state.phase='close';return true}return false}
export function endTurn(state){if(state.winner!==null)return;if(state.conqueredThisTurn){state.players[state.current].cards++;addLog(state,`${state.players[state.current].name} robó 1 carta.`,state.current)}let next=state.current;do{next=(next+1)%state.players.length;if(next===0)state.turn++}while(!state.players[next].alive);state.current=next;state.phase='reinforce';state.attackMadeThisTurn=false;state.conqueredThisTurn=false;state.pendingReinforcements=reinforcementCount(state,next);addLog(state,`Turno de ${state.players[next].name}: ${state.pendingReinforcements} refuerzos.`,next)}
function checkWinner(state){const alive=state.players.filter(p=>p.alive);if(alive.length===1){state.winner=alive[0].id;state.phase='gameover';addLog(state,`${alive[0].name} domina todo el mapa.`,alive[0].id)}}
function borderScore(state,id,pid){const t=state.territories[id],enemy=terr(state,id).n.filter(n=>state.territories[n].owner!==pid).reduce((s,n)=>s+state.territories[n].troops,0);return enemy+t.troops*.15}
export function aiTurn(state,pid=state.current,difficulty='normal'){
  if(state.winner!==null||state.current!==pid)return{ok:false};
  const report={ok:true,playerId:pid,playerName:state.players[pid].name,reinforcements:state.pendingReinforcements,battles:[],conquests:0,attackerLosses:0,defenderLosses:0,eliminated:[]};
  while(state.players[pid].cards>=5||(state.players[pid].cards>=3&&difficulty==='difícil'))tradeCards(state,pid);
  while(state.pendingReinforcements>0){
    const own=ownedIds(state,pid).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
    const id=own[0],terrain=terr(state,id).terrain;
    placeTroops(state,id,1,state.rulesMode==='terrain'?TERRAINS[terrain].unit:null);
  }
  let moves=0,limit=difficulty==='fácil'?5:difficulty==='difícil'?28:16;
  while(moves++<limit&&state.winner===null){
    const options=[];
    for(const from of ownedIds(state,pid))for(const to of enemiesOf(state,from)){
      const advantage=state.territories[from].troops-state.territories[to].troops;
      if(state.territories[from].troops>1)options.push({from,to,advantage,target:state.territories[to].troops});
    }
    if(!options.length)break;
    options.sort((a,b)=>b.advantage-a.advantage||a.target-b.target);
    const best=options[0],threshold=difficulty==='fácil'?2:difficulty==='difícil'?-1:0;
    if(state.attackMadeThisTurn&&best.advantage<threshold)break;
    const defenderId=state.territories[best.to].owner;
    const beforeState=defenderId===0?structuredClone(state):null;
    const result=blitz(state,best.from,best.to);
    if(result.ok){
      const al=result.rounds.reduce((s,r)=>s+r.attackerLosses,0),dl=result.rounds.reduce((s,r)=>s+r.defenderLosses,0),last=result.rounds.at(-1);
      report.battles.push({from:terr(state,best.from).name,to:terr(state,best.to).name,fromId:best.from,toId:best.to,defenderId,beforeState,afterState:beforeState?structuredClone(state):null,rounds:result.rounds.length,attackerLosses:al,defenderLosses:dl,conquered:result.conquered,eliminated:last.eliminated,bonus:last.bonus});
      report.attackerLosses+=al;report.defenderLosses+=dl;if(result.conquered)report.conquests++;if(last.eliminated!==null)report.eliminated.push(state.players[last.eliminated].name);
    }
  }
  if(state.winner!==null)return report;
  setPhase(state,'fortify');
  const sources=ownedIds(state,pid).filter(id=>state.territories[id].troops>2&&!enemiesOf(state,id).length).sort((a,b)=>state.territories[b].troops-state.territories[a].troops);
  const borders=ownedIds(state,pid).filter(id=>enemiesOf(state,id).length).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
  if(sources.length&&borders.length&&connectedOwned(state,sources[0],borders[0],pid))fortify(state,sources[0],borders[0],Math.max(1,state.territories[sources[0]].troops-1));else setPhase(state,'close');
  endTurn(state);return report;
}
export function validateState(state){const errors=[],ts=getTerritories(state);for(const t of ts){const s=state.territories[t.id];if(!s)errors.push(`Falta ${t.id}`);else if(s.troops<1)errors.push(`${t.id} sin tropas`);else if(!state.players[s.owner])errors.push(`${t.id} dueño inválido`);else if(!UNIT_TYPES[s.unitType])errors.push(`${t.id} unidad inválida`)}const owners=new Set(ts.map(t=>state.territories[t.id]?.owner));state.players.forEach(p=>{if(p.alive!==owners.has(p.id)&&state.winner===null)errors.push(`Estado vital incorrecto: ${p.name}`)});return errors}
