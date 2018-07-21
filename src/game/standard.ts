// tslint:disable:max-classes-per-file

import { Lock } from "../util/lock";
import { Board } from "./board";
import { GameOverError, InvalidMoveError } from "./errors";
import { Tile, TileId } from "./tile";

import { Observable } from "../util/observable";

function boundcheck(name: string, f: (l: number, x: number, y: number) => TileId) {
    return (l: number, x: number, y: number) => {
        const r = f(l, x, y);
        if (r < 0 || r >= l * l) {
            throw new RangeError("resulting tile id " + r + " is out of bounds for `" + name + "`");
        }
        return r;
    };
}

export class StandardGameBoard extends Board {

    public randAfterMove: boolean = true;

    private privMoveCount: number = 0;

    /** The number of player moves has been made to get to the current state. */
    public get moveCount() {
        return this.privMoveCount;
    }

    public constructor(size: number = 4) {
        super(size);
    }

    /**
     * Moves and merges tiles in the left direction.
     */
    public left(lock?: Lock) {
        return this.move(
            boundcheck("left", (l, x, y) =>
                l * y + x),
            lock,
        );
    }

    /**
     * Moves and merges tiles in the right direction.
     */
    public right(lock?: Lock) {
        return this.move(
            boundcheck("right", (l, x, y) =>
                l * (1 + y) - x - 1),
            lock,
        );
    }

    /**
     * Moves and merges tiles upward.
     */
    public up(lock?: Lock) {
        return this.move(
            boundcheck("up", (l, x, y) =>
                l * x + y),
            lock,
        );
    }

    /**
     * Moves and merges tiles downward.
     */
    public down(lock?: Lock) {
        return this.move(
            boundcheck("down", (l, x, y) =>
                l * (l - x - 1) + y),
            lock,
        );
    }

    /**
     * Execute a game move using the function argument as a way to translate a normalized direction
     * to the actual game board.
     * @param idxcalc how to calculate a TileId using the assumption that the movement is towards negative x
     */
    private move(idxcalc: (l: number, x: number, y: number) => TileId, actionLock?: Lock) {
        return this.queueAction((lock) => {
            /** Reference to the numbers array. */
            const num = this.numbers;
            /** Size in one axis. */
            const l = this.size;
            /** All pending changes caused by this move. */
            const changes: Array<Promise<any>> = [];

            // loop through all lines in the cross dimension
            for (let y = 0; y < l; y++) {
                // cache of changes
                const linemod: Array<number[] | null> = [];
                linemod.length = l;

                // move tiles to the low x to fill out empty slots
                for (let x = 1; x < l; x++) {
                    const idx = idxcalc(l, x, y);
                    const idxneg = idxcalc(l, x - 1, y);
                    const cv = num[idx];
                    if (cv !== 0 && num[idxneg] === 0) {
                        let neg = 1;
                        while (x - neg > 0) {
                            const idxtmp = idxcalc(l, x - neg - 1, y);
                            if (num[idxtmp] === 0) {
                                neg++;
                            } else {
                                break;
                            }
                        }
                        const xn = x - neg;
                        const idxn = idxcalc(l, x - neg, y);
                        const prevstate = linemod[xn];
                        linemod[xn] = [prevstate ? prevstate[0] : num[idxn], cv, idxn, idx];
                        linemod[x] = [cv, 0, idx];
                        num[idx] = 0;
                        num[idxn] = cv;
                    }
                }

                for (let x = 1; x < l; x++) {
                    const idx = idxcalc(l, x, y);
                    const idxneg = idxcalc(l, x - 1, y);
                    if (num[idx] === 0) {
                        // since everything is moved to the low x nothing is above
                        break;
                    } else if (num[idx] === num[idxneg]) {
                        const xneg = x - 1;
                        const prevmod = linemod[xneg];
                        if (!prevmod) {
                            // previous tile was unchanged
                            const nextval = linemod[x];
                            // tslint:disable-next-line:no-bitwise
                            linemod[xneg] = [num[idxneg], num[idxneg] << 1, idxneg, idxneg, nextval ? nextval[3] : idx];
                            linemod[x] = nextval && nextval[0] === 0 ? null : [nextval ? nextval[0] : num[idx], 0, idx];
                        } else if (prevmod.length > 4) {
                            // previous tile was already merged
                            continue;
                        } else {
                            // previous tile was moved but not merged
                            const nextval = linemod[x];
                            const mergefrom = nextval ? nextval[3] : idx;
                            // tslint:disable-next-line:no-bitwise
                            linemod[xneg] = [num[idxneg], num[idxneg] << 1, idxneg, prevmod[3], mergefrom];
                            linemod[x] = nextval && nextval[0] === 0 ? null : [nextval ? nextval[0] : num[idx], 0, idx];
                        }

                        // change the current value
                        // tslint:disable-next-line:no-bitwise
                        num[idxneg] <<= 1;
                        num[idx] = 0;

                        // move all the following values one step
                        for (let xpos = x + 1; xpos < l; xpos++) {
                            const idxpos = idxcalc(l, xpos, y);
                            if (num[idxpos] === 0) {
                                break;
                            }
                            const idxposneg = idxcalc(l, xpos - 1, y);
                            const xposneg = xpos - 1;
                            const nextval = linemod[xpos];
                            const modposneg = linemod[xposneg];
                            const origval = modposneg ? modposneg[0] : num[idxposneg];
                            if (nextval) {
                                linemod[xposneg] = [origval, num[idxpos], idxposneg, nextval[3]];
                                linemod[xpos] = nextval[0] === 0 ? null : [nextval[0], 0, idxpos];
                            } else {
                                linemod[xposneg] = [origval, num[idxpos], idxposneg, idxpos];
                                linemod[xpos] = [num[idxpos], 0, idxpos];
                            }
                            num[idxposneg] = num[idxpos];
                            num[idxpos] = 0;
                        }
                    }
                }

                // notify observers of changes
                for (const change of linemod) {
                    if (change) {
                        const clen = change.length;
                        const src: null | number | [number, number] =
                            clen === 3 ? null : clen === 4 ? change[3] : [change[3], change[4]];
                        changes.push(this.setTile(change[2], change[1], src, lock));
                    }
                }
            }

            if (changes.length === 0) {
                // if no tiles were merged or moved it counts as an invalid layer move
                const e = new InvalidMoveError("Move caused no change in state.");
                throw e;
            }
            this.privMoveCount++;
            return Promise.all(changes)
              .then<null | false | Tile>(() => this.randAfterMove ? this.randTile(lock) : Promise.resolve<false>(false))
              .then((t) => {
                if (t !== null) {
                    for (let y = 0; y < l; y++) {
                        for (let x = 0; x < l; x++) {
                            const idx = l * y + x;
                            const n = num[idx];
                            if (n === 0 || (x !== 0 && n === num[idx - 1]) || (y !== 0 && n === num[idx - l])) {
                                // there is a possible move to be done
                                return;
                            }
                        }
                    }
                }
                // no valid moves could be done from this state
                throw new GameOverError("No possible moves left.");
            });
        }, actionLock);
    }
}

