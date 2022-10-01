import { Client } from 'boardgame.io/react';
import { TicTacToe } from './Game';
import { Local } from 'boardgame.io/multiplayer';
import { Board }  from './Board';


const TicTacToeClient = Client({
  game: TicTacToe,
  board: Board,
//  multiplayer: Local(),
});

const App = () => (
  <div>
    <TicTacToeClient /* playerID="0" */ />
    {/* <TicTacToeClient playerID="1" /> */}
  </div>
);

export default App;