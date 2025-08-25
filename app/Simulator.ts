import SolverRK4 from "@/app/SolverRK4"
import { ModelType, NamedVector, PatientInput, vectorSum } from "@/app/types"
import { Derivatives } from "@/app/Solver"
import { HovorkaModelODE } from "@/app/HovorkaModelODE";
import { Controller } from "@/Controller";

export function Simulator(modelName: string, controllerName: string, meals: number[], basal: number[], simParams: any, patient: any, startGlyc: number): [number[], number[], NamedVector[]] {
//export function Simulator(days: number, Gstart: number, patient: PatientInput, model:HovorkaModelODE): [number[], NamedVector[]] {

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

  const model = new HovorkaModelODE(tInit);

  let input: PatientInput = {
    carbs: meals, // Carbohydrate intake in grams
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

  let u_t: number = 0;
  let d_t: number = 0;

  const stateHistory: NamedVector[] = [];
  const outputHistory: number[] = [];
  const inputHistory: number[] = [];

  while (t <= tEnd) {
    // Control computation
    const controlU = Controller(simParams.controller.name, simParams.controller.params, tStep, patient.Geq-3, outputHistory);
    const basal_t = input.basal ? input.basal[t] : 0;
    console.log(`basal(${t})=${basal_t}, controlU=${controlU}`)
    //u_t = Math.max(simParams.controller.params.min, Math.min(simParams.controller.params.max, controlU + basal_t));
    u_t = Math.max(simParams.controller.params.min, controlU + basal_t);
    input.u[t] = u_t;
    console.log(`u(${t})=${u_t}`)

    // Disturbance computation
    const disturbanceD = simParams.disturbance.params;
    const carbs_t = input.carbs[t] || 0;
    d_t = Math.max(simParams.disturbance.min, Math.min(simParams.disturbance.max, disturbanceD + carbs_t));
    input.d[t] = d_t;

    // State computation
    const derivatives: Derivatives = (t: number, x: NamedVector): NamedVector => {
      return model.computeDerivatives(t, x, patient, input);
    }
    x_t = solver.solve(derivatives, tInit, xInit, t);

    // Output computation
    const y_t: number= model.computeOutput(x_t, patient);

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