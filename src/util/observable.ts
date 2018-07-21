// tslint:disable:max-classes-per-file

if (!Symbol.observable) {
    Object.defineProperty(Symbol, "observable", { value: Symbol.for("observable") });
}

const noThrow = Symbol("noThrow");

interface ISubscription<T, E> extends Observable.Subscription {
    observer?: Observable.Observer<T, E>;
    cleanup(): void;
    close(): Observable.Observer<T, E> | undefined;
}

const Obs: typeof Observable = typeof Observable === "function" ? Observable :
class ObservablePolyfill<T = any, E = any> implements Observable<T, E> {

    public static errorReporter(e: Error) {
        // tslint:disable-next-line:no-console
        console.error(e);
    }

    /** Converts items to an Observable. */
    public static of<T>(...items: T[]): Observable<T, never> {
        const C = typeof this === "function" ? (this as typeof Observable) : Obs;
        return new C<T, never>((observer: Observable.SubscriptionObserver) => {
            for (const item of items) {
                observer.next(item);
                if (observer.closed) {
                    return;
                }
            }
            observer.complete();
        });
    }

    /** Converts an observable or iterable to an Observable. */
    public static from<T, E = any>(observable: Observable.IObservable<T, E> | Iterable<T>): Observable<T, E> {
        if (!observable || typeof observable !== "object") {
            throw new TypeError(observable + " is not an object");
        }
        const C = typeof this === "function" ? (this as typeof Observable) : Obs;
        const obsfunc = (observable as Observable.IObservable<T, E>)[Symbol.observable];
        if (obsfunc) {
            if (typeof obsfunc !== "function") {
                throw new TypeError("The observable " + observable + " returns an unexpected value: " + obsfunc);
            }
            const res = obsfunc.call(observable);
            if (!res) {
                throw new TypeError("Empty result from Symbol.observable function.");
            }
            if (typeof res === "object") {
                if (res.constructor === C) {
                    return res;
                }

                if (typeof res.subscribe === "function") {
                    //  tslint:disable-next-line:no-console max-line-length
                    // console.error("Expected result from Symbol.observable function to be an object of constructor " + C.name + " not ", res.constructor, res);
                    //  tslint:disable-next-line:max-line-length
                    // throw new TypeError("Expected result from Symbol.observable function to be an object of constructor " + C.name + " not " + res.constructor.name);
                    return new C<T, E>(res.subscribe);
                }

                return new C<T, E>(() => res);
            } else if (typeof res === "function" && res.length === 1) {
                // const observer = res;
                // res = (res as any as { observable: Observable<T, E> }).observable;
                // const sub = (res as Observable<T, E>).subscribe(observer);
                const o = new C<T, E>(() => undefined);
                o.subscribe(res);
                return o; // sub);
            } else {
                // tslint:disable-next-line:max-line-length
                throw new TypeError("Expected result from Symbol.observable function to be an object or built in function: " + res);
            }
        }
        const iterable = (observable as Iterable<T>)[Symbol.iterator];
        if (typeof iterable === "function") {
            return new C<T, E>((observer: Observable.SubscriptionObserver) => {
                const it = iterable.call(observable) as Iterator<T>;
                while (true) {
                    const item = it.next();
                    if (item.done) {
                        break;
                    }
                    observer.next(item.value);
                    if (observer.closed) {
                        return;
                    }
                }
                observer.complete();
            });
        }
        // tslint:disable-next-line:max-line-length
        throw new TypeError("Can only make an Observable from an observable or from an iterable, not from: " + observable);
    }

    private static readonly Subscription = class SubscriptionImpl<T, E> implements ISubscription<T, E> {

        // tslint:disable-next-line:variable-name
        private _cleanup?: () => any;

        public get closed() {
            return !this.observer;
        }

        public constructor(public observer: Observable.Observer<T, E>, subscriber: Observable.SubscriberFunction) {
            // tslint:disable-next-line:ban-types
            (this as Object).constructor = Object;
            this.observer = observer;
            try {
                if (observer.start) {
                    observer.start(this);
                }
            } catch (e) {
                ObservablePolyfill.errorReporter(e);
            }

            if (!this.observer) {
                // has been unsubscribed in start
                return;
            }

            const subobs = new ObservablePolyfill.SubscriptionObserver(this);
            let err: any;
            try {
                const cleanup: undefined | null | Observable.Subscription | (() => any)
                    = subscriber.call(undefined, subobs);
                if (cleanup !== null && cleanup !== undefined) {
                    if (typeof cleanup === "function") {
                        this._cleanup = cleanup;
                    } else if (typeof cleanup === "object" && typeof cleanup.unsubscribe === "function") {
                        this._cleanup = cleanup.unsubscribe.bind(cleanup);
                    } else {
                        err = new TypeError((typeof cleanup) + " " + cleanup + " is not a function");
                        throw err;
                    }
                }
            } catch (e) {
                subobs.error(e);
                if (err) {
                    throw e;
                }
            }

            if (!this.observer) {
                this.cleanup();
            }
        }

        public cleanup() {
            if (this._cleanup) {
                this._cleanup();
                this._cleanup = undefined;
            }
        }

        public close(): Observable.Observer<T, E> | undefined {
            const obs = this.observer;
            if (!obs) {
                return undefined;
            }
            this.observer = undefined as any;
            return obs;
        }

        public unsubscribe() {
            this.close();
            this.cleanup();
        }
    };

