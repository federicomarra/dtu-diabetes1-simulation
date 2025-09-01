import {Component} from "react";
import {ModelType, NamedVector, ParameterType, PatientInput, PatientOutput} from "@/app/types";
import {Derivatives} from "@/app/Solver";

/**
 * Represents the Ordinary Differential Equation (ODE) implementation of the Hovorka model,
 * an approach commonly utilized for glucose-insulin simulation in diabetes management systems.
 * This class includes methods to manage state initialization, compute insulin infusion rates,
 * steady-state dynamics, and glucose-insulin kinetics over time.
 */
export class HovorkaModel extends Component {

  tInit: number = 0; // initial time

  state: ModelType = {
    D1: { unit: "mmol", default: 0, value: 0, description: "glucose absorption in stomach", history: [] },
    D2: { unit: "mmol", default: 0, value: 0, description: "glucose absorption in intestine", history: [] },
    S1: { unit: "mU", default: 0, value: 0, description: "insulin absorption in adipose tissue 1", history: [] },
    S2: { unit: "mU", default: 0, value: 0, description: "insulin absorption in muscle tissue 2", history: [] },
    I: { unit: "mU/l", default: 0, value: 0, description: "insulin in plasma", history: [] },
    Q1: { unit: "mmol", default: 0, value: 0, min: 0, description: "glucose in blood", history: [] },
    Q2: { unit: "mmol", default: 0, value: 0, min: 0, description: "glucose in muscles", history: [] },
    x1: { unit: "1/min", default: 0, value: 0, description: "insulin action on glucose transport", history: [] },
    x2: { unit: "1/min", default: 0, value: 0, description: "insulin action on glucose disposal", history: [] },
    x3: { unit: "1/min", default: 0, value: 0, description: "insulin action on endogenous glucose production (liver)", history: [] },
  };

  constructor(tInit: number) {
    super({});
    this.tInit = tInit;
  }

  /**
   * Computes the insulin infusion rate (IIR) based on the target blood glucose level and time.
   *
   * @param {any} patient - The patient object containing parameters for the model.
   * @returns {number} IIR - The computed insulin infusion rate.
   */
  computeIIR(patient: any): number {
    /** extractions of parameters */
    const BW = patient.BW; // body weight in kg
    const VG = patient.VG * BW; // glucose distribution volume
    const F01 = patient.F01;
    const EGP0 = patient.EGP0 * BW;
    const SI1 = patient.SI1; // insulin sensitivity of distribution/transport
    const SI2 = patient.SI2; // insulin sensitivity of disposal
    const SI3 = patient.SI3; // insulin sensitivity of EGP
    const k12 = patient.k12; // transfer rate from the non-accessible to the accessible compartment
    const VI = patient.VI; // insulin distribution volume
    const ke = patient.ke; // insulin elimination from plasma
    const AG = patient.AG; // carbohydrate (CHO) bioavailability
    const MwG = patient.MwG; // molecular weight of glucose
    const tauI = patient.tauI; // maximum insulin absorption time
    const Geq = patient.Geq;  // already in mmol/l

    /** equilibrium blood glucose levels in mmol/l */
    const Q1eq = Geq * VG * BW;
    const F01eq = F01 * BW * Math.min(Geq / 4.5, 1);

    /** equilibrium insulin levels in mU/l */
    const Ieq_a = - Q1eq * SI1 * SI2 - EGP0 * SI2 * SI3
    const Ieq_b = -F01eq * SI2 - k12 * Q1eq * SI1
                       + k12 * SI1 * Q1eq
                       + EGP0 * SI2 - EGP0 * k12 * SI3
    const Ieq_c = -F01eq * k12 + EGP0 * k12
    const Ieq_det = Ieq_b * Ieq_b - 4 * Ieq_a * Ieq_c      // det = b^2 - 4ac
    if (Ieq_det < 0) {
      console.error("Negative determinant in insulin equilibrium calculation");
      return 0;
    }
    const Ieq = (-Ieq_b - Math.sqrt(Ieq_det)) / (2 * Ieq_a)   // quadratic formula

    /** equilibrium insulin absorption in mU/min */
    const Seq = tauI * (VI * BW) * ke * Ieq

    return Seq / tauI / 1000 * 60
  }

