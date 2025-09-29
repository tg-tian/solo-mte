export interface IPosition {
    line: number;
    column: number;
    index: number;
}

export interface ILocation {
    start: IPosition;
    end: IPosition;
}

export interface IItemLocation {
    value: string;
    location: ILocation;
}
