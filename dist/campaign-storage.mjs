import {upgradeGame,validateState} from './engine.mjs?v=14';

export const CAMPAIGN_SAVE_KEY='fronteras-acero-save-v3';

const browserStorage=storage=>storage||globalThis.localStorage;

export function saveCampaign(state,difficulty='normal',storage){
  if(!state)return false;
  try{browserStorage(storage).setItem(CAMPAIGN_SAVE_KEY,JSON.stringify({state,difficulty}));return true}catch{return false}
}

export function loadCampaign(storage){
  try{
    const stored=JSON.parse(browserStorage(storage).getItem(CAMPAIGN_SAVE_KEY)||'null');
    const state=upgradeGame(stored?.state);
    if(!state||validateState(state).length)return null;
    return{state,difficulty:stored.difficulty||'normal'};
  }catch{return null}
}

export function hasSavedCampaign(storage){try{return!!browserStorage(storage).getItem(CAMPAIGN_SAVE_KEY)}catch{return false}}
