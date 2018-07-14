
declare class Observable<T = any, E = Error> implements Observable.IObservable<T, E> {

    /** Converts items to an Observable. */
    public static of<T>(...items: T[]): Observable<T, never>;

    /** Converts an observable or iterable to an Observable. */
    public static from<T, E = any>(observable: Observable.IObservable<T, E> | Iterable<T>): Observable<T, E>;

    public constructor(subscriber: Observable.SubscriberFunction);

    /** Subscribes to the sequence with an observer. */
    public subscribe(observer: Observable.Observer<T, E>): Observable.Subscription;

    /** Subscribes to the sequence with callbacks. */
    public subscribe(onNext: (value: T) => any,
                     onError?: (error: E) => any,
                     onComplete?: () => any,
                    ): Observable.Subscription;

    /** Returns itself. */
    public [Symbol.observable](): this;
}

// tslint:disable-next-line:no-namespace
declare namespace Observable {

    export interface IObservable<T = any, E = Error> {
        [Symbol.observable](): Observable<T, E>;
    }

    // tslint:disable-next-line:interface-name
    export interface Observer<T = any, E = Error> {

        /** Receives the subscription object when `subscribe` is called. */
        start?(subscription: Subscription): any;

        /** Receives the next value in the sequence. */
        next?(value: T): any;

        /** Receives the sequence error. */
        error?(errorValue: E): any;

        /** Receives a completion notification. */
        complete?(data?: any): any;
    }

    // tslint:disable-next-line:interface-name
    export interface Subscription {

        /** A boolean value indicating whether the subscription is closed. */
        readonly closed: boolean;

        /** Cancels the subscription. */
        unsubscribe(): any;
    }

    /** A function which either returns an unsubscribe function or an object that has an unsubscribe method. */
    export type SubscriberFunction = (observer: SubscriptionObserver) => void | (() => void) | Subscription;

    // tslint:disable-next-line:interface-name
    export interface SubscriptionObserver<T = any, E = Error> {

        /** A boolean value indicating whether the subscription is closed. */
        readonly closed: boolean;

        /** Sends the next value in the sequence. */
        next(value: T): any;

        /** Sends the sequence error. */
        error(errorValue: E): any;

        /** Sends the completion notification. */
        complete(): any;
    }
}
