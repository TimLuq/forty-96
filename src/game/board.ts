import { CompletablePromise } from "../util/completable-promise";
import { Lock } from "../util/lock";
import { Observable } from "../util/observable";
import { randFill } from "../util/random";
import { Tile, TileId } from "./tile";

export class Board {
    /**
     * Height and width of the board.
     *
     * * Min: 2
     * * Max: 15
     */
    public readonly size: number = 4;

    public readonly tileObservers = new Set<(tile: Tile) => any>();
    public readonly tileObserver: Observable<Lock | undefined> = new Observable<Lock | undefined>((obs) => {
        const handler = (lock?: Lock) => obs.next(lock);
        this.actionObservers.add(handler);
        return () => { this.actionObservers.delete(handler); };
    });

    /**
     * The values of the tiles on this board.
     */
    protected readonly numbers: Uint16Array;

    /**
     * A queue of actions which is described by their locks.
     */
    protected readonly actionQueue: Lock[] = [];

    /** The action which is currently running. */
    private currentAction?: Lock;

    private lockCount: number = 0;

    private readonly actionObservers = new Set<(lock?: Lock) => any>();
    private readonly actionObserver: Observable<Lock | undefined> = new Observable<Lock | undefined>((obs) => {
        const handler = (lock?: Lock) => obs.next(lock);
        this.actionObservers.add(handler);
        return () => { this.actionObservers.delete(handler); };
    });

    public constructor(size: number = 4) {
        // tslint:disable-next-line:no-bitwise
        this.size = typeof size === "number" && size ? size | 0 : 4;
        this.numbers = new Uint16Array(size * size);
    }

    public randTile(lock?: Lock): Promise<TileId | null> {
        return this.queueAction<TileId | null>((l) => {
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
                const val: number = (r[0] & 1) << 1;
                // tslint:disable-next-line:no-bitwise
                const idx: TileId = (r[0] >> 1) % emptyCount;

                return this.setTile(idx, val, l);
            });
        }, lock);
    }

    public setTile(idx: TileId, val: number, lock?: Lock) {
        return this.queueAction(() => {
            this.numbers[idx] = val;
            if (this.tileObservers.size) {
                const tile = this.getTileDirect(idx);
                for (const obs of this.tileObservers) {
                    obs(tile);
                }
            }
            return idx;
        }, lock);
    }

    public getTileDirect(idx: TileId) {
        // tslint:disable-next-line:no-bitwise
        return new Tile(this, idx, idx % this.size, (idx / this.size) | 0);
    }

    protected queueAction<T>(action: (lock: Lock) => PromiseLike<T> | T, lock?: Lock): Promise<T> {
        if (lock) {
            if (lock === this.currentAction) {
                return lock.activated.then(action);
            } else if (this.actionQueue.indexOf(lock) !== -1) {
                const pro = new CompletablePromise<Lock>();
                const sub = this.actionObserver.subscribe((l) => {
                    if (l === lock) {
                        pro.resolve(lock.activated);
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
        return genLock.activated.then(action).then((v) => {
            genLock.release();
            return v;
        }, (e) => {
            genLock.release();
            throw e;
        });
    }
}
