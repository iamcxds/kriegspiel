import React from 'react';
import PropTypes from 'prop-types';
import { canPick, canPut } from './Game.js'
import './Board.css';

class Board extends React.Component {
  static propTypes = {
    G: PropTypes.any.isRequired,
    ctx: PropTypes.any.isRequired,
    moves: PropTypes.any.isRequired,
    playerID: PropTypes.string,
    isActive: PropTypes.bool,
    isMultiplayer: PropTypes.bool,
  };
  constructor(props) {
    super(props);
    this.state = { pickedUp: "none" };
  }

  playerOnClick = id => {
    if (this.state.pickedUp === "none") {
      if (canPick(this.props.G, this.props.ctx, id))
        this.setState({ pickedUp: id });
    }
    else if (canPut(this.props.G, this.props.ctx, this.state.pickedUp, id)) {
      this.setState({ pickedUp: "none" });
      this.props.moves.movePiece(this.state.pickedUp, id);
    }
    else if (this.state.pickedUp === id) { this.setState({ pickedUp: "none" }); }
  }
  viewerOnClick = id => {
    if (this.state.pickedUp === id) { this.setState({ pickedUp: "none" }); }
    else { this.setState({ pickedUp: id }); }
  }
  onClick = id => {
    if (this.props.isActive)
      return this.playerOnClick(id);
    else return this.viewerOnClick(id);
  }

  isAvailable(id) {
    if (!this.props.isActive) return false;
    else if (this.state.pickedUp !== "none" && canPut(this.props.G, this.props.ctx, this.state.pickedUp, id))
      return true;
  }
  getClassName(id) {
    if (id === this.state.pickedUp) { return 'highlight'; }

    else if (this.isAvailable(id)) { return 'active'; }
    else return '';
  }
  render() {
    let tbody = [];
    for (let i = 0; i < 4; i++) {
      let cells = [];
      for (let j = 0; j < 4; j++) {
        const id = 4 * i + j;
        cells.push(
          <td
            key={id}
            className={this.getClassName(id)}
            onClick={() => this.onClick(id)}
          >
            {this.props.G.cells[id]}
          </td>
        );
      }
      tbody.push(<tr key={i}>{cells}</tr>);
    }

    let winner = null;
    if (this.props.ctx.gameover) {
      winner =
        this.props.ctx.gameover.winner !== undefined ? (
          <div id="winner">Winner: {this.props.ctx.gameover.winner}</div>
        ) : (
          <div id="winner">Draw!</div>
        );
    }
    else { winner = this.props.isActive ? <div id="winner">your turn</div> : null; }



    return (
      <div>
        <table id="board">
          <tbody>{tbody}</tbody>
        </table>
        {winner}
      </div>
    );
  }
}

export default Board;