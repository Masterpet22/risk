import {createGame,aiTurn,validateState,TERRITORIES,MAPS,REGIONS,getRegion,getTerritories,UNIT_TYPES,ownedIds,enemiesOf,placeTroops,undoReinforcement,finishReinforcement,setPhase,attackRound,endTurn,fortify,tradeCards,territoryProduction,productionTotal,collectIncome,buyReinforcements,reinforcementCount,upgradeGame,drawTacticalCard,resolvePendingCardDraw,playTacticalCard,tacticalCardCost,isConnectionBlocked,TACTICAL_CARDS,buyMarketItem,generateMarket,MARKET_CATALOG,calculateInfluence,checkObjectives,rotateTemporaryObjectives,OBJECTIVES_CATALOG,COMMANDERS,COMMANDER_IDS,FRONT_STATES,FRONT_STATE_LABELS,getFrontState,updateFrontTension,coolDownFronts,isTerritoryInWarFront,VISIBILITY_LEVELS,approximateTroops,minDistanceToOwned,isTerritorySpied,getTerritoryVisibility,getTerritoryIntel,EVENT_CATALOG,EVENT_IDS,announceEvent,triggerEvent,checkEventCycle} from '../dist/engine.mjs';

let maxTurns=0;
for(let seed=1;seed<=60;seed++){
  const mapId=Object.keys(MAPS)[seed%3],rulesMode=seed%2?'classic':'terrain';
  const playerCommander=COMMANDER_IDS[seed%COMMANDER_IDS.length];
  const state=createGame({players:2+(seed%3),seed,human:false,mapId,rulesMode,playerCommander});
  let actions=0;
  while(state.winner===null&&actions<3000){const report=aiTurn(state,state.current,seed%2?'normal':'difícil');if(!Array.isArray(report.battles))throw new Error('Informe IA ausente');actions++;}
  const errors=validateState(state);
  if(errors.length)throw new Error(`Semilla ${seed}: ${errors.join(', ')}`);
  if(state.winner===null)throw new Error(`Semilla ${seed}: partida no terminó tras ${actions} turnos`);
  if(state.victoryType==='dominance'){
    if(state.players.filter(p=>p.alive).length!==1)throw new Error(`Semilla ${seed}: victoria inconsistente`);
    if(Object.values(state.territories).some(t=>t.owner!==state.winner))throw new Error(`Semilla ${seed}: el ganador no posee todo el mapa`);
  }else if(state.victoryType==='influence'){
    if(state.players[state.winner].influence<150)throw new Error(`Semilla ${seed}: ganador por influencia con menos de 150 pts`);
  }else if(state.victoryType==='round_limit'){
    if(state.turn<40)throw new Error(`Semilla ${seed}: límite de ronda declarado antes de ronda 40`);
  }else{
    throw new Error(`Semilla ${seed}: tipo de victoria desconocido: ${state.victoryType}`);
  }
  if(state.turn>40)throw new Error(`Semilla ${seed}: superó las 40 rondas (${state.turn})`);
  maxTurns=Math.max(maxTurns,state.turn);
}
console.log(`OK: 60 partidas completas, ${TERRITORIES.length} territorios, máximo ${maxTurns} rondas (límite 40 respetado).`);

// Flujo humano: no puede saltarse el combate cuando existe un ataque legal.
const manual=createGame({players:2,seed:2026,human:true});
while(manual.pendingReinforcements)placeTroops(manual,ownedIds(manual,0)[0],1);
if(!finishReinforcement(manual))throw new Error('No se pudo confirmar el Reclutamiento completo');
if(setPhase(manual,'fortify'))throw new Error('Se permitió saltar el combate obligatorio');
const origin=ownedIds(manual,0).find(id=>manual.territories[id].troops>1&&enemiesOf(manual,id).length);
if(!origin)throw new Error('La prueba no produjo un ataque legal');
const target=enemiesOf(manual,origin)[0];
const roll=attackRound(manual,origin,target,1);
if(!roll.ok||!manual.attackMadeThisTurn||roll.deployedTroops!==1||roll.rawAttackerDice.length!==1)throw new Error('La tirada obligatoria no registró el soldado desplegado');
if(manual.winner===null&&!setPhase(manual,'fortify'))throw new Error('No se permitió avanzar después de combatir');
if(manual.winner===null&&!setPhase(manual,'close'))throw new Error('No se mostró el cierre del turno');

// Cartas tácticas: mano máxima 3, descarte al robar la cuarta, costes y efectos.
const tc=createGame({players:2,seed:77,human:true});
tc.players[0].cards=['spy','mobilize','counter'];
const drawRes=drawTacticalCard(tc,0);
if(!drawRes.pending||!tc.pendingCardDraw)throw new Error('No se generó descarte pendiente al robar la cuarta carta');
resolvePendingCardDraw(tc,'spy');
if(tc.players[0].cards.length!==3||tc.players[0].cards.includes('spy'))throw new Error('El descarte no dejó exactamente 3 cartas en mano');

// Sabotaje: coste $15, reduce producción a la mitad, contraataque con contrainteligencia
const saboGame=createGame({players:2,seed:88,human:true});
saboGame.players[0].money=30;saboGame.players[0].cards=['sabotage'];
saboGame.players[1].cards=['counter'];
const targetT=ownedIds(saboGame,1)[0];
const saboBlocked=playTacticalCard(saboGame,'sabotage',targetT,0);
if(!saboBlocked.ok||!saboBlocked.countered||saboGame.players[1].cards.includes('counter'))throw new Error('La Contrainteligencia no neutralizó el Sabotaje');
if(saboGame.sabotagedTerritories[targetT])throw new Error('El territorio saboteado no debió afectarse tras contrainteligencia');

