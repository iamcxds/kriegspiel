import { INVALID_MOVE } from 'boardgame.io/core';
import * as gameFun from './resrc/Game.bs'
export const TicTacToe = {
    setup:  () => { 
        let eCells=Array(16).fill("none");
        eCells[0]='0';
        eCells[1]='1';
       return {cells: eCells} ;
    } ,

    turn:{
        minMoves:1,
        maxMoves:1,
    },

    moves: {
      movePiece: 
      
        (G, ctx, stCId, edCId) => {
        if ( canPick(G, ctx, stCId) && canPut(G, ctx, stCId, edCId))
        {G.cells[stCId] = "none";
        G.cells[edCId] = ctx.currentPlayer;}
        else
         return INVALID_MOVE; },
        
      },
    
    /* endIf: (G, ctx) =>  {
        if (IsVictory(G.cells)){
            return { winner: ctx.currentPlayer };
        }
        
        else if (IsDraw(G.cells)) {
            return {draw:true};
        }
    }, */
  };

  export function canPick(G, ctx, stCId) { 
    return G.cells[stCId] === ctx.currentPlayer;
    }
  export function canPut(G, ctx, stCId, edCId) { 
    return G.cells[edCId] === "none" && Math.abs(stCId-edCId)<=2;
    }

  function IsVictory(cells) {
    const positions = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
      [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
    ];
  
    const isRowComplete = row => {
      const symbols = row.map(i => cells[i]);
      return symbols.every(i => i !== null && i === symbols[0]);
    };
  
    return positions.map(isRowComplete).some(i => i === true);
  }
  
  // Return true if all `cells` are occupied.
  function IsDraw(cells) {
    return cells.filter(c => c === null).length === 0;
  }