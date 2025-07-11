import { NamedVector } from '@/app/types'

export type Derivatives = (t: Date, x: NamedVector) => NamedVector

export default interface Solver {

  /**
   * Resets solver.
   *
   * @param {number} defaultTimeStep - Typical/initial time step.
   */
  reset(defaultTimeStep: number): void

  /**
   * Proceeds simulation by given time step.
   *
   * @param {function} derivatives - Function that returns dx/dt (in 1/min)
   * @param {Date} tInit - Initial time
   * @param {NamedVector} xInit - Initial state vector
   * @param {Date} tFinal - Final time
   * @returns
   */
  solve(
    derivatives: Derivatives,
    tInit: Date,
    xInit: NamedVector,
    tFinal: Date
  ): NamedVector

}
