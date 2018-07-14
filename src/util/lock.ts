
/**
 * A lock for exclusive game access.
 */
export class Lock {

    /** A promise which is resolved after the lock is released. */
    public readonly released: Promise<this>;

    /** A promise which is resolved after the lock is released. */
    public readonly activated: Promise<this>;

    public readonly name: string;

    /** A private variable to store the completion state in. */
    // tslint:disable-next-line:variable-name
    private _isComplete: boolean = false;

    /** A private variable to store the active state in. */
    // tslint:disable-next-line:variable-name
    private _isActive: boolean = false;

    /** A private variable to store the completions state in. */
    // tslint:disable-next-line:variable-name
    private _complete?: () => void;

    /** A private variable to store the completions state in. */
    // tslint:disable-next-line:variable-name
    private _activate?: () => void;

    /** Check if this lock is released. */
    public get isReleased() {
        return this._isComplete;
    }

    /** Check if this lock is currently active. */
    public get isActive() {
        return this._isActive;
    }

    public constructor(public readonly id: number, name?: string) {
        this.name = (name || "unnamed-lock") + "#" + id;
        this.released = new Promise<this>((res) => {
            if (this._isComplete) {
                res(this);
            } else {
                this._complete = () => res(this);
            }
        });
        this.activated = new Promise<this>((res) => {
            if (this._isActive) {
                res(this);
            } else {
                this._activate = () => res(this);
            }
        });
    }

    public release() {
        if (!this._isComplete) {
            this._isComplete = true;
            if (this._complete) {
                this._complete();
            }
            this._isActive = false;
        }
    }

    /** Marks this lock as active. */
    public activate() {
        if (this._isActive) {
            throw new Error("Can not activate Lock that is already active.");
        }
        if (this._isComplete) {
            throw new Error("Can not activate Lock that is already released.");
        }
        this._isActive = true;
        if (this._activate) {
            this._activate();
        }
        return this;
    }
}
