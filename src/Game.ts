import { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';



export type P_ID = '0' | '1'

type CellID=number

export interface GameState {
  //myID:P_ID,
  //opponentID:P_ID,
  cells: (ObjInstance | null)[],
  places: (Stronghold | null)[],
  inSupply: { [key in P_ID]: CellID[] },
  moveRecords: { [key in P_ID]: [CellID, CellID][] }, //(stCId,edCId)
  attackRecords: { [key in P_ID]: [CellID, ObjInstance | "Arsenal"] | null },
  forcedRetreat: { [key in P_ID]: [(CellID | null), (CellID | null)] },//the start and end of retreat CId,
}
export function dualPlayerID(id: P_ID) {
  switch (id) {
    case '0': return '1';
    case '1': return '0';
  }
}
export const TicTacToe: Game<GameState> = {
  setup: (ctx) => {
    let eCells = Array(BoardSize.mx * BoardSize.my).fill(null);
    eCells[0] = newPiece("Infantry", '0');
    eCells[Pos2CId(0, 1)] = newPiece("Artillery", '0');
    eCells[Pos2CId(0, 4)] = newPiece("Relay", '0');
    eCells[1] = newPiece("Cavalry", '1');
    eCells[2] = newPiece("Cavalry", '1');
    eCells[3] = newPiece("Cavalry", '1');
    eCells[4] = newPiece("Cavalry", '1');
    let ePlaces = Array(BoardSize.mx * BoardSize.my).fill(null);
    ePlaces[0] = newStronghold("Arsenal", '0');
    ePlaces[9] = newStronghold("Arsenal", '1');
    ePlaces[Pos2CId(4, 3)] = newStronghold("Fortress");
    ePlaces[Pos2CId(3, 3)] = newStronghold("Mountain");
    let initGame: GameState = {
      cells: eCells, places: ePlaces,
      inSupply: {
        '0': Array(BoardSize.mx * BoardSize.my).fill(false),
        '1': Array(BoardSize.mx * BoardSize.my).fill(false)
      },
      moveRecords: { 0: [], 1: [] },
      attackRecords: { 0: null, 1: null },
      forcedRetreat: { 0: [null, null], 1: [null, null] }
    }
    update(initGame, ctx);
    return initGame;
  },
  /* playerView: (G, ctx, playerID) => {
    return {...G, myID: playerID, opponentID:dualPlayerID(playerID as P_ID)};
  }, */
  turn: {
    onBegin(G, ctx) {
      const cPlayer = ctx.currentPlayer as P_ID
      G.moveRecords[cPlayer] = [];
      G.attackRecords[cPlayer] = null;
      const retreatSt = G.forcedRetreat[cPlayer][0]
      //if nowhere to retreat
      if (retreatSt !== null && moveRange(G, retreatSt, 1).length === 0) {//capture
        G.cells[retreatSt] = null;
        G.forcedRetreat[cPlayer] = [null, null];
      }
    },
    onEnd(G, ctx) {
      const cPlayer = ctx.currentPlayer as P_ID
      const retreatEd = G.forcedRetreat[cPlayer][1]
      //retreating target
      if (retreatEd !== null) {
        const retreatObj = G.cells[retreatEd];
        if (retreatObj)
        //end retreating
        {
          retreatObj.retreating = false;
          G.forcedRetreat[cPlayer] = [null, null];
        }
      }
    },
  },

  moves: {
    movePiece: (G, ctx, stCId: number, edCId: number) => {
      const obj = G.cells[stCId]
      const cPlayer = ctx.currentPlayer as P_ID

      if (obj && canPick(G, ctx, stCId) && canPut(G, ctx, stCId, edCId)) {
        G.cells[stCId] = null;
        //default make it un supplied
        obj.supplied = false;
        G.cells[edCId] = obj;
        //record move
        G.moveRecords[cPlayer].push([stCId, edCId])

        const retreatSt = G.forcedRetreat[cPlayer][0]
        //if this is a retreat
        if (retreatSt !== null) {
          G.forcedRetreat[cPlayer] = [null, edCId];
        }





        update(G, ctx);
      }
      else
        return INVALID_MOVE;
    },
    attack: (G, ctx, CId: number) => {
      const cPlayer = ctx.currentPlayer as P_ID
      const obj = G.cells[CId]
      const [canAtk, relOff] = canAttack(G, ctx, CId)
      if (obj && canAtk) {
        G.attackRecords[cPlayer] = [CId, obj];
        //force retreat
        if (relOff === 1) {
          obj.retreating = true;
          G.forcedRetreat[obj.belong] = [CId, null];
        }
        //capture
        else { G.cells[CId] = null; }
        update(G, ctx);
      }
      else return INVALID_MOVE;
    }
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
function update(G: GameState, ctx: Ctx) {
  //check supply
  console.log("update")
  let cPlayer = ctx.currentPlayer as P_ID
  updateSuppliedCells(G, cPlayer);
  updateSuppliedCells(G, dualPlayerID(cPlayer));
  //check update of the stronghold
  G.places.forEach((strong, CId) => {
    if (!strong) { }
    else if (strong.placeType === "Mountain") { }
    //if on arsenals, 
    else if (strong.placeType === "Arsenal" && strong.belong) {

      const obj = G.cells[CId]
      // obj is a enemy, and have offense, and is supplied , check in update
      if (obj && obj.belong !== strong.belong && obj.offense > 0 && obj.supplied) {
        G.attackRecords[cPlayer] = [CId, "Arsenal"];

        G.places[CId] = null;
        //strong.placeRender="🏳️"
        //then add 1 atk action
      }
    }
    else {
      const obj = G.cells[CId]
      if (obj) { strong.belong = obj.belong; }
      else { strong.belong = null }
    }

  });

}

function updateSuppliedCells(G: GameState, player?: P_ID) {

  if (player !== "1") {
    console.log("SCupdate 0")
    const SuppliedCells0 = getSuppliedCells(G, "0");
    G.inSupply[0] = SuppliedCells0
    // G.inSupply[0].map((_, id) => SuppliedCells0.includes(id));
  }

  if (player !== "0") {
    console.log("SCupdate 1")
    const SuppliedCells1 = getSuppliedCells(G, "1");

    G.inSupply[1] = SuppliedCells1
    //G.inSupply[1].map((_, id) => SuppliedCells1.includes(id));
  }
  updateSuppliedObj(G);
}
function updateSuppliedObj(G: GameState) {
  console.log("SOupdate")
  G.cells = G.cells.map((obj, id) => {
    if (obj) { return { ...obj, supplied: G.inSupply[obj.belong].includes(id) } }
    else { return null }
  })
}




// Position and distance functions

interface Position {
  x: number,
  y: number
}

export const BoardSize = { mx: 25, my: 20 }

export function Pos2CId(x: number, y: number): CellID {
  if (x < 0 || y < 0 || x >= BoardSize.mx || y >= BoardSize.my) { return -1 }
  else { return y * BoardSize.mx + x }

}

export function CId2Pos(id: CellID): Position {
  const ox = id % BoardSize.mx
  const oy = Math.floor(id / BoardSize.mx)
  return { x: ox, y: oy }
}

function NaiveDistance(p1: Position, p2: Position): number {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y))
}

//filter the 米 like targets and distances 
function DirectDistance(p1: Position, p2: Position): null | number {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y)
  if (dx === dy || dx === 0 || dy === 0) { return Math.max(dx, dy) }
  else { return null }
}
function ptSetDisLessThan(set: CellID[], pt: CellID, dis: number = 1): boolean {
  return set.some((CId) => NaiveDistance(CId2Pos(pt), CId2Pos(CId)) <= dis)
}

