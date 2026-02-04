import {NamedVector, PatientInput, timesScalar, vectorSum} from "@/app/types"
import { Solver, Derivatives } from "@/app/Solver"
import { HovorkaModel } from "@/app/HovorkaModel";
import { Controller } from "@/app/Controller";

export function Simulator(modelName: string, solverName: string, carbs: number[], basal: number[], simParams: any, patient: any): [number[], number[], number[], NamedVector[]] {

  // Initialize simulation parameters
  const timeArray = simParams.time; // Time array in minutes
  const tInit = timeArray[0]; // Initial time
  const tStep = simParams.timeStep;
  const tLength = timeArray.length; // Length of the time array

  const tEnd = timeArray[tLength - 1];
  //const tEnd =  15; // TODO: REMOVE

  let t = tInit; // Simulation time in minutes

  if(modelName !== "Hovorka") {
    console.error("Model", modelName, "not supported");
  }

  const model = new HovorkaModel(tInit);

  let inputAndDist: PatientInput = {
    carbs: carbs, // Carbohydrate intake in grams
    basal: basal, // Basal insulin rate in U/min
    hir: 0.1, // Insulin-to-carbohydrate ratio
    iir: 1, // Insulin-to-insulin ratio
    ir: 2   // U *
  }

  model.tInit = tInit;
  const solver = new Solver();
  solver.reset(tStep) // Set the time step to 1 minute

  //const steadyState: NamedVector = model.computeSteady(patient, inputAndDist);

  const basalInit = basal[0] * 1000 / 60; // [mU/min] Initial insulin rate
  let us = basalInit || 1050; // [mU] Initial insulin rate

  //let us = model.computeIIR(patient); // [mU] Initial insulin rate

  let gStart = 0;
  let steadyState: NamedVector = {} as NamedVector;

  /*
  while (us < basalInit * 1.5 && us > basalInit * 0.5) {
    steadyState = model.computeInitialStateFromInsulin(us, patient);
    gStart = model.computeOutput(steadyState, patient);
    console.log("Geq:", gStart, "mmol/L", "us:", us, "mU");
    if (Math.abs(patient.Geq - gStart) < 1.3) {
      break;
    } else if (gStart > patient.Geq) {
      us -= 50
    } else if (gStart < patient.Geq) {
      us += 50
    }
  }

   */

  for (let i = 0; i < 1; i++) { // Iterate to find a stable starting point
    steadyState = model.computeInitialStateFromInsulin(us, patient);
    gStart = model.computeOutput(steadyState, patient);
    console.table(steadyState);
    console.log("Glicemia calcolata:", gStart, "mmol/L\n", "us:", us, "mU");
    if (3.9 < gStart && gStart < 7.8) {
      break;
    }
    //us = us * (patient.Geq / gStart > 1 ? 1.1 : 0.9); // Adjust insulin rate based on glucose difference
  }
  //steadyState = model.computeInitialStateFromInsulin(us, patient);

  //console.log("Geq:", gStart, "mmol/L", "us:", us, "mU");

  //return [[], [], [], []] as [number[], number[], number[], NamedVector[]];


  let x_t: NamedVector = steadyState;

  let d_t: number = 1;

  const stateHistory: NamedVector[] = [x_t];
  const outputHistory: number[] = [model.computeOutput(x_t, patient)];
  const inputHistory: number[] = [];
  const disturbanceHistory: number[] = [];

  const NO_CONTROL = false;   // TODO: REMOVE
  while (t < tEnd) {
    // Control computation
    let u_t = Controller(simParams.controller.name, simParams.controller.params, tStep, patient.Geq, outputHistory, inputAndDist.basal[t]);
    //u_t = u_t / 1000 //* tStep; // Convert U/min to mU/min
    if(NO_CONTROL) u_t = 0;  // TODO: REMOVE
    console.log(`u(${t})=${u_t}`)

    // Disturbance computation
    const disturbanceD: number = 0; // because it is an ODE and not an SDE solver
    const carbs_t = inputAndDist.carbs[t] || 0;
    d_t = Math.max(simParams.disturbance.min, Math.min(simParams.disturbance.max, disturbanceD + carbs_t));
    console.log(`d(${t})=${d_t}`)

    // State computation
    if (solverName === "Euler") {
      const dx_t = model.computeDerivatives(t, x_t, u_t / tStep, d_t / tStep, patient);
      console.log(`dx(${t})=${dx_t}`);
      x_t = vectorSum(x_t, timesScalar(dx_t, tStep));

    } else if (solverName === "Runge–Kutta") {
      const derivatives: Derivatives = (t: number, x: NamedVector): NamedVector => {
        return model.computeDerivatives(t, x_t, u_t / tStep, d_t / tStep, patient);
      }
      x_t = solver.solve(derivatives, tInit, steadyState, t);
    }
    console.log(`x(${t})=`, x_t);

    // Output computation
    const y_t: number = model.computeOutput(x_t, patient);

    // History saving
    stateHistory.push(x_t);
    outputHistory.push(y_t);
    inputHistory.push(u_t);
    disturbanceHistory.push(d_t);

    // Prepare for the next iteration
    t += 1;
  }

  console.log("Output history:", outputHistory);
  console.log("Input insulin history:", inputHistory);
  console.log("Disturbance carbohydrates history:", disturbanceHistory);
  console.log("State history:", stateHistory);

  console.table(stateHistory)

  // Return the glycemia history and state history
  const ret_array = [outputHistory, inputHistory, disturbanceHistory, stateHistory] as [number[], number[], number[], NamedVector[]];

  return ret_array;
}