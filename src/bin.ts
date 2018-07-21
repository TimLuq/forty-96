#!/usr/bin/env node

import { CompletablePromise, Forty96Error, StandardGame, Tile } from "./lib";

import { randFill } from "./util/random";

const out = process.stdout;
const isTTY = Boolean(out.isTTY);

function writeVal(g: StandardGame, tile: Tile) {
    const v = tile.value;
    const s = v ? v.toString().padStart(6, " ") : "      ";
    // _2_ 4 8 _16_ 32 64 _128_ 256 512 _1024_ 2048 4096 _8192_
    const color = !v || v < 16 ? "" : v < 128 ? "32" : v < 1024 ? "34" : v < 8192 ? "35" : "33";
    out.write([
        "\x1B[" + ((g.size - tile.y) * 2 + 4) + "A",
        "\x1B[" + (tile.x * 9 + 3) + "C",
        color && "\x1B[" + color + "m",
        s,
        color && "\x1B[0m",
        "\x1B[" + ((g.size - tile.y) * 2 + 4) + "B",
        "\r\n\x1B[1A",
    ].join(""));
}

function repeat<T>(d: T, c: number, append?: T[]) {
    const r: T[] = append || [];
    const s = r.length;
    const l = c + s;
    r.length = l;
    for (let i = s; i < l; i++) {
        r[i] = d;
    }
    return r;
}

function printGameBoard(size: number, state?: number[][]) {
    // const data: string[] = [];
    const lineDivider = repeat("--------+", size, [" +"]).join("");
    const lineEmpCell = repeat(state ? " %s |" : "        |", size, [" |"]).join("");

    // data.push("", "", "", "", lineDivider);
    // tslint:disable-next-line:no-console
    console.log("");
    // tslint:disable-next-line:no-console
    console.log("");
    // tslint:disable-next-line:no-console
    console.log("");
    // tslint:disable-next-line:no-console
    console.log("");
    // tslint:disable-next-line:no-console
    console.log(lineDivider);
    for (let y = 0; y < size; y++) {
        if (!state) {
            // tslint:disable-next-line:no-console
            console.log(lineEmpCell);
        } else {
            const args = state[y].map((v) => v ? v.toString(10).padStart(6, " ") : "      ");
            // tslint:disable-next-line:no-console
            console.log(lineEmpCell, ...args);
        }
        // tslint:disable-next-line:no-console
        console.log(lineDivider);
        // data.push(lineEmpCell, lineDivider);
    }

    const controls = "  Controls: [ w = up ] [ a = left ] [ s = down ] [ d = right ]";
    const description = "  Description: Merge tiles of the same number.";

    // tslint:disable-next-line:no-console
    console.log("");
    // tslint:disable-next-line:no-console
    console.log(controls);
    // tslint:disable-next-line:no-console
    console.log(description);
    // tslint:disable-next-line:no-console
    console.log("");
    // data.push("",
    //     controls,
    //     description,
    //     "",
    // );
    // out.write("\x1B[H\x1B[90m" + data.join("\r\n") + "\x1B[39m\x1B[1;" + (size * 2 + 9) + "H");
}

async function* streamchar(stream: NodeJS.ReadableStream): AsyncIterableIterator<number> {
    for await (const v of streamdata(stream)) {
        if (typeof v === "string") {
            const len = v.length;
            for (let i = 0; i < len; i++) {
                yield v.charCodeAt(i);
            }
        } else {
            const len = v.length;
            for (let i = 0; i < len; i++) {
                yield v[i];
            }
        }
    }
}

async function* streamdata(stream: NodeJS.ReadableStream): AsyncIterableIterator<Buffer | string> {
    const end = new CompletablePromise<Array<string | Buffer>>();
    let result: Array<string | Buffer> = undefined as any;
    let res = new CompletablePromise<Array<Buffer | string>>();
    const onData = (data: Buffer | string) => {
        if (res.isCompleted) {
            result.push(data);
        } else {
            result = [data];
            res.complete(result);
        }
    };
    stream.once("end", () => {
        end.completeExceptionally("eos");
        stream.off("data", onData);
    });
    stream.on("data", onData);
    while (true) {
        const vs = await CompletablePromise.race([end, res]);
        res = new CompletablePromise<Array<Buffer | string>>();
        yield* vs;
    }
}

const game = new StandardGame();

const timeout = 3600000;
let timeoutId: any;

const exitP = new CompletablePromise<number>();
export const exit = (v: number = 0) => {
    if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
    }
    return exitP.complete(v);
};

export const up = () => {
    if (timeoutId !== undefined) {
        clearTimeout(timeout);
        timeoutId = setTimeout(() => exitP.completeExceptionally(new Error("User timeout")), timeout);
    }
    return game.up().catch((e) => {
        return e;
    });
};
export const down = () => {
    if (timeoutId !== undefined) {
        clearTimeout(timeout);
        timeoutId = setTimeout(() => exitP.completeExceptionally(new Error("User timeout")), timeout);
    }
    return game.down().catch((e) => {
        return e;
    });
};
export const left = () => {
    if (timeoutId !== undefined) {
        clearTimeout(timeout);
        timeoutId = setTimeout(() => exitP.completeExceptionally(new Error("User timeout")), timeout);
    }
    return game.left().catch((e) => {
        return e;
    });
};
export const right = () => {
    if (timeoutId !== undefined) {
        clearTimeout(timeout);
        timeoutId = setTimeout(() => exitP.completeExceptionally(new Error("User timeout")), timeout);
    }
    return game.right().catch((e) => {
        return e;
    });
};

async function main() {
    let err: any;
    try {
        printGameBoard(game.size);
        const onTile = isTTY
            ? (tile: Tile) => writeVal(game, tile)
            : () => game.getState().then((state) => printGameBoard(game.size, state));
        game.tileObserver.subscribe(onTile);
        await game.reset();
        if (isTTY) {
            const stdin = process.stdin;
            if (stdin.setRawMode) {
                stdin.setRawMode(true);
            }
            for await (const l of streamchar(stdin)) {
                // tslint:disable-next-line:no-console
                // console.log("GOT %s:", typeof l, l);
                if (l <= 4) {
                    exit();
                }
                if (exitP.isCompleted) {
                    stdin.end();
                    break;
                }
                // tslint:disable-next-line:no-console
                out.write("\x1B[2D                                              \r\n\x1B[1A");

                try {
                    if (l === 119 || l === 87) {
                        await game.up(); // w
                    } else if (l === 97 || l === 65) {
                        await game.left(); // a
                    } else if (l === 115 || l === 83) {
                        await game.down(); // s
                    } else if (l === 100 || l === 68) {
                        await game.right(); // d
                    }
                } catch (e) {
                    if (e && e instanceof Forty96Error) {
                        out.write("  \x1B[36m" + e.message + "\x1B[0m\r\n\x1B[1A");
                        if (e.code !== "invalid_move") {
                            out.write("\x1B[1B\r\n");
                            stdin.end();
                            exit();
                            break;
                        }
                    } else {
                        throw e;
                    }
                }
            }
        } else {
            timeoutId = setTimeout(() => exitP.completeExceptionally(new Error("User timeout")), timeout);
            await exitP;
        }
    } catch (e) {
        // tslint:disable-next-line:no-console
        console.error("Error: ", e);
        err = e;
    }
    // out.write("\x1B[?47l\x1B8");
    // tslint:disable-next-line:no-console
    if (err && typeof console !== "undefined" && console.error) {
        // tslint:disable-next-line:no-console
        console.error("Error:", err);
    }
}

randFill(new Uint8Array(0)).then(() => main());