function connectedComponents(set: CellID[], pts: CellID[]): number[] {
  //use CId
  let oldSet = pts
  let newSet: CellID[] = []

  do {
    //new pts are not in old, and distance is less than 1
    newSet = set.filter((CId) => (!oldSet.includes(CId)) && ptSetDisLessThan(oldSet, CId));
    oldSet = oldSet.concat(newSet)
  } while (newSet.length > 0)
  return oldSet;
}

// useful function
export function nonNull<T>(a: T) { return a !== null }

export function removeDup<T>(a: Array<T>) { return Array.from(new Set(a)) }

export function filterCId<T>(a: (T | null)[], filter: (b: T, c: number) => boolean): number[] {
  return a.map((obj, id) => (obj && filter(obj, id)) ? id : null).filter(nonNull) as number[];
}

export function canPick(G: GameState, ctx: Ctx, CId: number) {
  const cPlayer = ctx.currentPlayer as P_ID
  const moveEdRec = G.moveRecords[cPlayer].map((p) => p[1])
  const retreatSt = G.forcedRetreat[cPlayer][0]


  //according the record, not yet attack, each piece has most 1 move, totally 5 moves
  if (G.attackRecords[cPlayer] !== null || moveEdRec.length >= 5 || moveEdRec.includes(CId)) { return false }
  //if there is a retreat
  else if (retreatSt !== null) { return CId === retreatSt; }
  else {
    let obj = G.cells[CId]
    //obj belongs to player, and must be supplied, except relays
    return obj !== null && obj.belong === cPlayer && (obj.supplied || obj.objType === "Relay");
  }
}
export function canPut(G: GameState, ctx: Ctx, stCId: number, edCId: number) {
  const obj = G.cells[stCId]
  //check obj is on stCells,  in move range
  return obj !== null && moveRange(G, stCId, obj.speed).includes(edCId);
}
function moveRange(G: GameState, stCId: number, speed: number = 1): number[] {
  let result = [stCId]
  for (let i = 0; i < speed; i++) {
    //for each steps target cell is empty and is not mountain,
    result = G.cells.map((obj, id) => NaiveDistance(CId2Pos(stCId), CId2Pos(id)) <= speed && obj === null && G.places[id]?.placeType !== "Mountain" && ptSetDisLessThan(result, id) ? id : null).filter(nonNull) as number[]

  }
  return result
}