export class StandardGame {

    /**
     * Observer which signals changes to tiles.
     */
    public readonly tileObserver: Observable<Tile> = new Observable<Tile>((obs) => {
        const handler = (tile: Tile) => obs.next(tile);
        this.tileObservers.add(handler);
        return () => { this.tileObservers.delete(handler); };
    });

    /**
     * Number of moves that the player has done.
     */
    public get moveCount() {
        return this.board ? this.board.moveCount : 0;
    }

    /** The current game board. This is replaced on reset. */
    protected board?: StandardGameBoard;

    private readonly tileObservers = new Set<(tile: Tile) => any>();
    private tileForwarder?: Observable.Subscription;

    /** Creates a new standard game with a board of the size of the argument. */
    public constructor(public readonly size: number = 4) {
        this.reset();
    }

    /**
     * Resets the current state of the game and starts a new game.
     */
    public reset() {
        return this.clearBoard(async (oldboard, board, lock) => {
            const tile = await board.randTile(lock);
            // clear board if needed
            if (tile && oldboard && board === this.board && this.tileObservers.size !== 0) {
                const l = board.size;
                for (let y = 0; y < l; y++) {
                    for (let x = 0; x < l; x++) {
                        if ((tile.x !== x || tile.y !== y) && oldboard.getTileValue(x, y) !== 0) {
                            const nt = new Tile(board, l * y + x, x, y);
                            nt.creation = null;
                            this.sendTileToObservers(nt);
                        }
                    }
                }
            }
        });
    }

    /**
     * Get the current state of the board.
     */
    public getState() {
        if (!this.board) {
            throw new TypeError("No game is active, reset the game.");
        }
        return this.board.getState();
    }

    /**
     * Restore to a specific state.
     * @param state state to restore
     */
    public restoreState(state: number[][]) {
        return this.clearBoard(async (_, board, lock) => {
            if (board === this.board && this.tileObservers.size !== 0) {
                for (let y = 0; y < state.length; y++) {
                    const row = state[y];
                    for (let x = 0; x < row.length; x++) {
                        await board.setTile(y * row.length + x, row[x], null, lock);
                    }
                }
            }
        });
    }

    public down() {
        if (!this.board) {
            throw new TypeError("No game board initialized. Reset to start a new game.");
        }
        return this.board.down();
    }

    public left() {
        if (!this.board) {
            throw new TypeError("No game board initialized. Reset to start a new game.");
        }
        return this.board.left();
    }

    public right() {
        if (!this.board) {
            throw new TypeError("No game board initialized. Reset to start a new game.");
        }
        return this.board.right();
    }

    public up() {
        if (!this.board) {
            throw new TypeError("No game board initialized. Reset to start a new game.");
        }
        return this.board.up();
    }

    /**
     * Notifies all observers of this tile.
     * @param tile tile to notify observers
     */
    protected sendTileToObservers(tile: Tile) {
        for (const obs of this.tileObservers) {
            try {
                obs(tile);
            } catch (e) {
                // tslint:disable-next-line:no-console
                console.warn("Error in observer to StandardGame.tileObserver:", e);
            }
        }
    }

    protected clearBoard<T>(action: (
                oldboard: StandardGameBoard | undefined,
                board: StandardGameBoard,
                lock: Lock,
            ) => PromiseLike<T> | T) {

        if (this.tileForwarder) {
            this.tileForwarder.unsubscribe();
        }

        const oldboard = this.board;
        const board = this.board = new StandardGameBoard(this.size);
        this.tileForwarder = board.tileObserver.subscribe((tile) => this.sendTileToObservers(tile));

        return board.queueAction<T>((l) => action.call(this, oldboard, board, l));
    }
}