  /**
   * Computes the steady-state of the Hovorka ODE model for a given patient profile.
   *
   * What it does:
   * - Derives the basal insulin infusion rate (IIR) needed to maintain the target glycemia Geq by
   *   calling computeIIR(patient). The IIR is interpreted in U/hour.
   * - Converts that basal infusion into steady-state subcutaneous insulin stores (S1, S2 = Seq),
   *   plasma insulin (Ieq), and insulin actions (x1eq, x2eq, x3eq).
   * - Solves the algebraic steady-state relations of the glucose subsystem to obtain Q1eq and Q2eq
   *   under the assumption of no active meal absorption (D1 = D2 = 0 at steady state).
   *
   * Inputs and units:
   * - patient: NamedVector containing at least the following fields (units in brackets)
   *   - BW [kg]                body weight
   *   - VI [L/kg]              insulin distribution volume per kg
   *   - ke [1/min]             insulin elimination from plasma
   *   - F01 [mmol/kg/min]      non–insulin-dependent glucose flux
   *   - EGP0 [mmol/kg/min]     endogenous glucose production at zero insulin
   *   - k12 [1/min]            glucose transfer rate between compartments
   *   - SI1 [1/(min·(mU/L))]   insulin sensitivity: distribution/transport
   *   - SI2 [1/(min·(mU/L))]   insulin sensitivity: disposal
   *   - SI3 [1/(mU/L)]         insulin sensitivity: EGP
   *   - tauI [min]             time-to-maximum insulin absorption
   *   - VG [L/kg]              glucose distribution volume (used indirectly via computeIIR)
   *   - Geq [mmol/L]           target/desired glycemia at equilibrium
   * - input: PatientInput (present for API symmetry). The steady-state calculation derives the
   *   basal IIR internally from patient parameters and Geq; it does not use input.iir.
   *
   * Returned state (NamedVector) and units:
   * - Q1 [mmol]  glucose in accessible (blood) compartment at steady state
   * - Q2 [mmol]  glucose in non-accessible (peripheral) compartment at steady state
   * - S1 [mU]    subcutaneous insulin compartment 1
   * - S2 [mU]    subcutaneous insulin compartment 2
   * - I  [mU/L]  plasma insulin
   * - x1 [1/min] insulin action on glucose transport
   * - x2 [1/min] insulin action on glucose disposal
   * - x3 [1/min] insulin action on endogenous glucose production
   * - D1 [mmol]  stomach glucose content (0 at steady state)
   * - D2 [mmol]  intestinal glucose content (0 at steady state)
   *
   * Assumptions and requirements:
   * - No ongoing carbohydrate absorption at steady state: D1 = D2 = 0.
   * - Positive, physiologically meaningful parameters: tauI > 0, ke > 0, VI > 0.
   * - Insulin sensitivities and rates should be non-negative. Division by SI2 (and combinations
   *   involving SI1, SI2) occurs; ensure they are not zero to avoid singularities.
   * - F01eq is capped linearly for Geq < 4.5 mmol/L and saturates above, as per the Hovorka model.
   * - computeIIR(patient) estimates the basal IIR from Geq; if a valid equilibrium for insulin
   *   cannot be found upstream, the resulting Seq/Ieq may be zero, which propagates to x1..x3.
   *
   *
   * @param patient Patient physiological parameters and model constants (see fields above).
   * @param input   PatientInput; present for signature compatibility, not used to set basal IIR.
   * @returns NamedVector containing the steady-state values for all state variables.
   */
  computeSteady(patient: NamedVector, input: PatientInput): NamedVector {    /** extractions of parameters */
    const F01 = patient.F01;  // non-insulin-dependent glucose ﬂux in mmol/kg/min
    const BW = patient.BW; // body weight in kg
    const VI = patient.VI * BW; // insulin distribution volume
    const ke = patient.ke; // insulin elimination from plasma
    const SI1 = patient.SI1; // insulin sensitivity of distribution/transport
    const SI2 = patient.SI2; // insulin sensitivity of disposal
    const SI3 = patient.SI3; // insulin sensitivity of EGP
    const EGP0 = patient.EGP0 * BW; // endogenous glucose production extrapolated to zero insulin concentration
    const k12 = patient.k12; // transfer rate from the non-accessible to the accessible compartment
    const tauI = patient.tauI; // maximum insulin absorption time

    /** equilibrium blood glucose levels in mmol/l */
    const Geq = patient.Geq
    const F01eq = F01 * BW * Math.min(Geq / 4.5, 1)
    const Seq = (input.iir || 0) * tauI * 1000 / 60
    const Ieq = Seq / (tauI * (VI * BW) * ke)
    const x1eq = SI1 * Ieq
    const x2eq = SI2 * Ieq
    const x3eq = SI3 * Ieq
    const Q2eq = -(F01eq - EGP0 * BW * (1 - x3eq)) / x2eq
    const Q1eq = patient.Geq * patient.BW * patient.VG

      return {
        Q1: Q1eq,   // glucose in blood
        Q2: Q2eq,   // glucose in muscles
        S1: Seq,    // insulin absorption in adipose tissue 1
        S2: Seq,    // insulin absorption in adipose tissue 2
        I: Ieq,     // insulin in plasma,
        x1: x1eq,   // insulin action on glucose transport
        x2: x2eq,   // insulin action on glucose disposal
        x3: x3eq,   // insulin action on endogenous glucose production (liver)
        D1: 0,      // glucose absorption in stomach
        D2: 0,      // glucose absorption in intestine
      };
  }

