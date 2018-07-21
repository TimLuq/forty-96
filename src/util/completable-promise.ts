
const symStateObj = Symbol("completionState");

interface ICompleteState<T> {
    state: 0 | 1 | 2;
    p: Promise<T>;
    v: any;
    res?: (v: T | PromiseLike<T>) => void;
    rej?: (v: any) => void;
}

export class CompletablePromise<T> implements Promise<T> {

    public static race<T>(values: Iterable<T | PromiseLike<T>>) {
        return new Promise<T>((res, rej) => {
            let b = false;
            for (const p of values) {
                b = true;
                if (p && typeof (p as PromiseLike<T>).then === "function") {
                    (p as PromiseLike<T>).then(
                        (v: T) => {
                            res(v);
                        },
                        (e: any) => {
                            rej(e);
                        },
                    );
                } else {
                    res(p);
                    return;
                }
            }
            if (!b) {
                rej(new TypeError("At least one argument must be sent to race."));
            }
        });
    }

    public readonly [Symbol.toStringTag]: "Promise";

    private readonly [symStateObj]: ICompleteState<T>;

    public get isCompleted() {
        return 0 !== this[symStateObj].state;
    }

    public constructor() {
        const state: ICompleteState<T> = { state: 0, v: undefined, p: undefined as any };
        state.p = new Promise<T>((resf, rejf) => {
            const st = state;
            if (st.state === 0) {
                st.res = resf;
                st.rej = rejf;
            } else if (st.state === 1) {
                resf(st.v);
            } else {
                rejf(st.v);
            }
        });
        this[symStateObj] = state;
    }

    public then<R1 = T, R2 = never>(
        onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null | undefined,
        onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null | undefined,
    ): Promise<R1 | R2> {
        return this[symStateObj].p.then<R1, R2>(onfulfilled, onrejected);
    }
    public catch<R = never>(onrejected?: ((reason: any) => R | PromiseLike<R>) | null | undefined): Promise<T | R> {
        return this[symStateObj].p.catch<R>(onrejected);
    }

    public complete(o: T | PromiseLike<T>) {
        const st = this[symStateObj];
        if (st.state !== 0) {
            return false;
        }
        st.state = 1;
        st.v = o;
        if (st.res) {
            st.res(o);
        }
        return true;
    }

    public completeExceptionally(o: any) {
        const st = this[symStateObj];
        if (st.state !== 0) {
            return false;
        }
        st.state = 2;
        st.v = o;
        if (st.rej) {
            st.rej(o);
        }
        return true;
    }
}
