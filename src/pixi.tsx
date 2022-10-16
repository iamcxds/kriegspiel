import React, { useRef, useState, useReducer } from 'react';
import { BoardProps } from 'boardgame.io/react';
import * as Game from './Game';
import {
  objTypeList,
  strongholdTypeList,
  BoardSize,
  CellID,
  Position,
  P_ID,
  GameState,
  ObjInstance,
  canPick,
  canAttack,
  canPut,
  CId2Pos,
  dualPlayerID,
  getBattleFactor,
  getChargedCavalries,
  getDirSuppliedLines,
  getSuppliedCells,
  exportGame,
} from './Game';
import { Stage, Sprite, useTick, Container, _ReactPixi } from '@saitonakamura/react-pixi'
import * as PIXI from 'pixi.js'

import { useGesture } from '@use-gesture/react'
import { closeSync } from 'fs';
import { JsxElement, JsxEmit } from 'typescript';

const stageScale = 32
const sWidth=800
const sHeight=600

function loadAssets(path: string) {
  return process.env.PUBLIC_URL + "/assets/" + path
}
interface IProps{
  children?:React.ReactNode,
  position?:Position,
  z?:number,
}
interface GameProps extends BoardProps<GameState> { }


export const PixiBoard = ({ G, ctx, moves, isActive, events, ...props }: GameProps) => {
  
  //const knTexture = PIXI.Texture.from(loadAssets("Mini_Characters/char_03.png"));
  const Knight = newSprite("Mini_Characters/char_03.png",stageScale / 16,[0.5,0.8])
  
  
  //const tileTexture = PIXI.Texture.from(loadAssets("IsoTiles/Enviroument/Spring/grass.png"));
  const Tile = newSprite("IsoTiles/Enviroument/Spring/grass.png",stageScale / 50,[0.5, 0.25])
  
  

 
  
  const stageRef = useRef(null);
   
  const GameView=({children}:IProps)=>{
    //const [dx,setDx]=useState(0)
    useTick((delta)=>{
      console.log(delta)
      //setDx(dx+delta)
    })
     //map move ui
     const [mapPos, setMapPos] = useState<Position>({ x: 0, y: 0 })
     const [mapScale, setMapScale] = useState<number>(1)
   
   
     useGesture(
       {
         onDrag: (state) => {
           
             const move = state.offset
             const dx = move[0] 
             const dy = move[1] 
             setMapPos({x:dx,y:dy});
           
         },
         onWheel: (state) => {
           const evt = state.event;
           evt.preventDefault();
           const spd = 0.0007
   
           const newScale = mapScale * (1 - spd * state.movement[1])
   
           setMapScale(newScale);
         },
         onPinch: (state) => {
   
           const newScale = state.offset[0]
   
   
           setMapScale(newScale);
         },
   
       },
       {
         target: stageRef,
         eventOptions: { passive: false },
       }
     );
    return (<Container  pivot={[-mapPos.x,sHeight/2-mapPos.y]} position={[sWidth/2,sHeight/2]} scale={mapScale}>
        {children}
      </Container>)
  }
  const backGround=
  //<ParticleContainer>{
    renderLayer((_,id,pos) => <Tile position={pos}/>)
  //}</ParticleContainer> 

  return (
    <div ref={stageRef} style={{touchAction: 'none'}}>
    <Stage width={sWidth} height={sHeight}>
      <GameView>
        {backGround}
        <Knight position={{x:10,y:10}} />
    

      </GameView>
    </Stage>
    </div>
  )
}

function newSprite(path:string,scale=1,anchor:_ReactPixi.PointLike=0.5) {
  
 return (({position,z}:IProps) => {
  return (
    <Sprite
      image={loadAssets(path)}
      //texture={knTexture}
      scale={scale}
      position={isoTranslate(position?.x,position?.y,z)}
      anchor={anchor}
    />
  )
})}

function renderLayer<T>(
  objRender: (a: T, b: CellID,pos:Position) => React.ReactNode,
  objLst: readonly T[] = Array(BoardSize.mx * BoardSize.my).fill(null),
) {
  return objLst.map((obj, id) => {
    const pos = CId2Pos(id);
    
    return objRender(obj, id, pos);
  });
}
function isoTranslate( cx = 0, cy = 0, cz = 0) {
  // (ox,oy)=cx(sqrt3/2,1/2)+cy(-sqrt3/2,1/2)+cz(0,-1)
  const rt3 = Math.sqrt(3)
  const ox = (cx - cy) * rt3 / 2 * stageScale
  const oy = ((cx + cy) / 2 - cz) * stageScale

  return  {x:ox, y:oy};
}