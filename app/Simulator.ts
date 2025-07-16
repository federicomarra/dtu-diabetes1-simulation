import SolverRK4 from "@/app/SolverRK4"
import {ModelType, NamedVector, PatientInput} from "@/app/types"
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

  const input: PatientInput = {
    carbs: d, // Carbohydrate intake in grams
    basal: u, // Basal insulin rate in U/min
    hir: 0.1, // Insulin-to-carbohydrate ratio
    iir: 1, // Insulin-to-insulin ratio
  }

  const steadyState = model.computeSteady(patient, input);

  const derivatives: Derivatives = (t: number, x: NamedVector): NamedVector => {
    return model.computeDerivatives(t, steadyState, patient, input);
  }

  model.tInit = tInit;
  const solver = new SolverRK4();
  solver.reset(tStep) // Set the time step to 1 minute
  const xInit: NamedVector = { }; // Initial state vector
  const stateHistory: NamedVector[] = [];
  const glycemiaHistory: number[] = [];

  while (t <= tEnd) {
    let vector_at_t: NamedVector = solver.solve(derivatives, tInit, xInit, tEnd)
    const glyc_at_t: number= model.computeOutput(vector_at_t, patient)
    vector_at_t.glyc = glyc_at_t; // Add glycemia to the state vector IS THIS NEEDED?
    stateHistory.push(vector_at_t);
    glycemiaHistory.push(glyc_at_t);
    t += 1;
  }

  console.log("Glycemia history:", glycemiaHistory);
  console.log("State history:", stateHistory);

  // Return the glycemia history and state history
  const ret_array = [glycemiaHistory, stateHistory] as [number[], NamedVector[]];

  return ret_array;
}