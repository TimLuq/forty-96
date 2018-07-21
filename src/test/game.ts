import { InvalidMoveError } from "../game/errors";
import { StandardGameBoard } from "../game/standard";

interface IGameState {
    state: [
        [number, number, number, number],
        [number, number, number, number],
        [number, number, number, number],
        [number, number, number, number]
    ];

    down?: IGameState | { new(msg: string): Error; };
    left?: IGameState | { new(msg: string): Error; };
    right?: IGameState | { new(msg: string): Error; };
    up?: IGameState | { new(msg: string): Error; };
}

const state0: IGameState = {
    state: [
        [0, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 4, 2, 0],
        [0, 0, 0, 0],
    ],

    left: {
        state: [
            [0, 0, 0, 0],
            [2, 0, 0, 0],
            [4, 2, 0, 0],
            [0, 0, 0, 0],
        ],

        left: InvalidMoveError,
        right: {
            state: [
                [0, 0, 0, 0],
                [0, 0, 0, 2],
                [0, 0, 4, 2],
                [0, 0, 0, 0],
            ],
        },
        up: {
            state: [
                [2, 2, 0, 0],
                [4, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },
    } as IGameState,

    right: {
        state: [
            [0, 0, 0, 0],
            [0, 0, 0, 2],
            [0, 0, 4, 2],
            [0, 0, 0, 0],
        ],

        down: {
            state: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 4, 4],
            ],

            down: InvalidMoveError,
            left: {
                state: [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [8, 0, 0, 0],
                ],
            },
            right: {
                state: [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 8],
                ],
            },
        },
        left: {
            state: [
                [0, 0, 0, 0],
                [2, 0, 0, 0],
                [4, 2, 0, 0],
                [0, 0, 0, 0],
            ],
        },
        right: InvalidMoveError,
        up: {
            state: [
                [0, 0, 4, 4],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],

            down: {
                state: [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 4, 4],
                ],

                left: {
                    state: [
                        [0, 0, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0],
                        [8, 0, 0, 0],
                    ],
                },
            },
        },
    },

    up: {
        state: [
            [2, 4, 2, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],

        down: {
            state: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [2, 4, 2, 0],
            ],
        },

        right: {
            state: [
                [0, 2, 4, 2],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },

        up: InvalidMoveError,
    },

    down: {
        state: [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [2, 4, 2, 0],
        ],

        down: InvalidMoveError,

        right: {
            state: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 2, 4, 2],
            ],
        },

        up: {
            state: [
                [2, 4, 2, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },
    },
};

const state1: IGameState = {
    state: [
        [ 0, 2, 2, 32 ],
        [ 0, 0, 0, 16 ],
        [ 0, 0, 0,  8 ],
        [ 0, 0, 0,  0 ],
    ],

    left: {
        state: [
            [  4, 32, 0, 0 ],
            [ 16,  0, 0, 0 ],
            [  8,  0, 0, 0 ],
            [  0,  0, 0, 0 ],
        ],
    },

    right: {
        state: [
            [ 0, 0, 4, 32 ],
            [ 0, 0, 0, 16 ],
            [ 0, 0, 0,  8 ],
            [ 0, 0, 0,  0 ],
        ],
    },
};

function renderStates(...states: number[][][]) {
    const arr: string[][] = [];
    const emptyLine: string[] = [];
    for (const a of states) {
        const arrlen = arr.length;
        const alen = a.length;

        for (let i = arrlen; i < alen; i++) {
            arr[i] = [...emptyLine];
        }

        let emptyPart = "      ";
        for (let y = 0; y < alen; y++) {
            arr[y].push(" [ ");
            for (const v of a[y]) {
                if (y === 0) {
                    emptyPart += "      ";
                }
                let n = v.toString();
                while (n.length < 6) {
                    n = " " + n;
                }
                arr[y].push(n);
            }
            arr[y].push(" ] ");
        }
        emptyLine.push(emptyPart);

        for (let i = alen; i < arrlen; i++) {
            arr[i].push(emptyPart);
        }
    }
    return arr.map((x) => x.join(""));
}

function arreq<T>(a: T[], b: T[]) {
    const l = a.length;
    if (l !== b.length) {
        return false;
    }
    for (let i = 0; i < l; i++) {
        const a0 = a[i];
        const b0 = b[i];
        if (Array.isArray(a0) && Array.isArray(b0)) {
            if (!arreq(a0, b0)) {
                return false;
            }
        } else {
            if (a0 !== b0) {
                return false;
            }
        }
    }
    return true;
}

function testState(board: StandardGameBoard, history: ArrayLike<string>, state: IGameState):
        Promise<AsyncIterableIterator<[ArrayLike<string>, boolean, string]>> {
    return board.queueAction(async (lock) => {
        const testresults: Array<[ArrayLike<string>, boolean, string]> = [];
        const subtests: Array<Promise<AsyncIterableIterator<[ArrayLike<string>, boolean, string]>>> = [];
        for (const k of ["left", "right", "up", "down"] as Array<"left" | "right" | "up" | "down">) {
            const r = state[k];
            if (!r) {
                continue;
            }
            const h2 = Object.create(history);
            h2.length = history.length + 1;
            h2[history.length] = k;
            await board.restoreState(state.state, lock);
            try {
                await board[k].call(board, lock);
                if (typeof r === "function") {
                    testresults.push([h2, false, "expected " + k + "() to throw " + r.name]);
                    continue;
                } else {
                    const newstate = await board.getState(lock);
                    const eq = arreq(newstate, r.state);
                    testresults.push([
                        h2,
                        eq,
                        "expected state after " + k + "()" +
                            (eq ? "" : "\n   " + renderStates(r.state, newstate).join("\n   ")),
                    ]);
                    if (eq) {
                        subtests.push(testState(board, h2, r));
                    }
                }
            } catch (e) {
                if (e instanceof Error) {
                    if (typeof r === "function") {
                        testresults.push([
                            h2,
                            e instanceof r,
                            "throw an error of type " + r.name,
                        ]);
                    } else {
                        testresults.push([
                            h2,
                            false,
                            "threw an error of type " + e.name + ": " + e.message,
                        ]);
                    }
                } else {
                    testresults.push([h2, false, "threw a non-error of type " + typeof e]);
                }
            }
        }
        return { testresults, subtests };
    }).then(async function*({ testresults, subtests }) {
        // console.log("results: ", testresults);
        yield* testresults;
        for (const sub of subtests) {
            yield* await sub;
        }
    });
}

export default function tests() {
    const board = new StandardGameBoard();
    board.randAfterMove = false;
    const tsp = [
        testState(board, { 0: "state0", length: 1 }, state0),
        testState(board, { 0: "state1", length: 1 }, state1),
    ];
    return Promise.all(tsp).then(async (ts) => {
        for (const rs of ts) {
            for await (const r of rs) {
                const h = Array.prototype.join.call(r[0], " -> ");
                if (r[1]) {
                    // tslint:disable-next-line:no-console
                    console.log("%s: \x1B[32mOK\x1B[0m", h);
                } else {
                    // tslint:disable-next-line:no-console
                    console.warn("%s: \x1B[31mFAIL\x1B[0m\n  %s", h, r[2]);
                }
            }
        }
    });
}
