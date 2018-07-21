import { CompletablePromise } from "../util/completable-promise";
import { Lock } from "../util/lock";
import { randFill } from "../util/random";
import { Tile, TileCreation, TileId } from "./tile";

import { Observable } from "../util/observable";

export class Board {
    /**
     * Height and width of the board.
     *
     * * Min: 2
     * * Max: 15
     */
    public readonly size: number = 4;
    public readonly tileObserver: Observable<Tile> = new Observable<Tile>((obs) => {
        const handler = (tile?: Tile) => obs.next(tile);
        this.tileObservers.add(handler);
        return () => { this.tileObservers.delete(handler); };
    });

    /**
     * The values of the tiles on this board.
     */
    protected readonly numbers: Uint16Array;

    /**
     * A queue of actions which is described by their locks.
     */
    private readonly actionQueue: Lock[] = [];

    /** The action which is currently running. */
    private currentAction?: Lock;

    private lockCount: number = 0;

    private readonly tileObservers = new Set<(tile: Tile) => any>();

    private readonly actionObservers = new Set<(lock?: Lock) => any>();
    private readonly actionObserver: Observable<Lock | undefined> = new Observable<Lock | undefined>((obs) => {
        const handler = (lock?: Lock) => obs.next(lock);
        this.actionObservers.add(handler);
        return () => { this.actionObservers.delete(handler); };
    });

    /**
     * Creates a board of size*size tiles. Default size is 4.
     * @param size size of dimension in both directions
     */
    public constructor(size: number = 4) {
        // tslint:disable-next-line:no-bitwise
        this.size = typeof size === "number" && size ? size | 0 : 4;
        this.numbers = new Uint16Array(size * size);
    }

    /**
     * Creates a random tile of value 2 or 4 at an empty space for the board.
     * If no empty space is available this will resolve to null.
     * @param lock an optional lock if this is part of a chained action
     */
    public randTile(lock?: Lock): Promise<Tile | null> {
        return this.queueAction<Tile | null>((l) => {
            const empty: TileId[] = [];
            for (let tileId: TileId = 0; tileId < this.numbers.length; tileId++) {
                if (this.numbers[tileId] === 0) {
                    empty.push(tileId);
                }
            }
            const emptyCount = empty.length;
            if (!emptyCount) {
                return null;
            }
            return randFill(new Uint8Array(1)).then((r) => {
                // tslint:disable-next-line:no-bitwise
                const val: number = (r[0] & 1) << 2 || 2;
                // tslint:disable-next-line:no-bitwise
                const idx: TileId = (r[0] >> 1) % emptyCount;

                return this.setTile(empty[idx], val, null, l);
            });
        }, lock);
    }

    /**
     * Set the value of a tile.
     * @param tile the Tile or TileId to set value of
     * @param val the number to set that tile to
     * @param creation optional creation method, null for new, TileId for move, array tuple for merge (default null)
     * @param lock optional lock if this is part of a chained action
     * @returns {Promise<Tile>} resolves to the changed tile after the value has been set
     */
    public setTile(tile: TileId | Tile, val: number, creation: TileCreation = null, lock?: Lock): Promise<Tile> {
        return this.queueAction(() => {
            const idx = typeof tile === "number" ? tile : tile.id;
            this.numbers[idx] = val;
            const newtile = this.getTileDirect(idx);
            newtile.creation = creation;
            if (this.tileObservers.size) {
                for (const obs of this.tileObservers) {
                    try {
                        obs(newtile);
                    } catch (e) {
                        // tslint:disable-next-line:no-console
                        console.warn("Error occured in a tile observer:", e);
                    }
                }
            }
            return newtile;
        }, lock);
    }

    public getTileDirect(idx: TileId) {
        // tslint:disable-next-line:no-bitwise
        return new Tile(this, idx, idx % this.size, (idx / this.size) | 0);
    }

    /**
     * Get the current value for a tile.
     * @param idx TileId of the tile to get the value from
     */
    public getTileValue(idx: TileId): number;
    public getTileValue(x: number, y: number): number;
    public getTileValue(x: TileId | number, y?: number) {
        return this.numbers[y === undefined ? x : this.size * y + x];
    }

    public queueAction<T>(action: (lock: Lock) => PromiseLike<T> | T, lock?: Lock): Promise<T> {
        if (lock) {
            if (lock === this.currentAction) {
                return lock.activated.then(action);
            } else if (this.actionQueue.indexOf(lock) !== -1) {
                const pro = new CompletablePromise<Lock>();
                const sub = this.actionObserver.subscribe((l) => {
                    if (l === lock) {
                        pro.complete(lock.activated);
                        sub.unsubscribe();
                    }
                });
                return pro.then(action);
            }
        }

        const genLock = new Lock(this.lockCount++, "board-lock");
        const su = this.actionObserver.subscribe((l) => {
            if (l === genLock) {
                if (lock) {
                    lock.activated.then(() => genLock.activate());
                } else {
                    genLock.activate();
                }
                su.unsubscribe();
            }
        });
        genLock.released.then((l) => {
            if (this.currentAction !== l) {
                // tslint:disable-next-line:no-console
                console.error(new Error("genLock should always be the current action"));
                return;
            }
            const act = this.currentAction = this.actionQueue.shift();
            for (const f of Array.from(this.actionObservers)) {
                f(act);
            }
        });

        this.actionQueue.push(genLock);
        if (this.currentAction === undefined) {
            // queue a microtask for shifting queue
            Promise.resolve().then(() => {
                if (this.currentAction === undefined) {
                    const act = this.currentAction = this.actionQueue.shift();
                    for (const f of Array.from(this.actionObservers)) {
                        f(act);
                    }
                }
            });
        }

        return genLock.activated.then(action).then((v) => {
            genLock.release();
            return v;
        }, (e) => {
            genLock.release();
            throw e;
        });
    }

    /**
     * Get the current state of the board.
     */
    public getState(lock?: Lock) {
        return this.queueAction(() => {
            const a = [];
            const l = this.size;
            a.length = l;
            for (let y = 0; y < l; y++) {
                const beg = y * l;
                a[y] = Array.from(this.numbers.subarray(beg, beg + l));
            }
            return a;
        }, lock);
    }

    /**
     * Restore a game state.
     * @param state the state to restore to
     * @param lock optional lock if this is part of another action
     */
    public restoreState(state: number[][], lock?: Lock) {
        return this.queueAction(async () => {
            const l = this.size;
            for (let y = 0; y < l; y++) {
                const row = state[y];
                for (let x = 0; x < l; x++) {
                    await this.setTile(y * l + x, row[x], null, lock);
                }
            }
        }, lock);
    }
}
