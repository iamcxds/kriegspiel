import React, { useRef, useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import * as Game from './Game';
import { objTypeList, strongholdTypeList, BoardSize, Position, CellID, P_ID, GameState, ObjInstance, canPick, canAttack, canPut, CId2Pos, Pos2CId, dualPlayerID, getBattleFactor, getChargedCavalries, getDirSuppliedLines, getSuppliedCells, exportGame } from './Game';
import { Ctx } from 'boardgame.io';
//import './Board.css'
import { Console } from 'console';
import { useGesture } from '@use-gesture/react'

const getWinner = (ctx: Ctx): string | null => {
  if (!ctx.gameover) return null;
  if (ctx.gameover.draw) return 'Draw';
  return `Player ${ctx.gameover.winner} wins!`;
};

interface GameProps extends BoardProps<GameState> { }

export const Board = ({ G, ctx, moves, isActive, events, ...props }: GameProps) => {
  let winner = getWinner(ctx);
  const myID = (props.playerID !== null ? props.playerID : ctx.currentPlayer) as P_ID;
  const opponentID = dualPlayerID(myID)
  const currentPlayer = ctx.currentPlayer as P_ID;
  const [pickedID, pickUpID] = useState<CellID | null>(null)

  const [gameData, setGameData] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editState, setEditState] = useState<(CellID | null)>(null)
  const [editFiction, setEditFiction] = useState<P_ID>('0')

  function pickedData(pId: CellID | null) {
    if (pId !== null && canPick(G, ctx, pId) && isActive) { return G.cells[pId]; }
    else { return null; }
  }



  function myOnClick(id: CellID) {
    if (editMode) {
      if (editState !== null) {
        if (editState < 6) {
          const obj = G.cells[id] ? null : Game.newPiece(objTypeList[editState], editFiction)
          moves.editCells(id, obj)
        }
        else {
          const state = editState - 6
          //only arsenal has fiction
          const fiction = state ? null : editFiction
          const str = G.places[id] ? null : Game.newStronghold(strongholdTypeList[state], fiction)
          moves.editPlaces(id, str)
        }
      }
    }
    else {
      switch (pickedID) {
        case null:
          pickUpID(id);

          break;
        case id: pickUpID(null);
          break;
        default:
          if (pickedData(pickedID) !== null) {
            pickUpID(null);
            moves.movePiece(pickedID, id);
          }
          else { pickUpID(id); }
      }
    }
  };

  function isAvailable(id: CellID) {
    if (!isActive) return false;
    else if (pickedID !== null && pickedData(pickedID) !== null && canPut(G, ctx, pickedID, id))

      return true;
  }

  function getCellColor(id: CellID) {
    const strongholdColor = G.places[id]?.belong
    if (id === pickedID) {
      return pico8Palette.dark_purple;
    }

    else if (isAvailable(id)) {
      //predict supply after moving
      if (getSuppliedCells({ ...G, cells: G.cells.map((obj, CId) => CId === pickedID ? null : (CId === id ? pickedData(pickedID) : obj)) }, currentPlayer).includes(id)) { return pico8Palette.green; }
      else { return pico8Palette.yellow; }
    }

    else if (typeof (strongholdColor) === "string") { return fictionColor(strongholdColor) }
    else {
      const pos = CId2Pos(id);
      const colorCase = (pos.x + pos.y) % 2 === 0;
      return colorCase ? pico8Palette.light_grey : pico8Palette.white;
    }
  }

  //render info UI  
  function battleFactorTable(id: CellID | null) {
    const nonNull = id !== null
    const MyOff = nonNull ? getBattleFactor(G, myID, true, id)[0] : 0
    const MyDef = nonNull ? getBattleFactor(G, myID, false, id)[0] : 0
    const EnemyDef = nonNull ? getBattleFactor(G, opponentID, false, id)[0] : 0
    const EnemyOff = nonNull ? getBattleFactor(G, opponentID, true, id)[0] : 0
    const RelOff = MyOff - EnemyDef
    const RelDef = MyDef - EnemyOff
    const obj = nonNull ? G.cells[id] : null;
    const myOffTd = <td style={{ backgroundColor: fictionColor(myID) }}>
      MyAtk: {MyOff} {offState(RelOff)}</td>
    const myDefTd = <td style={{ backgroundColor: fictionColor(myID) }}>
      MyDef: {MyDef} {defState(RelDef)} </td>
    const eDefTd = <td style={{ backgroundColor: fictionColor(opponentID) }}>
      EnemyDef: {EnemyDef} {defState(-RelOff)}</td>
    const eOffTd = <td style={{ backgroundColor: fictionColor(opponentID) }}>
      EnemyAtk: {EnemyOff} {offState(-RelDef)}</td>


    return (<table>
      {obj?.belong === opponentID ? <><tr>
        {eDefTd}{myOffTd}
      </tr>
        <tr>
          {eOffTd}{myDefTd}
        </tr></> :
        <><tr>
          {myDefTd}{eOffTd}
        </tr>
          <tr>
            {myOffTd}{eDefTd}
          </tr></>}

    </table>)
  }
  function offState(n: number) {
    if (n > 0) return "⚔️"
    else return ""
  }
  function defState(n: number) {
    if (n >= 0) return "🛡️"
    else if (n === -1) return "🏃‍♂️"
    else return "💀"
  }
  function renderBattleEffect(CId: CellID, selected: boolean) {
    const obj = G.cells[CId];
    let result: JSX.Element[] = []
    if (obj) {
      const belong = obj.belong;
      const [off, offLst] = getBattleFactor(G, dualPlayerID(belong), true, CId);
      const [def, defLst] = getBattleFactor(G, belong, false, CId);
      const relDef = def - off
      //show the detailed info for selected cell, otherwise only cell in danger
      if (selected) {
        result = result.concat(offLst.map((id) => gTranslate(renderStr("⚔️", 0.4), CId2Pos(id).x - 0.3, CId2Pos(id).y - 0.3)).concat(
          defLst.map((id) => gTranslate(renderStr("🛡️", 0.4), CId2Pos(id).x - 0.3, CId2Pos(id).y - 0.3))));
      }
      if (relDef < 0) {
        result = result.concat(gTranslate(renderStr(defState(relDef), 0.4), CId2Pos(CId).x + 0.3, CId2Pos(CId).y - 0.3));
      }
      return result
    }

  }

  //map move ui
  const [mapPos, setMapPos] = useState<Position>({ x: 0, y: 0 })
  const [mapScale, setMapScale] = useState<number>(1)
  //const [onDrag, setOnDrag]=useState<boolean>(false)
  const boardRef = useRef(null)
  //const gestureBind = 
  const gesture = useGesture(
    {
      onDrag: (state) => {
        const e = state.event
        const svg = e.target as SVGAElement
        const CTM = svg.getScreenCTM()
        if (CTM) {
          const move = state.offset
          const dx = move[0] / (CTM.a)
          const dy = move[1] / (CTM.d)
          setMapPos({ x: dx, y: dy });
        }
      },
      onWheel: (state) => {
        const spd = 0.0007
        console.log(state.offset)
        const newScale = mapScale * (1 - spd * state.movement[1])
        //if (newScale > 0.5 && newScale < 10) {  }
        setMapScale(newScale);
      },
      onPinch: (state) => {

        const newScale = state.offset[0]
        //if (newScale > 0.5 && newScale < 10) {  }

        setMapScale(newScale);
      },

    },
    {
      target: boardRef,
      eventOptions: { passive: false },
      preventDefault: true,
    }
  );



  const gameBoard = (

    <svg viewBox={`-0.6 -0.6 ${BoardSize.mx + 1.2} ${BoardSize.my + 1.2}`}
      ref={boardRef}
    //onWheel={myOnWheel} onMouseMove={drag} onMouseDown={startDarg} onMouseUp={endDarg} onMouseLeave={endDarg}
    //onTouchStart={startDarg} onTouchEnd={endDarg} onTouchCancel={endDarg}
    >
      <g transform={`translate(${BoardSize.mx / 2} ${BoardSize.my / 2})  scale(${mapScale}) translate(${mapPos.x - BoardSize.mx / 2} ${mapPos.y - BoardSize.my / 2})`}>
        <rect
          x={-0.6} y={-0.6}
          width="100%"
          height="100%"
          fill={pico8Palette.light_peach}
          stroke={pico8Palette.dark_grey}
          stroke-width="0.05" />
        {/* background */}
        {Array(BoardSize.mx).fill(null).map((_, id) => gTranslate(renderStr((id + 1).toString()), id, -0.8))}
        {Array(BoardSize.my).fill(null).map((_, id) => gTranslate(renderStr(String.fromCharCode(65 + id)), -0.8, id))}
        {Array(BoardSize.mx).fill(null).map((_, id) => gTranslate(renderStr((id + 1).toString()), id, BoardSize.my - 1 + 0.8))}
        {Array(BoardSize.my).fill(null).map((_, id) => gTranslate(renderStr(String.fromCharCode(65 + id)), BoardSize.mx - 1 + 0.8, id))}
        {renderLayer((_, id) => <rect
          key={id}
          width="1"
          height="1"
          fill={getCellColor(id)}
          stroke={pico8Palette.dark_grey}
          stroke-width="0.05" />
        )}
        <line x1="0" y1={BoardSize.my / 2} x2={BoardSize.mx} y2={BoardSize.my / 2} stroke={pico8Palette.lavender} stroke-width="0.2" />
        {/* supply line */}
        {getDirSuppliedLines(G, '0')[1].map((lines) => lines.map((lineLst) => {

          /*  let stPos = CId2Pos(lineLst[0]);
           let edPos = CId2Pos(lineLst[lineLst.length - 1]);
           return stPos && edPos && gTranslate(<line x1={stPos.x} y1={stPos.y} x2={edPos.x} y2={edPos.y} stroke={fictionColor('0')} stroke-width="0.1" stroke-dasharray="0.5 0.1" />, 0.45, 0.45)
          */
          return lines.length > 1 && gTranslate(drawLine(lineLst[0], lineLst[lineLst.length - 1], fictionColor('0'), 0.05, [0.5, 0.1]), -0.05, -0.05)
        }))}
        {getDirSuppliedLines(G, '1')[1].map((lines) => lines.map((lineLst) => {

          return lines.length > 1 && gTranslate(drawLine(lineLst[0], lineLst[lineLst.length - 1], fictionColor('1'), 0.05, [0.5, 0.1]), 0.05, 0.05)
        }))}
        {/* stronghold */}
        {renderLayer((stronghold, id) => <>{stronghold && renderStr(stronghold.placeRender, 1)}</>, G.places)}
        {/* move indication */}
        {G.moveRecords['0'].map(([st, ed]) => drawLine(st, ed, pico8Palette.dark_blue, 0.5, [0.3, 0.1]))}
        {G.moveRecords['1'].map(([st, ed]) => drawLine(st, ed, pico8Palette.brown, 0.5, [0.3, 0.1]))}

        {/* piece */}
        {renderLayer((obj, id) => <>{obj && renderPiece(obj)}</>, G.cells)}
        {/* attack */}
        {[G.attackRecords['0'], G.attackRecords['1']].map((atk) =>
          atk !== null && gTranslate(renderStr("💥", 0.7), CId2Pos(atk[0]).x, CId2Pos(atk[0]).y)
        )}
        {/* charge */}
        {renderLayer((obj, id) => <>{obj && getChargedCavalries(G, id).map((chargeRow) =>
          chargeRow.map((pos, id, row) =>
            gTranslate(renderStr("⚡"), pos.x - 0.5 * row[0].x, pos.y - 0.5 * row[0].y)
          ))}</>
          , G.cells)}
        {/* battle info indication */}
        {G.cells.map((_, id) => <>{renderBattleEffect(id, id === pickedID)}</>)
        }
        {/* control */}
        {renderLayer((_, id) => <rect onClick={() => myOnClick(id)} width="1"
          height="1" fillOpacity="0" />)}
      </g>
    </svg>

  )

  const sideBarPlay = (
    <div id="PlayUI">
      {/* how many units left */}
      <label>Over All:</label>
      <p> {spanBGColor(<>{objTypeList.map((type) => {
        const num = Game.filterCId(G.cells, (obj) => obj.typeName === type && obj.belong === myID).length
        return Game.objDataList[type].objRender + num
      })}</>, fictionColor(myID))}<br />
        {spanBGColor(<>{objTypeList.map((type) => {
          const num = Game.filterCId(G.cells, (obj) => obj.typeName === type && obj.belong === opponentID).length
          return Game.objDataList[type].objRender + num
        })}</>, fictionColor(opponentID))}

      </p>


      <p>{spanBGColor(<>It's {isActive ? "my" : "opponent's"} turn.</>, fictionColor(currentPlayer))}
        <button disabled={!isActive} onClick={props.undo} >Undo</button>
        <button disabled={!isActive} onClick={() => { events.endTurn && events.endTurn(); }} >End Turn</button>
      </p>

      {/* chosen piece info */}

      <p>Chosen Unit: {pickedID !== null && ((id) => {
        const obj = G.cells[id];
        const str = G.places[id];

        return (<>
          {obj && <>
            {spanBGColor(<>{obj.objRender + obj.typeName},<br /> offense: {obj.objType === "Cavalry" ? "4(+3)" : obj.offense}, defense: {obj.defense},<br /> range: {obj.range}, speed: {obj.speed}</>, fictionColor(obj.belong))}
            <button disabled={!(isActive && canAttack(G, ctx, pickedID)[0])} onClick={() => { pickUpID(null); moves.attack(pickedID); }} >💥Attack!</button>
          </>}
          {str && <><br />{spanBGColor(<>{str.placeRender + str.placeType}{str.defenseAdd > 0 ? (", additional defense: " + str.defenseAdd) : ''}</>, str.belong ? fictionColor(str.belong) : '')} </>}
        </>);
      })(pickedID)}</p>

      <label>Cell Coord: {pickedID !== null && ((pos) => { return `(${pos.x + 1}, ${String.fromCharCode(65 + pos.y)})`; })(CId2Pos(pickedID))}, CellId: {pickedID}
      </label>
      {/* battle factor */}
      {battleFactorTable(pickedID)}

      {/* action info */}
      <label>My Moves and Attack:</label>
      <svg viewBox='-0.1 -0.1 6.2 1.2'>
        {renderLayer((_, id) => {
          const moveEdRec = G.moveRecords[myID].map((p) => p[1]);
          const atk = G.attackRecords[myID];
          if (id < 5) {
            const edCId = moveEdRec[id];
            const edObj = G.cells[edCId];
            //render moved pieces, if attacked, then can not move anymore
            return <><rect
              width="1"
              height="1"
              fill={pico8Palette.light_peach}
              stroke={pico8Palette.dark_grey}
              stroke-width="0.05" />

              {edObj ? renderPiece(edObj) : (atk ? renderStr("❌") : null)}
            </>
          }
          else {

            return <><rect
              width="1"
              height="1"
              fill={pico8Palette.red}
              stroke={pico8Palette.dark_grey}
              stroke-width="0.05" />
              {atk && (atk[1] === "Arsenal" ? renderStr("🎪") : renderPiece(atk[1]))}</>
          }


        }
          , Array(6).fill(null))}
      </svg>
      {/* retreat info */}
      <p>{G.forcedRetreat[currentPlayer][0] !== null && "🏃‍♂️💥 I must retreat my unit first."}</p>
      <label>{winner && `Winner is ${winner}!`}</label>
    </div>
  )
  function editorClick(id: CellID) {
    switch (editState) {
      case null:
        setEditState(id);
        break;
      case id:
        setEditState(null);
        break;
      default:
        setEditState(id);
    }

  }
  const sideBarEdit = (
    <div id="EditUI">
      {/* Editor */}
      <div>
        <svg viewBox='-0.1 -0.2 6.2 2.2'>
          {renderLayer((type, id) => {
            return <g onClick={() => { editorClick(id); }}><rect
              width="0.9"
              height="0.9"
              x="0.05" y="0.05"
              fill={fictionColor(editFiction)}
              stroke={id === editState ? pico8Palette.red : pico8Palette.dark_grey}
              stroke-width={id === editState ? 0.15 : 0.05} />
              {renderStr(Game.objDataList[type].objRender)}
            </g>
          }, objTypeList)}
          {gTranslate(renderLayer((type, oid) => {
            const id = oid + 6
            return <g onClick={() => { editorClick(id); }}><rect
              width="0.9"
              height="0.9"
              x="0.05" y="0.05"
              fill={fictionColor(editFiction)}
              stroke={id === editState ? pico8Palette.red : pico8Palette.dark_grey}
              stroke-width={id === editState ? 0.15 : 0.05} />
              {renderStr(Game.renderPlaceByType(type)[0])}

            </g>
          }, strongholdTypeList), 0, 1)}

        </svg>
        <input type="button" value="Change Color" onClick={() => { setEditFiction(dualPlayerID(editFiction)) }} />
        <input type="button" value="Reset Board" onClick={() => moves.load(Game.onlyMap)} />
      </div>
      {/* Game Data */}
      <form>
        <label>GameData:</label>
        <textarea
          name="gameData"
          id="gameData"
          //cols={20} 
          rows={10}
          style={{ width: "90%", height: "60%", resize: "vertical" }}
          value={gameData}
          onChange={(e) => setGameData(e.target.value)}></textarea>

        <input type="button" value="Export Game" onClick={() => setGameData(exportGame(G))} />
        <input type="button" value="Load Game" onClick={() => moves.load(gameData)} />
        <input type="button" value="Copy Data" onClick={() => {
          // Get the text field
          const copyText = document.getElementById("gameData") as HTMLInputElement;
          // Select the text field     
          copyText.select();
          copyText.setSelectionRange(0, 99999); // For mobile devices       
          // Copy the text inside the text field
          navigator.clipboard.writeText(gameData);
        }} />
        <input type="button" value="Remove Data" onClick={() => setGameData('')} />
      </form>
    </div>
  )

  return (
    <main >
      <h1>Kriegspiel</h1>
      <div style={{ height: "auto", fontFamily: "'Lato', sans-serif", clear: "both", display: "flex" }}>

        <div style={{
          height: "95vh", width: "115vh", float: "left",
          border: `2px solid ${pico8Palette.dark_green}`, backgroundColor: `${pico8Palette.white}`,
          touchAction: 'none'
        }}         >
          {/* svg Game Board */}
          {gameBoard}

        </div>

        {/* info UI */}
        <div style={{  /* position: "fixed", right:"0", */maxWidth: "25%", float: "left",
          border: `2px solid ${pico8Palette.dark_green}`, backgroundColor: `${pico8Palette.white}`
        }}>

          <input type="button" value="Edit Mode" onClick={() => { setEditMode(!editMode); }} />
          {editMode ? sideBarEdit : sideBarPlay}

          <p>More information <a href="https://github.com/iamcxds/kriegspiel">here</a>.</p>


        </div>
      </div>
    </main>
  );
};

function renderLayer<T>(objRender: (a: T, b: CellID) => JSX.Element | JSX.Element[], objLst: readonly T[] = Array(BoardSize.mx * BoardSize.my).fill(null)) {
  return objLst.map((obj, id) => {
    const pos = CId2Pos(id);
    return gTranslate(objRender(obj, id), pos.x, pos.y);
  })
}
function renderPiece(obj: ObjInstance) {
  return (<>
    {<circle cx="0.5" cy="0.5" r="0.4" stroke={pico8Palette.dark_grey}
      stroke-width="0.05" fill={fictionColor(obj.belong)} />}
    {renderStr(obj.objRender)}
    {!obj.supplied && renderStr("😅", 0.4)}
    {obj.retreating && renderStr("🏃‍♂️", 0.4)}
  </>
  )
}
function renderStr(str: string, size: number = 0.5) {
  return (<text fontSize={`${size}`} x="0.5" y="0.5" dominantBaseline="middle" textAnchor="middle">{str}</text>)
}

function gTranslate(jsx: JSX.Element | JSX.Element[], x = 0, y = 0) {
  return <g transform={`translate(${x} ${y})`}>
    {jsx}
  </g>
}

function drawLine(stCId: CellID, edCId: CellID, color: string = "black", width: number = 0.1, dash: number[] = []) {

  const stPos = CId2Pos(stCId);
  const edPos = CId2Pos(edCId);
  return <line x1={stPos.x + 0.5} y1={stPos.y + 0.5} x2={edPos.x + 0.5} y2={edPos.y + 0.5} stroke={color} strokeWidth={width} stroke-dasharray={dash} />

}

function spanBGColor(jsx: JSX.Element | JSX.Element[], color: string) {
  return <span style={{ backgroundColor: color, whiteSpace: "normal" }}>{jsx}</span>
}

function fictionColor(pID: P_ID) {
  switch (pID) {
    case '0': return pico8Palette.blue;
    case '1': return pico8Palette.orange;
  }
}

const pico8Palette = {
  black: "#00000",
  dark_blue: "#1d2b53",
  dark_purple: "#7e2553",
  dark_green: "#008751",
  brown: "#ab5236",
  dark_grey: "#5f574f",
  light_grey: "#c2c3c7",
  white: "#fff1e8",
  red: "#ff004d",
  orange: "#ffa300",
  yellow: "#ffec27",
  green: "#00e436",
  blue: "#29adff",
  lavender: "#83769c",
  pink: "#ff77a8",
  light_peach: "#ffccaa"
}
