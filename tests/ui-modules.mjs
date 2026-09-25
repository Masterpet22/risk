import {strict as assert} from 'node:assert';
import {routeGeometry} from '../dist/map-routes.mjs';
import {diceMarkup,comparisonMarkup,roundTone,soldierFigures} from '../dist/combat-view.mjs';
import {clampMoveAmount,movementPreview} from '../dist/order-controls.mjs';
import {saveCampaign,loadCampaign,hasSavedCampaign,CAMPAIGN_SAVE_KEY} from '../dist/campaign-storage.mjs';
import {createGame} from '../dist/engine.mjs';

class MemoryStorage{constructor(){this.data=new Map()}getItem(key){return this.data.get(key)??null}setItem(key,value){this.data.set(key,String(value))}}
const straight=routeGeometry({id:'a',x:10,y:10},{id:'b',x:20,y:10},[]);assert.equal(straight.curved,false);assert.match(straight.d,/ L /);assert.deepEqual(straight.point(.5),{x:150,y:80});
const curved=routeGeometry({id:'a',x:10,y:10},{id:'b',x:30,y:10},[{id:'x',x:20,y:10}]);assert.equal(curved.curved,true);assert.match(curved.d,/ Q /);
assert.equal(clampMoveAmount('0',6),1);assert.equal(clampMoveAmount('99',6),6);assert.equal(clampMoveAmount('x',6),null);
const preview=movementPreview({originName:'Norte',destinationName:'Sur',originTroops:7,destinationTroops:2,amount:4});assert.match(preview.html,/7 → 3/);assert.match(preview.html,/2 → 6/);assert.match(preview.accessible,/Norte queda con 3/);
assert.match(diceMarkup([7],[6]),/6 \+1/);assert.match(soldierFigures(3),/translate\(14 3\)/);assert.equal(roundTone({attackerLosses:0,defenderLosses:1},false),'victory');
assert.match(comparisonMarkup({attackerDice:[6],defenderDice:[5],rawAttackerDice:[6],rawDefenderDice:[5],bonus:{attacker:0,defender:0,attackerReasons:[],defenderReasons:[]}}),/vence a/);
const storage=new MemoryStorage(),state=createGame({players:2,seed:6100,human:true});assert.equal(saveCampaign(state,'difícil',storage),true);assert.equal(hasSavedCampaign(storage),true);assert.ok(storage.getItem(CAMPAIGN_SAVE_KEY));const loaded=loadCampaign(storage);assert.equal(loaded.difficulty,'difícil');assert.equal(loaded.state.mapId,state.mapId);
console.log('OK: módulos de persistencia, rutas, combate y controles verificados de forma aislada.');
