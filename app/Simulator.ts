import SolverRK4 from "@/app/SolverRK4"
import { NamedVector, PatientInput } from "@/app/types"
import { Derivatives } from "@/app/Solver"
import {HovorkaModelODE} from "@/app/HovorkaModelODE";

export function Simulator(days: number, Gstart: number, patient: PatientInput, model:HovorkaModelODE): [number[], NamedVector[]] {

  let t = 0;
  const timeStep = 1;

  const state = model.state

  const steadyState = model.computeSteady(patient, t);

  const derivatives: Derivatives = (t: Date, x: NamedVector): NamedVector => {
    return model.computeDerivatives(t, state, patient);
  }

  const tInit = new Date();
  model.tInit = tInit;
  const tFinal = new Date(tInit.valueOf() + days * 24 * 60 * 60 * 1000);
  const solver = new SolverRK4();
  solver.reset(timeStep) // Set the time step to 1 minute
  const xInit: NamedVector = { glyc: Gstart }; // Initial state vector
  const stateHistory: NamedVector[] = [];
  const glycemiaHistory: number[] = [];


  const tmax: number = Math.floor((tFinal.valueOf() - tInit.valueOf()) / (1000 * 60))

  while (t <= tmax) {
    const vector_at_t = solver.solve(derivatives, tInit, steadyState, tFinal)
    vector_at_t.glyc = model.computeOutput(vector_at_t)
    stateHistory.push(vector_at_t);
    glycemiaHistory.push(model.computeOutput(vector_at_t));
    t += timeStep;
  }

  // Return the glycemia history and state history
  const ret_arrayay = [glycemiaHistory, stateHistory] as [number[], NamedVector[]];

  return ret_arrayay;
}