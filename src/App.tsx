import { Client } from 'boardgame.io/react';
import { aiConfig, dualPlayerID, GameState, Kriegspiel } from './Game';
import { Local } from 'boardgame.io/multiplayer';
import { Board } from './Board';
import { MCTSBot, RandomBot } from 'boardgame.io/ai';
import { Ctx, MoveFn, State } from 'boardgame.io';
import produce from "immer"
import { BotAction } from 'boardgame.io/dist/types/src/ai/bot';
import { Node } from 'boardgame.io/dist/types/src/ai/mcts-bot';
import { useEffect, useRef, useState } from 'react';
//import { CreateGameReducer } from 'boardgame.io/dist/types/packages/internal';



class CustomMCTSBot extends MCTSBot {
  constructor({ game, objectScores, ...config }: any) {
    super({ game, ...config });
    this.scoreFuns = {}
    
    this.playout = function ({ state, ...node }) {
    
      const scoreFuns = this.scoreFuns;
      function getScore(_state: State) {
        return Object.keys(scoreFuns).reduce((score, key) => {
          const objectScore: any = scoreFuns[key];
          return score + objectScore.weight * objectScore.checker(_state.G, _state.ctx);
        }, 0.0)
      }
      let turnNum=state.ctx.turn
      const depth = Math.min(Math.ceil(turnNum/10) ,(this.playoutDepth as number))
      let totalScore = 0
      let move: BotAction | null = null
      let childState = state
      return new Promise<{ score: number }>((resolve, reject) => {
        let playOutCounter = 0;

        const iteration = () => {

          let { G, ctx } = childState;


          if (!(move?.type === "GAME_EVENT" && move.payload.type === 'endTurn')) {
            // Check if any objectScores are met, sum up.

            const score = getScore(childState);

            // If so, return the score.
            totalScore += score
            playOutCounter++;
          }
          

          if(playOutCounter < depth){
          const moves = this.enumerate(G, ctx, ctx.currentPlayer);
          
          if (!moves || moves.length === 0) {
            reject('no Move');
          }
          const id = this.random(moves.length);
          move = moves[id]
          const nChildState = naiveReducer(childState, move);
          childState = nChildState
          }

        };


        const asyncIteration = () => {
          if (playOutCounter < depth && childState.ctx.gameover === undefined) {
            iteration();
            setImmediate(asyncIteration);
          } else {
            const averageScore = Math.max(totalScore / depth)

            resolve({ score: averageScore });
          }
        }
        asyncIteration();
      })
      /* for (
        let i = 0;
        i < (depth) && state.ctx.gameover === undefined;
        i++
      ) {
        let { G, ctx } = state;


        if (!(move?.type === "GAME_EVENT" && move.payload.type === 'endTurn')) {
          // Check if any objectScores are met, sum up.

          const score = getScore(state);

          // If so, return the score.

          totalScore += score

        }

        const moves = this.enumerate(G, ctx, ctx.currentPlayer);
        if (!moves || moves.length === 0) {
          return undefined;
        }
        const id = this.random(moves.length);
        move = moves[id]
        const childState = naiveReducer(state, move);

        state = childState;

      }
      const averageScore = Math.max(totalScore / depth)
      console.log(averageScore);
      return { score: averageScore }; */
    }
    this.play = function (
      state: State,
      playerID: string
    ): Promise<{ action: BotAction; metadata: Node }> {
      let selectedChild: Node | null = null;
      const { G, ctx } = state;
      this.scoreFuns = objectScores(G,ctx,playerID)
      const scoreFuns=this.scoreFuns
      const actions = this.enumerate(G, ctx, playerID);
      /* let numIterations = this.getOpt('iterations');
      if (typeof this.iterations === 'function') {
        numIterations = this.iterations(state.G, state.ctx);
      } */
      function naiveExpand(id: number): Node {

        const action = actions[id];
        const nState = naiveReducer(state, action)
        const nNode = {
          state: nState,
          parentAction: action,
          actions: [],
          objectives: [],
          children: [],
          visits: 0,
          value: 0,
        }
        
        return nNode;
      }
      function getScoreLst(_state: State) {
        return Object.keys(scoreFuns).map(( key) => {
          const objectScore: any = scoreFuns[key];
          return  key+' : '+objectScore.checker(_state.G, _state.ctx);
        })
      }
      const moveLength=actions.length

      return new Promise((resolve) => {
        const iteration = async () => {
          const id = this.iterationCounter 
          const child = naiveExpand(id);
          const result = this.playout(child);
          result.then((value: any) => {
            child.value = value.score;
            this.iterationCounter++;
            if (selectedChild == null || child.value > selectedChild.value) {
              selectedChild = child;
            }
            
            if (this.iterationCounter < moveLength) {
              iteration();
            } else {
              console.log('run '+this.iterationCounter + ' times')
              console.log("value: " + selectedChild.value)
              console.log(getScoreLst(selectedChild.state))
              const action = (selectedChild && selectedChild.parentAction) as BotAction;
              const metadata = selectedChild as Node;
              resolve({ action, metadata });
            }
          })
        };
        this.iterationCounter = 0;
        iteration()
        /* if (this.getOpt('async')) {
          const asyncIteration = () => {
            if (this.iterationCounter < numIterations) {
              iteration();
              setImmediate(asyncIteration);
            } else {
              resolve(getResult());
            }
          };
          asyncIteration();
        } else {
          while (this.iterationCounter < numIterations) {
            iteration();
          }
          resolve(getResult());
        } */
      });
    }
    this.setOpt('async', true)

  }
  private scoreFuns: Record<string, {weight:number, checker: (G: any, ctx: Ctx) => number}>
}

