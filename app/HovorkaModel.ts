import { NamedVector, PatientInput } from "@/app/types";
/**
 * Represents the Ordinary Differential Equation (ODE) implementation of the Hovorka model,
 * an approach commonly used for glucose-insulin simulation in diabetes management systems.
 * This class includes methods to manage state initialization, compute insulin infusion rates,
 * steady-state dynamics, and glucose-insulin kinetics over time.
 */
export class HovorkaModel {

  tInit: number = 0; // initial time

  constructor(tInit: number) {
    this.tInit = tInit;
  }

  /**
   * Computes the insulin infusion rate (IIR) based on the target blood glucose level and time.
   *
   * @param {any} patient - The patient object containing parameters for the model.
   * @returns {number} IIR - The computed insulin infusion rate.
   */
  computeIIR(patient: NamedVector): number {
    const BW = patient.BW;      // [kg] body weight
    const VG = patient.VG;      // [L/kg] glucose distribution volume
    const F01 = patient.F01;    // [mmol/kg/min] non-insulin-dependent glucose flux
    const EGP0 = patient.EGP0;  // [mmol/kg/min] endogenous glucose production extrapolated to zero insulin concentration
    const SI1 = patient.SI1;    // [1/min*(mU/L)] insulin sensitivity of distribution/transport
    const SI2 = patient.SI2;    // [1/min*(mU/L)] insulin sensitivity of disposal
    const SI3 = patient.SI3;    // [L/mU] insulin sensitivity of EGP
    const k12 = patient.k12;    // [1/min] transfer rate from non-accessible to accessible compartment
    const VI = patient.VI;      // [L] insulin distribution volume
    const ke = patient.ke;      // [1/min] insulin elimination from plasma
    const tauI = patient.tauI;  // [min] maximum insulin absorption time
    const Geq = patient.Geq;    // [mmol/L] target blood glucose

    console.log("IIR parameters:")
    console.table(patient)

    /** [mmol/L] equilibrium blood glucose levels */
    const Q1eq = Geq * VG * BW;                           // [mmol] = [mmol/L] * [L/kg] * [kg]
    const F01eq = F01 * BW * Math.min(Geq / 4.5, 1);      // [mmol/min] = [mmol/kg/min] * [kg] * 1

    /** [mU/L] equilibrium insulin levels */
    const Ieq_a = -Q1eq * SI1 * SI2 - EGP0 * SI2 * SI3    // [] = -[mmol] * [1/min] * [1/min] * [1] = -[mmol] * [1/min] * [1] = -[mmol]
    const Ieq_b = -F01eq * SI2 - k12 * Q1eq * SI1
      + k12 * SI1 * Q1eq
      + EGP0 * SI2 - EGP0 * k12 * SI3
    const Ieq_c = -F01eq * k12 + EGP0 * k12
    const Ieq_det = Ieq_b * Ieq_b - 4 * Ieq_a * Ieq_c      // det = b^2 - 4ac
    if (Ieq_det < 0) {
      console.error("Negative determinant in insulin equilibrium calculation:", Ieq_det);
      return 0;
    }
    const Ieq = (-Ieq_b - Math.sqrt(Ieq_det)) / (2 * Ieq_a)   // quadratic formula

    /** [mU/min] equilibrium insulin absorption */
    const Seq = tauI * (VI * BW) * ke * Ieq

    return Seq / tauI / 1000 * 60   // [mU/min] = [mU/min] * [1/min] = [mU/min] * [min] = [mU/min]
  }

