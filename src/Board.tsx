import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import * as Game from './Game';
import { Ctx } from 'boardgame.io';
import './Board.css'
import { Console } from 'console';
import { Style } from 'util';
import { undo } from 'boardgame.io/dist/types/src/core/action-creators';

const getWinner = (ctx: Ctx): string | null => {
  if (!ctx.gameover) return null;
  if (ctx.gameover.draw) return 'Draw';
  return `Player ${ctx.gameover.winner} wins!`;
};

interface GameProps extends BoardProps<Game.GameState> {}

export const Board = ({ G, ctx, moves,isActive,events,...props}: GameProps) => {
  let winner = getWinner(ctx);
  const myID=props.playerID as Game.P_ID;
  const opponentID=Game.dualPlayerID(props.playerID as Game.P_ID)
  const currentPlayer=ctx.currentPlayer as Game.P_ID;
  const [pickedID, pickUpID]=useState<number|null>(null)
  const [pickedData, pickUpData]=useState<Game.ObjInstance|null>(null)
  function pickUpById(id:number|null){
    if (id===null){
       pickUpID(null);
      pickUpData(null);
    }
     else {pickUpID(id);
      if(Game.canPick(G,ctx,id)&&isActive) {pickUpData(G.cells[id]);}
      else {pickUpData(null);}
    }
    
  }
  function myOnClick(id:number){
   switch (pickedID){
    case null: 
     pickUpById(id);
    break;
    case id: pickUpById(null);
    break;
    default: 
    if(pickedData!== null)
     {pickUpById(null);
      moves.movePiece(pickedID,id);}
    else {pickUpById(id);}
   } 
    };
  function isAvailable(id:number) {
      if (!isActive) return false;
      else if (pickedID !== null && pickedData !== null && Game.canPut(G, ctx,pickedID, pickedData , id))
        return true;
    }
  function  getCellColor(id:number) {
      const strongholdColor=G.places[id]?.belong
      if (id === pickedID) { return pico8Palette.dark_purple; }
  
      else if (isAvailable(id)) { return pico8Palette.green; }
      
      else if (typeof(strongholdColor)==="string"){return fictionColor(strongholdColor)}
      else {const pos=Game.CId2Pos(id);
        const colorCase= (pos.x+pos.y)%2===0;
        return colorCase?pico8Palette.white: pico8Palette.light_grey;}
    }
   
  //render info UI  
  function battleFactorTable(id:number|null){
    const  MyOff= id===null?0:Game.getBattleFactor(G,myID,true,id)[0]
    const  MyDef= id===null?0:Game.getBattleFactor(G,myID,false,id)[0]
    const EnemyDef= id===null?0:Game.getBattleFactor(G,opponentID,false,id)[0]
    const EnemyOff= id===null?0:Game.getBattleFactor(G,opponentID,true,id)[0]
    const RelOff = MyOff-EnemyDef
    const RelDef = MyDef-EnemyOff
    
    return (<table>
      <tr style={{backgroundColor:fictionColor(myID)}}>
        <td>MyOff:{MyOff} {offState(RelOff)}</td>
        <td>MyDef:{MyDef} {defState(RelDef)} </td>
      </tr>
      <tr style={{backgroundColor:fictionColor(opponentID)}}>
        <td>EnemyDef:{EnemyDef} {defState(-RelOff)}</td>
        <td>EnemyOff:{EnemyOff} {offState(-RelDef)}</td>
      </tr>
    </table>)
  }
  function offState(n:number){
    if(n>0) return "⚔️"
    else return ""
  }
  function defState(n:number){
    if(n>=0) return "🛡️"
    else if(n===-1) return "🏃‍♂️"
    else return "💀"
  }
  function renderBattleEffect(CId:number,selected:boolean){
    const obj=G.cells[CId];
    if (obj){
      const belong = obj.belong;
      const [off,offLst] = Game.getBattleFactor(G,Game.dualPlayerID(belong),true,CId);
      const [def,defLst] = Game.getBattleFactor(G,belong,false,CId);
      const relDef=def-off
      //show the detailed info for selected cell, otherwise only cell in danger
      if (selected) {
       return offLst.map((id)=>gTranslate(renderStr("⚔️",0.2),Game.CId2Pos(id).x-0.35,Game.CId2Pos(id).y-0.35)).concat(
        defLst.map((id)=>gTranslate(renderStr(id===CId?defState(relDef):"🛡️",0.2),Game.CId2Pos(id).x-0.35,Game.CId2Pos(id).y-0.35)));
      }
      else if (relDef<0){ 
        return gTranslate(renderStr(defState(relDef),0.2),Game.CId2Pos(CId).x-0.35,Game.CId2Pos(CId).y-0.35)
      }
      
    }
    
  }

  return (
    <main>
      <h1>Kriegspiel</h1>
      
      <div style={{width:"60%"}}>
      <svg viewBox={`-0.5 -0.5 ${Game.BoardSize.mx+1} ${Game.BoardSize.my+1}`}>
        
        {/* background */}
        {renderLayer((_,id)=><rect
          key={id}
          width="1"
          height="1"
          fill={getCellColor(id)}
          stroke={pico8Palette.dark_grey}
          stroke-width="0.05"/>
        )}
        {/* supply line */}
        {Game.dirSupplyFrom(G,0,'0').map((lineLst)=>{
          let stPos=Game.CId2Pos(lineLst[0]);
          let edPos=Game.CId2Pos(lineLst[lineLst.length-1]);
          return stPos&&edPos&&gTranslate(<line x1={stPos.x} y1={stPos.y} x2={edPos.x} y2={edPos.y} stroke={fictionColor('0')} stroke-width="0.1" stroke-dasharray="0.5 0.1" />,0.5,0.5)
        })}
        {/* stronghold */}
        {renderLayer((stronghold,id)=> <>{stronghold&&renderStr(stronghold.placeRender,1)}</> ,G.places)}
        {/* piece */}
        {renderLayer((obj,id)=><>{obj&&renderPiece(obj)}</>,G.cells)}
        {/* charge */}
        {renderLayer((obj,id)=><>{obj&&Game.getChargedCavalries(G,id).map((chargeRow)=>
           chargeRow.map((pos,id,row)=>
              gTranslate(renderStr("⚡"),pos.x-0.5*row[0].x,pos.y-0.5*row[0].y)
              )).flat()}</>
        ,G.cells)}
        {/* effecting info UI */}
        {G.cells.map((_,id)=><>{renderBattleEffect(id,id===pickedID)}</>)
        }
        {/* control */}
        {renderLayer((_,id)=><rect onClick={() => myOnClick(id)} width="1"
          height="1" fillOpacity="0"/> )}
        
      </svg>
        
        
      </div>
      <div >
        
        
         {battleFactorTable(pickedID)}
        <p>{spanBGColor(<>It's {isActive?"my":"opponent's"} turn.</>,fictionColor(currentPlayer))}
          <button disabled={!isActive} onClick={()=>{events.endTurn&&events.endTurn();}} >End Turn</button>
          <button disabled={!isActive} onClick={props.undo} >undo</button></p>
        <p>Cell-Coord: {pickedID!==null&&((pos)=>{return "("+pos.x+","+pos.y+")";})(Game.CId2Pos(pickedID))},{pickedID}, 
        
        Piece:{pickedID!==null&&((id)=>{const obj=G.cells[id];
        if(obj){return spanBGColor(<>{obj.objRender+obj.typeName}, offense:{obj.offense},
        defense: {obj.defense}, range:{obj.range}, speed:{obj.speed}
        </> ,fictionColor(obj.belong))}
        })(pickedID)} </p>
        </div>
    
    </main>
  );
};

function renderLayer<T>(objRender:(a:T,b:number)=>JSX.Element|JSX.Element[],objLst:T[]=Array(Game.BoardSize.mx * Game.BoardSize.my).fill(null)){
  return objLst.map((obj,id)=>{
    const pos= Game.CId2Pos(id);
    return gTranslate(objRender(obj,id),pos.x,pos.y);
  })
}
function renderPiece (obj:Game.ObjInstance){
  return (<g>
  {<circle cx="0.5" cy="0.5" r="0.4" stroke={pico8Palette.dark_grey}
  stroke-width="0.05" fill={fictionColor(obj.belong)} />}
  {renderStr(obj.objRender)}
</g>
)
}
function renderStr(str:string,size:number=0.5){ 
  return (<text fontSize={`${size}`} x="0.5" y="0.5" dominantBaseline="middle" textAnchor="middle">{str}</text>)
}

function gTranslate(jsx:JSX.Element|JSX.Element[],x=0,y=0){
  return <g transform={`translate(${x} ${y})`}>
      {jsx}
      </g>
}

function spanBGColor(jsx:JSX.Element|JSX.Element[],color:string){
  return <span style={{backgroundColor:color}}>{jsx}</span> 
}

function fictionColor(pID:Game.P_ID){
  switch (pID) {
    case '0': return pico8Palette.blue;
    case '1': return pico8Palette.orange;
  }
}

const pico8Palette={
  black:"#00000",
  dark_blue:"#1d2b53",
  dark_purple: "#7e2553", 
  dark_green:"#008751", 
  brown: "#ab5236", 
  dark_grey:"#5f574f", 
  light_grey:"#c2c3c7", 
  white: "#fff1e8",
  red: "#ff004d", 
  orange: "#ffa300", 
  yellow: "#ffec27", 
  green: "#00e436", 
  blue:"#29adff", 
  lavender:"#83769c", 
  pink:"#ff77a8", 
  light_peach:"#ffccaa"
}
