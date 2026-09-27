export const TUTORIAL_KEY = 'fronteras-acero-tutorial-v1';

export const TUTORIAL_STEPS = [
  {
    id: 'recruit',
    title: 'Recluta y corrige',
    text: 'Pulsa un territorio propio para colocar tropas. Si te equivocas, usa “Deshacer” antes de comenzar el combate.',
    target: '#orderCard',
    when: ({state}) => state?.phase === 'reinforce'
  },
  {
    id: 'influence',
    title: 'Entiende tu Influencia',
    text: 'Pulsa tu total de Influencia para ver cuánto aporta cada fuente y cuánto falta para ganar.',
    target: '.metric-influence-btn',
    when: ({state}) => state?.phase === 'reinforce'
  },
  {
    id: 'objectives',
    title: 'Consulta tus objetivos',
    text: 'La bandera abre tus objetivos y su progreso sin ocupar espacio permanente en el tablero.',
    target: '#objectivesMapBtn',
    when: ({state}) => state?.phase === 'reinforce'
  },
  {
    id: 'fronts',
    title: 'Lee los Frentes regionales',
    text: 'Cada región registra su propia tensión. Una guerra en el norte no convierte automáticamente los demás límites en guerra.',
    target: '#frontsMapBtn',
    when: ({state}) => state?.phase === 'reinforce'
  },
  {
    id: 'market',
    title: 'Compra con intención',
    text: 'El Mercado concentra tropas, cartas y efectos. Las cartas se pagan al comprarlas y se juegan sin coste.',
    target: '#marketModalBtn',
    when: ({state}) => state?.phase === 'reinforce'
  },
  {
    id: 'attack-origin',
    title: 'Elige quién ataca',
    text: 'Selecciona un territorio propio con al menos 2 tropas. Sus objetivos válidos quedarán destacados.',
    target: '#map',
    when: ({state, selectedFrom}) => state?.phase === 'attack' && !selectedFrom
  },
  {
    id: 'attack-target',
    title: 'Elige un vecino enemigo',
    text: 'Ahora selecciona un territorio enemigo conectado. Las rutas visibles corresponden al origen elegido.',
    target: '#map',
    when: ({state, selectedFrom, selectedTo}) => state?.phase === 'attack' && !!selectedFrom && !selectedTo
  },
  {
    id: 'attack-dice',
    title: 'Sondea o compromete tropas',
    text: 'Sondeo revela la guarnición con 1 dado y nunca conquista. Atacar es opcional; puedes pasar a Maniobra.',
    target: '#actionControls',
    when: ({state, selectedTo}) => state?.phase === 'attack' && !!selectedTo
  },
  {
    id: 'fortify',
    title: 'Maniobra con vista previa',
    text: 'Elige origen y destino propios; ajusta con −/+, escribe una cantidad o usa 1, Mitad y Máximo.',
    target: '#orderCard',
    when: ({state}) => state?.phase === 'fortify'
  },
  {
    id: 'cards',
    title: 'Cartas tácticas',
    text: 'Las cartas se ganan conquistando. Sus iconos muestran la mano y el detalle aparece al pasar o enfocar.',
    target: '#cardsSection',
    when: ({state}) => state?.phase === 'close'
  },
  {
    id: 'terrain-events',
    title: 'Eventos del terreno',
    text: 'En Modo terreno, este acceso anuncia terremotos, tsunamis o temporales antes de que se activen.',
    target: '#eventBanner',
    terrainOnly: true,
    when: ({state}) => state?.rulesMode === 'terrain' && !!(state?.announcedEvent || state?.activeEvent)
  }
];

export function getTutorialStatus(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try {
    return {
      version: 1,
      seen: [],
      dismissed: false,
      completed: false,
      ...JSON.parse(storage?.getItem?.(TUTORIAL_KEY) || '{}')
    };
  } catch {
    return {version: 1, seen: [], dismissed: false, completed: false};
  }
}

export function saveTutorialStatus(status, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  storage?.setItem?.(TUTORIAL_KEY, JSON.stringify(status));
}

export function resetTutorialStatus(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const status = {version: 1, seen: [], dismissed: false, completed: false};
  saveTutorialStatus(status, storage);
  return status;
}

export function dismissTutorialStatus(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const status = getTutorialStatus(storage);
  status.dismissed = true;
  saveTutorialStatus(status, storage);
  return status;
}

export function advanceTutorialStatus(status, currentStepId, rulesMode, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const next = {
    version: status?.version || 1,
    seen: Array.isArray(status?.seen) ? [...status.seen] : [],
    dismissed: !!status?.dismissed,
    completed: false
  };
  if (currentStepId && !next.seen.includes(currentStepId)) {
    next.seen.push(currentStepId);
  }
  const required = TUTORIAL_STEPS.filter(step => !step.terrainOnly || rulesMode === 'terrain');
  next.completed = required.every(step => next.seen.includes(step.id));
  saveTutorialStatus(next, storage);
  return next;
}

export function findNextTutorialStep({status, state, selectedFrom = null, selectedTo = null, currentStepId = null, steps = TUTORIAL_STEPS}) {
  const available = steps.filter(step => {
    if (step.terrainOnly && state?.rulesMode !== 'terrain') return false;
    if (status?.seen?.includes(step.id)) return false;
    return step.when({state, selectedFrom, selectedTo});
  });
  if (currentStepId) {
    const keep = available.find(item => item.id === currentStepId);
    if (keep) return keep;
  }
  return available[0] || null;
}

export function getTutorialProgress(status, rulesMode, steps = TUTORIAL_STEPS) {
  const relevant = steps.filter(item => !item.terrainOnly || rulesMode === 'terrain');
  const seenCount = (status?.seen || []).filter(id => relevant.some(r => r.id === id)).length;
  const current = Math.min(relevant.length, seenCount + 1);
  return {
    current,
    total: relevant.length,
    label: `${current} de ${relevant.length}`
  };
}