  /**
   * Computes the steady-state of the Hovorka ODE model for a given patient profile.
   *
   * What it does:
   * - Derives the basal insulin infusion rate (IIR) needed to maintain the target glycemia Geq by
   *   calling computeIIR(patient). The IIR is interpreted in U/hour.
   * - Converts that basal infusion into steady-state subcutaneous insulin stores (S1, S2 = Seq),
   *   plasma insulin (Ieq), and insulin actions (x1eq, x2eq, x3eq).
   * - Solves the algebraic steady-state relations of the glucose subsystem to get Q1eq and Q2eq
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
   * - No ongoing carbohydrate absorption at the steady state: D1 = D2 = 0.
   * - Positive, physiologically meaningful parameters: tauI > 0, ke > 0, VI > 0.
   * - Insulin sensitivities and rates should be non-negative. Division by SI2 (and combinations
   *   involving SI1, SI2) occurs; ensure they are not zero to avoid singularities.
   * - F01eq is capped linearly for Geq < 4.5 mmol/L and saturates above, as per the Hovorka model.
   * - computeIIR(patient) estimates the basal IIR from Geq; if a valid equilibrium for insulin
   *   cannot be found upstream, the resulting Seq/Ieq may be zero, which propagates to x1, x2, and x3.
   *
   *
   * @param patientParameters Patient physiological parameters and model constants (see fields above).
   * @param patientInput   PatientInput; present for signature compatibility, not used to set basal IIR.
   * @returns NamedVector containing the steady-state values for all state variables.
   */
  computeSteady(patientParameters: NamedVector, patientInput: PatientInput): NamedVector {
    /** EXTRACTIONS OF PARAMETERS */
    const EGP0 = patientParameters.EGP0;  // [mmol/kg/min]  endogenous glucose production extrapolated to zero insulin concentration
    const F01 = patientParameters.F01;    // [mmol/kg/min]  non-insulin-dependent glucose ﬂux
    const BW = patientParameters.BW;      // [kg]           body weight
    const VI = patientParameters.VI;      // [L/kg]         insulin distribution volume
    const ke = patientParameters.ke;      // [1/min]        insulin elimination from plasma
    const k12 = patientParameters.k12;    // [1/min]        transfer rate from the non-accessible to the accessible compartment
    const SI1 = patientParameters.SI1;    // [1/min*(mU/L)] insulin sensitivity of distribution/transport
    const SI2 = patientParameters.SI2;    // [1/min*(mU/L)] insulin sensitivity of disposal
    const SI3 = patientParameters.SI3;    // [L/mU]         insulin sensitivity of EGP
    const tauI = patientParameters.tauI;  // [min]          maximum insulin absorption time
    const Geq = patientParameters.Geq;    // [mmol/L]       target blood glucose

    const IIR = this.computeIIR(patientParameters)                // [U/hour]
    console.log(`IIR=${IIR}`)

    /** EQUILIBRIUM BLOOD GLUCOSE LEVELS IN MMOL/L */
    const F01eq = F01 * BW * Math.min(Geq / 4.5, 1)               // [mmol/min] = [mmol/kg/min] * [kg] * 1
    const Seq = (IIR || 0) * tauI * 1000 / 60;                    // [mU/min] = [U/hour] * [min/hour] * [1000/min] * [60/min]
    const Ieq = Seq / (tauI * (VI * BW) * ke);                    // [mU/L] = [mU/min] * [1/min] * [kg/L] * [1/kg] * [min]
    const x1eq = SI1 * Ieq                                        // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x2eq = SI2 * Ieq                                        // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x3eq = SI3 * Ieq                                        // [1] = [L/mU] * [mU/L]
    const Q2eq = Math.max( -(F01eq - EGP0 * BW * (1 - x3eq)) / x2eq, 0) // [mmol] = ([mmol/min] + [mmol/kg/min] * [kg] * [1]) * [min] = [mmol/min] * [min] = [mmol]
    const Q1eq = Math.max(Q2eq / x1eq * (k12 + x2eq), 0)                // [mmol] = [mmol] * [min] * [1/min]

      return {
        Q1: Q1eq,   // [mmol] glucose in blood
        Q2: Q2eq,   // [mmol] glucose in muscles
        S1: Seq,    // [mU] insulin absorption in first adipose tissue
        S2: Seq,    // [mU] insulin absorption in second adipose tissue
        I: Ieq,     // [mU/L] insulin in plasma,
        x1: x1eq,   // [1/min] insulin action on glucose transport
        x2: x2eq,   // [1/min] insulin action on glucose disposal
        x3: x3eq,   // [1] insulin action on endogenous glucose production (liver)
        D1: 0,      // [mmol] glucose absorption in the stomach
        D2: 0,      // [mmol] glucose absorption in the intestine
      };
  }



