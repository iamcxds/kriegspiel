import { Client } from 'boardgame.io/react';
import { Kriegspiel } from './Game';
import { Local } from 'boardgame.io/multiplayer';
import { Board }  from './Board';
import { DebugOpt } from 'boardgame.io/dist/types/src/client/client';


const KriegspielClient = Client({
  game: Kriegspiel,
  board: Board,
  debug: {collapseOnLoad:true}
//  multiplayer: Local(),
});

const App = () => (
  <div>
    <KriegspielClient /* playerID="0" */ />
    {/* <TicTacToeClient playerID="1" /> */}
  </div>
);

export default App;