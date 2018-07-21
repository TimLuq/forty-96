import { Board } from "./board";

export type TileId = number;
export type TileCreation = null | TileId | [TileId, TileId];

export class Tile {
    /** if read in a tile observer this field contains how the field was created */
    public creation?: TileCreation;
    public constructor(
        public readonly board: Board,
        public readonly id: TileId,
        public readonly x: number,
        public readonly y: number,
    ) {}

    public get value() {
        return this.board.getTileValue(this.id);
    }
}