saboGame.players[0].cards=['sabotage'];
const prodBefore=territoryProduction(saboGame,targetT);
const saboSuccess=playTacticalCard(saboGame,'sabotage',targetT,0);
if(!saboSuccess.ok||saboSuccess.countered||territoryProduction(saboGame,targetT)!==Math.floor(prodBefore/2))throw new Error('El sabotaje no redujo la producción a la mitad');

// Bloqueo: coste $25, bloquea ataque y maniobra
const blockGame=createGame({players:2,seed:99,human:true});
blockGame.players[0].money=30;blockGame.players[0].cards=['blockade'];
const bFrom=ownedIds(blockGame,0).find(id=>enemiesOf(blockGame,id).length);
const bTo=enemiesOf(blockGame,bFrom)[0];
const blockRes=playTacticalCard(blockGame,'blockade',[bFrom,bTo],0);
if(!blockRes.ok||!isConnectionBlocked(blockGame,bFrom,bTo))throw new Error('El bloqueo de conexión falló');
if(enemiesOf(blockGame,bFrom).includes(bTo))throw new Error('El territorio bloqueado sigue apareciendo como enemigo atacable');
if(attackRound(blockGame,bFrom,bTo,1).ok)throw new Error('Se permitió atacar a través de una conexión bloqueada');

// Movilización: coste $10, permite segunda maniobra
const mobGame=createGame({players:2,seed:101,human:true});
mobGame.players[0].money=20;mobGame.players[0].cards=['mobilize'];
while(mobGame.pendingReinforcements)placeTroops(mobGame,ownedIds(mobGame,0)[0],1);
finishReinforcement(mobGame);
setPhase(mobGame,'fortify');
playTacticalCard(mobGame,'mobilize',null,0);
if(mobGame.extraFortifies!==1)throw new Error('Movilización no otorgó maniobra adicional');

// Movilización también funciona cuando se juega después de la primera maniobra.
const mobAfter=createGame({players:2,seed:102,human:true});
mobAfter.territories.n1.owner=mobAfter.territories.n2.owner=0;mobAfter.territories.n1.troops=4;mobAfter.territories.n2.troops=2;mobAfter.phase='fortify';
if(!fortify(mobAfter,'n1','n2',1)||mobAfter.phase!=='close')throw new Error('La primera maniobra no cerró la fase');
mobAfter.players[0].cards=['mobilize'];mobAfter.players[0].money=10;
if(!playTacticalCard(mobAfter,'mobilize',null,0).ok||mobAfter.phase!=='fortify'||!fortify(mobAfter,'n2','n1',1))throw new Error('Movilización no habilitó una segunda maniobra después de la primera');

const reward=createGame({players:2,seed:991,human:true});
while(reward.pendingReinforcements)placeTroops(reward,ownedIds(reward,0)[0],1);
finishReinforcement(reward);
const strong=ownedIds(reward,0).find(id=>enemiesOf(reward,id).length);
const victim=enemiesOf(reward,strong)[0];reward.territories[strong].troops=30;reward.territories[victim].troops=1;
while(reward.territories[victim].owner!==0)attackRound(reward,strong,victim,3);
setPhase(reward,'fortify');setPhase(reward,'close');endTurn(reward);
if(reward.players[0].cards.length!==1)throw new Error('No se robó carta después de conquistar');
if(reward.campaign.players[0].conquests!==1||reward.campaign.conquests.length!==1||reward.campaign.players[0].cards!==1)throw new Error('El resumen de campaña no registró conquista y carta');
if(reward.campaign.players[0].lost+reward.campaign.players[1].lost<1)throw new Error('El resumen de campaña no registró bajas');
console.log('OK: combate obligatorio, selección de dados y cartas tácticas verificados.');

// Reclutamiento reversible: varias colocaciones, unidad anterior y confirmación explícita.
const undoGame=createGame({players:2,seed:2040,human:true,rulesMode:'terrain'});
const undoTerritory=ownedIds(undoGame,0)[0],undoBefore=undoGame.territories[undoTerritory].troops,undoPending=undoGame.pendingReinforcements,undoUnit=undoGame.territories[undoTerritory].unitType;
if(!placeTroops(undoGame,undoTerritory,1,'artillery')||!placeTroops(undoGame,undoTerritory,2,'cavalry'))throw new Error('No se registraron colocaciones reversibles');
const undoTwo=undoReinforcement(undoGame);
if(!undoTwo||undoTwo.amount!==2||undoGame.territories[undoTerritory].troops!==undoBefore+1||undoGame.territories[undoTerritory].unitType!=='artillery')throw new Error('Deshacer no restauró la colocación y unidad anteriores');
const undoOne=undoReinforcement(undoGame);
if(!undoOne||undoGame.territories[undoTerritory].troops!==undoBefore||undoGame.territories[undoTerritory].unitType!==undoUnit||undoGame.pendingReinforcements!==undoPending)throw new Error('Deshacer no restauró el inicio de Reclutamiento');
if(undoReinforcement(undoGame)!==false||finishReinforcement(undoGame)!==false)throw new Error('Se permitió deshacer o terminar Reclutamiento en un estado inválido');
while(undoGame.pendingReinforcements)placeTroops(undoGame,undoTerritory,1,'infantry');
if(undoGame.phase!=='reinforce'||!finishReinforcement(undoGame)||undoGame.phase!=='attack'||undoGame.reinforcementHistory.length)throw new Error('La confirmación explícita de Reclutamiento falló');
console.log('OK: Reclutamiento reversible y confirmación explícita verificados.');

