
export function randFill(arr: Uint8Array): Promise<Uint8Array> {
    if (typeof crypto === "object") {
        return Promise.resolve(crypto.getRandomValues(arr) as Uint8Array);
    }
    return import("crypto").then((crypto) => {
        return new Promise<Uint8Array>((res, rej) =>
            crypto.randomFill(arr, (err, buff) =>
                err ? rej(err) : res(buff)));
    });
}