  computeInitialState(targetGlycemia: number, P: NamedVector): NamedVector {
    /** EXTRACTIONS OF PARAMETERS */
    const EGP0 = P.EGP0;  // [mmol/kg/min]  endogenous glucose production extrapolated to zero insulin concentration
    const F01 = P.F01;    // [mmol/kg/min]  non-insulin-dependent glucose ﬂux
    const BW = P.BW;      // [kg]           body weight
    const VI = P.VI;      // [L/kg]         insulin distribution volume
    const VG = P.VG;      // [L/kg]         glucose distribution volume
    const ke = P.ke;      // [1/min]        insulin elimination from plasma
    const k12 = P.k12;    // [1/min]        transfer rate from the non-accessible to the accessible compartment
    const SI1 = P.SI1;    // [1/min*(mU/L)] insulin sensitivity of distribution/transport
    const SI2 = P.SI2;    // [1/min*(mU/L)] insulin sensitivity of disposal
    const SI3 = P.SI3;    // [L/mU]         insulin sensitivity of EGP
    const tauI = P.tauI;  // [min]          maximum insulin absorption time

    const Q1eq = targetGlycemia * BW * VG;  // [mmol] = [mmol/L] * [kg] * [kg/L]

    const F01c = (G: number) => (G >= 4.5 ? F01 * BW : F01 * BW * G / 4.5);
    const FR = (G: number) => (G >= 9 ? 0.003 * (G - 9) * BW * VG : 0);

    const residual = (u_mUmin: number) => {
      const I = u_mUmin / (BW * VI * ke);     // [mU/L] = [mU/min] * [kg/L] * [1/kg] * [min]
      const x1 = SI1 * I;                     // [1/min] = [1/min] * [L/mU] * [mU/L]
      const x2 = SI2 * I;                     // [1/min] = [1/min] * [L/mU] * [mU/L]
      const x3 = SI3 * I;                     // [1] = [L/mU] * [mU/L]
      const Q2 = (x1 / (k12 + x2)) * Q1eq;      // [mmol] = [min] * [1/min] * [mmol]
      return -F01c(targetGlycemia) - FR(targetGlycemia) - x1 * Q1eq + P.k12 * Q2 + P.EGP0 * P.BW * (1 - x3);
    };

    // bisection on u in [0, 300] mU/min
    let lower = 0;
    let upper = 300;
    let res_lower = residual(lower);
    let res_upper = residual(upper);
    if (res_lower * res_upper > 0) {
      console.error("Initial state not found");
      return {Q1: 0, Q2: 0, S1: 0, S2: 0, I: 0, x1: 0, x2: 0, x3: 0, D1: 0, D2: 0};
    }
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lower + upper)
      const res_mid = residual(mid);
      if (res_lower * res_mid <= 0) {
        upper = mid;
        res_upper = res_mid;
      } else {
        lower = mid;
        res_lower = res_mid;
      }
    }

    const u = 0.5 * (lower + upper);

    const Ieq = u / (BW * VI * ke);             // [mU/L] = [mU/min] * [kg/L] * [1/kg] * [min]
    const x1eq = SI1 * Ieq                      // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x2eq = SI2 * Ieq                      // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x3eq = SI3 * Ieq                      // [1] = [L/mU] * [mU/L]
    const Q2eq = (x1eq / (k12 + x2eq)) * Q1eq;  // [mmol] = [1/min] * [min] * [mmol]
    const Seq = u * tauI;    // [mU] = [mU/min] * [min]

    /*
    const F01eq = F01 * BW * Math.min(targetGlycemia / 4.5, 1)               // [mmol/min] = [mmol/kg/min] * [kg] * 1
    const Seq = (IIR || 0) * tauI * 1000 / 60;                    // [mU/min] = [U/hour] * [min/hour] * [1000/min] * [60/min]
    const Ieq = Seq / (tauI * (VI * BW) * ke);                    // [mU/L] = [mU/min] * [1/min] * [kg/L] * [1/kg] * [min]
    const x1eq = SI1 * Ieq                                        // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x2eq = SI2 * Ieq                                        // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x3eq = SI3 * Ieq                                        // [1] = [L/mU] * [mU/L]
    const Q2eq = Math.max( -(F01eq - EGP0 * BW * (1 - x3eq)) / x2eq, 0) // [mmol] = ([mmol/min] + [mmol/kg/min] * [kg] * [1]) * [min] = [mmol/min] * [min] = [mmol]
    const Q1eq = Math.max(Q2eq / x1eq * (k12 + x2eq), 0)                // [mmol] = [mmol] * [min] * [1/min]
     */

    return {
      Q1: Q1eq,   // [mmol] glucose in blood
      Q2: Q2eq,   // [mmol] glucose in muscles
      S1: Seq,    // [mU] insulin absorption in first adipose tissue
      S2: Seq,    // [mU] insulin absorption in second adipose tissue
      I: Ieq,     // [mU/L] insulin in plasma,
      x1: x1eq,   // [1/min] insulin action on glucose transport
      x2: x2eq,   // [1/min] insulin action on glucose disposal
      x3: x3eq,   // [1] insulin action on endogenous glucose production (liver)
      D1: 0,      // [mmol] glucose absorption in the stomach
      D2: 0,      // [mmol] glucose absorption in the intestine
    };
  }




  computeInitialStateFromInsulin(us: number, P: NamedVector): NamedVector {

    const BW = P.BW;      // [kg] body weight
    const tauI = P.tauI;  // [min] maximum insulin absorption time
    const ke = P.ke;      // [1/min] insulin elimination rate from plasma
    const VI = P.VI;      // [L/kg] insulin distribution volume
    const SI1 = P.SI1;    // [1/min*(mU/L)] insulin sensitivity of distribution/transport
    const SI2 = P.SI2;    // [1/min*(mU/L)] insulin sensitivity of disposal
    const SI3 = P.SI3;    // [L/mU]         insulin sensitivity of EGP
    const EGP0 = P.EGP0;  // [mmol/kg/min] endogenous glucose production extrapolated to zero insulin concentration
    const F01 = P.F01;    // [mmol/kg/min] non–insulin-dependent glucose flux (per kg)
    const k12 = P.k12;    // [1/min] transfer rate between non-accessible and accessible glucose compartments

    /*
    const BW = 70;      // [kg] body weight
    const tauI = 1 / 0.018;  // [min] maximum insulin absorption time
    const ke = 0.14;      // [1/min] insulin elimination rate from plasma
    const VI = 0.12;      // [L/kg] insulin distribution volume
    const SI1 = 51.2 * 1e-4;    // [1/min*(mU/L)] insulin sensitivity of distribution/transport
    const SI2 = 8.2 * 1e-4;    // [1/min*(mU/L)] insulin sensitivity of disposal
    const SI3 = 520 * 1e-4;    // [L/mU]         insulin sensitivity of EGP
    const EGP0 = 0.0161;  // [mmol/kg/min] endogenous glucose production extrapolated to zero insulin concentration
    const F01 = 0.0097;    // [mmol/kg/min] non–insulin-dependent glucose flux (per kg)
    const k12 = 0.0649;    // [1/min] transfer rate between non-accessible and accessible glucose compartments
    */

    const Seq = tauI * us;                    // [mU] = [min] * [mU/min]
    const Ieq = Seq / (ke * tauI * VI * BW);  // [mU/L] = [mU/min] * [1/min] * [kg/L] * [1/kg] * [min]
    const x1eq = SI1 * Ieq;                   // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x2eq = SI2 * Ieq;                   // [1/min] = [1/min] * [L/mU] * [mU/L]
    const x3eq = SI3 * Ieq;                   // [1] = [L/mU] * [mU/L]

    // -x1*Q1 + k12*Q2 = F01 + EGP0(x3-1) * BW
    // x1*Q1 - (k12 + x2)*Q2 = 0
    const b1 = (EGP0 * BW * (x3eq - 1)) + F01;  // [mmol/min] = [mmol/kg/min] * [kg] * [1]
    const a11 = -x1eq;                          // [1/min]
    const a12 = k12;                            // [1/min]
    // const b2 = 0;                            // [mmol/min]
    const a21 = x1eq;                           // [1/min]
    const a22 = - k12 - x2eq;                   // [1/min]
    const Q1eq = b1 / (a11 - (a12 * a21 / a22));  // [mmol] = [mmol/min] / [1/min]
    console.log("Q1eq=", Q1eq, "\nG=", Q1eq / (Math.log(1.16) * BW));
    const Q2eq = - a21 * Q1eq / a22;              // [mmol] = [1/min] * [mmol] / [1/min]

    console.log("Desired Q1=", P.Geq * BW * Math.log(1.16), "\nComputed Q1eq=", Q1eq);

    return {
      Q1: Q1eq,   // [mmol] glucose in blood
      Q2: Q2eq,   // [mmol] glucose in muscles
      S1: Seq,    // [mU] insulin absorption in first adipose tissue
      S2: Seq,    // [mU] insulin absorption in second adipose tissue
      I: Ieq,     // [mU/L] insulin in plasma,
      x1: x1eq,   // [1/min] insulin action on glucose transport
      x2: x2eq,   // [1/min] insulin action on glucose disposal
      x3: x3eq,   // [1] insulin action on endogenous glucose production (liver)
      D1: 0,      // [mmol] glucose absorption in the stomach
      D2: 0,      // [mmol] glucose absorption in the intestine
    };

  }



  /**
   * Computes the derivatives of the state variables for a given time step using the provided patient parameters and input data.
   *
   * @param {number} t - The current time step at which the derivatives are being calculated.
   * @param {NamedVector} x - The current state of the system, represented as a vector of named variables.
   * @param {NamedVector} P - The patient-specific parameters, such as body weight and sensitivity variables.
   * @param {PatientInput} u - The input data, including insulin infusion rate and carbohydrate intake.
   * @return {NamedVector} The computed derivatives of the state variables, including subsystems for glucose, insulin, insulin action, and carbohydrate absorption.
   */
  computeDerivatives(dt: number, x: NamedVector, u: number, d: number, P: NamedVector): NamedVector {
    //console.log("Pre state:", state)
    /** EXTRACTION OF PARAMETERS */
    const BW = P.BW;      // [kg] body weight
    const AG = P.AG;      // [1] carbohydrate (CHO) bioavailability
    const MwG = P.MwG;    // [g/mol] molecular weight of glucose (used to convert g to mmol)
    const tauI = P.tauI;  // [min] time-to-maximum insulin absorption (subcutaneous)
    const VI = P.VI;      // [L/kg] insulin distribution volume
    const ke = P.ke;      // [1/min] insulin elimination rate from plasma
    const VG = P.VG;      // [L/kg] glucose distribution volume
    const tauG = P.tauG;  // [min] time-to-maximum glucose absorption
    const F01 = P.F01;    // [mmol/kg/min] non–insulin-dependent glucose flux (per kg)
    const EGP0 = P.EGP0;  // [mmol/kg/min] endogenous glucose production at zero insulin (EGP0 [mmol/kg/min] * BW)
    const k12 = P.k12;    // [1/min] transfer rate between non-accessible and accessible glucose compartments
    const SI1 = P.SI1;    // [1/min/(mU/L)] insulin sensitivity: distribution/transport
    const SI2 = P.SI2;    // [1/min/(mU/L)] insulin sensitivity: disposal
    const SI3 = P.SI3;    // [L/mU] insulin sensitivity affecting EGP
    const ka1 = P.ka1;    // [1/min] insulin action activation rate (first chain)
    const ka2 = P.ka2;    // [1/min] insulin action deactivation rate (second chain)
    const ka3 = P.ka3;    // [1/min] insulin action deactivation rate (third chain)


    /** EXTRACTION OF STATE MODEL NODES */
    const S1 = x.S1;  // [mU] insulin absorption in first adipose tissue
    const S2 = x.S2;  // [mU] insulin absorption in second adipose tissue
    const I = x.I;    // [mU/L]   insulin in plasma

    const D1 = x.D1;  // [mmol] glucose absorption in the stomach
    const D2 = x.D2;  // [mmol] glucose absorption in the intestine

    const x1 = x.x1;  // [1/min] insulin action on glucose transport
    const x2 = x.x2;  // [1/min] insulin action on glucose disposal
    const x3 = x.x3;  // [1]     insulin action on endogenous glucose production (liver)

    const Q1 = x.Q1;  // [mmol] glucose in blood
    const Q2 = x.Q2;  // [mmol] glucose in muscles


    /** EXTRACTION OF INPUTS */
    // insulin infusion rate
    const U = (u || 0) * 1000;         // [mU/min] = [U/min] * [1000]
    // carbohydrate intake
    const D = (d || 0) * (1000 / MwG); // [mmol/min] = [g/min] * [1000 * mol/g]
    // eq:2.3: glucose concentration in mmol/L
    const G = Q1 / (VG * BW);          // [mmol/L] = [mmol] * [kg/L] * [1/kg]
    /*
    console.log(`U=${U}`)
    console.log(`D=${D}`)
    console.log(`G=${G}`)
    */

    /** CHO ABSORPTION */
    // eq:2.8a: drift of the glucose concentration in the stomach
    const dD1 = (AG * D) - ((1 / tauG) * D1); // [mmol/min] = [1 * mmol/min] - [1/min * mmol]
    // eq:2.8b: drift of the glucose concentration in the intestine
    const dD2 = (1 / tauG) * (D1 - D2);       // [mmol/min] = [1/min * mmol]
    // eq:2.9: glucose concentration in the blood
    const UG = (1 / tauG) * D2;               // [mmol/min] = [1/min * mmol]

    /** INSULIN ABSORPTION */
    // eq:2.11a: drift of the insulin concentration in the first adipose tissue
    const dS1 = U - ((1 / tauI) * S1);      // [mU/min] = [mU/min] - [1/min * mU]
    // eq:2.11b: drift of the insulin concentration in the second adipose tissue
    const dS2 = (1 / tauI) * (S1 - S2);     // [mU/min] = [1/min * mU]
    // eq:2.12:  insulin absorption rate in the blood
    const UI = (1 / tauI) * S2;             // [mU/min] = [1/min * mU]
    // eq:2.6:   drift of the insulin concentration in the blood
    const dI = (UI / (VI * BW)) - (ke * I); // [mU/L/min] = [mU/min * kg/L * 1/kg] - [1/min] * [mU/L]

    /** GLUCOSE */
    // eq:2.4: glucose absorbed by the central neural system
    const F01c = G >= 4.5 ? F01 * BW : F01 * BW * G / 4.5;  // [mmol/min] = [mmol/kg/min] * [kg]
    // eq:2.5: excretion rate of glucose in the kidneys
    const FR = G >= 9 ? 0.003 * (G - 9) * VG * BW : 0;      // [mmol/min] = [mmol/L] * [L/kg] * [kg]
    // eq:2.1: glucose concentration in the blood
    const dQ1 = UG - F01c - FR - (x1 * Q1) + (k12 * Q2) + (EGP0 * BW * (1 - x3)); // [mmol/min] = [mmol/min] - [mmol/min] - [mmol/min] - [1/min * mmol] + [1/min * mmol] + [mmol/min/kg * kg]
    // eq:2.2: glucose concentration in the muscles
    const dQ2 = x1 * Q1 - (k12 + x2) * Q2;    // [mmol/min] = [1/min * mmol] - [[1/min + 1/min] * mmol]

    /** INSULIN ACTION */
    // eq:2.13: insulin sensitivity for the distribution/transport
    const kb1 = SI1 * ka1;  // [min^-2/(mU/L)] = [1/min/(mU/L)] * [1/min]
    // eq:2.13: insulin sensitivity for the disposal
    const kb2 = SI2 * ka2;  // [min^-2/(mU/L)] = [1/min/(mU/L)] * [1/min]
    // eq:2.13: insulin sensitivity for the endogenous glucose production (liver)
    const kb3 = SI3 * ka3;  // [min^-1/(mU/L)] = [L/mU] * [1/min]
    // eq:2.7a: drift of the insulin action on glucose transport
    const dx1 = kb1 * I - ka1 * x1; // [1/min^2] = [min^-2 * L/mU] * [mU/L] - [1/min] * [1/min]
    // eq:2.7b: drift of the insulin action on glucose disposal
    const dx2 = kb2 * I - ka2 * x2; // [1/min^2] = [min^-2/(mU/L)] * [mU/L] - [1/min] * [1/min]
    // eq:2.7c: drift of the insulin action on endogenous glucose production (liver)
    const dx3 = kb3 * I - ka3 * x3; // [1/min] = [1/min * L/mU] * [mU/L] - [1/min] * [1]

    // drift vector for the system [state_vector/min]
    const drift: NamedVector = {
      // glucose subsystem
      Q1: dQ1, // [mmol/min] glucose in blood
      Q2: dQ2, // [mmol/min] glucose in muscles

      // insulin absorption subsystem
      S1: dS1, // [mU/min] insulin absorption in first adipose tissue
      S2: dS2, // [mU/min] insulin absorption in second adipose tissue
      I: dI,   // [mU/L/min] insulin in plasma

      // insulin action subsystem
      x1: dx1, // [1/min^2] insulin action on glucose transport
      x2: dx2, // [1/min^2] insulin action on glucose disposal
      x3: dx3, // [1/min] insulin action on endogenous glucose production (liver)

      // cho subsystem
      D1: dD1, // [mmol/min] glucose absorption in the stomach
      D2: dD2  // [mmol/min] glucose absorption in the intestine
    }

    //console.log("Drift vector at t=", t, ": ", drift);

    return drift

  }

  /**
   * Computes the glucose concentration based on the provided state and patient parameters.
   *
   * @param {NamedVector} state - The state object containing the model nodes such as Q1.
   * @param {any} patient - The patient object containing attributes like body weight (BW) and VG factor.
   * @return {number} - The computed glucose concentration in mmol/L.
   */
  computeOutput(state: NamedVector, patient: any): number {
    /** extractions of model nodes */
    const Q1 = state.Q1;      // [mmol] glucose in blood
    const VG = patient.VG;    // [L/kg] glucose distribution volume
    const BW = patient.BW;    // [kg] body weight

    // eq:2.3: glucose concentration in mmol/L
    const G = Q1 / (VG * BW); // [mmol/L] = [mmol] * [kg/L] * [1/kg]

    return G
  }

}