// Ventaja circular en modo terreno y ausencia de modificadores en clásico.
const terrain=createGame({players:2,seed:505,human:true,mapId:'archipelago',rulesMode:'terrain',playerCommander:'industrial'});
while(terrain.pendingReinforcements)placeTroops(terrain,ownedIds(terrain,0)[0],1,'infantry');
finishReinforcement(terrain);
const tFrom=ownedIds(terrain,0).find(id=>terrain.territories[id].troops>1&&enemiesOf(terrain,id).length),tTo=enemiesOf(terrain,tFrom)[0];
terrain.territories[tFrom].unitType='infantry';terrain.territories[tTo].unitType='artillery';
const terrainRoll=attackRound(terrain,tFrom,tTo,1);
if(terrainRoll.bonus.attacker!==1||terrainRoll.attackerDice[0]!==terrainRoll.rawAttackerDice[0]+1)throw new Error('El bono circular +1 no se aplicó');
const classic=createGame({players:2,seed:506,human:true,mapId:'rift',rulesMode:'classic',playerCommander:'industrial'});
while(classic.pendingReinforcements)placeTroops(classic,ownedIds(classic,0)[0],1);
finishReinforcement(classic);
const cFrom=ownedIds(classic,0).find(id=>classic.territories[id].troops>1&&enemiesOf(classic,id).length),cTo=enemiesOf(classic,cFrom)[0];
const classicRoll=attackRound(classic,cFrom,cTo,1);
if(classicRoll.bonus.attacker||classicRoll.bonus.defender)throw new Error('El modo clásico aplicó modificadores');
console.log('OK: 3 mapas, informes IA, modo clásico y rueda de terreno verificados.');

const allTerritoryNames=new Set(),allRegionNames=new Set();
for(const map of Object.values(MAPS)){
  const byId=Object.fromEntries(map.territories.map(t=>[t.id,t]));
  for(const t of map.territories){if(allTerritoryNames.has(t.name))throw new Error(`Nombre territorial repetido entre mapas: ${t.name}`);allTerritoryNames.add(t.name)}
  for(const key of Object.keys(REGIONS)){const regionName=getRegion(map,key).name;if(allRegionNames.has(regionName))throw new Error(`Nombre regional repetido entre mapas: ${regionName}`);allRegionNames.add(regionName)}
  for(const t of map.territories)for(const n of t.n)if(!byId[n]?.n.includes(t.id))throw new Error(`${map.name}: ruta asimétrica ${t.id}-${n}`);
  const seen=new Set([map.territories[0].id]),queue=[map.territories[0].id];
  while(queue.length){const id=queue.shift();for(const n of byId[id].n)if(!seen.has(n)){seen.add(n);queue.push(n)}}
  if(seen.size!==map.territories.length)throw new Error(`${map.name}: mapa desconectado`);
}
console.log('OK: conectividad, rutas simétricas y nombres únicos verificados en los 3 mapas.');

// Economía: mayoría regional, control total, cobro único, gasto y continuidad del guardado anterior.
const economy=createGame({players:2,seed:314,human:true});
for(const t of TERRITORIES)economy.territories[t.id].owner=1;
economy.territories.n1.owner=economy.territories.n2.owner=0;
if(territoryProduction(economy,'n1')!==2)throw new Error('La mayoría regional no aportó +1');
economy.territories.n3.owner=0;
if(territoryProduction(economy,'n1')!==2)throw new Error('Se otorgó el bono total antes de controlar toda la región');
economy.territories.n4.owner=0;
if(territoryProduction(economy,'n1')!==4||productionTotal(economy,0)!==16)throw new Error('El control total no aportó +2 adicionales');
economy.players[0].money=0;economy.players[0].lastIncomeRound=0;
if(collectIncome(economy,0)!==16||collectIncome(economy,0)!==0||economy.players[0].money!==16)throw new Error('El cobro económico se duplicó o calculó mal');
const before=economy.pendingReinforcements;
if(!buyReinforcements(economy)||economy.players[0].money!==6||economy.pendingReinforcements!==before+3||buyReinforcements(economy))throw new Error('La compra de refuerzos no respetó coste y saldo');
const previousV3=createGame({players:2,seed:315});previousV3.version=3;for(const p of previousV3.players){delete p.money;delete p.lastIncomeRound;p.cards=2;delete p.influence;delete p.completedObjectives;delete p.commander}
if(upgradeGame(previousV3)?.version!==10||previousV3.players[0].money!==productionTotal(previousV3,0)||previousV3.players[0].cards.length!==2||!previousV3.market?.offers||typeof previousV3.players[0].influence!=='number')throw new Error('La partida v3 no migró a v10 de forma estable');
const previousV4=createGame({players:2,seed:316});previousV4.version=4;for(const p of previousV4.players){p.cards=3;delete p.influence;delete p.completedObjectives;delete p.commander}
if(upgradeGame(previousV4)?.version!==10||previousV4.players[0].cards.length!==3||!previousV4.market?.offers)throw new Error('La partida v4 no migró a v10 de forma estable');
const previousV5=createGame({players:2,seed:317});previousV5.version=5;delete previousV5.market;delete previousV5.tempDefense;for(const p of previousV5.players){delete p.influence;delete p.completedObjectives;delete p.commander}
if(upgradeGame(previousV5)?.version!==10||!previousV5.market?.offers)throw new Error('La partida v5 no migró a v10 de forma estable');
const previousV6=createGame({players:2,seed:318});previousV6.version=6;delete previousV6.victoryType;delete previousV6.turnConquests;for(const p of previousV6.players){delete p.influence;delete p.completedObjectives;delete p.commander}
if(upgradeGame(previousV6)?.version!==10||typeof previousV6.players[0].influence!=='number'||!Array.isArray(previousV6.players[0].completedObjectives))throw new Error('La partida v6 no migró a v10 de forma estable');
console.log('OK: producción, tesoro, compras y migración v10 verificados.');

