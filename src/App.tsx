import { Client } from 'boardgame.io/react';
import { aiConfig, dualPlayerID, exportGame, GameState, Kriegspiel, loadGame, P_ID } from './Game';
import { Local } from 'boardgame.io/multiplayer';
import { Board } from './Board';
import { MCTSBot, RandomBot } from 'boardgame.io/ai';
import { Ctx, MoveFn, State } from 'boardgame.io';
import produce from "immer"
import { BotAction } from 'boardgame.io/dist/types/src/ai/bot';
import { Node } from 'boardgame.io/dist/types/src/ai/mcts-bot';
import {  useRef, useState } from 'react';




class CustomMCTSBot extends MCTSBot {
  constructor({ game, objectScores, ...config }: any) {
    super({ game, ...config });
    this.scoreFuns = {}
    const getScore=(_state: State)=>{
      return Object.keys(this.scoreFuns).reduce((score, key) => {
        const objectScore: any = this.scoreFuns[key];
        return score + objectScore.weight * objectScore.checker(_state.G, _state.ctx);
      }, 0.0)
    }
    this.playout = function ({ state, ...node }) {

      
      let turnNum = state.ctx.turn
      const depth = Math.min(Math.ceil(turnNum / 10), (this.playoutDepth as number))
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


          if (playOutCounter < depth) {
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
      this.scoreFuns = objectScores(G, ctx, playerID)
      const scoreFuns = this.scoreFuns
      const actions = this.enumerate(G, ctx, playerID);
      let currentValue= getScore(state);
      const moves=actions.filter((act)=>act.payload.type==="movePiece");
      const atks=actions.filter((act)=>act.payload.type==="attack")
      const endTurn=actions.filter((act)=>act.payload.type==="endTurn")
      /* let numIterations = this.getOpt('iterations');
      if (typeof this.iterations === 'function') {
        numIterations = this.iterations(state.G, state.ctx);
      } */
      
      function naiveExpand(id: number): Node {

        const action = moves[id];
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
      function naiveAction(action:BotAction){
        const metadata:Node={
          state: state,
          parentAction: action,
          actions: [],
          objectives: [],
          children: [],
          visits: 0,
          value: 0,
        }
        return {action,metadata}
      }
      function compareScoreLst(state1: State, state2: State) {
        let result:string[]=[]
         Object.keys(scoreFuns).forEach((key) => {
          const objectScore: any = scoreFuns[key];
          const different = objectScore.checker(state2.G, state2.ctx) - objectScore.checker(state1.G, state1.ctx)
          let sign = ''
          if (different !== 0) 
          { if (different > 0) { sign = '✔️' }
          else { sign = '❌' }
          result.push(key + sign + ' : ' + different);}
        })
        return result
      }
      

      const moveLength = moves.length
      
      return new Promise((resolve) => {
        let myCounter = 0
        this.iterationCounter = 0;
        const iteration = () => {
          const id = this.iterationCounter
          const child = naiveExpand(id);
          const result = this.playout(child);
          result.then((value: any) => {
            child.value = value.score;
            myCounter++;
            this.iterationCounter++;
            if ( child.value > currentValue) {
              selectedChild = child;
              currentValue=child.value;
            }

            if (myCounter < moveLength) {
              iteration();
            } else {
              getResult()
            }
          })
        };
         const getResult=()=>{
          console.log('run ' + this.iterationCounter + ' times')
                if(selectedChild)
                {
                  console.log('Player:'+state.ctx.currentPlayer+" value: " + selectedChild.value)
                console.log(compareScoreLst(state, selectedChild.state))
                const action = (selectedChild && selectedChild.parentAction) as BotAction;
                const metadata = selectedChild as Node;
                resolve({ action, metadata });
                }
                else{
                  console.log('No better moves');
                  if (atks.length>0){
                    let id=this.random(atks.length)
                    resolve(naiveAction(atks[id])) }
                  else {resolve(naiveAction(endTurn[0])) }
                }
        }

        
        if (myCounter < moveLength) {
          iteration();
        } else {
          getResult()
        }
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
  private scoreFuns: Record<string, { weight: number, checker: (G: any, ctx: Ctx) => number }>
}

function naiveReducer({ G, ctx, ...state }: State, action: BotAction) {
  let nG = G
  const game = Kriegspiel
  if (action?.type === "GAME_EVENT" && action?.payload.type === 'endTurn') {
    const turnBegin = game.turn?.onBegin
    const turnEnd = game.turn?.onEnd
    let nCtx = ctx
    if (turnBegin && turnEnd) {
      nG = produce(nG, (oG: GameState) => { turnEnd(oG, ctx) })
      nCtx = { ...ctx, currentPlayer: dualPlayerID(ctx.currentPlayer as P_ID) }
      nG = produce(nG, (oG: GameState) => { turnBegin(oG, nCtx) })
    }
    console.log("changePlayer")
    return { ...state, G: nG, ctx: nCtx }
  }
  else {

    if (action.type === "MAKE_MOVE") {

      const moveType = action.payload.type as string
      const args = action.payload.args
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
    else {
      const start = Date.now();

      const play = await this.bot.play(state, playerID);
      let time = (Date.now() - start) / 1000;

      console.log('play!')
      console.log('cost ' + time + 's')
      return play;
    }
  }
}
type aiType = String// 'Player'|'RandomBot'|'AdvancedBot'|
function getAI(t: aiType) {
  switch (t) {
    case 'RandomBot': return RandomBot;
    case 'AdvancedBot': return MyBot;
    default: return undefined
  }
}
function KriegspielClient(setUp:string,p0: aiType, p1: aiType) {
  let multConfig = undefined  
  if (p0!=='Player' || p1!=='Player') {
    const bot0= p0!=='Player'?{'0':getAI(p0)}:{}
    const bot1= p1!=='Player'?{'1':getAI(p1)}:{}

    multConfig = Local(
      {
        bots: {
          ...bot0,
          ...bot1
        }
      })
  }
  let game=Kriegspiel
  if(setUp!==''){
    game={...game,setup:(ctx) => {
      return loadGame(setUp, ctx);
    },}
  }
  return Client({
    game: game,
    board: Board,
    debug: { collapseOnLoad: true },
    multiplayer: multConfig
  });
}





const App = () => {
  const [ai, setAI] = useState<[aiType, aiType]>(['Player', 'Player'])
  const gameData=useRef<string>('')
  const startGame=useRef(false)
  const p0AI=useRef('Player')
  const p1AI=useRef('Player')
  const GameClient = KriegspielClient(gameData.current,ai[0], ai[1])
  let pID = undefined
  if (ai[0]!=='Player' && ai[1]==='Player') { pID = '1' }
  if (ai[1]!=='Player' && ai[0]==='Player') { pID = '0' }
  return (
    <div>
      <h1>Guy Debord's Kriegspiel</h1>
      <form >
      <label>Blue: </label>
      <select disabled={startGame.current} onChange={(e)=>{p0AI.current=e.target.value}} >
        {['Player', 'RandomBot', 'AdvancedBot'].map((name) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select >
      <label> Orange: </label>
      <select disabled={startGame.current} onChange={(e)=>{p1AI.current=e.target.value}} >
        {['Player', 'RandomBot', 'AdvancedBot'].map((name) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select>
      <label> Setup: </label>
      <input
          disabled={startGame.current}
          type='text'
          name="gameData"
          onChange={(e) => gameData.current=e.target.value}
        />
      <input disabled={startGame.current} type='button' value='Start' onClick={()=>{
        startGame.current=true
        setAI([p0AI.current,p1AI.current])
        }}/>
      </form>
      <GameClient playerID={pID} />
      
      

      
    </div>
  );
}

export default App;