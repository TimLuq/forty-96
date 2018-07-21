// tslint:disable:max-classes-per-file

const symForty96Error = Symbol("Forty96Error");
export abstract class Forty96Error extends Error {

    public static isForty96Error(e: Error): e is Forty96Error {
        return Boolean((e as Forty96Error)[symForty96Error]);
    }

    public readonly abstract code: string;

    private readonly [symForty96Error] = true;

    public constructor(msg: string) {
        super(msg);
    }
}

const symInvalidMoveError = Symbol("InvalidMoveError");
export class InvalidMoveError extends Forty96Error {

    public static isInvalidMoveError(e: Error): e is InvalidMoveError {
        return Boolean((e as InvalidMoveError)[symInvalidMoveError]);
    }

    public readonly code: string = "invalid_move";

    private readonly [symInvalidMoveError] = true;

    public constructor(msg: string) {
        super(msg);
    }
}

const symGameOverError = Symbol("GameOverError");
export class GameOverError extends Forty96Error {

    public static isGameOverError(e: Error): e is GameOverError {
        return Boolean((e as GameOverError)[symGameOverError]);
    }

    public readonly code: string = "game_over";

    private readonly [symGameOverError] = true;

    public constructor(msg: string) {
        super(msg);
    }
}
