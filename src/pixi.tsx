import React, { useRef, useState, useReducer, useEffect, createContext, useContext, ReactNode } from 'react';
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
import { Stage, Sprite, useTick, Container, _ReactPixi, useApp, PixiComponent, applyDefaultProps } from '@saitonakamura/react-pixi'
import * as PIXI from 'pixi.js'
import {AFFINE, Camera3d, Container2d, Sprite2d, TRANSFORM_STEP} from 'pixi-projection';

import { useGesture } from '@use-gesture/react'

import { Assets } from '@pixi/assets';
import { Rectangle, Texture } from 'pixi.js';

const stageScale = 40
const sWidth=1000
const sHeight=700

function loadAssets(path: string) {
  return process.env.PUBLIC_URL + "/assets/" + path
}
interface IProps{
  position?:Position,
  z?:number,
}
interface IProjProps{
  farPoint?:Position,
  factor?:number
  affineX?:Boolean,
  z?:number,
  position?:Position,
  anchor?:[number, number],
  pivot?:[number, number],
  rotation?:number,
  scale?:number,
  children?:ReactNode
  
}
interface GameProps extends BoardProps<GameState> { }

/* function useLoader (){
  const [sheet,setSheet] =useState<any>(null)
  async function getSheet(){
    
    const resultP= Assets.load(process.env.PUBLIC_URL + '/assets/spritesheet.json')
    resultP.then((res)=>{setSheet(res)}) 
  }
  useEffect( () => {
    app.loader.baseUrl=process.env.PUBLIC_URL + "/assets";
    app.loader
    //.add("knight","Mini_Characters/char_03.png")
    //.add("grass","IsoTiles/Enviroument/Spring/grass.png")
    .add('overWorld',"SP-Overworld.json")

    app.loader.onProgress.add((e)=>{console.log(e.progress)})
    app.loader.onError.add((e)=>{console.log("Error:"+e.message)})
    app.loader.onComplete.add((e)=>{console.log("Done!")})

    app.loader.load(); 
    getSheet()
  },[]) 
  return sheet
} */

