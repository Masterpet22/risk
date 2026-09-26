import {strict as assert} from 'node:assert';
import {
  createGame,aiTurn,ownedIds,getTerritories,cardHandLimit,maneuverLimit,
  reinforcementPrice,marketPrice,validateState
} from '../dist/engine.mjs';

const expected={
  'fácil':{cards:4,moves:3,basic:5,market:25},
  normal:{cards:3,moves:2,basic:10,market:30},
  'difícil':{cards:3,moves:1,basic:15,market:35},
  odio:{cards:2,moves:0,basic:20,market:40}
};
for(const[difficulty,rules]of Object.entries(expected)){
  const state=createGame({players:3,seed:7100,human:true,difficulty});
  assert.equal(state.difficulty,difficulty);
  assert.equal(cardHandLimit(state,0),rules.cards);
  assert.equal(maneuverLimit(state,0),rules.moves);
  assert.equal(reinforcementPrice(state,0),rules.basic);
  assert.equal(marketPrice(state,{cost:30},0),rules.market);
  assert.equal(cardHandLimit(state,1),3,'La mano de IA no debe recibir el hándicap humano');
  assert.equal(validateState(state).length,0);
}

function aiTargetFixture(difficulty){
  const state=createGame({players:3,seed:7200,human:true,difficulty});
  const map=getTerritories(state),source=map.find(t=>t.n.length>=3),humanTarget=source.n[0],aiTarget=source.n[1];
  for(const t of map)state.territories[t.id]={owner:1,troops:1};
  state.territories[source.id].troops=24;
  state.territories[humanTarget]={owner:0,troops:1};
  state.territories[aiTarget]={owner:2,troops:1};
  state.players.forEach(p=>{p.alive=true;p.cards=[];p.money=0;p.lastIncomeRound=state.turn});
  state.current=1;state.phase='reinforce';state.pendingReinforcements=0;
  return state;
}
const easyReport=aiTurn(aiTargetFixture('fácil'),1,'fácil');
assert.equal(easyReport.battles[0]?.defenderId,2,'Fácil debe atacar primero a otra IA si existe alternativa');
const hardReport=aiTurn(aiTargetFixture('difícil'),1,'difícil');
assert.equal(hardReport.battles[0]?.defenderId,0,'Difícil debe priorizar al jugador en una oportunidad equivalente');
const hateReport=aiTurn(aiTargetFixture('odio'),1,'odio');
assert.equal(hateReport.battles[0]?.defenderId,0,'Odio debe atacar al jugador siempre que pueda');

const aggregate={fácil:0,normal:0,difícil:0,odio:0};
for(const difficulty of Object.keys(aggregate))for(let seed=1;seed<=300;seed++){
  const state=createGame({players:3,seed,human:true,difficulty}),map=getTerritories(state),counts=state.players.map(p=>ownedIds(state,p.id).length);
  assert.equal(Math.max(...counts)-Math.min(...counts),0,'El reparto debe conservar la misma cantidad de territorios');
  for(const player of state.players){
    const own=ownedIds(state,player.id);
    assert.ok(own.some(id=>map.find(t=>t.id===id).n.some(n=>state.territories[n].owner===player.id)),'Cada jugador debe iniciar con una pareja conectada');
    for(const region of ['north','west','crown','ember','sun','isles'])assert.ok(!map.filter(t=>t.region===region).every(t=>state.territories[t.id].owner===player.id),'Nadie debe recibir una región completa');
  }
  aggregate[difficulty]+=ownedIds(state,0).reduce((sum,id)=>sum+map.find(t=>t.id===id).n.length,0);
}
assert.ok(aggregate.fácil>aggregate.normal,'Fácil debe sesgar el valor de conectividad a favor del jugador');
assert.ok(aggregate.normal>aggregate.difícil,'Difícil debe sesgar el reparto contra el jugador');
assert.ok(aggregate.normal>aggregate.odio,'Odio debe sesgar el reparto contra el jugador');

console.log('OK: perfiles, agresividad IA, precios, manos, maniobras y reparto ponderado verificados.');
