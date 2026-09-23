import {createGame,aiTurn,validateState,TERRITORIES,MAPS,UNIT_TYPES,ownedIds,enemiesOf,placeTroops,setPhase,attackRound,endTurn,tradeCards,territoryProduction,productionTotal,collectIncome,buyReinforcements,upgradeGame,drawTacticalCard,resolvePendingCardDraw,playTacticalCard,isConnectionBlocked,TACTICAL_CARDS,buyMarketItem,generateMarket,MARKET_CATALOG,calculateInfluence,checkObjectives,OBJECTIVES_CATALOG} from '../dist/engine.mjs';

let maxTurns=0;
for(let seed=1;seed<=60;seed++){
  const mapId=Object.keys(MAPS)[seed%3],rulesMode=seed%2?'classic':'terrain';
  const state=createGame({players:2+(seed%3),seed,human:false,mapId,rulesMode});
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
if(setPhase(manual,'fortify'))throw new Error('Se permitió saltar el combate obligatorio');
const origin=ownedIds(manual,0).find(id=>manual.territories[id].troops>1&&enemiesOf(manual,id).length);
if(!origin)throw new Error('La prueba no produjo un ataque legal');
const target=enemiesOf(manual,origin)[0];
const roll=attackRound(manual,origin,target,1);
if(!roll.ok||!manual.attackMadeThisTurn)throw new Error('La tirada obligatoria no quedó registrada');
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
setPhase(mobGame,'fortify');
playTacticalCard(mobGame,'mobilize',null,0);
if(mobGame.extraFortifies!==1)throw new Error('Movilización no otorgó maniobra adicional');

const reward=createGame({players:2,seed:991,human:true});
while(reward.pendingReinforcements)placeTroops(reward,ownedIds(reward,0)[0],1);
const strong=ownedIds(reward,0).find(id=>enemiesOf(reward,id).length);
const victim=enemiesOf(reward,strong)[0];reward.territories[strong].troops=30;reward.territories[victim].troops=1;
while(reward.territories[victim].owner!==0)attackRound(reward,strong,victim,3);
setPhase(reward,'fortify');setPhase(reward,'close');endTurn(reward);
if(reward.players[0].cards.length!==1)throw new Error('No se robó carta después de conquistar');
if(reward.campaign.players[0].conquests!==1||reward.campaign.conquests.length!==1||reward.campaign.players[0].cards!==1)throw new Error('El resumen de campaña no registró conquista y carta');
if(reward.campaign.players[0].lost+reward.campaign.players[1].lost<1)throw new Error('El resumen de campaña no registró bajas');
console.log('OK: combate obligatorio, selección de dados y cartas tácticas verificados.');

// Ventaja circular en modo terreno y ausencia de modificadores en clásico.
const terrain=createGame({players:2,seed:505,human:true,mapId:'archipelago',rulesMode:'terrain'});
while(terrain.pendingReinforcements)placeTroops(terrain,ownedIds(terrain,0)[0],1,'infantry');
const tFrom=ownedIds(terrain,0).find(id=>terrain.territories[id].troops>1&&enemiesOf(terrain,id).length),tTo=enemiesOf(terrain,tFrom)[0];
terrain.territories[tFrom].unitType='infantry';terrain.territories[tTo].unitType='artillery';
const terrainRoll=attackRound(terrain,tFrom,tTo,1);
if(terrainRoll.bonus.attacker!==1||terrainRoll.attackerDice[0]!==terrainRoll.rawAttackerDice[0]+1)throw new Error('El bono circular +1 no se aplicó');
const classic=createGame({players:2,seed:506,human:true,mapId:'rift',rulesMode:'classic'});
while(classic.pendingReinforcements)placeTroops(classic,ownedIds(classic,0)[0],1);
const cFrom=ownedIds(classic,0).find(id=>classic.territories[id].troops>1&&enemiesOf(classic,id).length),cTo=enemiesOf(classic,cFrom)[0];
const classicRoll=attackRound(classic,cFrom,cTo,1);
if(classicRoll.bonus.attacker||classicRoll.bonus.defender)throw new Error('El modo clásico aplicó modificadores');
console.log('OK: 3 mapas, informes IA, modo clásico y rueda de terreno verificados.');

for(const map of Object.values(MAPS)){
  const byId=Object.fromEntries(map.territories.map(t=>[t.id,t]));
  for(const t of map.territories)for(const n of t.n)if(!byId[n]?.n.includes(t.id))throw new Error(`${map.name}: ruta asimétrica ${t.id}-${n}`);
  const seen=new Set([map.territories[0].id]),queue=[map.territories[0].id];
  while(queue.length){const id=queue.shift();for(const n of byId[id].n)if(!seen.has(n)){seen.add(n);queue.push(n)}}
  if(seen.size!==map.territories.length)throw new Error(`${map.name}: mapa desconectado`);
}
console.log('OK: conectividad y rutas simétricas verificadas en los 3 mapas.');

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
const previousV3=createGame({players:2,seed:315});previousV3.version=3;for(const p of previousV3.players){delete p.money;delete p.lastIncomeRound;p.cards=2;delete p.influence;delete p.completedObjectives}
if(upgradeGame(previousV3)?.version!==7||previousV3.players[0].money!==productionTotal(previousV3,0)||previousV3.players[0].cards.length!==2||!previousV3.market?.offers||typeof previousV3.players[0].influence!=='number')throw new Error('La partida v3 no migró a v7 de forma estable');
const previousV4=createGame({players:2,seed:316});previousV4.version=4;for(const p of previousV4.players){p.cards=3;delete p.influence;delete p.completedObjectives}
if(upgradeGame(previousV4)?.version!==7||previousV4.players[0].cards.length!==3||!previousV4.market?.offers)throw new Error('La partida v4 no migró a v7 de forma estable');
const previousV5=createGame({players:2,seed:317});previousV5.version=5;delete previousV5.market;delete previousV5.tempDefense;for(const p of previousV5.players){delete p.influence;delete p.completedObjectives}
if(upgradeGame(previousV5)?.version!==7||!previousV5.market?.offers)throw new Error('La partida v5 no migró a v7 de forma estable');
const previousV6=createGame({players:2,seed:318});previousV6.version=6;delete previousV6.victoryType;delete previousV6.turnConquests;for(const p of previousV6.players){delete p.influence;delete p.completedObjectives}
if(upgradeGame(previousV6)?.version!==7||typeof previousV6.players[0].influence!=='number'||!Array.isArray(previousV6.players[0].completedObjectives))throw new Error('La partida v6 no migró a v7 de forma estable');
console.log('OK: producción, tesoro, compras y migración v7 verificados.');

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
if(vicC.winner!==0||vicC.victoryType!=='round_limit'||vicC.phase!=='gameover')throw new Error(`La victoria por límite de 40 rondas no se activó (tipo: ${vicC.victoryType}, inf: ${vicC.players.map(p=>p.influence)})`);

console.log('OK: Fórmula de Influencia (§8), Objetivos (§12) y Condiciones de Victoria B y C (§16) verificadas.');