export const PixiBoard = ({ G, ctx, moves, isActive, events, ...props }: GameProps) => {
   
  
  
  const TestSprite2d=PixiComponent('TestSprite2d', {
    create: () => {
      let grid=Texture.from(loadAssets('grid.png'))
     let spr= new Sprite2d(grid)
     
     spr.width=sWidth
     spr.height=sHeight
     spr.anchor.set(0,0)
     spr.position.set(0,0)
     //spr.proj.affine =  AFFINE.AXIS_X
     //spr.rotation=1
     return spr
    },
    
  })


//const knTexture = Texture.from(loadAssets("Mini_Characters/char_03.png"));

  const Horse = newSprite2d("horse.png",stageScale /500 ,[0.5,0.8])
  
  
  //const grassTexture = Texture.from(loadAssets("IsoTiles/Enviroument/Spring/grass.png"));
  const GrassList =Array(9).fill(null).map((_,id)=>{
    const sid=id+1
    const x=sid%5
    const y=Math.floor(sid/5)
    return newSprite2d(textureWithFrame('HAS Overworld Starter Pack/SP-Land.png',16*x,16*y,16),stageScale / 16,[0.5, 0.5],false)
  }) 
  
  const Pass = newSprite2d(textureWithFrame('HAS Overworld Starter Pack/SP-Road.png',2*16,0,16),stageScale / 16,[0.5, 0.5],false)
  
  function strongholdSprite(str:Game.Stronghold){
    const strType =str.placeType
    const belong = str.belong
    let path:string|Texture="";
    let size= 52
    let anchor2= 0.75
    switch (
      strType 
      ) {
        case 'Arsenal':
          path = belong==='0'?"blacksmith_blue(1).png":"blacksmith_wood(2).png";
          path = "IsoTiles/Buildings/house/"+path
          anchor2=0.65
          break;
        case 'Pass':
          return null
        case 'Fortress':
          path = belong?(belong==='0'?"Blue towers/castle_tower_blue(4).png" :"Wood towers/castle_tower_wood(4).png"):"Green towers/castle_tower_green(4).png" ;
          path = "IsoTiles/Towers/"+path
          break;
        case 'Mountain':
          path = textureWithFrame('HAS Overworld Starter Pack/SP-Mountains.png',16,0,16);
          anchor2=0.75
          size=16
          break;
      }
    
    return newSprite2d(path,stageScale/size,[0.5,anchor2])
  }

  function charSprite(char:Game.ObjInstance){
    const isP0=char.belong==='0'
    let ind=isP0?"03":"27"
    const type=char.objType
    if (type==="Artillery"){ind=isP0?"17":"04"}
    else if (type==="Relay"){ind=isP0?"15":"40"}
    const Body = newSprite2d(`Mini_Characters/char_${ind}.png`,stageScale / 16,[0.5,0.8])
    return (props:IProjProps)=>{
    let horse=null
    const z=props.z
    let nz=z?z:0
    if (char.speed===2){
       horse=Horse
       nz=nz+0.7
    }
    return <>
    <Body position={props.position} z={nz}/>
    {horse&&horse(props)}
    </>
    
  }
  }

 
  
  const stageRef = useRef(null);
   
  const GameView=(props:any)=>{
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
     let rotation=3*mapPos.x/sWidth
     const reverseXY=useRef([false,false])
     useEffect(()=>{
      const reverseX=Math.sin(rotation)<0
      const reverseY=Math.cos(rotation)<0
      const crXY=reverseXY.current
      if (crXY[0]!==reverseX||crXY[1]!==reverseY){
        reverseXY.current=[reverseX,reverseY]
      }
     },[mapPos])
     const boardWidth=BoardSize.mx*stageScale
     const boardHeight=BoardSize.my*stageScale
     
    return (<MyContainer2d farPoint={{x:sWidth/2,y:0}} factor={Math.min(mapScale-0.7,1.5)} position={{x:sWidth/2,y:sHeight}}>
    <RotationContext.Provider value={rotation}>
    <ReverseXY.Provider value={reverseXY.current}>
    <MyContainer2d pivot={[boardWidth/2/* -mapPos.x */,boardHeight/2-mapPos.y]} position={{x:0,y:-boardHeight/2}} scale={mapScale}>
    <MyContainer2d pivot={[(boardWidth-stageScale)/2,(boardHeight-stageScale)/2]} position={{x:boardWidth/2,y:boardHeight/2}}   rotation={rotation}
    {...props}/>
    </MyContainer2d>
    </ReverseXY.Provider>
    </RotationContext.Provider>
    </MyContainer2d>)
  }
  const backGround=
  //<ParticleContainer>{
    renderLayer((str,id,pos) =>
    { let sid=Math.floor(Math.random() * 9)
      let Grass=GrassList[sid]
      return<><Grass position={pos}/>
      {str?.placeType==="Pass"?<Pass position={pos}/>:null}</> },G.places)
  //}</ParticleContainer> 
  const onTheGround= ([rX,rY]:boolean[])=>
  {
  
  return renderLayer((str,id,pos) =>{
    const StrSprite= str&&strongholdSprite(str) 
    const char=G.cells[id]
    const CSprite=char&&charSprite(char)
    let charZ=str?.placeType==="Fortress"?1.2:0
    return <>
    {StrSprite&&<StrSprite position={pos}/>}
    {CSprite&&<CSprite  position={pos} z={charZ}/>}
    </>
  },G.places,
  rX,rY
  )
  }
  return (
    <div ref={stageRef} style={{touchAction: 'none'}}>
    
    <Stage width={sWidth} height={sHeight}>
      <GameView>
      <TestSprite2d/>
        {backGround}
        <ReverseXY.Consumer>
        {rXY=>onTheGround(rXY)}
        </ReverseXY.Consumer>
        
        
      </GameView>
    </Stage>
    </div>
  )
}

function textureWithFrame(path:string,x:number=0,y:number=0,w:number=16,h?:number){
  let nh=h?h:w
  let baseTexture=PIXI.BaseTexture.from(loadAssets(path))
  let frame=new Rectangle(x,y,w,nh)
  return new Texture(baseTexture,frame)
}

