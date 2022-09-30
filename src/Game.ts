import { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { Interface } from 'readline';
import { isNonNullExpression } from 'typescript';

export type P_ID='0'|'1'

export interface GameState {
  //myID:P_ID,
  //opponentID:P_ID,
  cells: (ObjInstance | null)[],
  places:(Stronghold|null)[],
  inSupply:{[key in P_ID]: boolean[]}
}
export function dualPlayerID(id:P_ID){
  switch (id){
    case '0': return '1';
    case '1': return '0';
  }
}
export const TicTacToe: Game<GameState> = {
  setup: (ctx) => {
    let eCells = Array(BoardSize.mx * BoardSize.my).fill(null);
    eCells[0] = newPiece("Infantry",'0');
    eCells[Pos2CId(0,1)] = newPiece("Artillery",'0');
    eCells[1] = newPiece("Cavalry",'1');
    eCells[2] = newPiece("Cavalry",'1');
    eCells[3] = newPiece("Cavalry",'1');
    eCells[4] = newPiece("Cavalry",'1');
    let ePlaces=Array(BoardSize.mx * BoardSize.my).fill(null);
    ePlaces[0]=newStronghold("Arsenal",'0');
    ePlaces[9]=newStronghold("Arsenal",'1');
    ePlaces[Pos2CId(4,3)]=newStronghold("Fortress");
    ePlaces[Pos2CId(3,3)]=newStronghold("Mountain");
    let initGame = {  cells: eCells ,places:ePlaces , 
      inSupply:{
        '0':Array(BoardSize.mx * BoardSize.my).fill(false),
        '1':Array(BoardSize.mx * BoardSize.my).fill(false)
    }}
    update(initGame,ctx);
    return initGame;
  },
  /* playerView: (G, ctx, playerID) => {
    return {...G, myID: playerID, opponentID:dualPlayerID(playerID as P_ID)};
  }, */
  turn: {
    
  },

  moves: {
    movePiece: (G, ctx, stCId: number, edCId: number) => {
      let obj=G.cells[stCId]
      
        if (obj&&canPick(G, ctx, stCId) && canPut(G, ctx, stCId, obj , edCId)) {
        G.cells[stCId] = null;
        //default make it un supplied
        obj.supplied=false;
        G.cells[edCId] = obj;
        update(G,ctx); 
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
function update(G:GameState,ctx:Ctx){
  //check supply
  console.log("update")
  let cPlayer=ctx.currentPlayer as P_ID
  updateSuppliedCells(G,cPlayer);
  updateSuppliedCells(G,dualPlayerID(cPlayer));
  //check capture the stronghold
  G.places.forEach((strong,CId) => {
    if (!strong) {}
    else if (strong.placeType==="Mountain"){}
    else if (strong.placeType==="Arsenal"){ 
      const obj=G.cells[CId];
      //obj is a enemy, and have offense, and is supplied
       if(obj&&strong.belong&&obj.belong!==strong.belong&&obj.offense>0&&obj.supplied){ 
        strong.belong=null;
        //strong.placeRender="🏳️"
        //then add 1 atk action
        } }
    else {const obj=G.cells[CId]
      if (obj) {strong.belong=obj.belong;}
      else {strong.belong=null}
    }
    
  });
  
}

function updateSuppliedCells(G:GameState,player?:P_ID){
  console.log("SCupdate")
  if (player!=="1"){
    let SuppliedCells0=getSuppliedCells(G,"0");
    G.inSupply[0]=G.inSupply[0].map((_,id)=>SuppliedCells0.includes(id)) ;
  }
  
  if (player!=="0"){
  let SuppliedCells1=getSuppliedCells(G,"1");
  
  G.inSupply[1]=G.inSupply[1].map((_,id)=>SuppliedCells1.includes(id)) ;}
  updateSuppliedObj(G);
}
function updateSuppliedObj(G:GameState){
  console.log("SOupdate")
  G.cells=G.cells.map((obj,id)=>{
    if(obj){ return {...obj,supplied:G.inSupply[obj.belong][id]}}
    else{return null}
  })
}

function endTurnUpdate(G:GameState){}


// Position and distance functions

interface Position {
  x: number,
  y: number
}

export const BoardSize = { mx: 10, my: 8 }

export function Pos2CId(x:number,y:number): number {
  if (x<0||y<0||x>=BoardSize.mx||y>=BoardSize.my) {return -1}
  else {return y * BoardSize.mx + x}

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
export function nonNull<T>(a:T){return a!==null}

export function removeDup<T>(a:Array<T>){return Array.from(new Set(a))}

export function canPick(G: GameState, ctx: Ctx, CId: number) {
  let obj = G.cells[CId]
  return obj&&obj.belong === ctx.currentPlayer&&obj.supplied;
}
export function canPut(G: GameState, ctx: Ctx, stCId: number, obj:ObjInstance,edCId: number) {
  const stPos = CId2Pos(stCId);
  const edPos = CId2Pos(edCId);
  return G.cells[edCId] === null&&G.places[edCId]?.placeType!=="Mountain" && NaiveDistance(stPos, edPos) <= obj.speed;
}

//search in 米 shape
function searchInMiShape(G:GameState, CId:number, filter:(obj:ObjInstance|null,id:number)=>boolean,min:number=0,max:number=Math.max(BoardSize.mx,BoardSize.my)):[number[][],Position[][]]
{
    const pos=CId2Pos(CId);
    const aCIdRowsLst:number[][]=[]
    const rowsLst:Position[][]=[];
    //search for 8 direction
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++)
      if (i!==0||j!==0){
        let relPosLine:Position[]=[];
        let aCIdLine:number[]=[];
        //check on 1 direction, distance from min to max
        for (let n = min; n <= max; n++) {
          //get the cells on direction
          let cCId= Pos2CId(pos.x+n*i,pos.y+n*j);
          let cObj=G.cells[cCId];
          //!!!filter here
          //and also filter the case that is out of board
          if (cObj!==undefined&&filter(cObj,cCId))
          {relPosLine.push({x:n*i,y:n*j});
            aCIdLine.push(cCId);}
          else {break;}
        }
        if(relPosLine.length!==0){
          rowsLst.push(relPosLine);
          aCIdRowsLst.push(aCIdLine)
        }
      }
    }
    return [aCIdRowsLst,rowsLst];
}

//battle value
// get charged cavalry rows with relative positions.
export function getChargedCavalries(G:GameState, CId:number):(Position[])[]{
  
  const obj=G.cells[CId]
  const belong=obj?.belong
  const placesType=G.places[CId]?.placeType
  
  //the target not in a stronghold, and has piece on it
  if (placesType==="Fortress"|| placesType==="Pass" ||!obj){ return []}
  else {
    /* const pos=CId2Pos(CId)
    const chargeRowsLst:(Position[])[]=[]
    //search for 8 direction
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++)
      if (i!==0||j!==0){
        let potentialCharge:Position[]=[];
        //check on 1 direction
        for (let n = 1; n <= 4; n++) {
          //get the cells on direction
          let cCId= Pos2CId(pos.x+n*i,pos.y+n*j)
          let cObj=G.cells[cCId]
          //!!!check cObj is a cavalry, a enemy, supplied,not retracted , not in a fortress
          if (cObj&&cObj.objType==="Cavalry"&&cObj.belong!==belong&&cObj.supplied&&!cObj.retreated&&G.places[cCId]?.placeType!=="Fortress")
          {potentialCharge.push({x:n*i,y:n*j});}
          else {break;}
        }
        if(potentialCharge.length!==0){
          chargeRowsLst.push(potentialCharge)
        }
      }
    } */
    const chargeRowsLst=searchInMiShape(G,CId,(cObj,cCId)=>
    //!!!check cObj is a cavalry, a enemy, supplied,not retracted , not in a fortress
    (cObj!==null&&cObj.objType==="Cavalry"&&cObj.belong!==belong&&cObj.supplied&&!cObj.retreated&&G.places[cCId]?.placeType!=="Fortress")
    ,1,4)[1]
    return chargeRowsLst
  }
  
}

export function getBattleFactor(G: GameState, player:P_ID,isOffense: boolean, CId:number):[number,number[]] 
//type: true->offense, false->defense
{ const pos = CId2Pos(CId);
  const targetObj=G.cells[CId]
  // filter the unit in 米 shape in its range
  let effectingObjs = G.cells.map((obj,id)=>{
  //obj is in range, supplied, belongs to the chosen player,
  if(obj&&isInRange(pos,CId2Pos(id),obj)&&obj.supplied&&obj.belong===player){
    //filter out retreated unit in offense
    if (isOffense&&obj.retreated){return null;}
    else {return id;}
  }
  else return null;}).filter(nonNull) as number[]
  //filter the effecting strongholds
  const effectingStonghold = effectingObjs.map((id)=>{
    const obj=G.cells[id]
    const strong=G.places[id];
  return (strong&&strong.defenseAdd>0&&obj&&obj.canAddDef)?strong:null
  }).filter((obj)=>obj) as Stronghold[]
  const strongholdDef =effectingStonghold.map((obj)=>obj.defenseAdd).reduce((a,b)=>a+b,0)

  //get charged cavalries
  const chargedCavalries =getChargedCavalries(G,CId).flat().map((rPos)=>{
  let aCId=Pos2CId(pos.x+rPos.x,pos.y+rPos.y);
  return aCId 
  })
  const chargedAmount=chargedCavalries.length
  
  var addValue=0
  //if it is offensive, merge objs in range and in charge
  if (targetObj&&targetObj.belong!==player&&isOffense){
    // add and merge cavalries
    effectingObjs= Array.from(new Set([...effectingObjs,...chargedCavalries]));
    
    // add charge value
    addValue=3*chargedAmount;
  }
  else if (!isOffense) {addValue=strongholdDef;}


  return [effectingObjs.map((id)=>G.cells[id] as ObjInstance).map((obj)=>isOffense? obj.offense:obj.defense).reduce((a,b)=>a+b,addValue)
  , effectingObjs]
}

function isInRange(pos:Position,oPos:Position,obj:ObjInstance):boolean{
  const dirDis=DirectDistance(pos,oPos);
  return (NaiveDistance(pos,oPos)<=3&&dirDis!==null&&dirDis<=obj.range)
}

//Supply 

export function dirSupplyFrom(G:GameState,CId:number,player:P_ID){
 let result=searchInMiShape(G,CId, (obj,id)=>
 //filter the objs block the supply lines
 //obj is enemy, has offense factor, is supplied, not retreat
 //and mountains also block
 !(obj&&obj.belong!==player&&obj.offense>0&&obj.supplied&&!obj.retreated)&&(G.places[id]?.placeType!=="Mountain") )
 return result[0]
}

export function getSuppliedCells(G:GameState,player:P_ID):number[]{
  const arsenalLst=G.places.map((str,id)=>(str&&str.belong===player&&str.placeType==="Arsenal")?id:null).filter(nonNull) as number[]
  const relayLst=G.cells.map((obj,id)=>(obj&&obj.belong===player&&obj.objType==="Relay")?id:null).filter(nonNull) as number[]
  const dirSupplied=removeDup(arsenalLst.map((aId)=>dirSupplyFrom(G,aId,player)).flat(2))
  console.log(dirSupplied);
  return dirSupplied
}

//Game Object

type Entity = number
type ObjType = "Infantry"|"Cavalry"|"Artillery"|"Swift_Artillery"|"Relay"|"Swift_Relay"
interface ObjData {
  readonly typeName: ObjType,
  readonly objType: ObjType, // functional type
  readonly objRender: string, //emoji
  readonly speed:number,
  readonly range:number,
  readonly offense: number,
  //readonly offenseOnCharge?:number, +3 for "Cavalry"
  readonly defense: number,
  readonly canAddDef:boolean,
  //readonly defenseInMountain:number, +2 for "Infantry" and "Artillery"
  //readonly defenseInFort:number +4
}
export interface ObjInstance extends ObjData {
  //entity: Entity,
  belong: P_ID,
  supplied:boolean,
  retreated:boolean,
}




type Type2ObjData ={
  [Key in ObjType]:ObjData
}
const dataList: Type2ObjData={
  "Infantry":{
  typeName: "Infantry",
  objType: "Infantry",
  objRender: "💂",
  speed: 1,
  range: 2,
  offense:4,
  defense:6,
  canAddDef: true,
},
"Cavalry":{
  typeName: "Cavalry",
  objType: "Cavalry",
  objRender: "🏇",
  speed: 2,
  range: 2,
  offense:4,
  defense:5,
  canAddDef: false,
},
"Artillery":{
  typeName: "Artillery",
  objType: "Artillery",
  objRender: "🎉",
  speed: 1,
  range: 3,
  offense:5,
  defense:8,
  canAddDef: true,
},
"Swift_Artillery":{
  typeName: "Swift_Artillery",
  objType: "Artillery",
  objRender: "🚀",
  speed: 2,
  range: 3,
  offense:5,
  defense:8,
  canAddDef: true,
},
"Relay":{
  typeName: "Relay",
  objType: "Relay",
  objRender: "🚩",
  speed: 1,
  range: 2,
  offense:0,
  defense:1,
  canAddDef: false,
},
"Swift_Relay":{
  typeName: "Swift_Relay",
  objType: "Relay",
  objRender: "🚚",
  speed: 2,
  range: 2,
  offense:0,
  defense:1,
  canAddDef: false,
},

}

function newPiece( type: ObjType,be:P_ID):ObjInstance{
  const objData= dataList[type]
  return {...objData,
    //entity:ent,
    belong:be,
    supplied:true,
    retreated:false
  }
}


type StrongholdType = "Arsenal"|"Pass"|"Fortress"|"Mountain"
interface Stronghold{
  readonly placeType: StrongholdType,
  readonly defenseAdd: number
  readonly placeRender: string
  belong: P_ID|null
}

function newStronghold(type:StrongholdType, belong:P_ID|null =null):Stronghold{
  function renderByType(t:StrongholdType):[string,number]{
    switch (t){//render and def Add
      case "Arsenal": return ["🎪",0];
      case "Pass":return ["🛣️",2];
      case "Fortress": return ["🏰",4];
      case "Mountain": return ["⛰️",0]
    }
  }
  return {placeType:type, defenseAdd:renderByType(type)[1], placeRender:renderByType(type)[0],belong:belong}
}