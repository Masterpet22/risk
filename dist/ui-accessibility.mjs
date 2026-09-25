export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createLiveAnnouncer(element){
  let previous='';
  return message=>{if(!message||message===previous||!element)return;previous=message;element.textContent='';requestAnimationFrame(()=>{element.textContent=message})};
}

export function restoreFocus(element,fallbackSelector='#mobileOrdersBtn'){
  requestAnimationFrame(()=>{const target=element?.isConnected?element:document.querySelector(fallbackSelector);if(target&&!target.disabled&&typeof target.focus==='function')target.focus()});
}
