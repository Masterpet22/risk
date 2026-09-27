/**
 * @file campaign-storage.mjs
 * @description Módulo de persistencia local para guardar y reanudar partidas.
 * Encapsula el acceso a localStorage con clave versionada, validación de integridad
 * y llamada automática al proceso de migración de esquemas hacia la versión actual.
 */

import {upgradeGame,validateState,normalizeDifficulty} from './engine.mjs?v=22';

export const CAMPAIGN_SAVE_KEY='fronteras-acero-save-v3';

const browserStorage=storage=>storage||globalThis.localStorage;

export function saveCampaign(state,difficulty='diplomatico',storage){
  if(!state)return false;
  try{browserStorage(storage).setItem(CAMPAIGN_SAVE_KEY,JSON.stringify({state,difficulty}));return true}catch{return false}
}

export function loadCampaign(storage){
  try{
    const stored=JSON.parse(browserStorage(storage).getItem(CAMPAIGN_SAVE_KEY)||'null');
    const state=upgradeGame(stored?.state);
    if(!state||validateState(state).length)return null;
    return{state,difficulty:normalizeDifficulty(stored.difficulty||state.difficulty)};
  }catch{return null}
}

export function hasSavedCampaign(storage){try{return!!browserStorage(storage).getItem(CAMPAIGN_SAVE_KEY)}catch{return false}}