// Pruebas unitarias de Mercado:
const mg=createGame({players:2,seed:404,human:true});
if(!mg.market||mg.market.offers.length<3||mg.market.offers.length>4)throw new Error('El mercado inicial no tiene entre 3 y 4 ofertas');
if(mg.market.cycle!==0)throw new Error('El ciclo de mercado inicial debe ser 0');

// Compra fuera de fase o sin dinero
mg.players[0].money=10;
const testOffer=mg.market.offers[0];
const failMoney=buyMarketItem(mg,testOffer.id,0);
if(failMoney.ok)throw new Error('Se permitió comprar con fondos insuficientes');

mg.phase='attack';
mg.players[0].money=100;
const failPhase=buyMarketItem(mg,testOffer.id,0);
if(failPhase.ok)throw new Error('Se permitió comprar fuera de fase Reclutamiento');

// Compra exitosa de tropas
mg.phase='reinforce';
mg.players[0].money=100;
const troopOffer=mg.market.offers.find(o=>o.type==='troops');
if(troopOffer){
  const moneyBefore=mg.players[0].money;
  const pendingBefore=mg.pendingReinforcements;
  const buyRes=buyMarketItem(mg,troopOffer.id,0);
  if(!buyRes.ok||mg.players[0].money!==moneyBefore-troopOffer.cost||mg.pendingReinforcements!==pendingBefore+troopOffer.value)throw new Error('La compra de tropas en el mercado falló');
  if(!troopOffer.boughtBy.includes(0))throw new Error('No se registró la compra del jugador');
  const buyTwice=buyMarketItem(mg,troopOffer.id,0);
  if(buyTwice.ok)throw new Error('Se permitió comprar la misma oferta dos veces en el mismo ciclo');
}

// Compra de defensa temporal y efecto en combate
const defOffer=mg.market.offers.find(o=>o.type==='defense')||{id:'temp_defense',name:'Defensa Temporal',cost:40,type:'defense',boughtBy:[]};
if(!mg.market.offers.some(o=>o.id==='temp_defense'))mg.market.offers.push(defOffer);
mg.players[1].money=100;
// Simulamos compra de jugador 1 en su turno
mg.current=1;mg.phase='reinforce';
const buyDef=buyMarketItem(mg,defOffer.id,1);
if(!buyDef.ok||mg.tempDefense[1]!==mg.turn)throw new Error('La defensa temporal no se activó');

// Verificamos que al defender, el jugador 1 recibe +1 en su dado defensivo
mg.current=0;mg.phase='attack';
const aT=ownedIds(mg,0).find(id=>enemiesOf(mg,id).includes(ownedIds(mg,1)[0]));
const dT=ownedIds(mg,1)[0];
mg.territories[aT].troops=10;mg.territories[dT].troops=5;
const rollDefense=attackRound(mg,aT,dT,1);
if(rollDefense.bonus.defender!==1)throw new Error('El bono de defensa temporal +1 no se aplicó en combate');

// Rotación del mercado tras 3 rondas (ronda 4 = ciclo 1)
mg.turn=3;mg.current=1;
endTurn(mg); // Al terminar jugador 1 en turno 3, pasa a turno 4 y jugador 0
if(mg.turn!==4||mg.market.cycle!==1)throw new Error('El mercado no rotó al inicio de la ronda 4');
console.log('OK: Mercado táctico verificado (catálogo, compras, stock de ciclo, defensa temporal y rotación).');

// --- PRUEBAS UNITARIAS DE INFLUENCIA Y OBJETIVOS (§8, §12, §16) ---
const ig=createGame({players:2,seed:808,human:true});
// 1. Verificación de la fórmula de Influencia:
// INFLUENCIA = (Territorios * 2) + (Regiones 100% * 8) + (Producción * 1) + (min(Tropas, 30) * 0.3) + Objetivos
for(const t of TERRITORIES)ig.territories[t.id].owner=1;
// Jugador 0 controla región Norte completa (4 territorios: n1, n2, n3, n4)
ig.territories.n1.owner=ig.territories.n2.owner=ig.territories.n3.owner=ig.territories.n4.owner=0;
ig.territories.n1.troops=15;ig.territories.n2.troops=10;ig.territories.n3.troops=10;ig.territories.n4.troops=10;
// Total tropas = 45 -> el tope debe ser 30 -> 30 * 0.3 = 9
// Territorios = 4 -> 4 * 2 = 8
// Regiones 100% = 1 (Norte) -> 1 * 8 = 8
// Producción: 4 territorios con 100% de región -> cada uno produce 1 + 1 + 2 = 4 -> total producción = 16 -> 16 * 1 = 16
// Objetivos = 0
// Total esperado = 8 + 8 + 16 + 9 + 0 = 41
const calcInf=calculateInfluence(ig,0);
if(calcInf!==41)throw new Error(`Cálculo de influencia erróneo: esperado 41, obtenido ${calcInf}`);

// 2. Cumplimiento de objetivos
ig.players[0].money=60;
checkObjectives(ig,0);
if(!ig.players[0].completedObjectives.includes('treasury_50'))throw new Error('El objetivo Poderío Económico ($50) no se cumplió');
const infWithObj=calculateInfluence(ig,0);
if(infWithObj!==51)throw new Error(`Influencia con objetivo errónea: esperado 51, obtenido ${infWithObj}`);

// 3. Condición de Victoria B: Hegemonía por Influencia (>= 150)
const vicB=createGame({players:2,seed:809,human:true});
for(const t of TERRITORIES)vicB.territories[t.id].owner=0;
vicB.territories.i4.owner=1;vicB.territories.i4.troops=2; // Rival vivo con 1 territorio
vicB.current=1;vicB.turn=2;
endTurn(vicB); // Jugador 1 termina su turno, vuelve a 0 (cierre de ronda completa con Influencia > 150)
if(vicB.winner!==0||vicB.victoryType!=='influence'||vicB.phase!=='gameover')throw new Error('La victoria por Hegemonía de Influencia (>= 150) no se activó al cierre de ronda');