  computeDerivatives(t: number, state: NamedVector, patient: NamedVector, input: PatientInput): NamedVector {
    //console.log("Pre state:", state)
    /** extractions of parameters */
    const BW = patient.BW; // body weight in kg

    const AG = patient.AG;     // carbohydrate (CHO) bioavailability
    const MwG = patient.MwG;   // molecular weight of glucose
    const tauI = patient.tauI; // maximum insulin absorption time
    const VI = patient.VI * BW;
    const ke = patient.ke;
    const ka1 = patient.ka1;
    const VG = patient.VG * BW;

    const tauG = patient.tauG; // maximum glucose absorption time

    const F01 = patient.F01;   // glucose appearance rate in mmol/min
    const EGP0 = patient.EGP0 * BW; // endogenous glucose production extrapolated to zero insulin concentration

    const k12 = patient.k12; // transfer rate from the non-accessible to the accessible compartment
    const SI1 = patient.SI1; // insulin sensitivity of distribution/transport
    const SI2 = patient.SI2; // insulin sensitivity of disposal
    const SI3 = patient.SI3; // insulin sensitivity of EGP
    const ka2 = patient.ka2; // deactivation rate
    const ka3 = patient.ka3; // deactivation rate



    /** extractions of input */
    const IIR = (input.u[t] || 0) * 1000;    // insulin infusion rate in mU/min
    const D = (input.carbs[t] || 0) * (1000 / MwG) * 10000000; // carbohydrate intake in
    const G = state.Q1 / (VG);          // eq:2.3 (glucose concentration in mmol/l)
    console.log(`G(${t})=${G}`)

    /** extractions of state model nodes */
    const S1 = state.S1;
    const S2 = state.S2;
    const I = state.I;

    const D1 = state.D1;
    const D2 = state.D2;

    const x1 = state.x1;
    const x2 = state.x2;
    const x3 = state.x3;

    const Q1 = state.Q1;
    const Q2 = state.Q2;


    /** cho absorption */
    const dD1 = (AG * D) - ((1 / tauG) * D1);                             // eq:2.8a
    const dD2 = (1 / tauG) * (D1 - D2);                                   // eq:2.8b
    const UG = (1 / tauG) * D2;                                           // eq:2.9

    /** insulin absorption */
    const dS1 = IIR - ((1 / tauI) * S1);                                  // eq:2.11a
    const dS2 = (1 / tauI) * (S1 - S2);                                   // eq:2.11b
    const UI = (1 / tauI) * S2;                                           // eq:2.12
    const dI = (UI / VI) - (ke * I);                                      // eq:2.6

    /** glucose */
    const F01c = G >= 4.5 ? F01 : F01 * G / 4.5;                          // eq:2.4
    const FR = G >= 9 ? 0.003 * (G - 9) * VG : 0;                         // eq:2.5
    const dQ1 = UG - (EGP0 * (1 - x3)) + (k12 * Q2) - F01c - FR - (x1 * Q1);  // eq:2.1
    const dQ2 = x1 * Q1 - (k12 + x2) * Q2;                                // eq:2.2

    /** insulin action */
    const kb1 = SI1 * ka1;                                                // eq:2.13
    const kb2 = SI2 * ka2;                                                // eq:2.13
    const kb3 = SI3 * ka3;                                                // eq:2.13
    const dx1 = kb1 * I - ka1 * x1;                                       // eq:2.7a
    const dx2 = kb2 * I - ka2 * x2;                                       // eq:2.7b
    const dx3 = kb3 * I - ka3 * x3;                                       // eq:2.7c

    const drift: NamedVector = {
      // glucose subsystem
      Q1: dQ1,
      Q2: dQ2,

      // insulin subsystem
      S1: dS1,
      S2: dS2,
      I: dI,

      // insulin action subsystem
      x1: dx1,
      x2: dx2,
      x3: dx3,

      // cho subsystem
      D1: dD1,
      D2: dD2
    }

    //console.log("Drift vector at t=", t, ": ", drift);

    return drift

  }

