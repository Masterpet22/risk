/**
 * @file difficulty-system.mjs
 * @description Suite de pruebas para los cuatro perfiles de dificultad de la IA.
 * Valida que Pacífico, Diplomático, Bélico y Aniquilación modulen agresividad, sesgos
 * de combate, límites de cartas, maniobras base y precios sin adulterar los dados.
 */

import {strict as assert} from 'node:assert';
import {
  createGame,aiTurn,ownedIds,getTerritories,cardHandLimit,maneuverLimit,
  marketPrice,validateState,aiStrategicScore,normalizeDifficulty,
  enemiesOf,placeTroops,finishReinforcement,setPhase,endTurn
} from '../dist/engine.mjs';

assert.equal(normalizeDifficulty('fácil'),'pacifico');
assert.equal(normalizeDifficulty('normal'),'diplomatico');
assert.equal(normalizeDifficulty('difícil'),'belico');
assert.equal(normalizeDifficulty('odio'),'aniquilacion');

const expected={
  pacifico:{cards:4,moves:3,market:25},
  diplomatico:{cards:3,moves:2,market:30},
  belico:{cards:3,moves:1,market:35},
  aniquilacion:{cards:2,moves:0,market:40}
};
for(const[difficulty,rules]of Object.entries(expected)){
  const state=createGame({players:3,seed:7100,human:true,difficulty});
  assert.equal(state.difficulty,difficulty);
  assert.equal(cardHandLimit(state,0),rules.cards);
  assert.equal(maneuverLimit(state,0),rules.moves);
  assert.equal(marketPrice(state,{cost:30},0),rules.market);
  assert.ok(state.market.offers.some(o=>o.type==='troops'),'El Mercado debe garantizar una oferta de tropas');
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
const peacefulFixture=aiTargetFixture('pacifico'),peacefulReport=aiTurn(peacefulFixture,1,'pacifico');
assert.equal(peacefulReport.battles[0]?.defenderId,2,'Pacífico debe atacar primero a otra IA si existe alternativa');
const warlikeFixture=aiTargetFixture('belico'),warlikeReport=aiTurn(warlikeFixture,1,'belico');
assert.equal(warlikeReport.battles[0]?.defenderId,0,'Bélico debe priorizar al jugador en una oportunidad equivalente');
const annihilationFixture=aiTargetFixture('aniquilacion'),annihilationReport=aiTurn(annihilationFixture,1,'aniquilacion');
assert.equal(annihilationReport.battles[0]?.defenderId,0,'Aniquilación debe atacar al jugador siempre que pueda');

const pressure=aiTargetFixture('diplomatico'),pressureSource=getTerritories(pressure).find(t=>t.n.some(n=>pressure.players[pressure.territories[n].owner]?.human))?.id;
assert.ok(aiStrategicScore(pressure,pressureSource,1,'aniquilacion')>aiStrategicScore(pressure,pressureSource,1,'belico'));
assert.ok(aiStrategicScore(pressure,pressureSource,1,'belico')>aiStrategicScore(pressure,pressureSource,1,'diplomatico'));
assert.ok(aiStrategicScore(pressure,pressureSource,1,'pacifico')<aiStrategicScore(pressure,pressureSource,1,'diplomatico'),'Los refuerzos deben alejarse del frente humano en Pacífico');

const aggregate={pacifico:0,diplomatico:0,belico:0,aniquilacion:0};
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
assert.ok(aggregate.pacifico>aggregate.diplomatico,'Pacífico debe sesgar el valor de conectividad a favor del jugador');
assert.ok(aggregate.diplomatico>aggregate.belico,'Bélico debe sesgar el reparto contra el jugador');
assert.ok(aggregate.diplomatico>aggregate.aniquilacion,'Aniquilación debe sesgar el reparto contra el jugador');

function passiveCampaigns(difficulty){
  let survived=0,totalRounds=0;
  for(let seed=1;seed<=30;seed++){
    const state=createGame({players:3,seed:9100+seed,human:true,difficulty});let guard=0;
    while(state.winner===null&&state.turn<=20&&guard++<400){
      if(state.players[state.current].human){
        while(state.pendingReinforcements){
          const own=ownedIds(state,0).sort((a,b)=>(enemiesOf(state,b).length*4-state.territories[b].troops)-(enemiesOf(state,a).length*4-state.territories[a].troops));
          placeTroops(state,own[0],1);
        }
        finishReinforcement(state);setPhase(state,'fortify');setPhase(state,'close');endTurn(state);
      }else aiTurn(state,state.current,difficulty);
    }
    if(state.players[0].alive)survived++;totalRounds+=state.turn;
  }
  return{survived,averageRounds:totalRounds/30};
}
const pressureResults=Object.fromEntries(Object.keys(expected).map(difficulty=>[difficulty,passiveCampaigns(difficulty)]));
assert.ok(pressureResults.pacifico.survived>pressureResults.diplomatico.survived,'Pacífico debe producir una supervivencia claramente mayor');
assert.ok(pressureResults.diplomatico.averageRounds>pressureResults.belico.averageRounds,'Bélico debe eliminar antes al jugador pasivo');
assert.ok(pressureResults.belico.averageRounds>pressureResults.aniquilacion.averageRounds,'Aniquilación debe ejercer la presión más rápida');

console.log('OK: perfiles, agresividad IA, presión de campaña, precios, manos, maniobras y reparto ponderado verificados.',pressureResults);
