import SolverRK4 from "@/app/SolverRK4"
import { NamedVector, PatientInput } from "@/app/types"
import { Derivatives } from "@/app/Solver"
import { HovorkaModelODE } from "@/app/HovorkaModelODE";

export function Simulator(modelName: string, controllerName: string, d: number[], u: number[], simParams: any, patient: any): [number[], NamedVector[]] {
//export function Simulator(days: number, Gstart: number, patient: PatientInput, model:HovorkaModelODE): [number[], NamedVector[]] {

  // Initialize simulation parameters
  const timeArray = simParams.time; // Time array in minutes
  const tInit = timeArray[0]; // Initial time
  const tStep = simParams.timeStep;
  const tLength = timeArray.length; // Length of the time array
  const tEnd = timeArray[tLength - 1];

  let t = tInit; // Simulation time in minutes

  const model = new HovorkaModelODE(tInit);

  const state = model.state

  const steadyState = model.computeSteady(patient, t);

  const derivatives: Derivatives = (t: number, x: NamedVector): NamedVector => {
    return model.computeDerivatives(t, state, patient);
  }

  model.tInit = tInit;
  const solver = new SolverRK4();
  solver.reset(tStep) // Set the time step to 1 minute
  const xInit: NamedVector = { }; // Initial state vector
  const stateHistory: NamedVector[] = [];
  const glycemiaHistory: number[] = [];

  while (t <= tEnd) {
    const vector_at_t = solver.solve(derivatives, tInit, steadyState, tEnd)
    vector_at_t.glyc = model.computeOutput(vector_at_t)
    stateHistory.push(vector_at_t);
    glycemiaHistory.push(model.computeOutput(vector_at_t));
    t += 1;
  }

  console.log("Glycemia history:", glycemiaHistory);
  console.log("State history:", stateHistory);

  // Return the glycemia history and state history
  const ret_array = [glycemiaHistory, stateHistory] as [number[], NamedVector[]];

  return ret_array;
}