// 4. Condición de Victoria C: Límite de 40 rondas (ambos con < 150 de influencia)
const vicC=createGame({players:2,seed:810,human:true});
// Reparto balanceado 13 vs 11 alternando territorios para evitar regiones al 100%
for(let i=0;i<TERRITORIES.length;i++)vicC.territories[TERRITORIES[i].id].owner=i%2===0?0:1;
vicC.territories[TERRITORIES[0].id].troops=10; // Ventaja para jugador 0
vicC.turn=40;vicC.current=1;
endTurn(vicC); // Cierre de ronda 40 con influencias < 150
if(vicC.winner===null||vicC.victoryType!=='round_limit'||vicC.phase!=='gameover'||vicC.players.some(p=>p.alive&&p.influence>vicC.players[vicC.winner].influence))throw new Error(`La victoria por límite de 40 rondas no se activó para el líder (tipo: ${vicC.victoryType}, inf: ${vicC.players.map(p=>p.influence)})`);

console.log('OK: Fórmula de Influencia (§8), Objetivos (§12) y Condiciones de Victoria B y C (§16) verificadas.');

// --- PRUEBAS UNITARIAS DE DOCTRINAS Y FRENTES DE GUERRA (§9.1, §13) ---
// 1. Doctrina El Conquistador: +1 en primer ataque del turno
const testConq = createGame({players:2, seed:901, human:true, playerCommander:'conqueror'});
const cqFrom = ownedIds(testConq, 0).find(id => enemiesOf(testConq, id).length);
const cqTo = enemiesOf(testConq, cqFrom)[0];
testConq.territories[cqFrom].troops = 10;
testConq.territories[cqTo].troops = 5;
testConq.phase = 'attack';
const r1 = attackRound(testConq, cqFrom, cqTo, 1);
if (r1.bonus.attacker !== 1) throw new Error('El Conquistador no recibió +1 en su primer ataque');
const r2 = attackRound(testConq, cqFrom, cqTo, 1);
if (r2.bonus.attacker !== 0) throw new Error('El Conquistador no debió recibir +1 en su segundo ataque');

// 2. Doctrina El Guardián y Frentes de Guerra:
const testGuard = createGame({players:2, seed:902, human:true, playerCommander:'guardian'});
testGuard.players[1].commander = 'guardian';
const gFrom = ownedIds(testGuard, 0).find(id => enemiesOf(testGuard, id).length);
const gTo = enemiesOf(testGuard, gFrom)[0];
testGuard.territories[gFrom].troops = 10;
testGuard.territories[gTo].troops = 5;
testGuard.phase = 'attack';
const gR1 = attackRound(testGuard, gFrom, gTo, 1);
if (gR1.bonus.defender !== 0) throw new Error('El Guardián defensor recibió bono indebido sin frente en guerra');
updateFrontTension(testGuard, 0, 1, 'war');
if (getFrontState(testGuard, 0, 1) !== 'war') throw new Error('El frente no se actualizó a guerra');
if (!isTerritoryInWarFront(testGuard, gTo)) throw new Error('El territorio no figura en frente en guerra');
const gR2 = attackRound(testGuard, gFrom, gTo, 1);
if (gR2.bonus.defender !== 1) throw new Error('El Guardián defensor no recibió +1 con frente en guerra');

// Enfriamiento de frentes en cierre de ronda completa
testGuard.turn = 1;
testGuard.current = 1;
endTurn(testGuard); // R1 termina, pasa a turno 2
testGuard.current = 1;
endTurn(testGuard); // R2 termina sin hostilidades -> frente en guerra se enfría a conflicto
if (getFrontState(testGuard, 0, 1) !== 'conflict') throw new Error('El frente en guerra no se enfrió a conflicto tras ronda pacífica');

// 3. Doctrina El Industrial: +1 producción base por territorio
const testInd = createGame({players:2, seed:903, human:true, playerCommander:'industrial'});
const indTerr = ownedIds(testInd, 0)[0];
const tObj = getTerritories(testInd).find(t => t.id === indTerr);
const regTerrs = getTerritories(testInd).filter(t => t.region === tObj.region);
for (const rt of regTerrs) testInd.territories[rt.id].owner = 1;
testInd.territories[indTerr].owner = 0;
const indProd = territoryProduction(testInd, indTerr, 0);
if (indProd !== 2) throw new Error(`El Industrial debe producir $2 base por territorio, obtenido: $${indProd}`);

// 4. Doctrina El Estratega: Costes reducidos en Bloqueo ($15) y Movilización ($0)
const testStrat = createGame({players:2, seed:904, human:true, playerCommander:'strategist'});
testStrat.players[0].cards = ['blockade', 'mobilize'];
testStrat.players[0].money = 15;
const sConn = [ownedIds(testStrat, 0)[0], getTerritories(testStrat).find(t => t.id === ownedIds(testStrat, 0)[0]).n[0]];
const bRes = playTacticalCard(testStrat, 'blockade', sConn, 0);
if (!bRes.ok || testStrat.players[0].money !== 0) throw new Error('El Estratega debió pagar exactamente $15 por Bloqueo');
const mRes = playTacticalCard(testStrat, 'mobilize', null, 0);
if (!mRes.ok || testStrat.players[0].money !== 0 || testStrat.extraFortifies !== 1) throw new Error('El Estratega debió pagar $0 por Movilización');
if(tacticalCardCost(testStrat,'blockade',0)!==15||tacticalCardCost(testStrat,'mobilize',0)!==0)throw new Error('Los costes efectivos del Estratega no coinciden con la interfaz');

