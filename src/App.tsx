import { Client } from 'boardgame.io/react';
import { Kriegspiel } from './Game';
import { Local } from 'boardgame.io/multiplayer';
import { Board }  from './Board';
import {RandomBot} from 'boardgame.io/ai';

const KriegspielClient = Client({
  game: Kriegspiel,
  board: Board,
  debug: {collapseOnLoad:true},
  /* multiplayer: //SocketIO({ server: 'localhost:8000' })
  Local(
    //{ bots:{ '1': RandomBot }}
  ), */
});

const App = () => (
  <div>
    <h1>Guy Debord's Kriegspiel</h1>
    <KriegspielClient /* playerID="0" */ />
   {/* <KriegspielClient playerID="1" /> */}
  </div>
);

export default App;