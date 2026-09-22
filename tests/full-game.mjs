import {createGame,aiTurn,validateState,TERRITORIES,ownedIds,enemiesOf,placeTroops,setPhase,attackRound,endTurn,tradeCards} from '../dist/engine.mjs';

let maxTurns=0;
for(let seed=1;seed<=60;seed++){
  const state=createGame({players:2+(seed%3),seed,human:false});
  let actions=0;
  while(state.winner===null&&actions<3000){aiTurn(state,state.current,seed%2?'normal':'difícil');actions++;}
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