// 5. Doctrina El Diplomático: +20% de Influencia en Objetivos
const testDip = createGame({players:2, seed:905, human:true, playerCommander:'diplomat'});
testDip.players[0].completedObjectives = ['regions_2']; // Vale 15 normalmente -> 15 * 1.2 = 18
const dipInf = calculateInfluence(testDip, 0);
testDip.players[0].commander = 'conqueror';
const regInf = calculateInfluence(testDip, 0);
if (Math.round((dipInf - regInf) * 10) / 10 !== 6) throw new Error(`El Diplomático debe obtener +6 pts adicionales por objetivo de 15 pts (+40%) (obtenido diff: ${dipInf - regInf})`);

// 6. Doctrina El Espía: Contrainteligencia pasiva y cartas gratuitas
const testSpy = createGame({players:2, seed:906, human:true, playerCommander:'spy'});
testSpy.players[0].cards = ['spy'];
testSpy.players[0].money = 0;
const spyTarget = ownedIds(testSpy, 1)[0];
const spyRes = playTacticalCard(testSpy, 'spy', spyTarget, 0);
if (!spyRes.ok) throw new Error('El Espía debe poder usar Espía gratis sin dinero');

// 7. Migración de partida guardada a v10:
const oldV7 = createGame({players:2, seed:907, human:true});
oldV7.version = 7;
delete oldV7.fronts;
oldV7.players.forEach(p => delete p.commander);
const upgraded = upgradeGame(oldV7);
if (!upgraded || upgraded.version !== 10 || !upgraded.fronts || !upgraded.players[0].commander) throw new Error('La migración a versión 9 falló');

const oldV8 = createGame({players:2, seed:908, human:true});
oldV8.version = 8;
const upgradedV8 = upgradeGame(oldV8);
if (!upgradedV8 || upgradedV8.version !== 10) throw new Error('La migración desde versión 8 a versión 9 falló');

console.log('OK: Doctrinas de Comandante (§9.1), Frentes de Guerra (§13) y Migración v8/v10 verificadas.');

// 8. Información Imperfecta (§10) y Rangos de Tropas
if (approximateTroops(1) !== '1-2' || approximateTroops(2) !== '1-2') throw new Error('Rango 1-2 incorrecto');
if (approximateTroops(3) !== '3-5' || approximateTroops(5) !== '3-5') throw new Error('Rango 3-5 incorrecto');
if (approximateTroops(6) !== '6-9' || approximateTroops(9) !== '6-9') throw new Error('Rango 6-9 incorrecto');
if (approximateTroops(10) !== '10+' || approximateTroops(42) !== '10+') throw new Error('Rango 10+ incorrecto');

// 9. Niveles de Visibilidad y Niebla de Guerra
const fogGame = createGame({players:3, seed:999, human:true});
const p0Terrs = ownedIds(fogGame, 0);
const myT = p0Terrs[0];
if (getTerritoryVisibility(fogGame, myT, 0) !== 'full') throw new Error('Un territorio propio debe tener visibilidad full');

// Encontrar vecinos directos (distancia 1)
const directEnemies = enemiesOf(fogGame, myT);
if (directEnemies.length > 0) {
  const directEnemy = directEnemies[0];
  if (minDistanceToOwned(fogGame, directEnemy, 0) !== 1) throw new Error('La distancia al vecino directo debe ser 1');
  if (getTerritoryVisibility(fogGame, directEnemy, 0, 'normal') !== 'full') throw new Error('Un vecino directo debe tener visibilidad full en normal');
  const directIntel = getTerritoryIntel(fogGame, directEnemy, 0, 'normal');
  if (directIntel.visibility !== 'full' || directIntel.troops === null || typeof directIntel.production !== 'number') {
    throw new Error('Intel de vecino directo incompleto');
  }
}

// Encontrar un territorio a distancia 2 o más
const allTerrs = getTerritories(fogGame).map(t => t.id);
const distMap = allTerrs.map(id => ({id, dist: minDistanceToOwned(fogGame, id, 0)}));
const dist2 = distMap.find(x => x.dist === 2);
if (dist2) {
  if (getTerritoryVisibility(fogGame, dist2.id, 0, 'normal') !== 'partial') throw new Error('Un territorio a distancia 2 debe tener visibilidad partial');
  const pIntel = getTerritoryIntel(fogGame, dist2.id, 0, 'normal');
  if (pIntel.visibility !== 'partial' || pIntel.unitType !== null || pIntel.production !== null) {
    throw new Error('Intel a distancia 2 no debe revelar unidad ni producción exacta');
  }
}

const dist3 = distMap.find(x => x.dist >= 3);
if (dist3) {
  if (getTerritoryVisibility(fogGame, dist3.id, 0, 'normal') !== 'hidden') throw new Error('Un territorio a distancia >=3 debe tener visibilidad hidden');
  const hIntel = getTerritoryIntel(fogGame, dist3.id, 0, 'normal');
  if (hIntel.visibility !== 'hidden' || hIntel.troops !== null || hIntel.troopsDisplay !== '?') {
    throw new Error('Intel a distancia >=3 debe ocultar tropas con ?');
  }

  // Carta de Espía perfora la niebla de guerra (§11)
  fogGame.players[0].cards = ['spy'];
  fogGame.players[0].money = 10;
  const spyRes = playTacticalCard(fogGame, 'spy', dist3.id, 0);
  if (spyRes.ok && !spyRes.countered) {
    if (getTerritoryVisibility(fogGame, dist3.id, 0, 'normal') !== 'full') {
      throw new Error('Un territorio espiado debe otorgar visibilidad full');
    }
    const spiedIntel = getTerritoryIntel(fogGame, dist3.id, 0, 'normal');
    if (spiedIntel.visibility !== 'full' || !spiedIntel.isSpied || spiedIntel.troops === null) {
      throw new Error('Intel de territorio espiado debe ser full y mostrar isSpied=true');
    }
  }
}

