export const REGIONS={north:{name:'Norte',bonus:2,color:'#70b7c7'},west:{name:'Occidente',bonus:3,color:'#c89e68'},crown:{name:'Corona',bonus:3,color:'#aa83bd'},ember:{name:'Brasa',bonus:2,color:'#da7867'},sun:{name:'Sol',bonus:3,color:'#d6bd57'},isles:{name:'Jade',bonus:2,color:'#64ae8b'}};
export const TERRAINS={plain:{name:'Llanura',icon:'◌',unit:'cavalry',color:'#d6bd57'},forest:{name:'Bosque',icon:'♠',unit:'infantry',color:'#64ae8b'},mountain:{name:'Montaña',icon:'▲',unit:'artillery',color:'#9aa8b5'}};
export const UNIT_TYPES={infantry:{name:'Infantería',icon:'◆',beats:'artillery',color:'#4ecdc4'},artillery:{name:'Artillería',icon:'✦',beats:'cavalry',color:'#ff786d'},cavalry:{name:'Caballería',icon:'♞',beats:'infantry',color:'#f3c64f'}};

export const COMMANDERS={
  conqueror:{id:'conqueror',name:'El Conquistador',icon:'⚔️',desc:'+1 al dado de ataque en el primer combate de cada turno.'},
  guardian:{id:'guardian',name:'El Guardián',icon:'🛡️',desc:'+1 al dado de defensa en territorios con Frente en Guerra.'},
  industrial:{id:'industrial',name:'El Industrial',icon:'⚙️',desc:'+1 de producción base en todos sus territorios.'},
  strategist:{id:'strategist',name:'El Estratega',icon:'♟️',desc:'-$5 en Mercado Táctico, Movilización gratis, Bloqueo $15 y 1 Movilización inicial.'},
  spy:{id:'spy',name:'El Espía',icon:'👁️',desc:'+1 al dado de ataque contra objetivos espiados, 1 Espía inicial y 50% anti-sabotaje.'},
  diplomat:{id:'diplomat',name:'El Diplomático',icon:'🕊️',desc:'+40% de Influencia en objetivos y subsidio diplomático de +$3 por frentes pacíficos.'}
};
export const COMMANDER_IDS=Object.keys(COMMANDERS);
export const INFLUENCE_TARGET=70;
export const FRONT_STATES=['stable','tense','conflict','war'];
export const FRONT_STATE_LABELS={
  stable:{name:'Estable',icon:'🕊️',color:'#64ae8b'},
  tense:{name:'Tenso',icon:'⚠️',color:'#f7b731'},
  conflict:{name:'Conflicto',icon:'⚡',color:'#ff786d'},
  war:{name:'Guerra',icon:'⚔️',color:'#e74c3c'}
};

export const EVENT_CATALOG={
  earthquake:{
    id:'earthquake',
    name:'Terremoto',
    icon:'🌋',
    duration:2,
    desc:'Seísmo geológico. Causa 1 baja en las guarniciones (mínimo 1 tropa) y corta conexiones terrestres por desprendimiento durante 2 rondas.'
  },
  tsunami:{
    id:'tsunami',
    name:'Tsunami',
    icon:'🌊',
    duration:2,
    desc:'Maremoto en costas e islas. Causa 1 baja en tropas costeras (mínimo 1 tropa) e inunda pasos marítimos durante 2 rondas.'
  },
  tempest:{
    id:'tempest',
    name:'Temporal',
    icon:'⛈️',
    duration:2,
    desc:'Tormenta huracanada. Reduce la producción regional a la mitad y corta un paso clave durante 2 rondas.'
  }
};
export const EVENT_IDS=Object.keys(EVENT_CATALOG);

export const frontKey=(p1,p2,region='global')=>`${p1<p2?`${p1}-${p2}`:`${p2}-${p1}`}:${region}`;
export function getFrontState(state,p1,p2,region=null){
  if(p1===p2||!state?.fronts)return 'stable';
  if(region)return state.fronts[frontKey(p1,p2,region)]?.state||'stable';
  return Object.keys(REGIONS).map(key=>state.fronts[frontKey(p1,p2,key)]?.state||'stable').sort((a,b)=>FRONT_STATES.indexOf(b)-FRONT_STATES.indexOf(a))[0]||'stable';
}
export function updateFrontTension(state,p1,p2,region,levelOrDelta){
  if(p1===p2||!state)return;
  if(levelOrDelta===undefined){levelOrDelta=region;region='crown'}
  if(!REGIONS[region])return;
  state.fronts=state.fronts||{};
  const k=frontKey(p1,p2,region);
  const cur=state.fronts[k]?.state||'stable';
  const curIdx=FRONT_STATES.indexOf(cur);
  let newIdx;
  if(typeof levelOrDelta==='string'){
    const targetIdx=FRONT_STATES.indexOf(levelOrDelta);
    newIdx=Math.max(curIdx,targetIdx);
  }else{
    newIdx=Math.max(0,Math.min(FRONT_STATES.length-1,curIdx+levelOrDelta));
  }
  const nextState=FRONT_STATES[newIdx];
  state.fronts[k]={
    state:nextState,
    lastHostilityTurn:state.turn,
    battlesThisTurn:(state.fronts[k]?.battlesThisTurn||0)+(levelOrDelta==='conflict'||levelOrDelta==='war'?1:0)
  };
}
export function coolDownFronts(state){
  if(!state?.fronts)return;
  for(const[k,data]of Object.entries(state.fronts)){
    if(data.lastHostilityTurn<state.turn){
      const curIdx=FRONT_STATES.indexOf(data.state);
      if(curIdx>0){
        data.state=FRONT_STATES[curIdx-1];
      }
    }
    data.battlesThisTurn=0;
  }
}
export function isTerritoryInWarFront(state,tid){
  const owner=state?.territories?.[tid]?.owner;
  if(owner===undefined)return false;
  const t=terr(state,tid);
  if(!t)return false;
  for(const n of t.n){
    const neighborOwner=state.territories[n]?.owner;
    if(neighborOwner!==undefined&&neighborOwner!==owner){
      if(getFrontState(state,owner,neighborOwner,t.region)==='war'){
        return true;
      }
    }
  }
  return false;
}

