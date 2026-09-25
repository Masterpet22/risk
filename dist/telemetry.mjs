export const TELEMETRY_VERSION=1;
export const TELEMETRY_KEY='fronteras-acero-telemetry-v1';

const empty=()=>({version:TELEMETRY_VERSION,campaigns:[],active:null});
const storageOrNull=storage=>storage||globalThis.localStorage||null;
const increment=(bucket,key,amount=1)=>{if(!key)return;bucket[key]=(bucket[key]||0)+amount};
const counts=list=>list.reduce((result,key)=>(increment(result,key),result),{});

export function loadTelemetry(storage){
  try{
    const parsed=JSON.parse(storageOrNull(storage)?.getItem(TELEMETRY_KEY)||'null');
    if(!parsed||parsed.version!==TELEMETRY_VERSION||!Array.isArray(parsed.campaigns))return empty();
    return{version:TELEMETRY_VERSION,campaigns:parsed.campaigns.slice(-100),active:parsed.active||null};
  }catch{return empty()}
}
function saveTelemetry(data,storage){try{storageOrNull(storage)?.setItem(TELEMETRY_KEY,JSON.stringify(data))}catch{}return data}
function abandonActive(data,now){
  if(!data.active)return;
  data.campaigns.push({...data.active,result:'abandoned',durationSeconds:Math.max(0,Math.round((now-data.active.startedAt)/1000)),market:undefined,startedAt:undefined});
  data.active=null;
}
export function startTelemetryCampaign(state,difficulty='normal',storage,now=Date.now()){
  const data=loadTelemetry(storage);abandonActive(data,now);
  data.active={startedAt:now,map:state.mapId,mode:state.rulesMode,difficulty,players:state.players.length,commander:state.players[0]?.commander||'conqueror',cardsPlayed:{},cardsDiscarded:{},offersBought:{},offersIgnored:{},snapshots:[],market:null,lastSnapshotKey:null};
  return saveTelemetry(data,storage);
}
export function ensureTelemetryCampaign(state,difficulty='normal',storage,now=Date.now()){
  const data=loadTelemetry(storage);if(data.active)return data;
  data.active={startedAt:now,map:state.mapId,mode:state.rulesMode,difficulty,players:state.players.length,commander:state.players[0]?.commander||'conqueror',cardsPlayed:{},cardsDiscarded:{},offersBought:{},offersIgnored:{},snapshots:[],market:null,lastSnapshotKey:null};
  return saveTelemetry(data,storage);
}
function updateActive(storage,change){const data=loadTelemetry(storage);if(!data.active)return data;change(data.active);return saveTelemetry(data,storage)}
export const recordCardPlayed=(cardId,storage)=>updateActive(storage,active=>increment(active.cardsPlayed,cardId));
export const recordCardDiscarded=(cardId,storage)=>updateActive(storage,active=>increment(active.cardsDiscarded,cardId));
export function recordOfferBought(offerId,storage){return updateActive(storage,active=>{increment(active.offersBought,offerId);if(active.market&&!active.market.bought.includes(offerId))active.market.bought.push(offerId)})}
function closeMarketCycle(active){if(!active.market)return;for(const id of active.market.offers)if(!active.market.bought.includes(id))increment(active.offersIgnored,id)}
export function observeTelemetryState(state,storage){
  return updateActive(storage,active=>{
    const market=state.market;
    if(market&&active.market?.cycle!==market.cycle){closeMarketCycle(active);active.market={cycle:market.cycle,offers:market.offers.map(offer=>offer.id),bought:market.offers.filter(offer=>offer.boughtBy?.includes(0)).map(offer=>offer.id)}}
    const key=`${state.turn}:${state.current}`;
    if(active.lastSnapshotKey!==key){
      active.lastSnapshotKey=key;
      const leaders=state.players.filter(player=>player.alive).map(player=>({id:player.id,territories:Object.values(state.territories).filter(territory=>territory.owner===player.id).length,influence:player.influence||0,money:player.money||0}));
      active.snapshots.push({round:state.turn,current:state.current,leaders});
      if(active.snapshots.length>160)active.snapshots.shift();
    }
  });
}
export function finishTelemetryCampaign(state,storage,now=Date.now()){
  const data=loadTelemetry(storage),active=data.active;if(!active||state.winner===null)return data;
  closeMarketCycle(active);
  const humanWon=state.winner===0;
  const finished={...active,result:humanWon?'victory':'defeat',victoryType:state.victoryType||'dominance',durationSeconds:Math.max(0,Math.round((now-active.startedAt)/1000)),rounds:state.turn,finalTerritories:Object.values(state.territories).filter(territory=>territory.owner===0).length,finalInfluence:state.players[0]?.influence||0,market:undefined,startedAt:undefined,lastSnapshotKey:undefined};
  data.campaigns.push(finished);data.campaigns=data.campaigns.slice(-100);data.active=null;
  return saveTelemetry(data,storage);
}
export function telemetrySummary(storage){
  const data=loadTelemetry(storage),campaigns=data.campaigns;
  const merge=field=>campaigns.reduce((all,campaign)=>{for(const[key,value]of Object.entries(campaign[field]||{}))increment(all,key,value);return all},{});
  return{version:TELEMETRY_VERSION,campaigns:campaigns.length,completed:campaigns.filter(c=>c.result!=='abandoned').length,victories:campaigns.filter(c=>c.result==='victory').length,commanders:counts(campaigns.map(c=>c.commander)),cardsPlayed:merge('cardsPlayed'),cardsDiscarded:merge('cardsDiscarded'),offersBought:merge('offersBought'),offersIgnored:merge('offersIgnored'),active:!!data.active};
}
export function exportTelemetry(storage){return JSON.stringify(loadTelemetry(storage),null,2)}
export function clearTelemetry(storage){try{storageOrNull(storage)?.removeItem(TELEMETRY_KEY)}catch{}return empty()}
