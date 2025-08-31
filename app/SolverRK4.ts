import { NamedVector, timesScalar, vectorSum } from '@/app/types'
import Solver, { Derivatives } from '@/app/Solver'

const MS_PER_MIN = 60e3

export default class SolverRK4 implements Solver {
    /** fixed time step in minutes */
    protected _timeStep = 1

    reset(defaultTimeStep: number) {
        this._timeStep = defaultTimeStep
    }

    solve(derivatives: Derivatives, tInit: number, xInit: NamedVector, tEnd: number): NamedVector {
        let t = tInit
        let dt = 1
        let x = xInit
        while (t < tEnd) {
            const tNext = Math.min(t + dt * MS_PER_MIN, tEnd)
            x = this.performTimeStep(derivatives, t, x, (tNext - t) / MS_PER_MIN)
            t = tNext
        }
        return x
    }

    /**
     * Performs single time step.
     *
     * @param {function} derivatives - Function that returns dx/dt
     * @param {Date} t - Initial time as number.
     * @param {NamedVector} x - Initial state.
     * @param {number} dt - Time step in minutes.
     */
    performTimeStep(derivatives: Derivatives, t: number, x: NamedVector, dt: number): NamedVector {
        const k1 = timesScalar(derivatives(t, x), dt)
        const k2 = timesScalar(derivatives(t + dt * MS_PER_MIN / 2, vectorSum(x, timesScalar(k1, 1 / 2))), dt)
        const k3 = timesScalar(derivatives(t + dt * MS_PER_MIN / 2, vectorSum(x, timesScalar(k2, 1 / 2))), dt)
        const k4 = timesScalar(derivatives(t + dt * MS_PER_MIN, vectorSum(x, k3)), dt)

        return vectorSum(x,
          timesScalar(k1, 1 / 6),
          timesScalar(k2, 1 / 3),
          timesScalar(k3, 1 / 3),
          timesScalar(k4, 1 / 6)
        )
    }
}
