import {strict as assert} from 'node:assert';
import {createGame,getTerritories,attackRound,blitz,fortify} from '../dist/engine.mjs';

for(const dice of [1,2,3]){
  const state=createGame({players:2,seed:5100+dice,human:true});
  const from=getTerritories(state)[0],to=getTerritories(state).find(territory=>from.n.includes(territory.id));
  state.current=0;state.phase='attack';state.territories[from.id]={...state.territories[from.id],owner:0,troops:6};state.territories[to.id]={...state.territories[to.id],owner:1,troops:6};
  const result=attackRound(state,from.id,to.id,dice);
  assert.equal(result.ok,true);assert.equal(result.deployedTroops,dice);assert.equal(result.rawAttackerDice.length,dice);
}

{
  const state=createGame({players:2,seed:5200,human:true}),from=getTerritories(state)[0],to=getTerritories(state).find(territory=>from.n.includes(territory.id));
  state.current=0;state.phase='attack';state.territories[from.id]={...state.territories[from.id],owner:0,troops:5};state.territories[to.id]={...state.territories[to.id],owner:1,troops:20};
  const result=blitz(state,from.id,to.id),initialTroops=5;let available=initialTroops;
  assert.equal(result.ok,true);
  for(const round of result.rounds){assert.equal(round.deployedTroops,Math.min(3,available-1));assert.equal(round.rawAttackerDice.length,round.deployedTroops);available-=round.attackerLosses;if(round.conquered)break}
}

{
  const state=createGame({players:2,seed:5300,human:true}),from=getTerritories(state)[0],to=getTerritories(state).find(territory=>from.n.includes(territory.id));
  state.current=0;state.phase='fortify';state.territories[from.id]={...state.territories[from.id],owner:0,troops:7};state.territories[to.id]={...state.territories[to.id],owner:0,troops:2};
  assert.equal(fortify(state,from.id,to.id,7),false,'No debe vaciarse el origen');assert.equal(state.territories[from.id].troops,7);assert.equal(state.territories[to.id].troops,2);
  assert.equal(fortify(state,from.id,to.id,4),true);assert.equal(state.territories[from.id].troops,3);assert.equal(state.territories[to.id].troops,6);assert.equal(state.phase,'close');
}
console.log('OK: dados/soldados, ataque rápido dinámico y límites/resultado de maniobra verificados.');
