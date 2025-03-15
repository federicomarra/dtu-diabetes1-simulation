import {Component} from "react";
import {ModelType, ParameterType} from "@/app/types";

export class HovorkaModel extends Component {

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
  }

  /**
   * Updates the model with the given delta value at the specified time.
   *
   * @param {number} t - The current time in minutes.
   * @param {string} key - The key of the model property to update.
   * @param {number} delta - The change in value to apply to the model property.
   */
  updateModel(t: number, key: string, delta: number) {
    let newvalue = this.state[key].value + delta;
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
   * Computes the glucose uptake (UG) based on the given parameters.
   *
   * @param time - Time in minutes.
   * @param {number} d - Amount of carbohydrate intake in grams.
   * @param {number} [tauD=1] - Time constant for glucose absorption in minutes.
   * @returns {number} UG - The computed glucose uptake.
   */
  choAbsorption(time: number, d: number, tauD: number = 1): number {
    /** extractions of parameters */
    const p = this.getParameter();
    const AG = p.AG.value;
    const MwG = p.MwG.value;

    /** extractions of model nodes */
    const D1 = this.state.D1.value;
    const D2 = this.state.D2.value;

    /** calculations */
    const D = (1000 / MwG) * d;
    const dD1 = (AG * D) - ((1 / tauD) * D1);
    const dD2 = (1 / tauD) * (D1 - D2);
    const UG = (1 / tauD) * D2;

    /** update model nodes */
    this.updateModel(time, "D1", dD1);
    this.updateModel(time, "D2", dD2);

    return UG;
  }

  /**
   * Computes the insulin absorption based on the given parameters.
   *
   * @param {number} t - The current time in minutes.
   * @param {number} u - The insulin infusion rate.
   * @param {number} [tauS=1] - The time constant for insulin absorption.
   * @returns {number} UI - The computed insulin absorption (UI).
   */
  insulinAbsorption(t: number, u: number, tauS: number = 1): number {
    /** extractions of model nodes */
    const S1 = this.state.S1.value;
    const S2 = this.state.S2.value;

    /** calculations */
    const dS1 = u - ((1 / tauS) * S1);
    const dS2 = (1 / tauS) * (S1 - S2);
    const UI = (1 / tauS) * S2;

    /** update model nodes */
    this.updateModel(t, "S1", dS1);
    this.updateModel(t, "S2", dS2);

    return UI;
  }

  glucoseRegulatorySystem(t: number, G: number, UG: number, UI: number): number{
    /** extractions of parameters */
    const p = this.getParameter();
    const VI = p.VI.value;
    const ke = p.ke.value;
    const EGP0 = p.EGP0.value;
    const F01 = p.F01.value;
    const k12 = p.k12.value;
    const ka1 = p.ka1.value;
    const ka2 = p.ka2.value;
    const ka3 = p.ka3.value;
    const SI1 = p.SI1.value;
    const SI2 = p.SI2.value;
    const SI3 = p.SI3.value;
    const VG = p.VG.value;

    /** extractions of model nodes */
    const I = this.state.I.value;
    const Q1 = this.state.Q1.value;
    const Q2 = this.state.Q2.value;
    const x1 = this.state.x1.value;
    const x2 = this.state.x2.value;
    const x3 = this.state.x3.value;

    /** calculations */

    /** glucose */
    const F01c = G >= 4.5 ? F01 : F01 / 4.5;
    const FR = G >= 9 ? 0.003 * (G - 9) * VG : 0;
    const dQ1 = UG + EGP0 * (1 - x3) + k12 * Q2 - F01c - FR  - (x1 * Q1);
    const dQ2 = x1 * Q1 - (k12 + x2) * Q2;

    /** insulin action */
    const kb1 = ka1 * SI1;
    const kb2 = ka2 * SI2;
    const kb3 = ka3 * SI3;
    const dx1 = kb1 * I - ka1 * x1;
    const dx2 = kb2 * I - ka2 * x2;
    const dx3 = kb3 * I - ka3 * x3;

    /** insulin in the plasma */
    const dI = (UI / VI) - (ke * I);

    /** update model nodes */
    this.updateModel(t, "I", dI);
    this.updateModel(t, "Q1", dQ1);
    this.updateModel(t, "Q2", dQ2);
    this.updateModel(t, "x1", dx1);
    this.updateModel(t, "x2", dx2);
    this.updateModel(t, "x3", dx3);

    const newG: number = Q1 / VG

    return newG;
  }

  getParameter() {
    return parameters
  }



  render() {
    return (
      <></>
    );
  }
}

const parameters: ParameterType = {
  "EGP0": { unit: "mmol/kg/min", default: 0.0161, value: 0.0161, description: "endogenous glucose production extrapolated to zero insulin concentration" },
  "F01": { unit: "mmol/kg/min", default: 0.0097, value: 0.0097, description: "non-insulin-dependent glucose ﬂux" },
  "k12": { unit: "1/min", default: 0.066, value: 0.066, description: "transfer rate from the non-accessible to the accessible compartment" },
  "ka1": { unit: "1/min", default: 0.006, value: 0.006, description: "deactivation rate" },
  "ka2": { unit: "1/min", default: 0.06, value: 0.06, description: "deactivation rate" },
  "ka3": { unit: "1/min", default: 0.03, value: 0.03, description: "deactivation rate" },
  "SI1": { unit: "1/min/mU/l", default: 51.2e-4, value: 51.2e-4, description: "insulin sensitivity of distribution/transport" },
  "SI2": { unit: "1/min/mU/l", default: 8.2e-4, value: 8.2e-4, description: "insulin sensitivity of disposal" },
  "SI3": { unit: "1/mU/l", default: 520e-4, value: 520e-4, description: "insulin sensitivity of EGP" },
  "ke": { unit: "1/min", default: 0.138, value: 0.138, description: "insulin elimination from plasma" },
  "VI": { unit: "l/kg", default: 0.12, value: 0.12, description: "insulin distribution volume" },
  "VG": { unit: "l/kg", default: 0.16, value: 0.16, description: "distribution volume of the accessible compartment" },
  "AG": { unit: "1", default: 0.8, value: 0.8, description: "carbohydrate (CHO) bioavailability" },
  "MwG": { unit: "g/mol", default: 180.1577, value: 180.1577, description: "molecular weight of glucose" },
  "BW": { unit: "kg", default: 75, value: 75, description: "body weight in kg" },
}