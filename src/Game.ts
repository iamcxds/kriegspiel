import { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { Interface } from 'readline';



export interface GameState {
  playerID:string,
  opponentID:string,
  cells: (ObjInstance | null)[];
}
function dualPlayerID(id:string|null){
  switch (id){
    case '0': return '1';
    case '1': return '0';
    default: return "none"
  }
}
export const TicTacToe: Game<GameState> = {
  setup: () => {
    let eCells = Array(BoardSize.mx * BoardSize.my).fill(null);
    eCells[0] = newPiece(0,"Infantry",'0');
    eCells[1] = newPiece(1,"Cavalry",'1');
    return { playerID:"none",opponentID:"none", cells: eCells };
  },
  playerView: (G, ctx, playerID) => {
    return {...G, playerID: playerID, opponentID:dualPlayerID(playerID)};
  },
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    movePiece: (G, ctx, stCId: number, edCId: number) => {
      let obj=G.cells[stCId]
      
        if (obj!==null&&canPick(G, ctx, stCId) && canPut(G, ctx, stCId, obj , edCId)) {
        G.cells[stCId] = null;
        G.cells[edCId] = obj;
      }
      else
        return INVALID_MOVE;
    },
  },

  /* endIf: (G, ctx) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  }, */

  ai: {
    enumerate: (G, ctx) => {
      let moves = [];
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) {
          moves.push({ move: 'clickCell', args: [i] });
        }
      }
      return moves;
    },
  },
};

// Position and distance functions

interface Position {
  x: number,
  y: number
}

export const BoardSize = { mx: 6, my: 5 }

export function Pos2CId(p: Position): number {
  return p.y * BoardSize.mx + p.x

}

export function CId2Pos(id: number): Position {
  const ox = id % BoardSize.mx
  const oy = Math.floor(id / BoardSize.mx)
  return { x: ox, y: oy }
}

function NaiveDistance(p1: Position, p2: Position): number {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y))
}

//filter the 米 like targets and distances 
function DirectDistance(p1: Position, p2: Position): null|number{
  const dx=Math.abs(p1.x - p2.x);
  const dy=Math.abs(p1.y - p2.y)
  if (dx===dy||dx===0||dy===0){return Math.max(dx,dy)}
  else {return null}
}

// useful function
export function canPick(G: GameState, ctx: Ctx, stCId: number) {
  return G.cells[stCId]?.belong === ctx.currentPlayer;
}
export function canPut(G: GameState, ctx: Ctx, stCId: number, obj:ObjInstance,edCId: number) {
  const stPos = CId2Pos(stCId);
  const edPos = CId2Pos(edCId);
  return G.cells[edCId] === null && NaiveDistance(stPos, edPos) <= obj.speed;
}
export function getBattleValue(G: GameState, player:string,type: boolean, CId:number):number 
//type: true->offense, false->defense
{ const pos = CId2Pos(CId);
  const effectingObjs = G.cells.filter((obj,id)=>(obj!==null&&isInRange(pos,CId2Pos(id),obj)&&obj.belong===player)) as ObjInstance[]
  return effectingObjs.map((obj)=>type? obj.offense:obj.defense).reduce((a,b)=>a+b,0)
}

function isInRange(pos:Position,oPos:Position,obj:ObjInstance):boolean{
  const dirDis=DirectDistance(pos,oPos);
  return (NaiveDistance(pos,oPos)<=3&&dirDis!==null&&dirDis<=obj.range)
}

//Game Object

type Entity = number
type ObjType = "Infantry" | "Cavalry"|"Artillery"
interface ObjData {
  readonly objType: ObjType,
  readonly objRender: string, //emoji
  readonly speed:number,
  readonly range:number,
  readonly offense: number,
  readonly offenseOnCharge?:number,
  readonly defense: number,
  readonly defenseInMountain:number,
  readonly defenseInFort:number
}
export interface ObjInstance extends ObjData {
  entity: Entity,
  belong: string | null,
}


type Type2ObjData ={
  [Key in ObjType]:ObjData
}
const dataList: Type2ObjData={
  "Infantry":{
  objType: "Infantry",
  objRender: "💂",
  speed: 1,
  range: 2,
  offense:4,
  defense:6,
  defenseInMountain:8,
  defenseInFort:10
},
"Cavalry":{
  objType: "Cavalry",
  objRender: "🏇",
  speed: 2,
  range: 2,
  offense:4,
  offenseOnCharge:7,
  defense:5,
  defenseInMountain:5,
  defenseInFort:5
},
"Artillery":{
  objType: "Artillery",
  objRender: "🎉",
  speed: 1,
  range: 3,
  offense:5,
  defense:8,
  defenseInMountain:10,
  defenseInFort:12
}
}

function newPiece(ent:Entity, type: ObjType ,be:string):ObjInstance{
  const objData= dataList[type]
  return {...objData,
    entity:ent,
    belong:be
  }
}