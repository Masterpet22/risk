import {createGame,aiTurn,validateState,TERRITORIES,MAPS,UNIT_TYPES,ownedIds,enemiesOf,placeTroops,setPhase,attackRound,endTurn,tradeCards} from '../dist/engine.mjs';

let maxTurns=0;
for(let seed=1;seed<=60;seed++){
  const mapId=Object.keys(MAPS)[seed%3],rulesMode=seed%2?'classic':'terrain';
  const state=createGame({players:2+(seed%3),seed,human:false,mapId,rulesMode});
  let actions=0;
  while(state.winner===null&&actions<3000){const report=aiTurn(state,state.current,seed%2?'normal':'difícil');if(!Array.isArray(report.battles))throw new Error('Informe IA ausente');actions++;}
  const errors=validateState(state);
  if(errors.length)throw new Error(`Semilla ${seed}: ${errors.join(', ')}`);
  if(state.winner===null)throw new Error(`Semilla ${seed}: partida no terminó tras ${actions} turnos`);
  if(state.players.filter(p=>p.alive).length!==1)throw new Error(`Semilla ${seed}: victoria inconsistente`);
  if(Object.values(state.territories).some(t=>t.owner!==state.winner))throw new Error(`Semilla ${seed}: el ganador no posee todo el mapa`);
  maxTurns=Math.max(maxTurns,state.turn);
}
console.log(`OK: 60 partidas completas, ${TERRITORIES.length} territorios, máximo ${maxTurns} rondas.`);

// Flujo humano: no puede saltarse el combate cuando existe un ataque legal.
const manual=createGame({players:2,seed:2026,human:true});
while(manual.pendingReinforcements)placeTroops(manual,ownedIds(manual,0)[0],1);
if(setPhase(manual,'fortify'))throw new Error('Se permitió saltar el combate obligatorio');
const origin=ownedIds(manual,0).find(id=>manual.territories[id].troops>1&&enemiesOf(manual,id).length);
if(!origin)throw new Error('La prueba no produjo un ataque legal');
const target=enemiesOf(manual,origin)[0];
const roll=attackRound(manual,origin,target,1);
if(!roll.ok||!manual.attackMadeThisTurn)throw new Error('La tirada obligatoria no quedó registrada');
if(manual.winner===null&&!setPhase(manual,'fortify'))throw new Error('No se permitió avanzar después de combatir');
if(manual.winner===null&&!setPhase(manual,'close'))throw new Error('No se mostró el cierre del turno');

// Cartas: canje forzado y robo al conquistar.
const cards=createGame({players:2,seed:77,human:true});
cards.players[0].cards=5;
if(placeTroops(cards,ownedIds(cards,0)[0],1))throw new Error('Se desplegó antes del canje obligatorio');
const traded=tradeCards(cards,0);
if(!traded.ok||cards.players[0].cards!==2||traded.bonus!==4)throw new Error('El canje de cartas falló');

const reward=createGame({players:2,seed:991,human:true});
while(reward.pendingReinforcements)placeTroops(reward,ownedIds(reward,0)[0],1);
const strong=ownedIds(reward,0).find(id=>enemiesOf(reward,id).length);
const victim=enemiesOf(reward,strong)[0];reward.territories[strong].troops=30;reward.territories[victim].troops=1;
while(reward.territories[victim].owner!==0)attackRound(reward,strong,victim,3);
setPhase(reward,'fortify');setPhase(reward,'close');endTurn(reward);
if(reward.players[0].cards!==1)throw new Error('No se robó carta después de conquistar');
console.log('OK: combate obligatorio, selección de dados y canje forzado verificados.');

// Ventaja circular en modo terreno y ausencia de modificadores en clásico.
const terrain=createGame({players:2,seed:505,human:true,mapId:'archipelago',rulesMode:'terrain'});
while(terrain.pendingReinforcements)placeTroops(terrain,ownedIds(terrain,0)[0],1,'infantry');
const tFrom=ownedIds(terrain,0).find(id=>terrain.territories[id].troops>1&&enemiesOf(terrain,id).length),tTo=enemiesOf(terrain,tFrom)[0];
terrain.territories[tFrom].unitType='infantry';terrain.territories[tTo].unitType='artillery';
const terrainRoll=attackRound(terrain,tFrom,tTo,1);
if(terrainRoll.bonus.attacker!==1||terrainRoll.attackerDice[0]!==terrainRoll.rawAttackerDice[0]+1)throw new Error('El bono circular +1 no se aplicó');
const classic=createGame({players:2,seed:506,human:true,mapId:'rift',rulesMode:'classic'});
while(classic.pendingReinforcements)placeTroops(classic,ownedIds(classic,0)[0],1);
const cFrom=ownedIds(classic,0).find(id=>classic.territories[id].troops>1&&enemiesOf(classic,id).length),cTo=enemiesOf(classic,cFrom)[0];
const classicRoll=attackRound(classic,cFrom,cTo,1);
if(classicRoll.bonus.attacker||classicRoll.bonus.defender)throw new Error('El modo clásico aplicó modificadores');
console.log('OK: 3 mapas, informes IA, modo clásico y rueda de terreno verificados.');

for(const map of Object.values(MAPS)){
  const byId=Object.fromEntries(map.territories.map(t=>[t.id,t]));
  for(const t of map.territories)for(const n of t.n)if(!byId[n]?.n.includes(t.id))throw new Error(`${map.name}: ruta asimétrica ${t.id}-${n}`);
  const seen=new Set([map.territories[0].id]),queue=[map.territories[0].id];
  while(queue.length){const id=queue.shift();for(const n of byId[id].n)if(!seen.has(n)){seen.add(n);queue.push(n)}}
  if(seen.size!==map.territories.length)throw new Error(`${map.name}: mapa desconectado`);
}
console.log('OK: conectividad y rutas simétricas verificadas en los 3 mapas.');
