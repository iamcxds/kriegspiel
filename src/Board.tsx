import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import * as Game from './Game';
import { Ctx } from 'boardgame.io';
import './Board.css'
import { Console } from 'console';
import { Style } from 'util';

const getWinner = (ctx: Ctx): string | null => {
  if (!ctx.gameover) return null;
  if (ctx.gameover.draw) return 'Draw';
  return `Player ${ctx.gameover.winner} wins!`;
};

interface GameProps extends BoardProps<Game.GameState> {}

export const Board = ({ G, ctx, moves,isActive }: GameProps) => {
  let winner = getWinner(ctx);
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

  function battleValueTable(id:number|null){
    const  MyOff= id===null?0:Game.getBattleValue(G,G.myID,true,id)
    const  MyDef= id===null?0:Game.getBattleValue(G,G.myID,false,id)
    const EnemyDef= id===null?0:Game.getBattleValue(G,G.opponentID,false,id)
    const EnemyOff= id===null?0:Game.getBattleValue(G,G.opponentID,true,id)
    const RelOff = MyOff-EnemyDef
    const RelDef = MyDef-EnemyOff
    function offState(n:number){
      if(n>0) return "⚔"
      else return ""
    }
    function defState(n:number){
      if(n>=0) return "🛡"
      else if(n===-1) return "🏃‍♂️"
      else return "💀"
    }
    return (<table>
      <tr style={{backgroundColor:fictionColor(G.myID)}}>
        <td>MyOff:{MyOff} {offState(RelOff)}</td>
        <td>MyDef:{MyDef} {defState(RelDef)} </td>
      </tr>
      <tr style={{backgroundColor:fictionColor(G.opponentID)}}>
        <td>EnemyDef:{EnemyDef} {defState(-RelOff)}</td>
        <td>EnemyOff:{EnemyOff} {offState(-RelDef)}</td>
      </tr>
    </table>)
  }

  return (
    <main>
      <h1>Kriegspiel</h1>
      
      <div style={{width:"50%"}}>
      <svg viewBox={`0 0 ${Game.BoardSize.mx} ${Game.BoardSize.my}`}>
        {G.cells.map((obj,id)=>{
        const pos= Game.CId2Pos(id);
        const stronghold=G.places[id]
        
        return (<g transform={`translate(${pos.x} ${pos.y})`} onClick={() => myOnClick(id)}>
          
        {/* background */}
        <rect
        key={id}
        width="1"
        height="1"
        fill={getCellColor(id)}
        stroke={pico8Palette.dark_grey}
        stroke-width="0.05"/>
        {/* stronghold */}
        {stronghold&&renderStr(stronghold.placeRender,0.8)}
        {/* piece */}
        {obj && renderPiece(obj)}
         </g>
         
        )
      })}
      </svg>
        
        
      </div>
      <div >
        
        
         {battleValueTable(pickedID)}
        <p style={{backgroundColor:fictionColor(currentPlayer)}}>It's {isActive?"my":"opponent's"} turn</p>
        <p>Cell-ID: {pickedID}, YouPick:{pickedData?.objType}</p>
        </div>
    
      {winner && <p>{winner}</p>}
    </main>
  );
};

function renderPiece (obj:Game.ObjInstance){
  return (<g>
  {obj.belong&&<circle cx="0.5" cy="0.5" r="0.4" stroke={pico8Palette.dark_grey}
  stroke-width="0.05" fill={fictionColor(obj.belong)} />}
  {renderStr(obj.objRender)}
</g>
)
}
function renderStr(str:string,size:number=0.5){ 
  return (<text fontSize={`${size}`} x="0.5" y="0.5" dominant-baseline="middle" text-anchor="middle">{str}</text>)
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
