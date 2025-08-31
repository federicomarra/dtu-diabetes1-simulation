import SolverRK4 from "@/app/SolverRK4"
import { ModelType, NamedVector, PatientInput, vectorSum } from "@/app/types"
import { Derivatives } from "@/app/Solver"
import { HovorkaModel } from "@/app/HovorkaModel";
import { Controller } from "@/app/Controller";

export function Simulator(modelName: string, carbs: number[], basal: number[], simParams: any, patient: any): [number[], number[], NamedVector[]] {

  // Initialize simulation parameters
  const timeArray = simParams.time; // Time array in minutes
  const tInit = timeArray[0]; // Initial time
  const tStep = simParams.timeStep;
  const tLength = timeArray.length; // Length of the time array
  const tEnd = timeArray[tLength - 1];

  let t = tInit; // Simulation time in minutes

  if(modelName !== "Hovorka") {
    console.error("Model", modelName, "not supported");
  }

  const model = new HovorkaModel(tInit);

  let input: PatientInput = {
    carbs: carbs, // Carbohydrate intake in grams
    basal: basal, // Basal insulin rate in U/min
    u: new Array(basal.length).fill(0),   // Insulin input intake after control, but initialized to zeros
    d: new Array(basal.length).fill(0),   // Disturbance carbohydrate intake after control, but initialized to zeros
    hir: 0.1, // Insulin-to-carbohydrate ratio
    iir: 1, // Insulin-to-insulin ratio
  }

  model.tInit = tInit;
  const solver = new SolverRK4();
  solver.reset(tStep) // Set the time step to 1 minute

  const steadyState: NamedVector = model.computeSteady(patient, input);

  const xInit: NamedVector = steadyState;

  let x_t: NamedVector = steadyState;

  let d_t: number = 0;

  const stateHistory: NamedVector[] = [];
  const outputHistory: number[] = [];
  const inputHistory: number[] = [];

  while (t <= tEnd) {
    // Control computation
    const u_t = Controller(simParams.controller.name, simParams.controller.params, tStep, patient.Geq, outputHistory, input.basal[t]);
    input.u[t] = u_t;
    //console.log(`u(${t})=${u_t}`)

    // Disturbance computation
    const disturbanceD: number = 0; // cause it is an ODE and not SDE solver
    const carbs_t = input.carbs[t] || 0;
    d_t = Math.max(simParams.disturbance.min, Math.min(simParams.disturbance.max, disturbanceD + carbs_t));
    input.d[t] = d_t;
    //console.log(`d(${t})=${d_t}`)

    // State computation
    const derivatives: Derivatives = (t: number, x: NamedVector): NamedVector => {
      return model.computeDerivatives(t, x, patient, input);
    }
    x_t = solver.solve(derivatives, tInit, xInit, t);

    // Output computation
    const y_t: number = model.computeOutput(x_t, patient);

    // History saving
    stateHistory.push(x_t);
    outputHistory.push(y_t);
    inputHistory.push(u_t);

    // Prepare for the next iteration
    t += 1;
  }

  console.log("Output history:", outputHistory);
  console.log("Input insulin history:", inputHistory);
  console.log("State history:", stateHistory);

  // Return the glycemia history and state history
  const ret_array = [outputHistory, inputHistory, stateHistory] as [number[], number[], NamedVector[]];

  return ret_array;
}