/* function newSprite(path:string,scale=1,anchor:_ReactPixi.PointLike=[0.5,0.5]) {
  
  return (({position,z}:IProps) => 
    //const app=useApp()
     <Sprite
       image={loadAssets(path)}
       scale={scale}
       position={isoTranslate(position?.x,position?.y,z)}
       anchor={anchor}
     />
 )} */
 const RotationContext=createContext(0)
 const ReverseXY=createContext([false,false])
 function newSprite2d(path:string|Texture,scale=1,anchor:[number,number]=[0.5,0.5],affineX:Boolean=true) {
  const texture=typeof path==='string'?Texture.from(loadAssets(path)):path
  
  return (({position,...props}:IProjProps) => 
  {const rotation=affineX?useContext(RotationContext):0
     return <MySprite2d
        {...props}
       texture={texture}
       scale={scale}
       position={position&&{x:position.x*stageScale,y:position.y*stageScale}}
       //z={z?z*stageScale:0}
       anchor={anchor}   
       affineX={affineX}
       rotation={-rotation}
     />
  })}

function renderLayer<T>(
  objRender: (a: T, CId: CellID,pos:Position) => ReactNode,
  objLst: readonly T[] = Array(BoardSize.mx * BoardSize.my).fill(null),
  reverseX:Boolean=false,
  reverseY:Boolean=false,
) {
  let result:ReactNode[]=[]
  
  for (let j = 0; j < BoardSize.my; j++) {
      for (let i = 0; i < BoardSize.mx; i++) { 
        let cx=reverseX?BoardSize.mx-i:i
        let cy=reverseY?BoardSize.my-j:j
        const pos={x:cx ,y:cy}
        const id=Game.Pos2CId(cx,cy)
        const obj=objLst[id]
        result.push(objRender(obj, id, pos))
    }   
  }
  return result
  /* return objLst.map((obj, id) => {
    const pos = CId2Pos(id);
    
    return objRender(obj, id, pos);
  }); */
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

const MyContainer2d=PixiComponent('MyContainer2d', {
  create: (props:IProjProps) => {
    let instance=new Container2d()
     return  instance
  },
  applyProps: (instance, oldProps, newProps) => {
    //const { farPoint: oldFar, ...oldP } = oldProps;
    const { farPoint,position,pivot,rotation,scale,anchor,affineX,factor,...newP } = newProps;

    /* (Object.keys(newP)as (keyof typeof newP)[]).forEach((p) => {
      const prop=newP[p]
      if (prop!==undefined) {
        if (typeof prop ==='number')
        {instance[p].set(prop);}
        else{instance[p].set(prop.x,prop.y);}
      }
    }); */
    position&&instance.position.set(position.x,position.y)
    pivot&&instance.pivot.set(pivot[0],pivot[1])
    scale&&instance.scale.set(scale)
    if(rotation) {instance.rotation=rotation}
    
     // apply rest props to PIXI.Text
    if(farPoint){
    const pos = instance.toLocal(farPoint, undefined, {x:0,y:0}, undefined, TRANSFORM_STEP.BEFORE_PROJ);
    // need to invert this thing, otherwise we'll have to use scale.y=-1 which is not good
    pos.y = -pos.y;
    pos.x = -pos.x;
    const pfactor=factor!==undefined?factor:1
    instance.proj.setAxisY(pos, -pfactor);
    }
    if(affineX){
      instance.proj.affine =  AFFINE.AXIS_X
    }
  },
})
const MySprite2d=PixiComponent('MySprite2d', {
  create: ({texture,...props}:{texture:Texture}&IProjProps) => {
    let instance=new Sprite2d(texture)
     return  instance
  },
  applyProps: (instance, oldProps, newProps) => {
    //const { farPoint: oldFar, ...oldP } = oldProps;
    const { farPoint,position,pivot,rotation,scale,anchor,affineX,factor,...newP } = newProps;

    position&&instance.position.set(position.x,position.y)
    pivot&&instance.pivot.set(pivot[0],pivot[1])
    anchor&&instance.anchor.set(anchor[0],anchor[1])
    scale&&instance.scale.set(scale)
    if(rotation) {instance.rotation=rotation}
    
     // apply rest props to PIXI.Text
    if(farPoint){
    const pos = instance.toLocal(farPoint, undefined, {x:0,y:0}, undefined, TRANSFORM_STEP.BEFORE_PROJ);
    // need to invert this thing, otherwise we'll have to use scale.y=-1 which is not good
    pos.y = -pos.y;
    pos.x = -pos.x;
    const pfactor=factor!==undefined?factor:1
    instance.proj.setAxisY(pos, -pfactor);
    }
    if(affineX){
      instance.proj.affine =  AFFINE.AXIS_X
      newP.z&&anchor&&instance.anchor.set(anchor[0],anchor[1]+newP.z)
    }
  },
})

