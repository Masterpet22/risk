/**
 * @file order-controls.mjs
 * @description Módulo de control para la fase de Maniobra (P0.2).
 * Gestiona la validación segura de cantidades de tropas a mover y genera la vista previa
 * en tiempo real de los totales resultantes tanto en formato HTML como para lectores de pantalla.
 */

export function clampMoveAmount(value,max){const parsed=Number.parseInt(value,10);return Number.isInteger(parsed)?Math.max(1,Math.min(max,parsed)):null}

export function movementPreview({originName,destinationName,originTroops,destinationTroops,amount}){
  return{html:`<div><span>${originName}</span><strong>${originTroops} → ${originTroops-amount}</strong></div><i>→</i><div><span>${destinationName}</span><strong>${destinationTroops} → ${destinationTroops+amount}</strong></div>`,accessible:`${amount} tropas. ${originName} queda con ${originTroops-amount}; ${destinationName} queda con ${destinationTroops+amount}`};
}
