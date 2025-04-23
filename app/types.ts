export type ModelType = DefaultType

export type ParameterType = DefaultType

export type PatientInput = {
  carbs?: number;
  hir?: number;
  iir?: number;
  exercise?: number;
  meal?: number;
}

export type PatientOutput = {
  Gp: number;
  Gt?: number;
}

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