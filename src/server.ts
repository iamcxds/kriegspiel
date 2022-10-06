import { Server, Origins } from 'boardgame.io/server';
import { Kriegspiel } from './Game';

const server = Server({
  games: [Kriegspiel],
  origins: [Origins.LOCALHOST],
});

server.run(8000)