const IDS=['n1','n2','n3','n4','w1','w2','w3','w4','c1','c2','c3','c4','e1','e2','e3','e4','s1','s2','s3','s4','i1','i2','i3','i4'];
const REGIONS_BY_ID=Object.fromEntries(IDS.map(id=>[id,{n:'north',w:'west',c:'crown',e:'ember',s:'sun',i:'isles'}[id[0]]]));
const MAP_REGION_IDENTITIES={
  frontier:{
    north:{name:'Dominio Boreal',short:'BOREAL'},west:{name:'Marca Occidental',short:'OCCIDENTE'},crown:{name:'Tierras de la Corona',short:'CORONA'},
    ember:{name:'Cuenca de Brasa',short:'BRASA'},sun:{name:'Desiertos del Sol',short:'SOL'},isles:{name:'Costa de Jade',short:'JADE'}
  },
  archipelago:{
    north:{name:'Islas de la Bruma',short:'BRUMA'},west:{name:'Bajíos del Cuervo',short:'BAJÍOS'},crown:{name:'Canales del Trono',short:'TRONO'},
    ember:{name:'Cinturón Ígneo',short:'ÍGNEO'},sun:{name:'Mar Dorado',short:'DORADO'},isles:{name:'Arrecifes de Jade',short:'ARRECIFE'}
  },
  rift:{
    north:{name:'Cumbres del Hielo',short:'CUMBRES'},west:{name:'Mesetas del Ocaso',short:'MESETAS'},crown:{name:'Corona Quebrada',short:'GRIETA'},
    ember:{name:'Fosas de Brasa',short:'FOSAS'},sun:{name:'Eriales del Sol',short:'ERIALES'},isles:{name:'Agujas de Jade',short:'AGUJAS'}
  }
};
function mapFrom(id,name,description,names,positions,edges,terrainOffset=0){
  const neighbors=Object.fromEntries(IDS.map(x=>[x,[]]));for(const [a,b] of edges){neighbors[a].push(b);neighbors[b].push(a)}
  return{id,name,description,regions:MAP_REGION_IDENTITIES[id],territories:IDS.map((tid,i)=>({id:tid,name:names[i],region:REGIONS_BY_ID[tid],x:positions[i][0],y:positions[i][1],n:neighbors[tid],terrain:['plain','forest','mountain'][(i+terrainOffset)%3]}))};
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
export const getMap=s=>MAPS[typeof s==='string'?s:(s?.mapId||s?.id)]||MAPS.frontier;
export const getRegion=(s,key)=>({...REGIONS[key],...(getMap(s).regions?.[key]||{})});
export const getTerritories=s=>getMap(s).territories;
const terr=(s,id)=>getTerritories(s).find(t=>t.id===id);

export function makeRng(seed=Date.now()){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function createGame({players=3,seed=Date.now(),human=true,mapId='frontier',rulesMode='classic',playerCommander='conqueror',playerColor=PLAYER_COLORS[0]}={}){
  const rng=makeRng(seed),map=getMap(mapId),order=shuffle(map.territories.map(t=>t.id),rng);
  const chosenCmd=COMMANDERS[playerCommander]?playerCommander:'conqueror';
  const chosenColor=PLAYER_COLORS.includes(playerColor)?playerColor:PLAYER_COLORS[0];
  const playerColors=[chosenColor,...PLAYER_COLORS.filter(color=>color!==chosenColor)];
  const availCmds=COMMANDER_IDS.filter(c=>c!==chosenCmd);
  const pCommanders=Array.from({length:players},(_,i)=>{
    if(i===0)return chosenCmd;
    return availCmds[(i-1)%availCmds.length]||COMMANDER_IDS[i%COMMANDER_IDS.length];
  });
  const state={version:12,seed,mapId:map.id,rulesMode,turn:1,current:0,phase:'reinforce',winner:null,victoryType:null,log:[],campaign:{complete:true,players:Array.from({length:players},()=>({rolls:0,conquests:0,lost:0,defeated:0,trades:0,cards:0})),conquests:[]},pendingReinforcements:0,reinforcementHistory:[],attackMadeThisTurn:false,probeUsedThisTurn:false,conqueredThisTurn:false,turnConquests:{},blockedConnections:[],sabotagedTerritories:{},spiedTerritories:{},reconTerritories:{},pendingReactions:[],reactionSequence:0,extraFortifies:0,pendingCardDraw:null,tempDefense:{},fronts:{},objectiveCycle:0,announcedEvent:null,activeEvent:null,
    players:Array.from({length:players},(_,i)=>({id:i,name:human&&i===0?'Tú':PLAYER_NAMES[i]||`Ejército ${i+1}`,color:playerColors[i%playerColors.length],human:human&&i===0,commander:pCommanders[i],alive:true,cards:pCommanders[i]==='spy'?['spy']:pCommanders[i]==='strategist'?['mobilize']:[],money:0,lastIncomeRound:0,completedObjectives:[],mainObjectiveResolved:false,temporaryObjectiveResolvedCycle:-1,eliminatedRivals:0,influence:0,objectiveStats:{cardTypes:[],fortifiedTroops:0,moneySpent:0,intelConquests:0},objectiveCycleStats:{cardTypes:[],fortifiedTroops:0,moneySpent:0,intelConquests:0,startTerritories:0}})),territories:{},rngState:Math.floor(rng()*0xffffffff)};
  state.market=generateMarket(state,0);
  order.forEach((id,i)=>state.territories[id]={owner:i%players,troops:1,unitType:['infantry','artillery','cavalry'][i%3]});
  const reserves=Math.max(8,14-Math.floor(map.territories.length/players));state.players.forEach(p=>{const owned=order.filter(id=>state.territories[id].owner===p.id);for(let k=0;k<reserves;k++)state.territories[owned[k%owned.length]].troops++});
  for(let i=0;i<players;i++)for(let j=i+1;j<players;j++)for(const region of Object.keys(REGIONS))state.fronts[frontKey(i,j,region)]={state:'stable',lastHostilityTurn:0,battlesThisTurn:0};
  state.players.forEach(p=>{p.objectiveCycleStats.startTerritories=ownedIds(state,p.id).length;assignPlayerObjectives(state,p);p.influence=calculateInfluence(state,p.id)});
  state.pendingReinforcements=reinforcementCount(state,0);addLog(state,`Campaña iniciada en ${map.name}.`,0);collectIncome(state,0);return state;
}
export const ownedIds=(s,p)=>getTerritories(s).filter(t=>s.territories[t.id].owner===p).map(t=>t.id);
export const enemiesOf=(s,id)=>terr(s,id).n.filter(n=>s.territories[n].owner!==s.territories[id].owner&&!isConnectionBlocked(s,id,n));
export const alliesOf=(s,id)=>terr(s,id).n.filter(n=>s.territories[n].owner===s.territories[id].owner&&!isConnectionBlocked(s,id,n));

export const VISIBILITY_LEVELS=['full','partial','hidden'];
export function approximateTroops(troops){
  if(troops<=2)return '1-2';
  if(troops<=5)return '3-5';
  if(troops<=9)return '6-9';
  return '10+';
}
export function minDistanceToOwned(state,tid,pid){
  if(state.territories[tid]?.owner===pid)return 0;
  const myTerrs=ownedIds(state,pid);
  if(!myTerrs.length)return Infinity;
  const dist=new Map();
  const q=[];
  for(const id of myTerrs){dist.set(id,0);q.push(id)}
  while(q.length){
    const curr=q.shift();
    const d=dist.get(curr);
    if(curr===tid)return d;
    for(const neighbor of terr(state,curr).n){
      if(!dist.has(neighbor)){
        dist.set(neighbor,d+1);
        q.push(neighbor);
      }
    }
  }
  return dist.get(tid)??Infinity;
}
export function isTerritorySpied(state,tid,pid=0){
  const s=state?.spiedTerritories?.[tid];
  if(!s)return false;
  const exp=typeof s==='object'?s.expiresTurn:s;
  const spiedBy=typeof s==='object'?s.spiedBy:undefined;
  if(exp<state.turn)return false;
  if(spiedBy!==undefined&&spiedBy!==pid)return false;
  return true;
}
export function isTerritoryReconnoitered(state,tid,pid=0){
  const data=state?.reconTerritories?.[tid];
  if(!data||data.expiresTurn<state.turn||data.scoutedBy!==pid)return false;
  return true;
}
export function getTerritoryVisibility(state,tid,observerId=0,difficulty='normal'){
  if(!state?.territories?.[tid])return 'hidden';
  if(state.territories[tid].owner===observerId)return 'full';
  if(isTerritorySpied(state,tid,observerId)||isTerritoryReconnoitered(state,tid,observerId))return 'full';
  const d=minDistanceToOwned(state,tid,observerId);
  const isObserverHuman=state.players[observerId]?.human;
  if(isObserverHuman||difficulty==='normal'){
    if(d<=2)return 'partial';
    return 'hidden';
  }
  if(difficulty==='fácil'){
    if(d<=1)return 'partial';
    return 'hidden';
  }
  if(difficulty==='difícil')return d<=2?'partial':'hidden';
  return d<=2?'partial':'hidden';
}
export function getTerritoryIntel(state,tid,observerId=0,difficulty='normal'){
  const vis=getTerritoryVisibility(state,tid,observerId,difficulty);
  const t=terr(state,tid);
  const d=state.territories[tid];
  if(!t||!d)return null;
  const owner=d.owner;
  const isSpied=isTerritorySpied(state,tid,observerId);
  const isScouted=isTerritoryReconnoitered(state,tid,observerId);
  if(vis==='full'){
    return{visibility:'full',owner,troops:d.troops,troopsDisplay:String(d.troops),unitType:d.unitType,production:territoryProduction(state,tid),isSabotaged:state.sabotagedTerritories?.[tid]>=state.turn,isSpied,isScouted};
  }
  if(vis==='partial'){
    return{visibility:'partial',owner,troops:null,troopsDisplay:approximateTroops(d.troops),unitType:null,production:null,isSabotaged:state.sabotagedTerritories?.[tid]>=state.turn,isSpied:false,isScouted:false};
  }
  return{visibility:'hidden',owner,troops:null,troopsDisplay:'?',unitType:null,production:null,isSabotaged:null,isSpied:false,isScouted:false};
}
export function territoryProduction(state,id,pid=state.territories[id]?.owner){
  const t=terr(state,id);
  if(!t||state.territories[id]?.owner!==pid)return 0;
  const region=getTerritories(state).filter(x=>x.region===t.region);
  const owned=region.filter(x=>state.territories[x.id].owner===pid).length;
  const base=state.players[pid]?.commander==='industrial'?2:1;
  let prod=base+(owned*2>=region.length?1:0)+(owned===region.length?2:0);
  if(state.sabotagedTerritories?.[id]&&state.sabotagedTerritories[id]>=state.turn){
    prod=Math.floor(prod/2);
  }
  return prod;
}
export function productionTotal(state,pid){return ownedIds(state,pid).reduce((total,id)=>total+territoryProduction(state,id,pid),0)}
export function collectIncome(state,pid=state.current){
  const player=state.players[pid];
  if(!player?.alive||player.lastIncomeRound===state.turn)return 0;
  const amount=productionTotal(state,pid);
  player.money+=amount;player.lastIncomeRound=state.turn;
  addLog(state,`${player.name} recibió $${amount} de producción.`,pid);
  return amount;
}
export const TACTICAL_CARDS={
  spy:{id:'spy',name:'Espía',cost:0,duration:1,type:'territory',icon:'👁',desc:'Revela información completa de un territorio durante 1 ronda.'},
  sabotage:{id:'sabotage',name:'Sabotaje',cost:15,duration:2,type:'territory',icon:'⚡',desc:'Reduce a la mitad la producción de un territorio enemigo durante 2 rondas.'},
  blockade:{id:'blockade',name:'Bloqueo',cost:25,duration:2,type:'connection',icon:'⛔',desc:'Cierra una conexión durante 2 rondas.'},
  mobilize:{id:'mobilize',name:'Movilización',cost:10,duration:0,type:'self',icon:'🚀',desc:'Permite una segunda operación de movimiento este turno.'},
  counter:{id:'counter',name:'Contrainteligencia',cost:0,duration:0,type:'reaction',icon:'🛡',desc:'Cuando recibes Espía o Sabotaje, eliges si descartarla para anular el efecto.'}
};
export function tacticalCardCost(state,cardId,pid=state.current){
  const card=TACTICAL_CARDS[cardId];
  if(!card)return Infinity;
  if(state.players[pid]?.commander==='strategist'&&(cardId==='blockade'||cardId==='mobilize'))return Math.max(0,card.cost-10);
  return card.cost;
}

export const connectionKey=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
export function isConnectionBlocked(state,a,b){
  if(!state?.blockedConnections?.length)return false;
  const key=connectionKey(a,b);
  return state.blockedConnections.some(b=>connectionKey(b.a,b.b)===key&&b.expiresTurn>=state.turn);
}
export function cleanExpiredEffects(state){
  if(state.blockedConnections){
    state.blockedConnections=state.blockedConnections.filter(b=>b.expiresTurn>=state.turn);
  }
  if(state.sabotagedTerritories){
    for(const[tid,exp]of Object.entries(state.sabotagedTerritories)){
      if(exp<state.turn)delete state.sabotagedTerritories[tid];
    }
  }
  if(state.spiedTerritories){
    for(const[tid,data]of Object.entries(state.spiedTerritories)){
      const exp=typeof data==='object'?data.expiresTurn:data;
      if(exp<state.turn)delete state.spiedTerritories[tid];
    }
  }
  if(state.reconTerritories){
    for(const[tid,data]of Object.entries(state.reconTerritories))if(data.expiresTurn<state.turn)delete state.reconTerritories[tid];
  }
  if(state.tempDefense){
    for(const[pid,exp]of Object.entries(state.tempDefense)){
      if(exp<state.turn)delete state.tempDefense[pid];
    }
  }
}

export const MARKET_CATALOG=[
  {id:'troops_3',name:'+3 Tropas',cost:30,type:'troops',value:3,icon:'🎖',desc:'Añade 3 refuerzos inmediatos a tu reserva.'},
  {id:'troops_5',name:'+5 Batallón',cost:45,type:'troops',value:5,icon:'⚔️',desc:'Añade 5 refuerzos inmediatos a tu reserva.'},
  {id:'card_spy',name:'Carta de Espía',cost:35,type:'card',cardId:'spy',icon:'👁',desc:'Añade una carta de Espía a tu mano.'},
  {id:'card_sabotage',name:'Carta de Sabotaje',cost:35,type:'card',cardId:'sabotage',icon:'⚡',desc:'Añade una carta de Sabotaje a tu mano.'},
  {id:'card_blockade',name:'Carta de Bloqueo',cost:35,type:'card',cardId:'blockade',icon:'⛔',desc:'Añade una carta de Bloqueo a tu mano.'},
  {id:'card_mobilize',name:'Carta de Movilización',cost:45,type:'card',cardId:'mobilize',icon:'🚀',desc:'Añade una carta de Movilización a tu mano.'},
  {id:'card_counter',name:'Contrainteligencia',cost:30,type:'card',cardId:'counter',icon:'🛡',desc:'Añade una carta de Contrainteligencia a tu mano.'},
  {id:'temp_defense',name:'Defensa Temporal',cost:40,type:'defense',icon:'🏰',desc:'+1 al dado defensivo mayor durante esta ronda.'}
];

export function generateMarket(state,cycle=Math.floor((state.turn-1)/3)){
  const pool=[...MARKET_CATALOG];
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(nextRand(state)*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  const count=3+Math.floor(nextRand(state)*2);
  const offers=pool.slice(0,count).map(item=>({...item,boughtBy:[]}));
  return{cycle,offers};
}

export function buyMarketItem(state,offerId,pid=state.current){
  const p=state.players[pid];
  if(state.phase!=='reinforce'||state.current!==pid||!p?.alive)return{ok:false,reason:'Solo se puede comprar en Reclutamiento durante tu turno'};
  if(!state.market?.offers)return{ok:false,reason:'No hay ofertas disponibles'};
  const offer=state.market.offers.find(o=>o.id===offerId);
  if(!offer)return{ok:false,reason:'Oferta no encontrada'};
  offer.boughtBy=offer.boughtBy||[];
  if(offer.boughtBy.includes(pid))return{ok:false,reason:'Ya has adquirido esta oferta en este ciclo'};
  const discount=p.commander==='strategist'?5:0;const actualCost=Math.max(5,offer.cost-discount);if(p.money<actualCost)return{ok:false,reason:`Fondos insuficientes (cuesta $${actualCost})`};
  if(offer.type==='card'&&p.cards.length>=3)return{ok:false,reason:'Mano llena: máximo 3 cartas'};

  p.money-=actualCost;
  recordObjectiveAction(state,pid,{spent:actualCost});
  offer.boughtBy.push(pid);
  if(offer.type==='troops'){
    state.reinforcementHistory=[];
    state.pendingReinforcements+=offer.value;
    addLog(state,`${p.name} adquirió ${offer.name} en el Mercado por $${actualCost}: +${offer.value} a la reserva.`,pid);
  }else if(offer.type==='card'){
    p.cards.push(offer.cardId);
    if(state.campaign)state.campaign.players[pid].cards++;
    addLog(state,`${p.name} compró ${offer.name} en el Mercado.`,pid);
  }else if(offer.type==='defense'){
    state.tempDefense=state.tempDefense||{};
    state.tempDefense[pid]=state.turn;
    addLog(state,`${p.name} activó Defensa Temporal del Mercado.`,pid);
  }
  checkObjectives(state,pid);
  return{ok:true,offer};
}

export function buyReinforcements(state,pid=state.current){
  const player=state.players[pid];
  if(state.phase!=='reinforce'||state.current!==pid||!player?.alive||player.money<10||player.reinforcementsBoughtRound===state.turn)return false;
  player.money-=10;recordObjectiveAction(state,pid,{spent:10});state.reinforcementHistory=[];state.pendingReinforcements+=3;
  player.reinforcementsBoughtRound=state.turn;
  addLog(state,`${player.name} realizó la compra básica: +3 refuerzos por $10.`,pid);
  checkObjectives(state,pid);
  return true;
}
export const OBJECTIVES_CATALOG=[
  {id:'regional_network',kind:'main',path:'position',name:'Red Continental',value:18,icon:'🗺️',desc:'Mantén al menos 3 territorios en 4 regiones distintas.'},
  {id:'tactical_doctrine',kind:'main',path:'tactics',name:'Doctrina Combinada',value:18,icon:'🃏',desc:'Juega 3 tipos distintos de Carta Táctica durante la campaña.'},
  {id:'logistics_12',kind:'main',path:'logistics',name:'Red Logística',value:18,icon:'🚚',desc:'Mueve 12 tropas mediante Maniobras durante la campaña.'},
  {id:'investment_60',kind:'main',path:'economy',name:'Inversión Estratégica',value:18,icon:'⚙️',desc:'Invierte $60 en tropas, Mercado o Cartas durante la campaña.'},
  {id:'conquer_2',kind:'temporary',path:'offense',name:'Ofensiva Relámpago',value:10,icon:'⚡',desc:'Conquista 2 territorios en un mismo turno.'},
  {id:'intel_strike',kind:'temporary',path:'intelligence',name:'Golpe de Inteligencia',value:10,icon:'👁',desc:'Conquista un territorio que hayas revelado con Espía.'},
  {id:'fortify_6',kind:'temporary',path:'logistics',name:'Repliegue Coordinado',value:10,icon:'↔️',desc:'Mueve 6 tropas mediante Maniobras durante este ciclo.'},
  {id:'spend_20',kind:'temporary',path:'economy',name:'Operación Financiada',value:10,icon:'💰',desc:'Invierte $20 en tropas, Mercado o Cartas durante este ciclo.'},
  {id:'frontline_3',kind:'temporary',path:'defense',name:'Línea Fortificada',value:10,icon:'🛡️',desc:'Mantén 3 territorios fronterizos con al menos 4 tropas cada uno.'},
  {id:'recover_2',kind:'temporary',path:'recovery',name:'Contraofensiva',value:10,icon:'🔥',desc:'Termina el ciclo con 2 territorios más que al comenzar.'}
];
const LEGACY_OBJECTIVE_VALUES={regions_2:15,territories_8:10,territories_12:15,treasury_50:10,eliminate_rival:15};
const MAIN_OBJECTIVES=OBJECTIVES_CATALOG.filter(o=>o.kind==='main').map(o=>o.id);
const TEMP_OBJECTIVES=OBJECTIVES_CATALOG.filter(o=>o.kind==='temporary').map(o=>o.id);
function ensureObjectiveStats(state,p){
  p.temporaryObjectiveResolvedCycle=Number.isFinite(p.temporaryObjectiveResolvedCycle)?p.temporaryObjectiveResolvedCycle:-1;
  p.objectiveStats=p.objectiveStats||{};
  p.objectiveStats.cardTypes=Array.isArray(p.objectiveStats.cardTypes)?p.objectiveStats.cardTypes:[];
  p.objectiveStats.fortifiedTroops=p.objectiveStats.fortifiedTroops||0;
  p.objectiveStats.moneySpent=p.objectiveStats.moneySpent||0;
  p.objectiveStats.intelConquests=p.objectiveStats.intelConquests||0;
  p.objectiveCycleStats=p.objectiveCycleStats||{};
  p.objectiveCycleStats.cardTypes=Array.isArray(p.objectiveCycleStats.cardTypes)?p.objectiveCycleStats.cardTypes:[];
  p.objectiveCycleStats.fortifiedTroops=p.objectiveCycleStats.fortifiedTroops||0;
  p.objectiveCycleStats.moneySpent=p.objectiveCycleStats.moneySpent||0;
  p.objectiveCycleStats.intelConquests=p.objectiveCycleStats.intelConquests||0;
  p.objectiveCycleStats.startTerritories=Number.isFinite(p.objectiveCycleStats.startTerritories)?p.objectiveCycleStats.startTerritories:ownedIds(state,p.id).length;
  p.objectiveChoices=p.objectiveChoices||{main:[],temporary:[]};
}
function objectiveChoices(pool,p,start=0,count=3){
  const choices=[];
  for(let i=0;i<pool.length&&choices.length<count;i++){
    const id=pool[(start+i)%pool.length];
    if(!p.completedObjectives?.includes(id))choices.push(id);
  }
  return choices;
}
function aiObjectiveChoice(state,p,choices){
  const preferred={conqueror:'offense',guardian:'defense',industrial:'economy',strategist:'logistics',spy:'intelligence',diplomat:'position'}[p.commander];
  return choices.find(id=>OBJECTIVES_CATALOG.find(o=>o.id===id)?.path===preferred)||choices[0]||null;
}
export function assignPlayerObjectives(state,p,cycle=state.objectiveCycle||0){
  p.completedObjectives=p.completedObjectives||[];
  ensureObjectiveStats(state,p);
  if(!p.mainObjective&&!p.mainObjectiveResolved){
    if(!p.objectiveChoices.main.length)p.objectiveChoices.main=objectiveChoices(MAIN_OBJECTIVES,p,(state.seed+p.id)%MAIN_OBJECTIVES.length);
    if(!p.human)p.mainObjective=aiObjectiveChoice(state,p,p.objectiveChoices.main);
  }
  if(!p.temporaryObjective&&p.temporaryObjectiveResolvedCycle!==cycle&&!TEMP_OBJECTIVES.every(id=>p.completedObjectives.includes(id))){
    if(!p.objectiveChoices.temporary.length)p.objectiveChoices.temporary=objectiveChoices(TEMP_OBJECTIVES,p,(state.seed+p.id+cycle)%TEMP_OBJECTIVES.length);
    if(!p.human)p.temporaryObjective=aiObjectiveChoice(state,p,p.objectiveChoices.temporary);
  }
}
export function chooseObjective(state,pid,kind,objectiveId){
  const p=state?.players?.[pid];
  if(!p?.alive||!['main','temporary'].includes(kind))return{ok:false,reason:'Jugador u objetivo inválido'};
  assignPlayerObjectives(state,p);
  const slot=kind==='main'?'mainObjective':'temporaryObjective';
  if(kind==='temporary'&&p.temporaryObjectiveResolvedCycle===(state.objectiveCycle||0))return{ok:false,reason:'Ya completaste una misión en este ciclo'};
  if(p[slot])return{ok:false,reason:'Ya tienes un objetivo activo de este tipo'};
  const choices=p.objectiveChoices?.[kind]||[];
  if(!choices.includes(objectiveId))return{ok:false,reason:'Ese objetivo no está entre las opciones disponibles'};
  p[slot]=objectiveId;
  p.objectiveChoices[kind]=[];
  addLog(state,`${p.name} eligió el objetivo ${OBJECTIVES_CATALOG.find(o=>o.id===objectiveId)?.name||objectiveId}.`,pid);
  checkObjectives(state,pid);
  return{ok:true,objectiveId};
}
export function rotateTemporaryObjectives(state,cycle=Math.floor((state.turn-1)/3)){
  if(state.objectiveCycle===cycle)return;
  state.objectiveCycle=cycle;
  state.players.forEach(p=>{if(p.alive){ensureObjectiveStats(state,p);p.temporaryObjective=null;p.objectiveChoices.temporary=[];p.objectiveCycleStats={cardTypes:[],fortifiedTroops:0,moneySpent:0,intelConquests:0,startTerritories:ownedIds(state,p.id).length};assignPlayerObjectives(state,p,cycle)}});
  addLog(state,'Los objetivos temporales han rotado para la nueva etapa de campaña.');
}

export function objectiveProgress(state,pid,objectiveId){
  const p=state?.players?.[pid],stats=p?.objectiveStats||{},cycle=p?.objectiveCycleStats||{};
  if(!p)return{current:0,target:1,label:'0/1',complete:false};
  const terrs=ownedIds(state,pid);
  const regionCounts=terrs.reduce((counts,id)=>{const region=terr(state,id).region;counts[region]=(counts[region]||0)+1;return counts},{});
  const networkRegions=Object.values(regionCounts).filter(count=>count>=3).length;
  const borderStrong=terrs.filter(id=>state.territories[id].troops>=4&&enemiesOf(state,id).length>0).length;
  const values={
    regional_network:[networkRegions,4],tactical_doctrine:[stats.cardTypes?.length||0,3],logistics_12:[stats.fortifiedTroops||0,12],investment_60:[stats.moneySpent||0,60],
    conquer_2:[state.turnConquests?.[pid]||0,2],intel_strike:[cycle.intelConquests||0,1],fortify_6:[cycle.fortifiedTroops||0,6],spend_20:[cycle.moneySpent||0,20],frontline_3:[borderStrong,3],recover_2:[Math.max(0,terrs.length-(cycle.startTerritories??terrs.length)),2]
  };
  const[current,target]=values[objectiveId]||[0,1];
  const money=objectiveId==='investment_60'||objectiveId==='spend_20';
  return{current:Math.min(current,target),raw:current,target,label:money?`$${Math.min(current,target)}/$${target}`:`${Math.min(current,target)}/${target}`,complete:current>=target};
}

function recordObjectiveAction(state,pid,{cardId=null,fortified=0,spent=0,intelConquest=0}={}){
  const p=state.players[pid];if(!p)return;
  ensureObjectiveStats(state,p);
  if(cardId){if(!p.objectiveStats.cardTypes.includes(cardId))p.objectiveStats.cardTypes.push(cardId);if(!p.objectiveCycleStats.cardTypes.includes(cardId))p.objectiveCycleStats.cardTypes.push(cardId)}
  p.objectiveStats.fortifiedTroops+=fortified;p.objectiveCycleStats.fortifiedTroops+=fortified;
  p.objectiveStats.moneySpent+=spent;p.objectiveCycleStats.moneySpent+=spent;
  p.objectiveStats.intelConquests+=intelConquest;p.objectiveCycleStats.intelConquests+=intelConquest;
}

export function calculateInfluence(state,pid){
  return influenceBreakdown(state,pid).total;
}

export function influenceBreakdown(state,pid){
  const p=state?.players?.[pid];
  if(!p||!p.alive)return{territories:{count:0,capped:0,cap:8,points:0},regions:{count:0,capped:0,cap:3,points:0},production:{value:0,points:0},troops:{count:0,capped:0,cap:0,points:0},objectives:{count:0,basePoints:0,multiplier:1,bonusPoints:0,points:0},total:0,target:INFLUENCE_TARGET,remaining:INFLUENCE_TARGET};
  const terrs=ownedIds(state,pid).length;
  let fullRegions=0;
  for(const[key]of Object.entries(REGIONS)){
    const regTerrs=getTerritories(state).filter(t=>t.region===key);
    if(regTerrs.length&&regTerrs.every(t=>state.territories[t.id].owner===pid))fullRegions++;
  }
  const prod=productionTotal(state,pid);
  const totalTroops=ownedIds(state,pid).reduce((s,id)=>s+state.territories[id].troops,0);
  const completedObjectives=p.completedObjectives||[];
  const objectivesBase=completedObjectives.reduce((sum,objId)=>{
    const obj=OBJECTIVES_CATALOG.find(o=>o.id===objId);
    return sum+(obj?obj.value:(LEGACY_OBJECTIVE_VALUES[objId]||0));
  },0);
  const objectiveMultiplier=p.commander==='diplomat'?1.4:1;
  const objectivesValue=Math.round(objectivesBase*objectiveMultiplier*10)/10;
  const objectiveBonus=Math.round((objectivesValue-objectivesBase)*10)/10;
  const territoryPoints=Math.min(terrs,8);
  const regionPoints=Math.min(fullRegions,3)*3;
  const total=Math.round((territoryPoints+regionPoints+objectivesValue)*10)/10;
  return{
    territories:{count:terrs,capped:Math.min(terrs,8),cap:8,points:territoryPoints},
    regions:{count:fullRegions,capped:Math.min(fullRegions,3),cap:3,points:regionPoints},
    production:{value:prod,points:0},
    troops:{count:totalTroops,capped:0,cap:0,points:0},
    objectives:{count:completedObjectives.length,basePoints:objectivesBase,multiplier:objectiveMultiplier,bonusPoints:objectiveBonus,points:objectivesValue},
    total,target:INFLUENCE_TARGET,remaining:Math.max(0,Math.round((INFLUENCE_TARGET-total)*10)/10)
  };
}

export function checkObjectives(state,pid){
  const p=state?.players?.[pid];
  if(!p||!p.alive)return[];
  p.completedObjectives=p.completedObjectives||[];
  const newlyCompleted=[];
  const terrs=ownedIds(state,pid).length;

  let fullRegions=0;
  for(const[key]of Object.entries(REGIONS)){
    const regTerrs=getTerritories(state).filter(t=>t.region===key);
    if(regTerrs.length&&regTerrs.every(t=>state.territories[t.id].owner===pid))fullRegions++;
  }

  assignPlayerObjectives(state,p);
  const achieved=Object.fromEntries(OBJECTIVES_CATALOG.map(obj=>[obj.id,objectiveProgress(state,pid,obj.id).complete]));
  for(const slot of ['mainObjective','temporaryObjective']){
    const id=p[slot];
    if(id&&!p.completedObjectives.includes(id)&&achieved[id]){p.completedObjectives.push(id);newlyCompleted.push(id);p[slot]=null;if(slot==='mainObjective')p.mainObjectiveResolved=true;else{p.temporaryObjectiveResolvedCycle=state.objectiveCycle||0;p.objectiveChoices.temporary=[]}}
  }

  newlyCompleted.forEach(objId=>{
    const obj=OBJECTIVES_CATALOG.find(o=>o.id===objId);
    if(obj)addLog(state,`¡${p.name} cumplió el objetivo ${obj.name} (+${obj.value} Influencia)!`,pid);
  });
  assignPlayerObjectives(state,p);

  p.influence=calculateInfluence(state,pid);
  return newlyCompleted;
}

export function upgradeGame(state){
  if(!state)return null;
  if(state.version===12){
    state.reinforcementHistory=Array.isArray(state.reinforcementHistory)?state.reinforcementHistory:[];
    state.reconTerritories=state.reconTerritories||{};state.pendingReactions=state.pendingReactions||[];state.reactionSequence=state.reactionSequence||0;state.probeUsedThisTurn=!!state.probeUsedThisTurn;
    state.players.forEach(p=>{ensureObjectiveStats(state,p);assignPlayerObjectives(state,p);p.influence=calculateInfluence(state,p.id)});
    if(state.rulesMode!=='terrain')clearTerrainEvents(state);
    return state;
  }
  if(![3,4,5,6,7,8,9,10,11].includes(state.version))return null;
  if(state.version===3){
    state.players.forEach(p=>{p.money=0;p.lastIncomeRound=0});
  }
  const pool=Object.keys(TACTICAL_CARDS);
  state.players.forEach(p=>{
    if(typeof p.cards==='number'){
      const count=Math.min(3,p.cards);
      p.cards=pool.slice(0,count);
    }else if(!Array.isArray(p.cards)){
      p.cards=[];
    }
  });
  state.blockedConnections=state.blockedConnections||[];
  state.sabotagedTerritories=state.sabotagedTerritories||{};
  state.spiedTerritories=state.spiedTerritories||{};
  state.reconTerritories=state.reconTerritories||{};
  state.pendingReactions=state.pendingReactions||[];
  state.reactionSequence=state.reactionSequence||0;
  state.probeUsedThisTurn=!!state.probeUsedThisTurn;
  state.extraFortifies=state.extraFortifies||0;
  state.reinforcementHistory=[];
  state.pendingCardDraw=null;
  delete state.cardTradeLevel;
  state.tempDefense=state.tempDefense||{};
  if(!state.market||!state.market.offers){
    state.market=generateMarket(state,Math.floor((state.turn-1)/3));
  }
  state.victoryType=state.victoryType||(state.winner!==null?'dominance':null);
  state.turnConquests=state.turnConquests||{};
  state.objectiveCycle=state.objectiveCycle??Math.floor((state.turn-1)/3);
  const legacyFronts=state.fronts||{};
  state.fronts={};
  const numP=state.players.length;
  for(let i=0;i<numP;i++)for(let j=i+1;j<numP;j++)for(const region of Object.keys(REGIONS)){
    const legacy=legacyFronts[`${i}-${j}`]||legacyFronts[`${j}-${i}`];
    state.fronts[frontKey(i,j,region)]={...(legacy||{state:'stable',lastHostilityTurn:0,battlesThisTurn:0})};
  }
  state.players.forEach((p,i)=>{
    p.completedObjectives=p.completedObjectives||[];
    p.mainObjective=OBJECTIVES_CATALOG.some(o=>o.id===p.mainObjective&&o.kind==='main')?p.mainObjective:null;
    p.mainObjectiveResolved=p.mainObjectiveResolved??(!p.mainObjective&&MAIN_OBJECTIVES.some(id=>p.completedObjectives.includes(id)));
    p.temporaryObjective=OBJECTIVES_CATALOG.some(o=>o.id===p.temporaryObjective&&o.kind==='temporary')?p.temporaryObjective:null;
    p.eliminatedRivals=p.eliminatedRivals||0;
    if(!p.commander||!COMMANDERS[p.commander]){
      p.commander=COMMANDER_IDS[i%COMMANDER_IDS.length];
    }
    ensureObjectiveStats(state,p);
    assignPlayerObjectives(state,p);
    p.influence=calculateInfluence(state,p.id);
  });
  state.announcedEvent=state.announcedEvent||null;
  state.activeEvent=state.activeEvent||null;
  if(state.rulesMode!=='terrain')clearTerrainEvents(state);
  state.version=12;
  if(state.winner===null&&state.players[state.current]?.lastIncomeRound===0)collectIncome(state,state.current);
  return state;
}
export function reinforcementCount(state,pid){const count=ownedIds(state,pid).length;if(!count)return 0;const emergency=count<=3?1:0;let total=Math.max(3,Math.floor(count/3))+emergency;for(const[key,r]of Object.entries(REGIONS)){const ids=getTerritories(state).filter(t=>t.region===key).map(t=>t.id);if(ids.length&&ids.every(id=>state.territories[id].owner===pid))total+=r.bonus}return total}
export function canPlayerAttack(state,pid=state.current){return ownedIds(state,pid).some(id=>state.territories[id].troops>=2&&enemiesOf(state,id).length>0)}
export function tradeCards(state,pid=state.current){return{ok:false,bonus:0}}
export function placeTroops(state,id,amount=1,unitType=null){if(state.phase!=='reinforce'||state.pendingReinforcements<amount||state.territories[id]?.owner!==state.current||amount<1)return false;state.reinforcementHistory=Array.isArray(state.reinforcementHistory)?state.reinforcementHistory:[];const territory=state.territories[id];state.reinforcementHistory.push({id,amount,unitTypeBefore:territory.unitType});territory.troops+=amount;if(state.rulesMode==='terrain'&&UNIT_TYPES[unitType])territory.unitType=unitType;state.pendingReinforcements-=amount;return true}
export function undoReinforcement(state){if(state.phase!=='reinforce'||!Array.isArray(state.reinforcementHistory)||!state.reinforcementHistory.length)return false;const action=state.reinforcementHistory.pop(),territory=state.territories[action.id];if(!territory||territory.owner!==state.current||territory.troops-action.amount<1){state.reinforcementHistory.push(action);return false}territory.troops-=action.amount;territory.unitType=action.unitTypeBefore;state.pendingReinforcements+=action.amount;return{ok:true,...action}}
export function finishReinforcement(state){if(state.phase!=='reinforce'||state.pendingReinforcements!==0)return false;state.reinforcementHistory=[];state.phase='attack';addLog(state,'Refuerzos desplegados. Comienza el combate.',state.current);return true}
function nextRand(s){s.rngState=(Math.imul(1664525,s.rngState)+1013904223)>>>0;return s.rngState/4294967296}
function roll(s,n){return Array.from({length:n},()=>1+Math.floor(nextRand(s)*6)).sort((a,b)=>b-a)}
function addLog(s,text,p=null){s.log.unshift({text,p,turn:s.turn});if(s.log.length>60)s.log.length=60}

function clearTerrainEvents(state){
  const active=state.activeEvent;
  if(active?.type==='tempest'&&state.sabotagedTerritories){
    for(const t of getTerritories(state).filter(t=>t.region===active.region)){
      if(state.sabotagedTerritories[t.id]===active.expiresRound)delete state.sabotagedTerritories[t.id];
    }
  }
  state.blockedConnections=(state.blockedConnections||[]).filter(connection=>!EVENT_IDS.includes(connection.cause));
  state.announcedEvent=null;
  state.activeEvent=null;
}

export function announceEvent(state,type=null,region=null,triggerRound=state.turn+1){
  if(state.rulesMode!=='terrain')return null;
  if(state.activeEvent||state.announcedEvent)return null;
  const types=EVENT_IDS;
  const chosenType=type&&EVENT_CATALOG[type]?type:types[Math.floor(nextRand(state)*types.length)];
  let chosenRegion=region;
  if(!chosenRegion||!REGIONS[chosenRegion]){
    if(chosenType==='tsunami'){
      chosenRegion='isles';
    }else if(chosenType==='earthquake'){
      const eqRegions=['north','west','crown','ember','sun'];
      chosenRegion=eqRegions[Math.floor(nextRand(state)*eqRegions.length)];
    }else{
      const allRegs=Object.keys(REGIONS);
      chosenRegion=allRegs[Math.floor(nextRand(state)*allRegs.length)];
    }
  }
  const def=EVENT_CATALOG[chosenType];
  state.announcedEvent={
    type:chosenType,
    region:chosenRegion,
    announceRound:state.turn,
    triggerRound,
    duration:def.duration
  };
  addLog(state,`⚠️ ¡Alerta geológica! Se predice un ${def.name} en ${getRegion(state,chosenRegion).name} para la ronda ${triggerRound}.`);
  return state.announcedEvent;
}

export function triggerEvent(state,event=state.announcedEvent){
  if(state.rulesMode!=='terrain')return null;
  if(!event||!EVENT_CATALOG[event.type])return null;
  const def=EVENT_CATALOG[event.type];
  const affectedTerrs=getTerritories(state).filter(t=>t.region===event.region);
  
  let casualties=0;
  for(const t of affectedTerrs){
    if(state.territories[t.id].troops>1){
      state.territories[t.id].troops--;
      casualties++;
    }
  }

  state.blockedConnections=state.blockedConnections||[];
  const candidateEdges=[];
  for(const t of affectedTerrs){
    for(const n of t.n){
      if(!isConnectionBlocked(state,t.id,n)){
        candidateEdges.push([t.id,n]);
      }
    }
  }
  const blockedList=[];
  if(candidateEdges.length>0){
    const numEdges=Math.min(candidateEdges.length,1+(candidateEdges.length>3?1:0));
    for(let i=0;i<numEdges;i++){
      const[a,b]=candidateEdges[i];
      if(!isConnectionBlocked(state,a,b)){
        state.blockedConnections.push({
          a,
          b,
          expiresTurn:state.turn+def.duration,
          cause:event.type
        });
        blockedList.push(`${terr(state,a).name} ↔ ${terr(state,b).name}`);
      }
    }
  }

  if(event.type==='tempest'){
    state.sabotagedTerritories=state.sabotagedTerritories||{};
    for(const t of affectedTerrs){
      state.sabotagedTerritories[t.id]=state.turn+def.duration;
    }
  }

  state.activeEvent={
    ...event,
    expiresRound:state.turn+def.duration,
    casualties,
    blockedRoutes:blockedList
  };
  state.announcedEvent=null;

  addLog(state,`¡${def.icon} ${def.name} golpea ${getRegion(state,event.region).name}! ${casualties} bajas y rutas cortadas.`);
  return state.activeEvent;
}

export function checkEventCycle(state){
  if(state.rulesMode!=='terrain'){
    clearTerrainEvents(state);
    return;
  }
  if(state.activeEvent){
    if(state.turn>=state.activeEvent.expiresRound){
      const def=EVENT_CATALOG[state.activeEvent.type];
      addLog(state,`El ${def?def.name:'evento'} en ${getRegion(state,state.activeEvent.region).name} ha concluido. Conexiones restauradas.`);
      state.activeEvent=null;
    }
  }

  if(state.announcedEvent){
    if(state.turn>=state.announcedEvent.triggerRound){
      triggerEvent(state,state.announcedEvent);
      return;
    }
  }

  if(!state.activeEvent&&!state.announcedEvent&&state.turn>=3&&(state.turn-3)%4===0){
    announceEvent(state);
  }
}
function battleBonuses(state,from,to,includeAttackDoctrine=true){
  const a=state.territories[from],d=state.territories[to],terrain=terr(state,to).terrain,ar=[],dr=[];
  let attackerBonus=0,defenderBonus=0;
  if(state.rulesMode==='terrain'){
    if(UNIT_TYPES[a.unitType].beats===d.unitType)ar.push(`${UNIT_TYPES[a.unitType].name} vence a ${UNIT_TYPES[d.unitType].name}`);
    if(UNIT_TYPES[d.unitType].beats===a.unitType)dr.push(`${UNIT_TYPES[d.unitType].name} vence a ${UNIT_TYPES[a.unitType].name}`);
    if(TERRAINS[terrain].unit===d.unitType)dr.push(`afinidad con ${TERRAINS[terrain].name.toLowerCase()}`);
    attackerBonus=ar.length?1:0;
    defenderBonus=dr.length?1:0;
  }
  if(state.tempDefense?.[d.owner]>=state.turn){
    defenderBonus+=1;
    dr.push('defensa temporal del mercado');
  }
  if(includeAttackDoctrine&&state.players[a.owner]?.commander==='conqueror'&&!state.attackMadeThisTurn){
    attackerBonus+=1;
    ar.push('doctrina El Conquistador (+1 primer ataque)');
  }if(includeAttackDoctrine&&state.players[a.owner]?.commander==='spy'&&isTerritorySpied(state,to,a.owner)){attackerBonus+=1;ar.push('doctrina El Espía (+1 ataque en objetivo espiado)');}
  if(state.players[d.owner]?.commander==='guardian'&&isTerritoryInWarFront(state,to)){
    defenderBonus+=1;
    dr.push('doctrina El Guardián (+1 defensa en frente en guerra)');
  }
  return{attacker:attackerBonus,defender:defenderBonus,attackerReasons:ar,defenderReasons:dr};
}
function applyBonus(dice,bonus){const out=[...dice];if(out.length)out[0]+=bonus;return out}
export function probeTerritory(state,from,to){
  const a=state.territories[from],d=state.territories[to];
  if(state.phase!=='attack'||state.probeUsedThisTurn||!a||!d||a.owner!==state.current||d.owner===a.owner||a.troops<2||!terr(state,from).n.includes(to)||isConnectionBlocked(state,from,to))return{ok:false,reason:state.probeUsedThisTurn?'Ya utilizaste el Sondeo este turno':'Sondeo inválido'};
  const attacker=a.owner,defender=d.owner,rawA=roll(state,1),rawD=roll(state,1),bonus=battleBonuses(state,from,to,false),ad=applyBonus(rawA,bonus.attacker),dd=applyBonus(rawD,bonus.defender);
  let al=0,dl=0;
  if(ad[0]>dd[0]){if(d.troops>1){d.troops--;dl=1}}else{a.troops--;al=1}
  state.probeUsedThisTurn=true;
  state.reconTerritories[to]={scoutedBy:attacker,expiresTurn:state.turn};
  updateFrontTension(state,attacker,defender,terr(state,to).region,'tense');
  if(state.campaign){state.campaign.players[attacker].rolls++;state.campaign.players[attacker].lost+=al;state.campaign.players[defender].lost+=dl}
  addLog(state,`${state.players[attacker].name} sondeó ${terr(state,to).name}: guarnición revelada${dl?' y 1 baja enemiga':al?' con 1 baja propia':' sin bajas'}.`,attacker);
  return{ok:true,probe:true,from,to,deployedTroops:1,defendingTroops:1,movedTroops:0,attackerDice:ad,defenderDice:dd,rawAttackerDice:rawA,rawDefenderDice:rawD,bonus,attackerLosses:al,defenderLosses:dl,conquered:false,eliminated:null,revealedTroops:d.troops};
}
export function attackRound(state,from,to,attackerDiceCount=null){const a=state.territories[from],d=state.territories[to];if(state.phase!=='attack'||!a||!d||a.owner!==state.current||d.owner===a.owner||a.troops<2||!terr(state,from).n.includes(to)||isConnectionBlocked(state,from,to))return{ok:false};const max=Math.min(3,a.troops-1),chosen=attackerDiceCount===null?max:Number(attackerDiceCount);if(!Number.isInteger(chosen)||chosen<1||chosen>max)return{ok:false};const attacker=a.owner,defender=d.owner,region=terr(state,to).region,rawA=roll(state,chosen),rawD=roll(state,Math.min(2,d.troops)),bonus=battleBonuses(state,from,to),ad=applyBonus(rawA,bonus.attacker),dd=applyBonus(rawD,bonus.defender);state.attackMadeThisTurn=true;updateFrontTension(state,attacker,defender,region,'conflict');let al=0,dl=0;for(let i=0;i<Math.min(ad.length,dd.length);i++){if(ad[i]>dd[i]){d.troops--;dl++}else{a.troops--;al++}}if(state.campaign){state.campaign.players[attacker].rolls++;state.campaign.players[attacker].lost+=al;state.campaign.players[defender].lost+=dl}let conquered=false,eliminated=null,movedTroops=0;if(d.troops<=0){const intelConquest=isTerritorySpied(state,to,attacker)?1:0;movedTroops=Math.max(1,Math.min(chosen,a.troops-1));d.owner=attacker;d.troops=movedTroops;d.unitType=a.unitType;a.troops-=movedTroops;conquered=true;state.conqueredThisTurn=true;state.turnConquests=state.turnConquests||{};state.turnConquests[attacker]=(state.turnConquests[attacker]||0)+1;recordObjectiveAction(state,attacker,{intelConquest});updateFrontTension(state,attacker,defender,region,'war');if(state.campaign){state.campaign.players[attacker].conquests++;state.campaign.conquests.push({turn:state.turn,attacker,defender,from,to})}addLog(state,`${terr(state,from).name} conquistó ${terr(state,to).name}.`,attacker);if(!ownedIds(state,defender).length){state.players[defender].alive=false;eliminated=defender;state.players[attacker].eliminatedRivals=(state.players[attacker].eliminatedRivals||0)+1;if(state.campaign)state.campaign.players[attacker].defeated++;if(Array.isArray(state.players[defender].cards)){for(const c of state.players[defender].cards){if(state.players[attacker].cards.length<3)state.players[attacker].cards.push(c)}state.players[defender].cards=[]}addLog(state,`${state.players[defender].name} fue eliminado.`,attacker)}checkObjectives(state,attacker);state.players[attacker].influence=calculateInfluence(state,attacker);checkWinner(state)}return{ok:true,from,to,deployedTroops:chosen,defendingTroops:rawD.length,movedTroops,attackerDice:ad,defenderDice:dd,rawAttackerDice:rawA,rawDefenderDice:rawD,bonus,attackerLosses:al,defenderLosses:dl,conquered,eliminated}}
export function blitz(state,from,to,maxRounds=50){const rounds=[];while(rounds.length<maxRounds&&state.winner===null&&state.territories[from]?.troops>1&&state.territories[to]?.owner!==state.current){const r=attackRound(state,from,to);if(!r.ok)break;rounds.push(r);if(r.conquered)break}return{ok:rounds.length>0,rounds,conquered:rounds.at(-1)?.conquered||false}}
function connectedOwned(state,start,target,pid){const q=[start],seen=new Set(q);while(q.length){const id=q.shift();if(id===target)return true;for(const n of terr(state,id).n)if(!seen.has(n)&&state.territories[n].owner===pid&&!isConnectionBlocked(state,id,n)){seen.add(n);q.push(n)}}return false}
export function fortify(state,from,to,amount){
  const a=state.territories[from],b=state.territories[to];
  if(state.phase!=='fortify'||!a||!b||a.owner!==state.current||b.owner!==state.current||amount<1||a.troops<=amount||!connectedOwned(state,from,to,state.current))return false;
  const before=b.troops;a.troops-=amount;b.troops+=amount;state.fortifiesUsedThisTurn=(state.fortifiesUsedThisTurn||0)+1;
  recordObjectiveAction(state,state.current,{fortified:amount});
  if(state.rulesMode==='terrain'&&amount>=before)b.unitType=a.unitType;
  if(state.extraFortifies>0){state.extraFortifies--;addLog(state,`${amount} unidades se movieron a ${terr(state,to).name}. Movilización activa: puedes realizar otra maniobra.`,state.current)}
  else{state.phase='close';addLog(state,`${amount} unidades se movieron a ${terr(state,to).name}.`,state.current)}
  checkObjectives(state,state.current);return true;
}
export function setPhase(state,phase){if(phase==='fortify'&&state.phase==='attack'){state.phase='fortify';return true}if(phase==='close'&&state.phase==='fortify'){state.phase='close';state.extraFortifies=0;if(state.conqueredThisTurn&&!state.cardDrawnThisTurn){drawTacticalCard(state,state.current);state.cardDrawnThisTurn=true}return true}return false}

function aiChooseDiscard(state,pid,newCard){
  const p=state.players[pid];
  for(let i=0;i<p.cards.length;i++){
    if(p.cards.filter(c=>c===p.cards[i]).length>1)return i;
    if(p.cards[i]===newCard)return i;
  }
  if(p.money<15){
    const bIdx=p.cards.indexOf('blockade');if(bIdx!==-1)return bIdx;
    const sIdx=p.cards.indexOf('sabotage');if(sIdx!==-1)return sIdx;
  }
  return 0;
}

export function drawTacticalCard(state,pid=state.current,chosenDiscard=null){
  const p=state.players[pid];
  if(!p?.alive)return null;
  const pool=Object.keys(TACTICAL_CARDS);
  const cardId=pool[Math.floor(nextRand(state)*pool.length)];
  if(state.campaign)state.campaign.players[pid].cards++;
  if(p.cards.length<3){
    p.cards.push(cardId);
    addLog(state,`${p.name} robó la carta táctica: ${TACTICAL_CARDS[cardId].name}.`,pid);
    return{card:cardId,discarded:null,pending:false};
  }
  if(!p.human){
    const discardIndex=aiChooseDiscard(state,pid,cardId);
    let discarded=cardId;
    if(discardIndex>=0&&discardIndex<p.cards.length){
      discarded=p.cards[discardIndex];
      p.cards.splice(discardIndex,1);
      p.cards.push(cardId);
    }
    addLog(state,`${p.name} robó ${TACTICAL_CARDS[cardId].name} y descartó ${TACTICAL_CARDS[discarded].name}.`,pid);
    return{card:cardId,discarded,pending:false};
  }else{
    if(chosenDiscard!==null){
      return resolvePendingCardDraw(state,chosenDiscard,cardId,pid);
    }
    state.pendingCardDraw={pid,card:cardId};
    return{card:cardId,discarded:null,pending:true};
  }
}

export function resolvePendingCardDraw(state,discardChoice,drawnCard=state.pendingCardDraw?.card,pid=state.pendingCardDraw?.pid??state.current){
  const p=state.players[pid];
  if(!p||!drawnCard)return{ok:false};
  let discarded=drawnCard;
  if(discardChoice!==drawnCard&&p.cards.includes(discardChoice)){
    const idx=p.cards.indexOf(discardChoice);
    discarded=p.cards[idx];
    p.cards.splice(idx,1);
    p.cards.push(drawnCard);
  }
  state.pendingCardDraw=null;
  addLog(state,`${p.name} robó ${TACTICAL_CARDS[drawnCard].name} y descartó ${TACTICAL_CARDS[discarded].name}.`,pid);
  return{ok:true,kept:drawnCard,discarded};
}

function applyHostileCardEffect(state,reaction){
  const cardDef=TACTICAL_CARDS[reaction.cardId];
  if(reaction.cardId==='spy'){
    state.spiedTerritories[reaction.target]={spiedBy:reaction.attackerId,expiresTurn:state.turn+cardDef.duration};
    addLog(state,`${state.players[reaction.attackerId].name} envió un Espía a ${terr(state,reaction.target).name}.`,reaction.attackerId);
  }else if(reaction.cardId==='sabotage'){
    state.sabotagedTerritories[reaction.target]=state.turn+cardDef.duration;
    addLog(state,`${state.players[reaction.attackerId].name} saboteó ${terr(state,reaction.target).name}.`,reaction.attackerId);
  }
}
function aiUsesCounter(state,reaction){
  if(reaction.cardId==='sabotage')return territoryProduction(state,reaction.target,reaction.defenderId)>=2;
  return state.territories[reaction.target].troops>=4||enemiesOf(state,reaction.target).some(id=>state.territories[id].owner===reaction.attackerId);
}
function offerCounterReaction(state,cardId,target,attackerId,defenderId){
  const defender=state.players[defenderId],reaction={id:++state.reactionSequence,cardId,target,attackerId,defenderId,createdTurn:state.turn};
  const counterIndex=defender.cards.indexOf('counter');
  if(counterIndex===-1){applyHostileCardEffect(state,reaction);return{pendingReaction:false,countered:false}}
  if(defender.human){state.pendingReactions.push(reaction);addLog(state,`${defender.name} puede responder con Contrainteligencia.`,defenderId);return{pendingReaction:true,countered:false,reactionId:reaction.id}}
  if(aiUsesCounter(state,reaction)){
    defender.cards.splice(counterIndex,1);recordObjectiveAction(state,defenderId,{cardId:'counter'});checkObjectives(state,defenderId);
    addLog(state,`¡Contrainteligencia de ${defender.name} neutralizó ${TACTICAL_CARDS[cardId].name} de ${state.players[attackerId].name}!`,defenderId);
    return{pendingReaction:false,countered:true,message:`Contrainteligencia de ${defender.name} neutralizó tu ${TACTICAL_CARDS[cardId].name}.`};
  }
  applyHostileCardEffect(state,reaction);return{pendingReaction:false,countered:false};
}
export function resolveCounterReaction(state,reactionId,useCounter,pid){
  const index=state.pendingReactions?.findIndex(item=>item.id===reactionId&&item.defenderId===pid)??-1;
  if(index<0)return{ok:false,reason:'Reacción no disponible'};
  const reaction=state.pendingReactions.splice(index,1)[0],defender=state.players[pid],counterIndex=defender.cards.indexOf('counter');
  if(useCounter&&counterIndex!==-1){
    defender.cards.splice(counterIndex,1);recordObjectiveAction(state,pid,{cardId:'counter'});checkObjectives(state,pid);
    addLog(state,`${defender.name} gastó Contrainteligencia y anuló ${TACTICAL_CARDS[reaction.cardId].name}.`,pid);
    return{ok:true,countered:true,reaction};
  }
  applyHostileCardEffect(state,reaction);
  addLog(state,`${defender.name} conservó Contrainteligencia; ${TACTICAL_CARDS[reaction.cardId].name} surtió efecto.`,pid);
  return{ok:true,countered:false,reaction};
}

export function playTacticalCard(state,cardId,target=null,pid=state.current){
  const p=state.players[pid];
  if(!p?.alive||state.current!==pid||state.winner!==null)return{ok:false,reason:'Turno o jugador inválido'};
  const cardIndex=p.cards.indexOf(cardId);
  if(cardIndex===-1)return{ok:false,reason:'No tienes esa carta'};
  const cardDef=TACTICAL_CARDS[cardId];
  if(!cardDef)return{ok:false,reason:'Carta desconocida'};
  if(cardDef.type==='reaction')return{ok:false,reason:'La Contrainteligencia solo puede elegirse como reacción a Espía o Sabotaje'};
  if(cardId==='mobilize'&&state.mobilizationUsedThisTurn)return{ok:false,reason:'Solo puedes activar una Movilización por turno'};
  if(cardId==='mobilize'&&state.phase==='close'&&!state.fortifiesUsedThisTurn)return{ok:false,reason:'La Movilización añade una segunda maniobra después de la primera'};
  const effectiveCost=tacticalCardCost(state,cardId,pid);
  if(p.money<effectiveCost)return{ok:false,reason:`Dinero insuficiente (necesitas $${effectiveCost})`};

  if(cardId==='spy'){
    if(!target||!state.territories[target]||state.territories[target].owner===pid)return{ok:false,reason:'Objetivo enemigo inválido'};
    const defenderId=state.territories[target].owner,defender=state.players[defenderId];
    p.money-=effectiveCost;
    p.cards.splice(cardIndex,1);
    recordObjectiveAction(state,pid,{cardId,spent:effectiveCost});
    updateFrontTension(state,pid,defenderId,terr(state,target).region,'tense');
    const reaction=offerCounterReaction(state,cardId,target,pid,defenderId);
    checkObjectives(state,pid);return{ok:true,...reaction};
  }

  if(cardId==='sabotage'){
    if(!target||!state.territories[target]||state.territories[target].owner===pid)return{ok:false,reason:'Objetivo enemigo inválido'};
    const defenderId=state.territories[target].owner,defender=state.players[defenderId];
    p.money-=effectiveCost;
    p.cards.splice(cardIndex,1);
    recordObjectiveAction(state,pid,{cardId,spent:effectiveCost});
    updateFrontTension(state,pid,defenderId,terr(state,target).region,'tense');
    if(defender.commander==='spy'&&nextRand(state)<0.5){
      addLog(state,`¡Red de contrainteligencia de ${defender.name} (El Espía) neutralizó el Sabotaje de ${p.name}!`,defenderId);
      checkObjectives(state,pid);return{ok:true,countered:true,message:`Red de contrainteligencia de ${defender.name} neutralizó tu Sabotaje.`};
    }
    const reaction=offerCounterReaction(state,cardId,target,pid,defenderId);
    checkObjectives(state,pid);return{ok:true,...reaction};
  }

  if(cardId==='blockade'){
    if(!target||!Array.isArray(target)||target.length!==2)return{ok:false,reason:'Debes elegir dos territorios conectados'};
    const[t1,t2]=target;
    if(!terr(state,t1)?.n.includes(t2))return{ok:false,reason:'Los territorios no están conectados'};
    if(isConnectionBlocked(state,t1,t2))return{ok:false,reason:'Esa conexión ya está bloqueada'};
    p.money-=effectiveCost;
    p.cards.splice(cardIndex,1);
    recordObjectiveAction(state,pid,{cardId,spent:effectiveCost});
    const o1=state.territories[t1]?.owner,o2=state.territories[t2]?.owner;
    if(o1!==undefined&&o2!==undefined&&o1!==o2){
      for(const region of new Set([terr(state,t1).region,terr(state,t2).region]))updateFrontTension(state,pid,o1===pid?o2:o1,region,'tense');
    }
    state.blockedConnections.push({a:t1,b:t2,expiresTurn:state.turn+cardDef.duration});
    addLog(state,`${p.name} bloqueó el paso entre ${terr(state,t1).name} y ${terr(state,t2).name}.`,pid);
    checkObjectives(state,pid);return{ok:true,countered:false};
  }

  if(cardId==='mobilize'){
    p.money-=effectiveCost;
    p.cards.splice(cardIndex,1);
    recordObjectiveAction(state,pid,{cardId,spent:effectiveCost});
    state.mobilizationUsedThisTurn=true;
    if(state.phase==='close')state.phase='fortify';
    else state.extraFortifies=(state.extraFortifies||0)+1;
    addLog(state,`${p.name} activó Movilización por $${effectiveCost}.`,pid);
    checkObjectives(state,pid);return{ok:true,countered:false};
  }

  return{ok:false,reason:'Acción no implementada'};
}

export function endTurn(state){
  if(state.winner!==null)return;
  if(state.conqueredThisTurn&&!state.cardDrawnThisTurn){
    drawTacticalCard(state,state.current);
  }
  state.cardDrawnThisTurn=false;
  state.extraFortifies=0;
  state.fortifiesUsedThisTurn=0;
  state.mobilizationUsedThisTurn=false;
  state.pendingCardDraw=null;

  checkObjectives(state,state.current);
  state.players[state.current].influence=calculateInfluence(state,state.current);

  let next=state.current;
  do{
    next=(next+1)%state.players.length;
    if(next===0){
      state.turnConquests={};
      coolDownFronts(state);
      state.players.forEach(p=>{
        if(p.alive){
          checkObjectives(state,p.id);
          p.influence=calculateInfluence(state,p.id);
        }
      });

      const highInfluence=state.players
        .filter(p=>p.alive&&p.influence>=INFLUENCE_TARGET)
        .sort((a,b)=>b.influence-a.influence);
      if(highInfluence.length>0&&state.winner===null){
        state.winner=highInfluence[0].id;
        state.victoryType='influence';
        state.phase='gameover';
        addLog(state,`¡${highInfluence[0].name} alcanzó la Hegemonía continental con ${highInfluence[0].influence} puntos de Influencia!`,highInfluence[0].id);
        return;
      }

      if(state.turn>=40&&state.winner===null){
        const ranked=state.players
          .filter(p=>p.alive)
          .sort((a,b)=>b.influence-a.influence||ownedIds(state,b.id).length-ownedIds(state,a.id).length||b.money-a.money);
        state.winner=ranked[0].id;
        state.victoryType='round_limit';
        state.phase='gameover';
        addLog(state,`Fin de campaña: ronda 40 alcanzada. ${ranked[0].name} gana por mayor Influencia (${ranked[0].influence} pts).`,ranked[0].id);
        return;
      }

      checkEventCycle(state);
      state.turn++;
      cleanExpiredEffects(state);
      state.players.forEach(p=>{if(p.alive&&p.commander==='diplomat'){const hasStable=state.players.some(o=>o.id!==p.id&&o.alive&&getFrontState(state,p.id,o.id)==='stable');if(hasStable){p.money+=3;addLog(state,`Subsidio diplomático: ${p.name} recibe +$3 por frentes pacíficos.`,p.id);}}});
      const newCycle=Math.floor((state.turn-1)/3);
      rotateTemporaryObjectives(state,newCycle);
      if(state.market?.cycle!==newCycle){
        state.market=generateMarket(state,newCycle);
        addLog(state,'Nuevas ofertas disponibles en el Mercado Táctico.');
      }
    }
  }while(!state.players[next].alive);
  state.current=next;
  state.phase='reinforce';
  state.reinforcementHistory=[];
  state.attackMadeThisTurn=false;
  state.probeUsedThisTurn=false;
  state.conqueredThisTurn=false;
  state.fortifiesUsedThisTurn=0;
  state.mobilizationUsedThisTurn=false;
  state.pendingReinforcements=reinforcementCount(state,next);
  collectIncome(state,next);
  addLog(state,`Turno de ${state.players[next].name}: ${state.pendingReinforcements} refuerzos.`,next);
}
function checkWinner(state){const alive=state.players.filter(p=>p.alive);if(alive.length===1){state.winner=alive[0].id;state.victoryType='dominance';state.phase='gameover';addLog(state,`${alive[0].name} domina todo el mapa.`,alive[0].id)}}
function borderScore(state,id,pid){const t=state.territories[id],enemy=terr(state,id).n.filter(n=>state.territories[n].owner!==pid&&!isConnectionBlocked(state,id,n)).reduce((s,n)=>s+state.territories[n].troops,0);return enemy+t.troops*.15}
export function aiTurn(state,pid=state.current,difficulty='normal'){
  if(state.winner!==null||state.current!==pid)return{ok:false};
  const report={ok:true,playerId:pid,playerName:state.players[pid].name,reinforcements:state.pendingReinforcements,probes:[],battles:[],conquests:0,attackerLosses:0,defenderLosses:0,eliminated:[]};
  const p=state.players[pid];
  if(p.cards.includes('sabotage')&&p.money>=15){
    const enemyTerrs=getTerritories(state).filter(t=>state.territories[t.id].owner!==pid&&(!state.sabotagedTerritories||!state.sabotagedTerritories[t.id]));
    if(enemyTerrs.length){
      if(difficulty==='fácil'){
        const randIdx=Math.floor(nextRand(state)*enemyTerrs.length);
        playTacticalCard(state,'sabotage',enemyTerrs[randIdx].id,pid);
      }else{
        enemyTerrs.sort((a,b)=>territoryProduction(state,b.id)-territoryProduction(state,a.id));
        playTacticalCard(state,'sabotage',enemyTerrs[0].id,pid);
      }
    }
  }
  const blockCost=p.commander==='strategist'?15:25;
  if(p.cards.includes('blockade')&&p.money>=blockCost){
    let worstConn=null,maxThreat=0;
    for(const myId of ownedIds(state,pid)){
      for(const enemyId of enemiesOf(state,myId)){
        const threat=state.territories[enemyId].troops-state.territories[myId].troops;
        if(threat>maxThreat&&!isConnectionBlocked(state,myId,enemyId)){
          maxThreat=threat;
          worstConn=[myId,enemyId];
        }
      }
    }
    if(worstConn&&maxThreat>=2)playTacticalCard(state,'blockade',worstConn,pid);
  }
  if(p.cards.includes('spy')){
    let spyTarget=null;if(p.commander==='spy'){const adj=ownedIds(state,pid).flatMap(m=>enemiesOf(state,m)).filter(e=>!isTerritorySpied(state,e,pid));if(adj.length){adj.sort((a,b)=>state.territories[b].troops-state.territories[a].troops);spyTarget=adj[0];}}const unseen=getTerritories(state).filter(t=>state.territories[t.id].owner!==pid&&getTerritoryVisibility(state,t.id,pid,difficulty)!=='full');
    if(spyTarget)playTacticalCard(state,'spy',spyTarget,pid);else if(unseen.length){
      unseen.sort((a,b)=>minDistanceToOwned(state,a.id,pid)-minDistanceToOwned(state,b.id,pid));
      playTacticalCard(state,'spy',unseen[0].id,pid);
    }
  }

  const borderNeed=ownedIds(state,pid).some(id=>state.territories[id].troops<3&&enemiesOf(state,id).length);
  if(state.market?.offers){
    const actualCost=o=>(p.commander==='strategist'?Math.max(5,o.cost-5):o.cost);const available=state.market.offers.filter(o=>!o.boughtBy?.includes(pid)&&p.money>=actualCost(o));
    if(difficulty==='fácil'){
      const cheap=[...available].sort((a,b)=>a.cost-b.cost)[0];
      if(cheap&&nextRand(state)>.55)buyMarketItem(state,cheap.id,pid);
    }else if(borderNeed){
      const defOffer=available.find(o=>o.type==='defense');
      if(defOffer&&!state.tempDefense?.[pid])buyMarketItem(state,defOffer.id,pid);
      const troopOffer=[...available].filter(o=>o.type==='troops').sort((a,b)=>b.value-a.value)[0];
      if(troopOffer)buyMarketItem(state,troopOffer.id,pid);
    }
    if(difficulty!=='fácil'&&p.cards.length<3&&p.money>=40){
      const cardOffer=difficulty==='difícil'?available.find(o=>o.type==='card'&&(o.cardId==='counter'||o.cardId==='sabotage'))||available.find(o=>o.type==='card'):available.find(o=>o.type==='card');
      if(cardOffer)buyMarketItem(state,cardOffer.id,pid);
    }
  }
  if((borderNeed||p.commander==='industrial')&&state.players[pid].money>=10)buyReinforcements(state,pid);
  report.reinforcements=state.pendingReinforcements;
  while(state.pendingReinforcements>0){
    let own=ownedIds(state,pid).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
    if(difficulty==='difícil'&&state.announcedEvent){
      const safe=own.filter(id=>terr(state,id).region!==state.announcedEvent.region);
      if(safe.length)own=safe;
    }
    const id=own[0],terrain=terr(state,id).terrain;
    placeTroops(state,id,1,state.rulesMode==='terrain'?TERRAINS[terrain].unit:null);
  }
  finishReinforcement(state);
  let moves=0,limit=difficulty==='fácil'?5:difficulty==='difícil'?28:16;
  while(moves++<limit&&state.winner===null){
    const options=[];
    for(const from of ownedIds(state,pid))for(const to of enemiesOf(state,from)){
      const intel=getTerritoryIntel(state,to,pid,difficulty);
      let perceivedTroops=state.territories[to].troops;
      if(intel.visibility==='partial'){
        const r=approximateTroops(state.territories[to].troops);
        perceivedTroops=r==='1-2'?1.5:r==='3-5'?4:r==='6-9'?7.5:12;
      }else if(intel.visibility==='hidden'){
        perceivedTroops=4;
      }
      const advantage=state.territories[from].troops-perceivedTroops;
      if(state.territories[from].troops>1)options.push({from,to,advantage,target:perceivedTroops,visibility:intel.visibility});
    }
    if(!options.length)break;
    options.sort((a,b)=>b.advantage-a.advantage||a.target-b.target);
    const best=options[0],threshold=difficulty==='fácil'?2:difficulty==='difícil'?-1:0;
    if(best.advantage<threshold)break;
    if(difficulty!=='fácil'&&!state.probeUsedThisTurn&&best.visibility!=='full'){
      const probe=probeTerritory(state,best.from,best.to);
      if(probe.ok){report.probes.push({from:terr(state,best.from).name,to:terr(state,best.to).name,fromId:best.from,toId:best.to,attackerLosses:probe.attackerLosses,defenderLosses:probe.defenderLosses,revealedTroops:probe.revealedTroops});continue}
    }
    const defenderId=state.territories[best.to].owner;
    const beforeState=defenderId===0?structuredClone(state):null;
    const result=blitz(state,best.from,best.to);
    if(result.ok){
      const al=result.rounds.reduce((s,r)=>s+r.attackerLosses,0),dl=result.rounds.reduce((s,r)=>s+r.defenderLosses,0),last=result.rounds.at(-1);
      report.battles.push({from:terr(state,best.from).name,to:terr(state,best.to).name,fromId:best.from,toId:best.to,defenderId,beforeState,afterState:beforeState?structuredClone(state):null,roundResults:defenderId===0?result.rounds:null,rounds:result.rounds.length,attackerLosses:al,defenderLosses:dl,conquered:result.conquered,eliminated:last.eliminated,bonus:last.bonus});
      report.attackerLosses+=al;report.defenderLosses+=dl;if(result.conquered)report.conquests++;if(last.eliminated!==null)report.eliminated.push(state.players[last.eliminated].name);
    }
  }
  if(state.winner!==null)return report;
  setPhase(state,'fortify');
  const sources=ownedIds(state,pid).filter(id=>state.territories[id].troops>2&&!enemiesOf(state,id).length).sort((a,b)=>state.territories[b].troops-state.territories[a].troops);
  const borders=ownedIds(state,pid).filter(id=>enemiesOf(state,id).length).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
  if(sources.length&&borders.length&&connectedOwned(state,sources[0],borders[0],pid)){
    fortify(state,sources[0],borders[0],Math.max(1,state.territories[sources[0]].troops-1));
    const mobCost=p.commander==='strategist'?0:10;
    if(p.cards.includes('mobilize')&&p.money>=mobCost&&sources.length>1&&borders.length>1){
      if(playTacticalCard(state,'mobilize',null,pid).ok&&connectedOwned(state,sources[1],borders[1],pid)){
        fortify(state,sources[1],borders[1],Math.max(1,state.territories[sources[1]].troops-1));
      }
    }
  }else setPhase(state,'close');
  endTurn(state);return report;
}
export function validateState(state){const errors=[],ts=getTerritories(state);for(const t of ts){const s=state.territories[t.id];if(!s)errors.push(`Falta ${t.id}`);else if(s.troops<1)errors.push(`${t.id} sin tropas`);else if(!state.players[s.owner])errors.push(`${t.id} dueño inválido`);else if(!UNIT_TYPES[s.unitType])errors.push(`${t.id} unidad inválida`)}const owners=new Set(ts.map(t=>state.territories[t.id]?.owner));state.players.forEach(p=>{if(p.alive!==owners.has(p.id)&&state.winner===null)errors.push(`Estado vital incorrecto: ${p.name}`);if(!Array.isArray(p.cards)||p.cards.length>3)errors.push(`Mano de cartas inválida en ${p.name}`);if(typeof p.influence!=='number'||isNaN(p.influence))errors.push(`Influencia inválida en ${p.name}`);if(!Array.isArray(p.completedObjectives))errors.push(`Objetivos inválidos en ${p.name}`);if(!p.commander||!COMMANDERS[p.commander])errors.push(`Doctrina inválida en ${p.name}`)});if(!state.market||!Array.isArray(state.market.offers)||state.market.offers.length<3||state.market.offers.length>4){errors.push('Mercado inválido')}if(!state.fronts||typeof state.fronts!=='object'){errors.push('Frentes inválidos')}if(!Array.isArray(state.reinforcementHistory)){errors.push('Historial de Reclutamiento inválido')}if(state.announcedEvent&&(typeof state.announcedEvent!=='object'||!EVENT_CATALOG[state.announcedEvent.type]||!REGIONS[state.announcedEvent.region])){errors.push('Evento anunciado inválido')}if(state.activeEvent&&(typeof state.activeEvent!=='object'||!EVENT_CATALOG[state.activeEvent.type]||!REGIONS[state.activeEvent.region])){errors.push('Evento activo inválido')}return errors}
