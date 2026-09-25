export function clampMoveAmount(value,max){const parsed=Number.parseInt(value,10);return Number.isInteger(parsed)?Math.max(1,Math.min(max,parsed)):null}

export function movementPreview({originName,destinationName,originTroops,destinationTroops,amount}){
  return{html:`<div><span>${originName}</span><strong>${originTroops} → ${originTroops-amount}</strong></div><i>→</i><div><span>${destinationName}</span><strong>${destinationTroops} → ${destinationTroops+amount}</strong></div>`,accessible:`${amount} tropas. ${originName} queda con ${originTroops-amount}; ${destinationName} queda con ${destinationTroops+amount}`};
}
