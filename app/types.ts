export type ModelType = DefaultType

export type ParameterType = DefaultType

type DefaultType = {
  [key: string]: {
    unit: string;
    default: number;
    value: number;
    description: string;
    history?: { t: number, value: number }[];
    min?: number;
    max?: number;
  }
}