export function canAttack(G: GameState, ctx: Ctx, CId: number): [boolean, number] {
  const cPlayer = ctx.currentPlayer as P_ID
  const obj = G.cells[CId];
  const retreatSt = G.forcedRetreat[cPlayer][0]

  //if there is no retreat one haven't attacked and obj is enemy
  if (retreatSt === null && G.attackRecords[cPlayer] === null && obj && obj.belong !== cPlayer) {

    const enemy = obj.belong;
    const off = getBattleFactor(G, cPlayer, true, CId)[0];
    const def = getBattleFactor(G, enemy, false, CId)[0];
    const relOff = off - def
    return [relOff > 0, relOff]
  }
  else { return [false, 0] }
}
//search in 米 shape
function searchInMiShape(G: GameState, CId: number, filter: (obj: ObjInstance | null, id: number) => boolean, min: number = 0, max: number = Math.max(BoardSize.mx, BoardSize.my)): [number[][], Position[][]] {
  const pos = CId2Pos(CId);
  const aCIdRowsLst: number[][] = []
  const rowsLst: Position[][] = [];
  //search for 8 direction
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++)
      if (i !== 0 || j !== 0) {
        let relPosLine: Position[] = [];
        let aCIdLine: number[] = [];
        //check on 1 direction, distance from min to max
        for (let n = min; n <= max; n++) {
          //get the cells on direction
          let cx = pos.x + n * i
          let cy = pos.y + n * j
          let cCId = Pos2CId(cx, cy);
          let cObj = G.cells[cCId];
          //!!!filter here
          //and also filter the case that is out of board
          //cx>=0&&cx<BoardSize.mx&&cy>=0&&cy<BoardSize.my
          if (cObj !== undefined && filter(cObj, cCId)) {
            relPosLine.push({ x: n * i, y: n * j });
            aCIdLine.push(cCId);
          }
          else { break; }
        }
        if (relPosLine.length !== 0) {
          rowsLst.push(relPosLine);
          aCIdRowsLst.push(aCIdLine)
        }
      }
  }
  return [aCIdRowsLst, rowsLst];
}

//battle value
// get charged cavalry rows with relative positions.
export function getChargedCavalries(G: GameState, CId: number): (Position[])[] {

  const obj = G.cells[CId]
  const belong = obj?.belong
  const placesType = G.places[CId]?.placeType

  //the target not in a stronghold, and has piece on it
  if (placesType === "Fortress" || placesType === "Pass" || !obj) { return [] }
  else {

    const chargeRowsLst = searchInMiShape(G, CId, (cObj, cCId) =>
      //!!!check cObj is a cavalry, a enemy, supplied,not retreating , not in a fortress
      (cObj !== null && cObj.objType === "Cavalry" && cObj.belong !== belong && cObj.supplied && !cObj.retreating && G.places[cCId]?.placeType !== "Fortress")
      , 1, 4)[1]
    return chargeRowsLst
  }

}

