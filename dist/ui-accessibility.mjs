/**
 * @file ui-accessibility.mjs
 * @description Módulo de utilidades de accesibilidad web (P3).
 * Proporciona escape seguro de texto HTML, gestión de regiones aria-live
 * para anuncios en lectores de pantalla y restauración garantizada del foco.
 */

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createLiveAnnouncer(element){
  let previous='';
  return message=>{if(!message||message===previous||!element)return;previous=message;element.textContent='';requestAnimationFrame(()=>{element.textContent=message})};
}

export function restoreFocus(element,fallbackSelector='#mobileOrdersBtn'){
  requestAnimationFrame(()=>{const target=element?.isConnected?element:document.querySelector(fallbackSelector);if(target&&!target.disabled&&typeof target.focus==='function')target.focus()});
}