function naiveReducer({ G, ctx, ...state }: any, move: any) {
  let nG = G
  const game = Kriegspiel
  if (move.type === "GAME_EVENT" && move.payload.type === 'endTurn') {
    const turnBegin = game.turn?.onBegin
    const turnEnd = game.turn?.onEnd
    let nCtx = ctx
    if (turnBegin && turnEnd) {
      nG = produce(nG, (oG: GameState) => { turnEnd(oG, ctx) })
      nCtx = { ...ctx, currentPlayer: dualPlayerID(ctx.currentPlayer) }
      nG = produce(nG, (oG: GameState) => { turnBegin(oG, nCtx) })
    }
    console.log("changePlayer")
    return { ...state, G: nG, ctx: nCtx }
  }
  else {

    if (move.type === "MAKE_MOVE") {

      const moveType = move.payload.type as string
      const args = move.payload.args
      const moveFunction = game.moves && game.moves[moveType] as MoveFn
      if (moveFunction) {

        nG = produce(nG, (oG: GameState) => { moveFunction(oG, ctx, ...args) })

      }

    }
    return { ...state, G: nG, ctx: ctx }
  }
}

class MyBot {
  bot = new CustomMCTSBot({ ...aiConfig, game: Kriegspiel })
  async play(state: State, playerID: string) {
    let moves = this.bot.enumerate(state.G, state.ctx, playerID)
    if (moves.length === 1) {
      console.log('noMoreChoice')
      return { action: moves[0] }
    }
    else{
    const start = Date.now();
   
    const play = await this.bot.play(state, playerID);
    let time = (Date.now() - start) / 1000;
   
    console.log('play!')
    console.log('cost ' + time + 's')
    return play;
    }
  }
}

const KriegspielClient = Client({
  game: Kriegspiel,
  board: Board,
  debug: { collapseOnLoad: true },
  multiplayer: //SocketIO({ server: 'localhost:8000' })
    Local(
      { bots: { 
        //'0': MyBot,
        '1': MyBot
     } }
    ),
});





const App = () => {
  
  
  return(
  <div>
    <h1>Guy Debord's Kriegspiel</h1>
    <KriegspielClient playerID="0" />
    {/* <KriegspielClient playerID="1" /> */}
  </div>
);}

export default App;