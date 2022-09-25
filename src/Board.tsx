import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import * as Game from './Game';
import { Ctx } from 'boardgame.io';
import './Board.css'
import { Console } from 'console';

const getWinner = (ctx: Ctx): string | null => {
  if (!ctx.gameover) return null;
  if (ctx.gameover.draw) return 'Draw';
  return `Player ${ctx.gameover.winner} wins!`;
};

interface GameProps extends BoardProps<Game.GameState> {}

export const Board = ({ G, ctx, moves,isActive }: GameProps) => {
  let winner = getWinner(ctx);
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
  function  getCellClassName(id:number) {
      if (id === pickedID) { return "highlight"; }
  
      else if (isAvailable(id)) { return "active"; }
      else return '';
    }

  /* let tbody=[]
  for (let i = 0; i < Game.BoardSize.my; i++) {
    let cells = [];
    for (let j = 0; j < Game.BoardSize.mx; j++) {
      const id = Game.BoardSize.mx * i + j;
      const obj=G.cells[id]
      cells.push(
        <td
          key={id}
          className={getCellClassName(id)}
          onClick={() => myOnClick(id)}
        >
          {obj===null? null: renderPiece(obj)}
        </td>
      );
    }
    tbody.push(<tr key={i}>{cells}</tr>);
  } */

  return (
    <main>
      <h1>boardgame.io Typescript Demo</h1>

      <div id="boardBody">
      <svg viewBox={`0 0 ${Game.BoardSize.mx} ${Game.BoardSize.my}`}>
        {G.cells.map((obj,id)=>{
        const pos= Game.CId2Pos(id);
        
        return <g transform={`translate(${pos.x} ${pos.y})`} onClick={() => myOnClick(id)}>
          <rect
        className={getCellClassName(id)}
        width="1"
        height="1"
        fill="white"
        stroke="gray"
        stroke-width="0.1"/>
        {obj && renderPiece(obj)}
         </g>
      })}</svg>
        
        
      </div>
      <div id="infoBody">
        {pickedID===null?null:
        <table>
          <tr>
            <td>MyOff:{Game.getBattleValue(G,G.playerID,true,pickedID)}</td>
            <td>MyDef:{Game.getBattleValue(G,G.playerID,false,pickedID)}</td>
          </tr>
          <tr>
            <td>EnemyDef:{Game.getBattleValue(G,G.opponentID,false,pickedID)}</td>
            <td>EnemyOff:{Game.getBattleValue(G,G.opponentID,true,pickedID)}</td>
          </tr>
        </table>
        }</div>
    <p>Cell-ID: {pickedID}, Data:{pickedData?.objType}</p>
      {winner && <p>{winner}</p>}
    </main>
  );
};

function renderPiece (obj:Game.ObjInstance){
  return (<g  fontSize={"0.5"}>
  <circle cx="0.5" cy="0.5" r="0.4" stroke="gray"
  stroke-width="0.05" className={`piece${obj.belong}`}  />
  <text x="0.5" y="0.5" dominant-baseline="middle" text-anchor="middle">{obj.objRender}</text>

</g>
)
}