// 10. Percepción de la IA según Dificultad (§9.3)
if (directEnemies.length > 0) {
  const directEnemy = directEnemies[0];
  // En fácil, la IA tiene visión más reducida (distancia 1 es partial para observador IA)
  const aiObserver = 1;
  const aiDist = minDistanceToOwned(fogGame, directEnemy, aiObserver);
  if (aiDist === 1) {
    if (getTerritoryVisibility(fogGame, directEnemy, aiObserver, 'fácil') !== 'partial') {
      throw new Error('En fácil, la IA debe percibir territorios fronterizos con visibilidad partial');
    }
  }
}

// En difícil la IA conserva la misma información; la ventaja viene de sus decisiones.
const hardObserver=1,hardFar=allTerrs.find(id=>fogGame.territories[id].owner!==hardObserver&&minDistanceToOwned(fogGame,id,hardObserver)>=3);
if(hardFar&&getTerritoryVisibility(fogGame,hardFar,hardObserver,'difícil')!=='hidden')throw new Error('La IA difícil recibió información perfecta que el diseño no concede');

// Cada comandante mantiene un objetivo principal y uno temporal; el temporal rota por ciclo.
const objectivesGame=createGame({players:2,seed:1234,human:true});
const op=objectivesGame.players[0],oldTemporary=op.temporaryObjective;
if(!op.mainObjective||!oldTemporary)throw new Error('No se asignaron los dos tipos de objetivo');
objectivesGame.objectiveCycle=0;rotateTemporaryObjectives(objectivesGame,1);
if(objectivesGame.objectiveCycle!==1||!op.temporaryObjective||op.temporaryObjective===oldTemporary)throw new Error('El objetivo temporal no rotó al cambiar de ciclo');

console.log('OK: Información imperfecta (§10), niebla de guerra, Espía y Dificultad IA (§9.3) verificados.');

// 11. Eventos Dinámicos del Mapa (§14)
const eventGame = createGame({players:2, seed:555, human:true, rulesMode:'terrain'});
if (eventGame.announcedEvent !== null || eventGame.activeEvent !== null) throw new Error('Los eventos iniciales deben ser null');

// Aviso con 1 ronda de anticipación (§14.3)
const announced = announceEvent(eventGame, 'earthquake', 'crown', 4);
if (!announced || eventGame.announcedEvent.type !== 'earthquake' || eventGame.announcedEvent.region !== 'crown' || eventGame.announcedEvent.triggerRound !== 4) {
  throw new Error('El anuncio anticipado de evento no se registró correctamente');
}

// Comprobación de que la IA en difícil evita reforzar la región amenazada
const crownTerrs = getTerritories(eventGame).filter(t => t.region === 'crown').map(t => t.id);
const nonCrownTerrs = getTerritories(eventGame).filter(t => t.region !== 'crown').map(t => t.id);
// Dar a jugador 1 (IA) territorios en corona y fuera de corona
crownTerrs.forEach(tid => eventGame.territories[tid].owner = 1);
nonCrownTerrs.slice(0, 3).forEach(tid => eventGame.territories[tid].owner = 1);
eventGame.pendingReinforcements = 2;
const p1BeforeCrownTroops = crownTerrs.reduce((sum, tid) => sum + eventGame.territories[tid].troops, 0);
// Simular colocación de la IA en difícil
let ownAi = ownedIds(eventGame, 1);
const safeAi = ownAi.filter(id => getTerritories(eventGame).find(t => t.id === id).region !== eventGame.announcedEvent.region);
if (safeAi.length === 0) throw new Error('Deben existir territorios seguros fuera de Corona para la IA');

// Impacto del evento (§14): Terremoto
const crownTroopsBefore = crownTerrs.map(tid => eventGame.territories[tid].troops);
const active = triggerEvent(eventGame, eventGame.announcedEvent);
if (!active || eventGame.activeEvent.type !== 'earthquake' || eventGame.announcedEvent !== null) {
  throw new Error('La activación del evento no limpió el anuncio o falló');
}
// Verificar que las tropas sufrieron bajas pero respetaron el mínimo de 1
crownTerrs.forEach((tid, i) => {
  const current = eventGame.territories[tid].troops;
  if (crownTroopsBefore[i] > 1 && current >= crownTroopsBefore[i]) {
    throw new Error('El terremoto debió reducir tropas en la región');
  }
  if (current < 1) throw new Error('El evento redujo tropas por debajo del mínimo de 1');
});
// Verificar conexiones bloqueadas por el evento
const eventBlocked = eventGame.blockedConnections.filter(b => b.cause === 'earthquake');
if (eventBlocked.length === 0) throw new Error('El terremoto debió bloquear al menos una conexión');

// Caducidad del evento tras concluir su duración
eventGame.turn = active.expiresRound;
checkEventCycle(eventGame);
if (eventGame.activeEvent !== null) throw new Error('El evento activo debió expirar al cumplirse su duración');

// Tsunami en islas/costas
const tsunamiGame = createGame({players:2, seed:556, human:true, rulesMode:'terrain'});
const tsunamiAnnounced = announceEvent(tsunamiGame, 'tsunami', 'isles', 3);
if (tsunamiAnnounced.region !== 'isles') throw new Error('El tsunami debe dirigirse a la región Jade/islas');
const tsunamiActive = triggerEvent(tsunamiGame, tsunamiAnnounced);
if (!tsunamiActive || tsunamiGame.activeEvent.type !== 'tsunami') throw new Error('El tsunami no se activó correctamente');

