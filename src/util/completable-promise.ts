
const symStateObj = Symbol("completionState");

export class CompletablePromise<T> extends Promise<T> {
    private [symStateObj]: {
        state: 0 | 1 | 2;
        v: any;
        res?: (v: T | PromiseLike<T>) => void;
        rej?: (v: any) => void;
    } = { state: 0, v: undefined };

    public constructor() {
        super((resf, rejf) => {
            const st = this[symStateObj];
            if (st.state === 0) {
                st.res = resf;
                st.rej = rejf;
            } else if (st.state === 1) {
                resf(st.v);
            } else {
                rejf(st.v);
            }
        });
    }

    public resolve(o: T | PromiseLike<T>) {
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

    public reject(o: any) {
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