export function getBattleFactor(G: GameState, player: P_ID, isOffense: boolean, CId: number): [number, number[]]
//type: true->offense, false->defense
{
  const pos = CId2Pos(CId);
  const targetObj = G.cells[CId]
  // filter the unit in 米 shape in its range
  //first filter Out the mountain block,
  let effectingObjs =
    removeDup(searchInMiShape(G, CId, (obj, id) => G.places[id]?.placeType !== "Mountain", 0, 3)[0].flat()).filter(
      (id) => {
        let obj = G.cells[id];
        //obj is in range, supplied, belongs to the chosen player,
        return obj && (isInRange(pos, CId2Pos(id), obj) && obj.supplied && obj.belong === player)
          //filter out retreating units in offense
          && !(isOffense && (obj.retreating || obj.offense === 0))
      })
  /* filterCId(G.cells,(obj,id)=>
  //obj is in range, supplied, belongs to the chosen player,
  (isInRange(pos,CId2Pos(id),obj)&&obj.supplied&&obj.belong===player)
  //filter out retreating units in offense
  &&!(isOffense&&obj.retreating)
  ) */


  //filter the effecting strongholds
  const effectingStronghold = effectingObjs.map((id) => {
    const obj = G.cells[id]
    const strong = G.places[id];
    return (strong && strong.defenseAdd > 0 && obj && obj.canAddDef) ? strong : null
  }).filter((obj) => obj) as Stronghold[]
  const strongholdDef = effectingStronghold.map((obj) => obj.defenseAdd).reduce((a, b) => a + b, 0)

  //get charged cavalries
  const chargedCavalries = getChargedCavalries(G, CId).flat().map((rPos) => {
    let aCId = Pos2CId(pos.x + rPos.x, pos.y + rPos.y);
    return aCId
  })
  const chargedAmount = chargedCavalries.length

  var addValue = 0
  //if it is offensive, merge objs in range and in charge
  if (targetObj && targetObj.belong !== player && isOffense) {
    // add and merge cavalries
    effectingObjs = Array.from(new Set([...effectingObjs, ...chargedCavalries]));

    // add charge value
    addValue = 3 * chargedAmount;
  }
  else if (!isOffense) { addValue = strongholdDef; }


  return [effectingObjs.map((id) => G.cells[id] as ObjInstance).map((obj) => isOffense ? obj.offense : obj.defense).reduce((a, b) => a + b, addValue)
    , effectingObjs]
}

function isInRange(pos: Position, oPos: Position, obj: ObjInstance): boolean {
  const dirDis = DirectDistance(pos, oPos);
  return (NaiveDistance(pos, oPos) <= 3 && dirDis !== null && dirDis <= obj.range)
}

//Supply 

export function dirSupplyFrom(G: GameState, CId: number, player: P_ID) {
  let result = searchInMiShape(G, CId, (obj, id) =>
    //filter the objs block the supply lines
    //obj is enemy, has offense factor, is supplied, not retreat
    //and mountains also block
    !(obj && obj.belong !== player && obj.offense > 0 && obj.supplied) && (G.places[id]?.placeType !== "Mountain"))
  return result[0]
}

export function getDirSuppliedLines(G: GameState, player: P_ID): [number[], number[][][]] {
  //get arsenals CId and relays CId
  const arsenalLst = filterCId(G.places, (str) => (str.belong === player && str.placeType === "Arsenal"));
  let relayLst = filterCId(G.cells, (obj) => obj.belong === player && obj.objType === "Relay");
  // get direct supply lines
  let dirSuppliedLines = arsenalLst.map((aId) => dirSupplyFrom(G, aId, player));
  let dirSupplied = dirSuppliedLines.flat(2);
  //if relay is on direct, then add more supply lines
  relayLst = relayLst.filter((rId) => dirSupplied.includes(rId));
  dirSuppliedLines = dirSuppliedLines.concat(relayLst.map((rId) => dirSupplyFrom(G, rId, player)));
  dirSupplied = removeDup(dirSuppliedLines.flat(2));
  return [dirSupplied, dirSuppliedLines]
}

