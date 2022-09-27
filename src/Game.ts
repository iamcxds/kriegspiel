import { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { Interface } from 'readline';

export type P_ID='0'|'1'

export interface GameState {
  myID:P_ID,
  opponentID:P_ID,
  cells: (ObjInstance | null)[],
  places:(Stronghold|null)[],
}
function dualPlayerID(id:P_ID){
  switch (id){
    case '0': return '1';
    case '1': return '0';
  }
}
export const TicTacToe: Game<GameState> = {
  setup: () => {
    let eCells = Array(BoardSize.mx * BoardSize.my).fill(null);
    eCells[0] = newPiece("Infantry",'0');
    eCells[1] = newPiece("Cavalry",'1');
    eCells[2] = newPiece("Artillery",'1');
    let ePlaces=Array(BoardSize.mx * BoardSize.my).fill(null);
    ePlaces[0]=newStronghold("Arsenal",'0');
    ePlaces[Pos2CId(4,3)]=newStronghold("Fortress");
    return { myID:"0",opponentID:"1", cells: eCells ,places:ePlaces};
  },
  playerView: (G, ctx, playerID) => {
    return {...G, myID: playerID, opponentID:dualPlayerID(playerID as P_ID)};
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
        update(G);
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

};

//update game 
function update(G:GameState){
  //check capture the stronghold
  G.places.forEach((strong,CId) => {
    if (strong===null) {}
    else if (strong.placeType==="Arsenal"){}
    else {let obj=G.cells[CId]
      if (obj===null) {strong.belong=null;}
      else {strong.belong=obj.belong}
    }
    
  });
}

// Position and distance functions

interface Position {
  x: number,
  y: number
}

export const BoardSize = { mx: 5, my: 4 }

export function Pos2CId(x:number,y:number): number {
  return y * BoardSize.mx + x

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
type ObjType = "Infantry"|"Cavalry"|"Artillery"
interface ObjData {
  readonly objType: ObjType,
  readonly objRender: string, //emoji
  readonly speed:number,
  readonly range:number,
  readonly offense: number,
  //readonly offenseOnCharge?:number, +3 for "Cavalry"
  readonly defense: number,
  //readonly defenseInMountain:number, +2 for "Infantry" and "Artillery"
  //readonly defenseInFort:number +4
}
export interface ObjInstance extends ObjData {
  //entity: Entity,
  belong: P_ID | null,
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
  
},
"Cavalry":{
  objType: "Cavalry",
  objRender: "🏇",
  speed: 2,
  range: 2,
  offense:4,
  defense:5,
},
"Artillery":{
  objType: "Artillery",
  objRender: "🎉",
  speed: 1,
  range: 3,
  offense:5,
  defense:8,
}
}

function newPiece( type: ObjType,be:P_ID|null=null):ObjInstance{
  const objData= dataList[type]
  return {...objData,
    //entity:ent,
    belong:be
  }
}

type StrongholdType = "Arsenal"|"Pass"|"Fortress"
interface Stronghold{
  readonly placeType: StrongholdType,
  readonly placeRender: string
  belong: P_ID|null
}

function newStronghold(type:StrongholdType, belong:P_ID|null =null):Stronghold{
  function renderByType(t:StrongholdType):string{
    switch (t){
      case "Arsenal": return "🏭";
      case "Pass":return "🛣";
      case "Fortress": return "🏰";
    }
  }
  return {placeType:type, placeRender:renderByType(type),belong:belong}
}