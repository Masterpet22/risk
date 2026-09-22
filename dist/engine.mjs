export const REGIONS = {
  north: { name: 'Norte de Hierro', bonus: 2, color: '#70b7c7' },
  west: { name: 'Marca Occidental', bonus: 3, color: '#c89e68' },
  crown: { name: 'Tierras de la Corona', bonus: 3, color: '#aa83bd' },
  ember: { name: 'Costa de Brasa', bonus: 2, color: '#da7867' },
  sun: { name: 'Dominios del Sol', bonus: 3, color: '#d6bd57' },
  isles: { name: 'Islas de Jade', bonus: 2, color: '#64ae8b' }
};

export const TERRITORIES = [
  {id:'n1',name:'Bastión Boreal',region:'north',x:17,y:16,n:['n2','w1']},
  {id:'n2',name:'Fiordo Gris',region:'north',x:30,y:12,n:['n1','n3','w2']},
  {id:'n3',name:'Paso del Lobo',region:'north',x:43,y:17,n:['n2','n4','c1']},
  {id:'n4',name:'Vigilia Blanca',region:'north',x:56,y:12,n:['n3','c2','i1']},
  {id:'w1',name:'Puerto Cuervo',region:'west',x:11,y:34,n:['n1','w2','w3']},
  {id:'w2',name:'Campos de Bronce',region:'west',x:25,y:30,n:['n2','w1','w3','c1']},
  {id:'w3',name:'Bosque Ancestral',region:'west',x:19,y:47,n:['w1','w2','w4','c3']},
  {id:'w4',name:'Risco del Ocaso',region:'west',x:9,y:58,n:['w3','e1']},
  {id:'c1',name:'Valdoria',region:'crown',x:40,y:33,n:['n3','w2','c2','c3']},
  {id:'c2',name:'Ciudadela Real',region:'crown',x:54,y:29,n:['n4','c1','c4','i1']},
  {id:'c3',name:'Llanura Alta',region:'crown',x:36,y:49,n:['w3','c1','c4','e2']},
  {id:'c4',name:'Puente Carmesí',region:'crown',x:51,y:46,n:['c2','c3','e3','s1','i2']},
  {id:'e1',name:'Bahía Ceniza',region:'ember',x:14,y:70,n:['w4','e2']},
  {id:'e2',name:'Forja del Sur',region:'ember',x:30,y:66,n:['c3','e1','e3','s1']},
  {id:'e3',name:'Delta Rojo',region:'ember',x:44,y:62,n:['c4','e2','e4','s2']},
  {id:'e4',name:'Cabo Ardiente',region:'ember',x:37,y:79,n:['e3','s3']},
  {id:'s1',name:'Arco Dorado',region:'sun',x:59,y:60,n:['c4','e2','s2','i2']},
  {id:'s2',name:'Dunas Reales',region:'sun',x:55,y:76,n:['e3','s1','s3','s4']},
  {id:'s3',name:'Oasis de Sal',region:'sun',x:68,y:84,n:['e4','s2','s4']},
  {id:'s4',name:'Torre del Alba',region:'sun',x:73,y:69,n:['s2','s3','i4']},
  {id:'i1',name:'Jade Norte',region:'isles',x:74,y:20,n:['n4','c2','i2']},
  {id:'i2',name:'Estrecho Verde',region:'isles',x:78,y:41,n:['c4','s1','i1','i3']},
  {id:'i3',name:'Isla Tempestad',region:'isles',x:91,y:47,n:['i2','i4']},
  {id:'i4',name:'Puerto Esmeralda',region:'isles',x:88,y:68,n:['i3','s4']}
];

export const PLAYER_COLORS = ['#4ecdc4','#ff6b6b','#f7b731','#9b7ede'];
export const PLAYER_NAMES = ['Tú','Legión Carmesí','Casa Áurea','Pacto Violeta'];

export function makeRng(seed=Date.now()) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}

