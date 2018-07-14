import { Board } from "./board";

export type TileId = number;

export class Tile {
    public constructor(
        public readonly board: Board,
        public readonly id: TileId,
        public readonly x: number,
        public readonly y: number,
    ) {}
}