  computeOutput(state: NamedVector, patient: any): number {
    /** extractions of model nodes */
    const Q1 = state.Q1;
    const BW = patient.BW; // body weight in kg
    const VG = patient.VG * BW; // glucose distribution volume

    const G = Q1 / VG; // eq:2.3 (glucose in mmol/l)

    return G
  }












  /**
   * Updates the model with the given value at the specified time.
   *
   * @param {number} t - The current time in minutes.
   * @param {string} key - The key of the model property to update.
   * @param {number} newvalue - The new value to set for the model property.
   */
  insertValueInModel(t: number, key: string, newvalue: number) {
    if (this.state[key].max && newvalue > this.state[key].max)
      newvalue = this.state[key].max;
    if (this.state[key].min && newvalue < this.state[key].min)
      newvalue = this.state[key].min;
    this.state[key].value = newvalue;

    if (this.state[key].history)
      this.state[key].history.push({t, value: newvalue});
    else
      this.state[key].history = [{t, value: newvalue}];
  }

  /**
   * Updates the model with the given delta value at the specified time.
   *
   * @param {number} t - The current time in minutes.
   * @param {string} key - The key of the model property to update.
   * @param {number} delta - The change in value to apply to the model property.
   */
  updateModel(state: any, t: number, key: string, value?: number, delta?: number) {
    let newvalue;
    if (delta) {
      newvalue = state[key].value + delta;
    } else {
      newvalue = value || 0;
    }
    if (state[key].max && newvalue > state[key].max)
      newvalue = state[key].max;
    if (state[key].min && newvalue < state[key].min)
      newvalue = state[key].min;
    state[key].value = newvalue;

    if (state[key].history || state[key].history.length > 0)
      state[key].history.push({t, value: newvalue});
    else
      state[key].history = [{t, value: newvalue}];
  }

  /*
  getParameter() {
    return parameters
  }

  getParameterValues(): { [key: string]: number } {
    return Object.keys(parameters).reduce((acc: { [key: string]: number }, key: string) => {
      acc[key] = parameters[key].value;
      return acc;
    }, {});
  }

  getIndexFromTime(t: Date): number {
    return Math.floor((t.valueOf() - this.tInit.valueOf()) / (1000 * 60));
  }

   */


  render() {
    return (
      <></>
    );
  }
}


/*
const parameters: ParameterType = {
  "EGP0": { unit: "mmol/kg/min", default: 0.0161, value: 0.0161, description: "endogenous glucose production extrapolated to zero insulin concentration" },
  "F01": { unit: "mmol/kg/min", default: 0.0097, value: 0.0097, description: "non-insulin-dependent glucose ﬂux" },
  "k12": { unit: "1/min", default: 0.0649, value: 0.0649, description: "transfer rate from the non-accessible to the accessible compartment" },
  "ka1": { unit: "1/min", default: 0.0055, value: 0.0055, description: "deactivation rate" },
  "ka2": { unit: "1/min", default: 0.0683, value: 0.0683, description: "deactivation rate" },
  "ka3": { unit: "1/min", default: 0.0304, value: 0.0304, description: "deactivation rate" },
  "SI1": { unit: "1/min/U/l", default: 51.2, value: 51.2, description: "insulin sensitivity of distribution/transport" },
  "SI2": { unit: "1/min/U/l", default: 8.2, value: 8.2, description: "insulin sensitivity of disposal" },
  "SI3": { unit: "1/U/l", default: 520, value: 520, description: "insulin sensitivity of EGP" },
  "ke": { unit: "1/min", default: 0.14, value: 0.14, description: "insulin elimination from plasma" },
  "VI": { unit: "l/kg", default: 0.12, value: 0.12, description: "insulin distribution volume" },
  "VG": { unit: "l/kg", default: 0.148, value: 0.148, description: "distribution volume of the accessible compartment" },
  "AG": { unit: "1", default: 0.7, value: 0.7, description: "carbohydrate (CHO) bioavailability" },
  "MwG": { unit: "g/mol", default: 180.1577, value: 180.1577, description: "molecular weight of glucose" },
  "BW": { unit: "kg", default: 65, value: 65, description: "body weight in kg" },
  "tauI": { unit: "min", default: 55, value: 55, description: "time-to-maximum of absorption of subcutaneously injected short-acting insulin"},
  "tauG": { unit: "min", default: 40, value: 40, description: "time-to-maximum of CHO absorption"},
}

 */