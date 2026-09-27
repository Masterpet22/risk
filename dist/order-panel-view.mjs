/**
 * @file order-panel-view.mjs
 * @description Módulo de interfaz para el Panel de Órdenes de Fronteras de Acero.
 * Determina de forma desacoplada la jerarquía textual de cada fase del turno
 * (insignia de fase, título de acción, subtítulo, estado y botón principal de pase),
 * además de generar el marcado accesible de controles reversibles de Reclutamiento.
 */

export function orderPanelPhaseDetails({
  state,
  human,
  selectedFrom,
  selectedTo,
  canAttack,
  originName = '',
  targetName = '',
  remainingManeuvers = 0,
  skipAiRequested = false
}) {
  if (state.phase === 'gameover') {
    const won = state.winner === 0;
    const vType = state.victoryType;
    const title = won ? '¡Victoria Hegemónica!' : 'Campaña Concluida';
    const subtitle = won ? 'Todos los estandartes rivales han caído.' : 'Tus últimos territorios fueron conquistados.';
    const statusHtml = won
      ? '<strong>Objetivo cumplido.</strong> ¡Victoria por ' + (vType === 'influence' ? 'Hegemonía de Influencia' : vType === 'round_limit' ? 'puntuación en Ronda 40' : 'Dominio territorial') + '!'
      : 'Puedes revisar el mapa o ver el resumen final.';
    return {
      badge: won ? 'Victoria' : 'Derrota',
      heading: title,
      subtitle,
      statusHtml,
      phaseBtnText: 'Nueva partida',
      phaseBtnDisabled: false
    };
  }

  if (!human) {
    const p = state.players[state.current];
    return {
      badge: 'Turno IA',
      heading: `${p.name} está actuando`,
      subtitle: skipAiRequested ? 'Resolviendo el resto del turno sin animaciones.' : 'Procesando órdenes de combate y refuerzos.',
      statusHtml: skipAiRequested ? '<strong>Avance rápido activo.</strong>' : '<strong>Espera:</strong> puedes omitir la presentación de este turno.',
      phaseBtnText: skipAiRequested ? 'Avance rápido activo…' : 'Saltar turno enemigo →',
      phaseBtnDisabled: skipAiRequested
    };
  }

  if (state.phase === 'reinforce') {
    const pending = state.pendingReinforcements || 0;
    return {
      badge: 'Reclutamiento',
      heading: pending > 0 ? `${pending} tropas por desplegar` : 'Despliegue completado',
      subtitle: 'Pulsa un territorio propio para añadir tropas.',
      statusHtml: '<strong>Objetivo:</strong> coloca todas las tropas; después comienza el combate.',
      phaseBtnText: pending > 0 ? 'Coloca todos tus refuerzos' : 'Comenzar combate →',
      phaseBtnDisabled: pending > 0
    };
  }

  if (state.phase === 'attack') {
    let heading = 'Fase de Combate';
    let subtitle = 'Elige un territorio propio con 2 o más tropas para atacar.';
    if (selectedTo) {
      heading = 'Asalto preparado';
      subtitle = 'Configura los dados y pulsa lanzar o ataque rápido.';
    } else if (selectedFrom) {
      heading = `Atacando desde ${originName}`;
      subtitle = 'Selecciona un territorio enemigo adyacente con borde rojo.';
    }
    const statusHtml = state.attackMadeThisTurn
      ? '<strong>Combate resuelto.</strong> Puedes continuar o pasar a Maniobra.'
      : canAttack
      ? '<strong>Combate opcional:</strong> ataca, realiza un Sondeo o pasa sin combatir.'
      : '<strong>Sin ataques posibles:</strong> puedes avanzar a Maniobra.';
    return {
      badge: 'Combate',
      heading,
      subtitle,
      statusHtml,
      phaseBtnText: state.attackMadeThisTurn ? 'Terminar combate →' : 'Pasar combate → maniobra',
      phaseBtnDisabled: false
    };
  }

  if (state.phase === 'fortify') {
    let heading = 'Fase de Maniobra';
    let subtitle = 'Mueve tropas por una ruta continua o pasa al cierre.';
    if (selectedTo) {
      heading = 'Transferencia de tropas';
      subtitle = 'Elige la cantidad de tropas y confirma el movimiento.';
    } else if (selectedFrom) {
      heading = `Moviendo desde ${originName}`;
      subtitle = 'Selecciona el territorio destino conectado.';
    }
    const statusHtml = remainingManeuvers > 0
      ? `<strong>${remainingManeuvers} ${remainingManeuvers === 1 ? 'maniobra disponible' : 'maniobras disponibles'}.</strong> Puedes mover o pasar.`
      : '<strong>Sin maniobras base.</strong> Una carta de Movilización habilita una.';
    return {
      badge: 'Maniobra',
      heading,
      subtitle,
      statusHtml,
      phaseBtnText: 'Pasar maniobra → cierre',
      phaseBtnDisabled: false
    };
  }

  return {
    badge: 'Cierre',
    heading: 'Fin de turno',
    subtitle: 'Revisa cartas obtenidas y pasa el turno.',
    statusHtml: state.conqueredThisTurn
      ? '<strong>Territorio conquistado:</strong> elige una carta táctica antes de pasar.'
      : '<strong>Turno finalizado:</strong> pasa al siguiente jugador.',
    phaseBtnText: 'Cerrar turno →',
    phaseBtnDisabled: false
  };
}

export function reinforcementUndoMarkup(last, lastName, undoCount) {
  if (!undoCount || !last) return '';
  return `<button class="secondary-btn undo-reinforcement-btn" id="undoReinforcementBtn">↶ Deshacer ${last.amount > 1 ? `${last.amount} tropas` : 'última tropa'} · ${lastName}</button><small class="undo-hint">${undoCount} ${undoCount === 1 ? 'colocación reversible' : 'colocaciones reversibles'}</small>`;
}