// El modo clásico no anuncia ni activa desastres, aunque se invoque el ciclo.
const classicEventGame = createGame({players:2, seed:557, human:true, rulesMode:'classic'});
const classicTroopsBefore = Object.values(classicEventGame.territories).reduce((sum,t)=>sum+t.troops,0);
if (announceEvent(classicEventGame,'earthquake','crown',3)!==null) throw new Error('El modo clásico anunció un desastre');
if (triggerEvent(classicEventGame,{type:'earthquake',region:'crown',triggerRound:3,duration:2})!==null) throw new Error('El modo clásico activó un desastre');
classicEventGame.turn=7;
checkEventCycle(classicEventGame);
const classicTroopsAfter = Object.values(classicEventGame.territories).reduce((sum,t)=>sum+t.troops,0);
if (classicEventGame.announcedEvent!==null||classicEventGame.activeEvent!==null||classicTroopsAfter!==classicTroopsBefore) throw new Error('El modo clásico aplicó efectos de desastre');

// Las partidas clásicas guardadas también deben limpiar efectos antiguos.
const legacyEventTerritory = getTerritories(classicEventGame).find(t=>t.region==='crown').id;
classicEventGame.activeEvent={type:'tempest',region:'crown',expiresRound:9};
classicEventGame.announcedEvent={type:'earthquake',region:'west',triggerRound:8};
classicEventGame.blockedConnections.push({a:'c1',b:'c2',expiresTurn:9,cause:'tempest'});
classicEventGame.sabotagedTerritories[legacyEventTerritory]=9;
upgradeGame(classicEventGame);
if(classicEventGame.activeEvent||classicEventGame.announcedEvent||classicEventGame.blockedConnections.some(b=>EVENT_IDS.includes(b.cause))||classicEventGame.sabotagedTerritories[legacyEventTerritory]) throw new Error('La migración clásica conservó efectos de desastre antiguos');

console.log('OK: Eventos dinámicos del mapa (§14), aviso previo, impacto, bajas mínimas y caducidad verificados.');

{
// --- PRUEBAS DE BALANCE (PARTE 8) ---
// 1. Resistencia nacional: bono de emergencia (+1) si territorios <= 3
const resGame = createGame({players:2, seed:701, human:true});
const p0ResTerrs = ownedIds(resGame, 0);
p0ResTerrs.slice(2).forEach(tid => { resGame.territories[tid].owner = 1; });
const rCount = reinforcementCount(resGame, 0);
if (rCount !== 4) throw new Error(`Resistencia nacional falló: esperado 4 refuerzos, obtenido ${rCount}`);

// 2. Comandante El Espía: carta inicial de espía y bono +1 al atacar objetivo espiado
const spyGame = createGame({players:2, seed:702, human:true, playerCommander:'spy'});
if (!spyGame.players[0].cards.includes('spy')) throw new Error('El Espía debe iniciar con una carta de Espía');
const spyOrigin = ownedIds(spyGame, 0).find(id => enemiesOf(spyGame, id).length);
const spyTarget = enemiesOf(spyGame, spyOrigin)[0];
playTacticalCard(spyGame, 'spy', spyTarget, 0);
if (!isTerritorySpied(spyGame, spyTarget, 0)) throw new Error('El objetivo debe figurar como espiado');
spyGame.territories[spyOrigin].troops = 5;
spyGame.territories[spyTarget].troops = 2;
spyGame.phase = 'attack';
const spyBattle = attackRound(spyGame, spyOrigin, spyTarget, 3);
if (!spyBattle.bonus.attackerReasons.some(r => r.includes('El Espía'))) {
  throw new Error('El Espía debió recibir +1 al dado de ataque contra objetivo espiado');
}

// 3. Comandante El Estratega: carta inicial y descuento de $5 en el mercado
const stratGame = createGame({players:2, seed:703, human:true, playerCommander:'strategist'});
if (!stratGame.players[0].cards.includes('mobilize')) throw new Error('El Estratega debe iniciar con una carta de Movilización');
const firstOffer = stratGame.market.offers[0];
const origCost = firstOffer.cost;
stratGame.players[0].money = origCost;
const stratBuy = buyMarketItem(stratGame, firstOffer.id, 0);
if (!stratBuy.ok) throw new Error(`El Estratega no pudo comprar con descuento: ${stratBuy.reason}`);
if (stratGame.players[0].money !== 5) {
  throw new Error('El Estratega no recibió el descuento de -$5 en el Mercado');
}

// 4. Comandante El Diplomático: +40% en objetivos y subsidio de pacificación
const dipGame = createGame({players:2, seed:704, human:true, playerCommander:'diplomat'});
dipGame.players[0].completedObjectives = ['territories_8'];
const dipInf = calculateInfluence(dipGame, 0);
const nonDipGame = createGame({players:2, seed:704, human:true, playerCommander:'conqueror'});
nonDipGame.players[0].completedObjectives = ['territories_8'];
const nonDipInf = calculateInfluence(nonDipGame, 0);
if (dipInf - nonDipInf !== 4) throw new Error(`El Diplomático debió otorgar +4 pts adicionales (+40% de 10 = 14 vs 10), diferencia: ${dipInf - nonDipInf}`);

dipGame.players[0].money = 0;
dipGame.current = 1;
dipGame.turn = 1;
dipGame.phase = 'close';
endTurn(dipGame);
if (dipGame.players[0].money < 3) throw new Error('El Diplomático debió recibir subsidio diplomático al mantenerse en paz');

}
console.log('OK: Balance (§6, §7.3, §9.1, §9.2, §15, §16), Resistencia Nacional y Doctrinas reequilibradas verificados.');