export function getSuppliedCells(G: GameState, player: P_ID): CellID[] {
  const dirSupplied = getDirSuppliedLines(G, player)[0]
  //get the connected component of supplied pieces
  const myPieceLst = filterCId(G.cells, (obj) => obj.belong === player)
  const myPieceDirSupplied = myPieceLst.filter((id) => dirSupplied.includes(id))

  const mySuppliedPieces = connectedComponents(myPieceLst, myPieceDirSupplied)
  //supplied=dirSupplied+ dis<1 of supplied pieces
  //const suppliedCells= removeDup(G.cells.map((_,id)=>id).filter((_,id) =>ptSetDisLessThan(myPieceDirSupplied,id)).concat(dirSupplied));
  return mySuppliedPieces
}

//Game Object

type Entity = number
type ObjType = "Infantry" | "Cavalry" | "Artillery" | "Swift_Artillery" | "Relay" | "Swift_Relay"
interface ObjData {
  readonly typeName: ObjType,
  readonly objType: ObjType, // functional type
  readonly objRender: string, //emoji
  readonly speed: number,
  readonly range: number,
  readonly offense: number,
  //readonly offenseOnCharge?:number, +3 for "Cavalry"
  readonly defense: number,
  readonly canAddDef: boolean,
  //readonly defenseInMountain:number, +2 for "Infantry" and "Artillery"
  //readonly defenseInFort:number +4
}
export interface ObjInstance extends ObjData {
  //entity: Entity,
  belong: P_ID,
  supplied: boolean,
  retreating: boolean,
}




type Type2ObjData = {
  [Key in ObjType]: ObjData
}
const dataList: Type2ObjData = {
  "Infantry": {
    typeName: "Infantry",
    objType: "Infantry",
    objRender: "💂",
    speed: 1,
    range: 2,
    offense: 4,
    defense: 6,
    canAddDef: true,
  },
  "Cavalry": {
    typeName: "Cavalry",
    objType: "Cavalry",
    objRender: "🏇",
    speed: 2,
    range: 2,
    offense: 4,
    defense: 5,
    canAddDef: false,
  },
  "Artillery": {
    typeName: "Artillery",
    objType: "Artillery",
    objRender: "🎉",
    speed: 1,
    range: 3,
    offense: 5,
    defense: 8,
    canAddDef: true,
  },
  "Swift_Artillery": {
    typeName: "Swift_Artillery",
    objType: "Artillery",
    objRender: "🚀",
    speed: 2,
    range: 3,
    offense: 5,
    defense: 8,
    canAddDef: true,
  },
  "Relay": {
    typeName: "Relay",
    objType: "Relay",
    objRender: "🚩",
    speed: 1,
    range: 2,
    offense: 0,
    defense: 1,
    canAddDef: false,
  },
  "Swift_Relay": {
    typeName: "Swift_Relay",
    objType: "Relay",
    objRender: "🚚",
    speed: 2,
    range: 2,
    offense: 0,
    defense: 1,
    canAddDef: false,
  },

}

function newPiece(type: ObjType, be: P_ID): ObjInstance {
  const objData = dataList[type]
  return {
    ...objData,
    //entity:ent,
    belong: be,
    supplied: true,
    retreating: false
  }
}


type StrongholdType = "Arsenal" | "Pass" | "Fortress" | "Mountain"
interface Stronghold {
  readonly placeType: StrongholdType,
  readonly defenseAdd: number
  readonly placeRender: string
  belong: P_ID | null
}

function newStronghold(type: StrongholdType, belong: P_ID | null = null): Stronghold {
  function renderByType(t: StrongholdType): [string, number] {
    switch (t) {//render and def Add
      case "Arsenal": return ["🎪", 0];
      case "Pass": return ["🛣️", 2];
      case "Fortress": return ["🏰", 4];
      case "Mountain": return ["⛰️", 0]
    }
  }
  return { placeType: type, defenseAdd: renderByType(type)[1], placeRender: renderByType(type)[0], belong: belong }
}