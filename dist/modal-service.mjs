import {restoreFocus} from './ui-accessibility.mjs?v=1';

export function openStrategicModal(options,{onUnavailable=()=>{},fallbackSelector='#helpBtn'}={}){
  if(!globalThis.Swal){onUnavailable();return null}
  const returnFocus=document.activeElement,didOpen=options.didOpen,didClose=options.didClose;
  return globalThis.Swal.fire({...options,confirmButtonText:'Cerrar',showCloseButton:true,background:'#071827',color:'#eaf6ff',confirmButtonColor:'#d6aa3c',customClass:{popup:'strategy-swal',htmlContainer:'strategy-swal-content'},didOpen:popup=>didOpen?.(popup),didClose:()=>{didClose?.();restoreFocus(returnFocus,fallbackSelector)}});
}
