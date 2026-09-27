/**
 * @file ui-modules.mjs
 * @description Suite de pruebas unitarias aisladas para los módulos de interfaz desacoplados.
 * Valida de forma independiente la persistencia, geometría de rutas, vistas de combate,
 * controles de maniobra, máquina de estados del tutorial, crónica, vistas estratégicas,
 * catálogo del mercado táctico y detalles del panel de órdenes sin requerir navegador.
 */

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
assert.equal(comparisonMarkup({attackerDice:[6],defenderDice:[5],rawAttackerDice:[6],rawDefenderDice:[5],bonus:{attacker:0,defender:0,attackerReasons:[],defenderReasons:[]}}),'');
assert.match(comparisonMarkup({attackerDice:[7],defenderDice:[5],rawAttackerDice:[6],rawDefenderDice:[5],bonus:{attacker:1,defender:0,attackerReasons:['Doctrina ofensiva'],defenderReasons:[]}}),/Doctrina ofensiva/);
const storage=new MemoryStorage(),state=createGame({players:2,seed:6100,human:true});assert.equal(saveCampaign(state,'belico',storage),true);assert.equal(hasSavedCampaign(storage),true);assert.ok(storage.getItem(CAMPAIGN_SAVE_KEY));const loaded=loadCampaign(storage);assert.equal(loaded.difficulty,'belico');assert.equal(loaded.state.mapId,state.mapId);

// Pruebas de tutorial-controller
import {getTutorialStatus,saveTutorialStatus,resetTutorialStatus,dismissTutorialStatus,advanceTutorialStatus,findNextTutorialStep,getTutorialProgress} from '../dist/tutorial-controller.mjs';
const tutStore=new MemoryStorage();
let tStatus=getTutorialStatus(tutStore);
assert.equal(tStatus.version,1);assert.equal(tStatus.dismissed,false);
tStatus=dismissTutorialStatus(tutStore);assert.equal(tStatus.dismissed,true);
tStatus=resetTutorialStatus(tutStore);assert.equal(tStatus.dismissed,false);assert.equal(tStatus.seen.length,0);
const firstStep=findNextTutorialStep({status:tStatus,state,selectedFrom:null,selectedTo:null});
assert.ok(firstStep);assert.equal(firstStep.id,'recruit');
const prog=getTutorialProgress(tStatus,'classic');
assert.match(prog.label,/1 de /);
const advanced=advanceTutorialStatus(tStatus,'recruit','classic',tutStore);
assert.ok(advanced.seen.includes('recruit'));

// Pruebas de chronicle-modal-view
import {chronicleCategory,chronicleModalMarkup,sidebarLogMarkup} from '../dist/chronicle-modal-view.mjs';
assert.equal(chronicleCategory('Territorio conquistado con éxito'),'combat');
assert.equal(chronicleCategory('Compra en el mercado: 3 tropas por $30'),'economy');
assert.equal(chronicleCategory('Terremoto en región norte'),'events');
assert.equal(chronicleCategory('Inicio de campaña'),'campaign');
const logMarkup=sidebarLogMarkup([{text:'Ataque exitoso',p:0}],state.players);
assert.match(logMarkup,/Ataque exitoso/);
const chronicleHtml=chronicleModalMarkup([{turn:1,text:'Ataque exitoso',p:0}],state.players);
assert.match(chronicleHtml,/chronicle-modal/);assert.match(chronicleHtml,/data-chronicle-filter="combat"/);

// Pruebas de strategic-views
import {influenceModalMarkup,frontsModalMarkup} from '../dist/strategic-views.mjs';
import {influenceBreakdown,influenceVictoryEligibility,marketPrice,cardHandLimit} from '../dist/engine.mjs';
const infBreakdown=influenceBreakdown(state,0),infElig=influenceVictoryEligibility(state,0);
const infMarkup=influenceModalMarkup({player:state.players[0],breakdown:infBreakdown,eligibility:infElig});
assert.match(infMarkup,/influence-breakdown/);assert.match(infMarkup,/Presencia territorial/);
const frontsHtml=frontsModalMarkup({rows:[],state,human:state.players[0]});
assert.match(frontsHtml,/fronts-modal/);assert.match(frontsHtml,/front-legend/);

// Pruebas de market-modal-view
import {marketOfferTypeMeta,marketOffersListMarkup,marketModalMarkup} from '../dist/market-modal-view.mjs';
assert.equal(marketOfferTypeMeta('troops').label,'RESERVA');
assert.equal(marketOfferTypeMeta('card').label,'CARTA');
assert.equal(marketOfferTypeMeta('effect').label,'EFECTO');
const mOffersMarkup=marketOffersListMarkup({offers:[{id:'t3',name:'3 tropas',type:'troops',desc:'+3 reservas',icon:'🛡'}],player:state.players[0],state,marketPriceFn:marketPrice,cardHandLimitFn:cardHandLimit});
assert.match(mOffersMarkup,/market-offer/);
const mModalMarkup=marketModalMarkup({offersHtml:mOffersMarkup,player:state.players[0],nextRotationRound:4,roundsLeft:3,hasTempDef:false,totalProd:5});
assert.match(mModalMarkup,/modal-market-box/);assert.match(mModalMarkup,/OFERTAS ROTATORIAS/);

// Pruebas de order-panel-view
import {orderPanelPhaseDetails,reinforcementUndoMarkup} from '../dist/order-panel-view.mjs';
const rfDetails=orderPanelPhaseDetails({state:{phase:'reinforce',pendingReinforcements:3},human:true});
assert.equal(rfDetails.badge,'Reclutamiento');assert.match(rfDetails.heading,/3 tropas por desplegar/);
const undoHtml=reinforcementUndoMarkup({id:'t1',amount:2},'Tierras Altas',1);
assert.match(undoHtml,/Deshacer 2 tropas · Tierras Altas/);
const atDetails=orderPanelPhaseDetails({state:{phase:'attack',attackMadeThisTurn:false},human:true,canAttack:true});
assert.equal(atDetails.badge,'Combate');assert.match(atDetails.statusHtml,/Combate opcional/);
const ftDetails=orderPanelPhaseDetails({state:{phase:'fortify'},human:true,remainingManeuvers:2});
assert.equal(ftDetails.badge,'Maniobra');assert.match(ftDetails.statusHtml,/2 maniobras disponibles/);

console.log('OK: módulos de persistencia, rutas, combate, controles, tutorial, crónica, vistas estratégicas, mercado y panel de órdenes verificados de forma aislada.');
