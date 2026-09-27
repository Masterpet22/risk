/**
 * @file market-modal-view.mjs
 * @description Módulo de interfaz para el Mercado Táctico de Fronteras de Acero.
 * Construye la presentación del catálogo rotatorio de ofertas (tropas, cartas y efectos),
 * badges de categoría, estados de fondos, cálculo de precios y la plantilla HTML
 * del modal interactivo de compra durante la fase de Reclutamiento.
 */

export function marketOfferTypeMeta(offerType) {
  if (offerType === 'troops') return { label: 'RESERVA', className: 'market-type-reserve' };
  if (offerType === 'card') return { label: 'CARTA', className: 'market-type-card' };
  return { label: 'EFECTO', className: 'market-type-effect' };
}

export function marketOffersListMarkup({offers = [], player, state, marketPriceFn, cardHandLimitFn}) {
  return offers.map(offer => {
    const alreadyBought = offer.boughtBy?.includes(player.id);
    const actualCost = marketPriceFn(state, offer, player.id);
    const canAfford = player.money >= actualCost;
    const handLimit = cardHandLimitFn(state, player.id);
    const isFullCards = offer.type === 'card' && player.cards.length >= handLimit;
    const canBuy = player.human && state.phase === 'reinforce' && !alreadyBought && canAfford && !isFullCards;

    let buttonOrBadge = '';
    if (alreadyBought) {
      buttonOrBadge = '<span class="market-badge bought">Adquirido</span>';
    } else if (player.human && state.phase === 'reinforce') {
      const reasonDisabled = !canAfford
        ? `Requiere $${actualCost}`
        : isFullCards
        ? `Mano llena (máx ${handLimit})`
        : `Comprar ${offer.name}`;
      buttonOrBadge = `<button class="secondary-btn market-buy-btn" data-offer="${offer.id}" ${canBuy ? '' : 'disabled'} title="${reasonDisabled}">Comprar · $${actualCost}</button>`;
    } else {
      buttonOrBadge = `<span class="market-price-tag">$${actualCost}</span>`;
    }

    const typeMeta = marketOfferTypeMeta(offer.type);
    return `<div class="market-offer ${alreadyBought ? 'offer-bought' : ''}">
      <div class="market-offer-info">
        <span class="market-offer-icon">${offer.icon || '📦'}</span>
        <div>
          <div class="market-offer-title"><b>${offer.name}</b><span class="market-type-badge ${typeMeta.className}">${typeMeta.label}</span></div>
          <small class="market-offer-desc">${offer.desc}</small>
        </div>
      </div>
      <div class="market-offer-action">
        ${buttonOrBadge}
      </div>
    </div>`;
  }).join('');
}

export function marketModalMarkup({offersHtml, player, nextRotationRound, roundsLeft, hasTempDef, totalProd}) {
  return `
    <div class="market-box modal-market-box">
    <div class="market-head">
      <div class="market-head-title">
        <span>OFERTAS ROTATORIAS</span>
        </div>
      ${hasTempDef ? '<span class="temp-def-active-pill">🛡 Defensa +1 activa</span>' : ''}
    </div>
    <p class="market-separation-note"><strong>Fondos: $${player.money}</strong> · Producción al inicio del turno: +$${totalProd}. Tropas, cartas y efectos se compran únicamente aquí; las cartas no vuelven a cobrar al jugarlas.</p>
    <div class="market-offers-list">${offersHtml}</div>
    <p class="market-rotation-note">Rota en la ronda ${nextRotationRound} · ${roundsLeft} ${roundsLeft === 1 ? 'ronda' : 'rondas'} restantes</p>
    </div>`;
}