    // tslint:disable-next-line:max-line-length
    private static readonly SubscriptionObserver = class SubscriptionObserverImpl<T, E> implements Observable.SubscriptionObserver<T, E> {

        public get closed() {
            return this.subscription.closed;
        }

        public constructor(public subscription: ISubscription<T, E>) {
            // tslint:disable-next-line:ban-types
            (this as Object).constructor = Object;
        }

        /** Pass on value to the registered observer. */
        public next(value: T) {
            const obs = this.subscription.observer;
            const nf = obs && obs.next;
            if (!nf) {
                return undefined;
            }
            if (typeof nf !== "function") {
                throw new TypeError("observer.next must be a function if it exists");
            }
            try {
                return nf.call(obs, value);
            } catch (e) {
                ObservablePolyfill.errorReporter(e);
                try {
                    this.subscription.cleanup();
                } catch (e2) {
                    throw e;
                }
                // return e;
            }
        }

        /** Pass on error to the registered observer. */
        public error(errorValue: E) {
            const obs = this.subscription.close();
            if (!obs) {
                //  throw new Error("Observer is closed and can not receive any errors.");
                // TODO: spec says undefined, tests says `throw errorValue`.
                // return undefined;
                throw errorValue;
            }
            let err: any = noThrow;
            let ret: any;
            try {
                const errf = obs.error;
                if (!errf) {
                    throw errorValue;
                }
                if (typeof errf !== "function") {
                    throw new TypeError("observer.error must be a function if it exists");
                }
                try {
                    ret = errf.call(obs, errorValue);
                } catch (e) {
                    err = e;
                    ObservablePolyfill.errorReporter(e);
                }
            } catch (e) {
                if (err === noThrow) {
                    err = e;
                }
            }
            try {
                this.subscription.cleanup();
            } catch (e) {
                if (err === noThrow) {
                    err = e;
                }
            }
            if (err !== noThrow) {
                throw err;
            }
            return ret;
        }

        /** Pass on completion to the registered observer. */
        public complete(data?: any) {
            const obs = this.subscription.close();
            let err: any = noThrow;
            let ret: any;
            try {
                const comf = obs && obs.complete;
                if (comf === undefined || comf === null) {
                    ret = undefined;
                } else if (typeof comf !== "function") {
                    throw new TypeError("observer.complete must be a function if it exists");
                } else {
                    try {
                        ret = comf.call(obs, data);
                    } catch (e) {
                        ObservablePolyfill.errorReporter(e);
                        err = e;
                    }
                }
            } catch (e) {
                if (err === noThrow) {
                    err = e;
                }
            }
            try {
                this.subscription.cleanup();
            } catch (e) {
                if (err === noThrow) {
                    err = e;
                }
            }
            if (err !== noThrow) {
                throw err;
            }
            return ret;
        }
    };

    // tslint:disable-next-line:variable-name
    private readonly _subscriber: Observable.SubscriberFunction;

    public constructor(subscriber: Observable.SubscriberFunction) {
        // The stream subscriber must be a function
        if (typeof subscriber !== "function") {
            throw new TypeError("Observable initializer must be a function");
        }

        this._subscriber = subscriber;
    }

    /** Subscribes to the sequence with an observer. */
    public subscribe(observer: Observable.Observer<T, E>): Observable.Subscription;
    /** Subscribes to the sequence with callbacks. */
    public subscribe(onNext: (value: T) => any,
                     onError?: (error: any) => any,
                     onComplete?: () => any,
                    ): Observable.Subscription;
    /** Implementation takes either a callback or an observer. */
    // tslint:disable-next-line:max-line-length
    public subscribe(onNext: Observable.Observer<T, E> | ((value: T) => any)): Observable.Subscription {
        const observer = typeof onNext === "function" ? {
                complete: arguments[2] as undefined | (() => any),
                error: arguments[1] as undefined | ((error: E) => any),
                next: onNext,
            } : onNext;
        if (!observer || typeof observer !== "object") {
            throw new TypeError("Invalid observer supplied to subscribe.");
        }
        return new ObservablePolyfill.Subscription<T, E>(observer, this._subscriber);
    }

    /** Returns itself. */
    public [Symbol.observable](): this {
        return this;
    }
};

export { Obs as Observable };