function shuffle(a,rng){ for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const terr = id => TERRITORIES.find(t=>t.id===id);

export function createGame({players=3,seed=Date.now(),human=true}={}) {
  const rng=makeRng(seed), order=shuffle(TERRITORIES.map(t=>t.id),rng);
  const state={version:2,seed,turn:1,current:0,phase:'reinforce',winner:null,log:[],selected:null,pendingReinforcements:0,
    attackMadeThisTurn:false,conqueredThisTurn:false,cardTradeLevel:0,
    players:Array.from({length:players},(_,i)=>({id:i,name:human&&i===0?'Tú':PLAYER_NAMES[i]||`Ejército ${i+1}`,color:PLAYER_COLORS[i],human:human&&i===0,alive:true,cards:0})),
    territories:{},rngState:Math.floor(rng()*0xffffffff)};
  order.forEach((id,i)=>state.territories[id]={owner:i%players,troops:1});
  const reserves=Math.max(8,14-Math.floor(TERRITORIES.length/players));
  state.players.forEach(p=>{
    const owned=order.filter(id=>state.territories[id].owner===p.id);
    for(let k=0;k<reserves;k++) state.territories[owned[k%owned.length]].troops++;
  });
  state.pendingReinforcements=reinforcementCount(state,0);
  addLog(state,'La campaña ha comenzado. Despliega tus refuerzos.',0);
  return state;
}

export function reinforcementCount(state,pid){
  const count=ownedIds(state,pid).length;
  if(!count) return 0;
  let total=Math.max(3,Math.floor(count/3));
  for(const [key,r] of Object.entries(REGIONS)){
    const ids=TERRITORIES.filter(t=>t.region===key).map(t=>t.id);
    if(ids.every(id=>state.territories[id].owner===pid)) total+=r.bonus;
  }
  return total;
}
export const ownedIds=(s,p)=>TERRITORIES.filter(t=>s.territories[t.id].owner===p).map(t=>t.id);
export const enemiesOf=(s,id)=>terr(id).n.filter(n=>s.territories[n].owner!==s.territories[id].owner);
export const alliesOf=(s,id)=>terr(id).n.filter(n=>s.territories[n].owner===s.territories[id].owner);
export function canPlayerAttack(state,pid=state.current){return ownedIds(state,pid).some(id=>state.territories[id].troops>=2&&enemiesOf(state,id).length>0);}

export function tradeCards(state,pid=state.current){
  const player=state.players[pid];
  if(state.phase!=='reinforce'||pid!==state.current||player.cards<3)return {ok:false,bonus:0};
  player.cards-=3;state.cardTradeLevel++;
  const sequence=[4,6,8,10,12,15];
  const bonus=state.cardTradeLevel<=sequence.length?sequence[state.cardTradeLevel-1]:15+(state.cardTradeLevel-sequence.length)*5;
  state.pendingReinforcements+=bonus;addLog(state,`${player.name} canjeó 3 cartas por ${bonus} tropas.`,pid);
  return {ok:true,bonus};
}

export function placeTroops(state,id,amount=1){
  if(state.phase!=='reinforce'||state.players[state.current].cards>=5||state.pendingReinforcements<amount||state.territories[id]?.owner!==state.current||amount<1) return false;
  state.territories[id].troops+=amount; state.pendingReinforcements-=amount;
  if(state.pendingReinforcements===0){ state.phase='attack'; state.selected=null; addLog(state,'Refuerzos desplegados. Fase de ataque.',state.current); }
  return true;
}

function nextRand(state){ state.rngState=(Math.imul(1664525,state.rngState)+1013904223)>>>0; return state.rngState/4294967296; }
function roll(state,n){ return Array.from({length:n},()=>1+Math.floor(nextRand(state)*6)).sort((a,b)=>b-a); }
function addLog(s,text,p=null){s.log.unshift({text,p,turn:s.turn}); if(s.log.length>50)s.log.length=50;}

export function attackRound(state,from,to,attackerDiceCount=null){
  const a=state.territories[from],d=state.territories[to];
  if(state.phase!=='attack'||!a||!d||a.owner!==state.current||d.owner===a.owner||a.troops<2||!terr(from).n.includes(to)) return {ok:false};
  const maxDice=Math.min(3,a.troops-1),chosen=attackerDiceCount===null?maxDice:Number(attackerDiceCount);
  if(!Number.isInteger(chosen)||chosen<1||chosen>maxDice)return {ok:false};
  const attacker=a.owner, defender=d.owner, ad=roll(state,chosen),dd=roll(state,Math.min(2,d.troops));
  state.attackMadeThisTurn=true;
  let al=0,dl=0; for(let i=0;i<Math.min(ad.length,dd.length);i++){if(ad[i]>dd[i]){d.troops--;dl++;}else{a.troops--;al++;}}
  let conquered=false, eliminated=null;
  if(d.troops<=0){
    const moved=Math.max(1,Math.min(ad.length,a.troops-1)); d.owner=attacker; d.troops=moved; a.troops-=moved; conquered=true;
    addLog(state,`${terr(from).name} conquistó ${terr(to).name}.`,attacker);
    state.conqueredThisTurn=true;
    if(ownedIds(state,defender).length===0){state.players[defender].alive=false;eliminated=defender;state.players[attacker].cards+=state.players[defender].cards;state.players[defender].cards=0;addLog(state,`${state.players[defender].name} ha sido eliminado. Sus cartas pasan a ${state.players[attacker].name}.`,attacker);}
    checkWinner(state);
  }
  return {ok:true,attackerDice:ad,defenderDice:dd,attackerLosses:al,defenderLosses:dl,conquered,eliminated};
}

export function blitz(state,from,to,maxRounds=50){
  const rounds=[]; while(rounds.length<maxRounds&&state.winner===null&&state.territories[from]?.troops>1&&state.territories[to]?.owner!==state.current){
    const r=attackRound(state,from,to); if(!r.ok)break; rounds.push(r); if(r.conquered)break;
  }
  return {ok:rounds.length>0,rounds,conquered:rounds.at(-1)?.conquered||false};
}

function connectedOwned(state,start,target,pid){
  const q=[start],seen=new Set(q); while(q.length){const id=q.shift();if(id===target)return true;for(const n of terr(id).n)if(!seen.has(n)&&state.territories[n].owner===pid){seen.add(n);q.push(n);}}return false;
}
export function fortify(state,from,to,amount){
  const a=state.territories[from],b=state.territories[to];
  if(state.phase!=='fortify'||!a||!b||a.owner!==state.current||b.owner!==state.current||amount<1||a.troops<=amount||!connectedOwned(state,from,to,state.current))return false;
  a.troops-=amount;b.troops+=amount;state.phase='close';addLog(state,`${amount} unidades se movieron a ${terr(to).name}.`,state.current);return true;
}
export function setPhase(state,phase){
  if(phase==='fortify'&&state.phase==='attack'&&(state.attackMadeThisTurn||!canPlayerAttack(state))){state.phase='fortify';state.selected=null;return true;}
  if(phase==='close'&&state.phase==='fortify'){state.phase='close';state.selected=null;return true;}
  return false;
}
export function endTurn(state){
  if(state.winner!==null)return;
  if(state.conqueredThisTurn){state.players[state.current].cards++;addLog(state,`${state.players[state.current].name} robó 1 carta por conquistar.`,state.current);}
  let next=state.current;do{next=(next+1)%state.players.length;if(next===0)state.turn++;}while(!state.players[next].alive);
  state.current=next;state.phase='reinforce';state.selected=null;state.attackMadeThisTurn=false;state.conqueredThisTurn=false;state.pendingReinforcements=reinforcementCount(state,next);addLog(state,`Turno de ${state.players[next].name}: ${state.pendingReinforcements} refuerzos.`,next);
}
function checkWinner(state){const alive=state.players.filter(p=>p.alive);if(alive.length===1){state.winner=alive[0].id;state.phase='gameover';addLog(state,`${alive[0].name} domina todo el continente.`,alive[0].id);}}

function borderScore(state,id,pid){const t=state.territories[id];const enemy=terr(id).n.filter(n=>state.territories[n].owner!==pid).reduce((s,n)=>s+state.territories[n].troops,0);return enemy+t.troops*.15;}
export function aiTurn(state,pid=state.current,difficulty='normal'){
  if(state.winner!==null||state.current!==pid)return false;
  while(state.players[pid].cards>=5||(state.players[pid].cards>=3&&difficulty==='difícil'))tradeCards(state,pid);
  while(state.pendingReinforcements>0){
    const own=ownedIds(state,pid).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
    placeTroops(state,own[0],1);
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
    blitz(state,best.from,best.to);
  }
  if(state.winner!==null)return true;
  setPhase(state,'fortify');
  const sources=ownedIds(state,pid).filter(id=>state.territories[id].troops>2&&enemiesOf(state,id).length===0).sort((a,b)=>state.territories[b].troops-state.territories[a].troops);
  if(sources.length){
    const borders=ownedIds(state,pid).filter(id=>enemiesOf(state,id).length).sort((a,b)=>borderScore(state,b,pid)-borderScore(state,a,pid));
    if(borders.length&&connectedOwned(state,sources[0],borders[0],pid)){fortify(state,sources[0],borders[0],Math.max(1,state.territories[sources[0]].troops-1));endTurn(state);return true;}
  }
  setPhase(state,'close');
  endTurn(state);return true;
}

export function validateState(state){
  const errors=[];
  for(const t of TERRITORIES){const s=state.territories[t.id];if(!s)errors.push(`Falta ${t.id}`);else if(s.troops<1)errors.push(`${t.id} sin tropas`);else if(!state.players[s.owner])errors.push(`${t.id} dueño inválido`);}
  const owners=new Set(TERRITORIES.map(t=>state.territories[t.id]?.owner));
  state.players.forEach(p=>{if(p.alive!==owners.has(p.id)&&state.winner===null)errors.push(`Estado vital incorrecto: ${p.name}`);});
  return errors;
}
