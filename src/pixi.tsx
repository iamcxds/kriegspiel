import React, { useRef, useState, useReducer, useEffect } from 'react';
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
import { Stage, Sprite, useTick, Container, _ReactPixi, useApp } from '@saitonakamura/react-pixi'
import * as PIXI from 'pixi.js'

import { useGesture } from '@use-gesture/react'
import { closeSync } from 'fs';
import { JsxElement, JsxEmit } from 'typescript';

const stageScale = 32
const sWidth=1000
const sHeight=700

function loadAssets(path: string) {
  return process.env.PUBLIC_URL + "/assets/" + path
}
interface IProps{
  children?:React.ReactNode,
  position?:Position,
  z?:number,
}
interface GameProps extends BoardProps<GameState> { }

/* function Loader (){
   const app = useApp();
   
  useEffect(() => {
    app.loader.baseUrl=process.env.PUBLIC_URL + "/assets";
    app.loader.add("knight","Mini_Characters/char_03.png")
    .add("grass","IsoTiles/Enviroument/Spring/grass.png")

    app.loader.onProgress.add((e)=>{console.log(e.progress)})
    app.loader.onError.add((e)=>{console.log("Error:"+e.message)})
    app.loader.onComplete.add((e)=>{console.log("Done!")})

    app.loader.load();
  },[]) 
  return <></>
} */

export const PixiBoard = ({ G, ctx, moves, isActive, events, ...props }: GameProps) => {
 

  

  //const knTexture = PIXI.Texture.from(loadAssets("Mini_Characters/char_03.png"));
  
  const Horse = newSprite("horse.png",stageScale /500 ,[0.6,0.6])
  
  
  //const tileTexture = PIXI.Texture.from(loadAssets("IsoTiles/Enviroument/Spring/grass.png"));
  const Grass = newSprite("IsoTiles/Enviroument/Spring/grass.png",stageScale / 52,[0.5, 0.25])
  const Pass = newSprite("IsoTiles/Roads/Spring/road(2).png",stageScale / 52,[0.5, 0.25])
  
  function strongholdSprite(str:Game.Stronghold){
    const strType =str.placeType
    const belong = str.belong
    let path="";
    let size= 52
    let pivot2= 0.75
    switch (
      strType 
      ) {
        case 'Arsenal':
          path = belong==='0'?"blacksmith_blue(1).png":"blacksmith_wood(2).png";
          path = "Buildings/house/"+path
          pivot2=0.65
          break;
        case 'Pass':
          return null
        case 'Fortress':
          path = belong?(belong==='0'?"Blue towers/castle_tower_blue(4).png" :"Wood towers/castle_tower_wood(4).png"):"Green towers/castle_tower_green(4).png" ;
          path = "Towers/"+path
          break;
        case 'Mountain':
          path = "Enviroument/Spring/stones/stone(4).png";
          pivot2=0.5
          size=40
          break;
      }
    return newSprite("IsoTiles/"+path,stageScale/size,[0.5,pivot2])
  }

  function charSprite(char:Game.ObjInstance){
    const isP0=char.belong==='0'
    let ind=isP0?"03":"27"
    const type=char.objType
    if (type==="Artillery"){ind=isP0?"17":"04"}
    else if (type==="Relay"){ind=isP0?"15":"40"}
    const Body = newSprite(`Mini_Characters/char_${ind}.png`,stageScale / 16,[0.5,0.8])
    return (props:IProps)=>{
    let horse=null
    const z=props.z
    let nz=z?z:0
    if (char.speed===2){
       horse=Horse
       nz=nz+0.4
    }
    return <>
    <Body position={props.position} z={nz}/>
    {horse&&horse(props)}
    </>
    
  }
  }

 
  
  const stageRef = useRef(null);
   
  const GameView=({children}:IProps)=>{
    //const [dx,setDx]=useState(0)
    useTick((delta)=>{
      //console.log(delta)
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
    renderLayer((str,id,pos) =>str?.placeType==="Pass"?<Pass position={pos}/> :<Grass position={pos}/>,G.places)
  //}</ParticleContainer> 
  const onTheGround=
  renderLayer((str,id,pos) =>{
    const StrSprite= str&&strongholdSprite(str) 
    const char=G.cells[id]
    const CSprite=char&&charSprite(char)
    let charZ=str?.placeType==="Fortress"?1.2:0
    return <>
    {StrSprite&&<StrSprite position={pos}/>}
    {CSprite&&<CSprite  position={pos} z={charZ}/>}
    </>
  },G.places)

  return (
    <div ref={stageRef} style={{touchAction: 'none'}}>
    <Stage width={sWidth} height={sHeight}>
      <GameView>
        {backGround}
        {onTheGround}

      </GameView>
    </Stage>
    </div>
  )
}

function newSprite(path:string,scale=1,anchor:_ReactPixi.PointLike=0.5) {
  
  return (({position,z}:IProps) => {
    //const app=useApp()
   return (
     <Sprite
       image={loadAssets(path)}
       //texture={app.loader.resources[path].texture}
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
function wrapComponent<A,B>(funs:((a:A)=>B)[]):(a:A)=>B[]{
  return (a:A)=>funs.map(fun=>fun(a))
}