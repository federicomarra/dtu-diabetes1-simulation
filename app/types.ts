import {number} from "prop-types";

export type ModelType = DefaultType

export type ParameterType = DefaultType

export type PatientInput = {
  carbs: number[];  // grams of carbohydrates' intake
  basal: number[]; // basal insulin rate
  u: number[];      // insulin units input
  d: number[];      // grams of carbohydrate disturbance
  hir?: number;       // insulin-to-carbohydrate ratio
  iir?: number;       // insulin-to-insulin ratio
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


export type Vector = number[]

export type Matrix = number[][]

export type NamedVector = {
  [id in string]: number
}

/**
 * Computes the element-wise sum of named vectors
 *
 * @param {NamedVector[]} X - Array of vectors
 * @returns {NamedVector} Vector carrying sum of entries.
 */

export function vectorSum(...X: NamedVector[]): NamedVector {
  return X.reduce((a, b) => {
    for (const k in b) {
      if (b.hasOwnProperty(k))
        a[k] = (a[k] || 0) + b[k]
    }
    return a
  }, {})
}

/**
 * Multiplies each element of a named vector by a scalar.
 *
 * @param {NamedVector} X - Original vector.
 * @param {number} a - Scalar gain.
 * @returns {NamedVector} Product a*X.
 */
export function timesScalar(X: NamedVector, a: number): NamedVector {
  return Object.keys(X).reduce(function (result: NamedVector, key: string): NamedVector {
    result[key] = X[key] * a
    return result
  }, {})
}

