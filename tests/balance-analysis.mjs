import {createGame,aiTurn,MAPS,COMMANDER_IDS,ownedIds,productionTotal,reinforcementCount,influenceBreakdown} from '../dist/engine.mjs';

const GAMES=Number(process.env.BALANCE_GAMES||120),EARLY_ROUND=8;
const games=[],commanderGames={},commanderWins={},victoryTypes={};
const add=(bucket,key,value=1)=>bucket[key]=(bucket[key]||0)+value;
const playerMetrics=(state,player)=>{const breakdown=influenceBreakdown(state,player.id);return{id:player.id,commander:player.commander,territories:ownedIds(state,player.id).length,production:productionTotal(state,player.id),reinforcements:reinforcementCount(state,player.id),influence:breakdown.total,regions:breakdown.regions.count,objectiveInfluence:breakdown.objectives.points,breakdown}};
const pearson=(xs,ys)=>{const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;let top=0,xx=0,yy=0;for(let i=0;i<xs.length;i++){const x=xs[i]-mx,y=ys[i]-my;top+=x*y;xx+=x*x;yy+=y*y}return top/Math.sqrt(xx*yy)||0};
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];

for(let seed=1;seed<=GAMES;seed++){
  const state=createGame({players:2+(seed%3),seed:9000+seed,human:false,mapId:Object.keys(MAPS)[seed%3],rulesMode:seed%2?'classic':'terrain',playerCommander:COMMANDER_IDS[seed%COMMANDER_IDS.length]});
  state.players.forEach(player=>add(commanderGames,player.commander));
  let early=null,actions=0;
  while(state.winner===null&&actions<4000){aiTurn(state,state.current,seed%3===0?'difícil':'normal');actions++;if(!early&&state.turn>=EARLY_ROUND)early=state.players.filter(player=>player.alive).map(player=>playerMetrics(state,player))}
  if(state.winner===null)throw new Error(`La simulación ${seed} no terminó`);
  early=early||state.players.filter(player=>player.alive).map(player=>playerMetrics(state,player));
  const earlyLeader=[...early].sort((a,b)=>b.territories-a.territories||b.influence-a.influence)[0];
  const final=state.players.map(player=>playerMetrics(state,player));
  const maxTerritories=Math.max(...final.map(metric=>metric.territories));
  const alternative=final.map(metric=>({id:metric.id,score:metric.territories*1.5+metric.breakdown.regions.points+metric.production*.75+metric.breakdown.troops.points+metric.objectiveInfluence*1.25+(maxTerritories-metric.territories)*.5})).sort((a,b)=>b.score-a.score)[0].id;
  add(commanderWins,state.players[state.winner].commander);add(victoryTypes,state.victoryType);
  games.push({rounds:state.turn,winner:state.winner,early,final,earlyLeader:earlyLeader.id,earlyLeaderWon:earlyLeader.id===state.winner,comeback:earlyLeader.id!==state.winner,alternativeWinner:alternative,alternativeChanged:alternative!==state.winner});
}

const observations=games.flatMap(game=>game.early.map(metric=>({...metric,won:metric.id===game.winner?1:0})));
const leaderRows=games.map(game=>game.early.find(metric=>metric.id===game.earlyLeader));
const restRows=games.flatMap(game=>game.early.filter(metric=>metric.id!==game.earlyLeader));
const avg=(rows,key)=>rows.reduce((sum,row)=>sum+row[key],0)/rows.length;
const winnerRows=games.map(game=>game.final.find(metric=>metric.id===game.winner));
const result={games:GAMES,earlyRound:EARLY_ROUND,earlyLeaderWinRate:games.filter(game=>game.earlyLeaderWon).length/GAMES,comebackRate:games.filter(game=>game.comeback).length/GAMES,territoryVictoryCorrelation:pearson(observations.map(row=>row.territories),observations.map(row=>row.won)),rounds:{average:games.reduce((sum,game)=>sum+game.rounds,0)/GAMES,median:percentile(games.map(game=>game.rounds),.5),p90:percentile(games.map(game=>game.rounds),.9),min:Math.min(...games.map(game=>game.rounds)),max:Math.max(...games.map(game=>game.rounds))},earlyLeader:{territories:avg(leaderRows,'territories'),production:avg(leaderRows,'production'),reinforcements:avg(leaderRows,'reinforcements'),influence:avg(leaderRows,'influence')},earlyRest:{territories:avg(restRows,'territories'),production:avg(restRows,'production'),reinforcements:avg(restRows,'reinforcements'),influence:avg(restRows,'influence')},winnerInfluenceSources:{territories:avg(winnerRows.map(row=>row.breakdown.territories),'points'),regions:avg(winnerRows.map(row=>row.breakdown.regions),'points'),production:avg(winnerRows.map(row=>row.breakdown.production),'points'),troops:avg(winnerRows.map(row=>row.breakdown.troops),'points'),objectives:avg(winnerRows.map(row=>row.breakdown.objectives),'points')},victoryTypes,commanderGames,commanderWins,counterfactualWinnerChangeRate:games.filter(game=>game.alternativeChanged).length/GAMES};
console.log(JSON.stringify(result,null,2));
