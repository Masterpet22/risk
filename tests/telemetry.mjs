import {strict as assert} from 'node:assert';
import {createGame} from '../dist/engine.mjs';
import {TELEMETRY_VERSION,TELEMETRY_KEY,startTelemetryCampaign,observeTelemetryState,recordCardPlayed,recordCardDiscarded,recordOfferBought,finishTelemetryCampaign,telemetrySummary,exportTelemetry,clearTelemetry} from '../dist/telemetry.mjs';

class MemoryStorage{constructor(){this.data=new Map()}getItem(key){return this.data.get(key)??null}setItem(key,value){this.data.set(key,String(value))}removeItem(key){this.data.delete(key)}}
const storage=new MemoryStorage(),state=createGame({players:3,seed:4401,human:true,mapId:'rift',rulesMode:'terrain',playerCommander:'diplomat'});
startTelemetryCampaign(state,'difícil',storage,1000);
observeTelemetryState(state,storage);
recordCardPlayed('spy',storage);recordCardDiscarded('mobilize',storage);
const bought=state.market.offers[0].id;recordOfferBought(bought,storage);
state.market={...state.market,cycle:1,offers:state.market.offers.map((offer,index)=>({...offer,id:`next_${index}`,boughtBy:[]}))};
observeTelemetryState(state,storage);
state.winner=0;state.victoryType='influence';state.turn=12;state.players[0].influence=151;
finishTelemetryCampaign(state,storage,61000);

const raw=JSON.parse(storage.getItem(TELEMETRY_KEY)),summary=telemetrySummary(storage),exported=JSON.parse(exportTelemetry(storage));
assert.equal(raw.version,TELEMETRY_VERSION);assert.equal(raw.active,null);assert.equal(raw.campaigns.length,1);
assert.equal(raw.campaigns[0].durationSeconds,60);assert.equal(raw.campaigns[0].commander,'diplomat');assert.equal(raw.campaigns[0].result,'victory');
assert.equal(summary.cardsPlayed.spy,1);assert.equal(summary.cardsDiscarded.mobilize,1);assert.equal(summary.offersBought[bought],1);
assert.equal(Object.values(summary.offersIgnored).reduce((a,b)=>a+b,0),(state.market.offers.length*2)-1);
assert.equal(exported.campaigns[0].map,'rift');assert.ok(!JSON.stringify(exported).includes('Tú'));
clearTelemetry(storage);assert.equal(storage.getItem(TELEMETRY_KEY),null);
console.log('OK: telemetría local v1, privacidad, resumen, exportación y borrado verificados.');
