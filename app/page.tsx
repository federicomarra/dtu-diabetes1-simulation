'use client'

import { NextPage } from "next";
import { useState } from "react";
import { HovorkaModel } from "@/app/HovorkaModel";
import { LineChart } from '@mui/x-charts/LineChart';
import {width} from "@mui/system";
import {Simulator} from "@/app/Simulator";
import {HovorkaModelODE} from "@/app/HovorkaModelODE";
import {PatientInput} from "@/app/types";
import {switchCase} from "@babel/types";

const Home: NextPage = () => {

  const generateValueGivenMeanAndStdDev = (mean: number, stdDev: number, step: number, distrName?: string): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    let rawValue = z0 * stdDev + mean;
    if (distrName === "exp") {
      rawValue = Math.log(rawValue);
    } else if (distrName === "div" && rawValue !== 0) {
      rawValue = 1 / rawValue; // Inverse transformation for division
    } else if (distrName === "divln") {
      rawValue = 1 / Math.exp(rawValue); // Inverse transformation for division by log
    } else if (distrName === "uniform") {
      rawValue = (stdDev - mean) / 2 + mean
    }
    return Math.max(step, Math.floor(rawValue / step) * step); // Round to the nearest step
    //return Math.floor(rawValue / step) * step; // Round to the nearest step
  }

  const initDays = 1;
  const [days, setDays] = useState<number>(initDays);
  const initTime = (days: number) => Array.from({ length: 24 * days }, (_, i) => i + 1)
  const [time, setTime] = useState<number[]>(initTime(days));
  const initGlyc = 100;
  const initDCho = (days: number) => Array.from({length: 24 * days}, (_, i) => i % 24 == 7 ? 50 : i % 24 == 12 ? 75 : i % 24 == 20 ? 40 : 0);
  const initUIns = (days: number) => Array.from({ length: 24 * days }, (_, i) => i % 24 < 7 ? 1.5 : i % 24 < 12 ? 1.3 : i % 24 < 20 ? 1.4 : 0);

  // PATIENT PARAMETERS
  // EGP0: Endogenous Glucose Production rate
  const [EGP0_mean,setEGP0_mean] = useState(0.0161); // EGP0 mean value in mmol/min/kg
  const [EGP0_stdDev,setEGP0_stdDev] = useState(0.0039); // EGP0 standard deviation in mmol/min/kg
  const EGP0_step = 0.0001; // EGP0 step size for input field
  const [EGP0_value, setEGP0_value] = useState(generateValueGivenMeanAndStdDev(EGP0_mean, EGP0_stdDev,EGP0_step)); // EGP0 initial value in mmol/min/kg
  const EGP0_unit = "mmol/min/kg"; // EGP0 unit
  const EGP0_description = "Endogenous glucose production rate is the rate at which glucose is produced by the liver in the absence of food intake or insulin stimulation. It is a key parameter in glucose metabolism and regulation.";
  const [EGP0_hover, setEGP0_hover] = useState(false); // EGP0 hover state for tooltip

  // F01: Insulin-independent glucose flux
  const [F01_mean, setF01_mean] = useState(0.0097); // F01 mean value in mmol/kg/min
  const [F01_stdDev, setF01_stdDev] = useState(0.0022); // F01 standard deviation in mmol/kg/min
  const F01_step = 0.0001; // F01 step size for input field
  const [F01_value, setF01_value] = useState(generateValueGivenMeanAndStdDev(F01_mean, F01_stdDev, F01_step)); // F01 initial value in mmol/kg/min
  const F01_unit = "mmol/kg/min"; // F01 unit
  const F01_description = "Insulin-independent glucose flux represents the amount of glucose uptake that occurs without insulin influence.";
  const [F01_hover, setF01_hover] = useState(false); // F01 hover state for tooltip

  // K12: Transfer rate between compartments
  const [K12_mean, setK12_mean] = useState(0.0649); // K12 mean value in min^-1
  const [K12_stdDev, setK12_stdDev] = useState(0.0282); // K12 standard deviation in min^-1
  const K12_step = 0.0001; // K12 step size for input field
  const [K12_value, setK12_value] = useState(generateValueGivenMeanAndStdDev(K12_mean, K12_stdDev, K12_step)); // K12 initial value in min^-1
  const K12_unit = "min⁻¹"; // K12 unit
  const K12_description = "Transfer rate between the accessible and non-accessible glucose compartments.";
  const [K12_hover, setK12_hover] = useState(false); // K12 hover state for tooltip

  // Ka1: Insulin absorption rate
  const [Ka1_mean, setKa1_mean] = useState(0.0055); // Ka1 mean value in min^-1
  const [Ka1_stdDev, setKa1_stdDev] = useState(0.0056); // Ka1 standard deviation in min^-1
  const Ka1_step = 0.0001; // Ka1 step size for input field
  const [Ka1_value, setKa1_value] = useState(generateValueGivenMeanAndStdDev(Ka1_mean, Ka1_stdDev, Ka1_step)); // Ka1 initial value in min^-1
  const Ka1_unit = "min⁻¹"; // Ka1 unit
  const Ka1_description = "Rate constant for insulin absorption from the subcutaneous tissue.";
  const [Ka1_hover, setKa1_hover] = useState(false); // Ka1 hover state for tooltip

  // Ka2: Insulin absorption rate
  const [Ka2_mean, setKa2_mean] = useState(0.0683); // Ka2 mean value in min^-1
  const [Ka2_stdDev, setKa2_stdDev] = useState(0.0507); // Ka2 standard deviation in min^-1
  const Ka2_step = 0.0001; // Ka2 step size for input field
  const [Ka2_value, setKa2_value] = useState(generateValueGivenMeanAndStdDev(Ka2_mean, Ka2_stdDev, Ka2_step)); // Ka2 initial value in min^-1
  const Ka2_unit = "min⁻¹"; // Ka2 unit
  const Ka2_description = "Second rate constant for insulin absorption model.";
  const [Ka2_hover, setKa2_hover] = useState(false); // Ka2 hover state for tooltip

  // Ka3: Insulin absorption rate
  const [Ka3_mean, setKa3_mean] = useState(0.0304); // Ka3 mean value in min^-1
  const [Ka3_stdDev, setKa3_stdDev] = useState(0.0235); // Ka3 standard deviation in min^-1
  const Ka3_step = 0.0001; // Ka3 step size for input field
  const [Ka3_value, setKa3_value] = useState(generateValueGivenMeanAndStdDev(Ka3_mean, Ka3_stdDev, Ka3_step)); // Ka3 initial value in min^-1
  const Ka3_unit = "min⁻¹"; // Ka3 unit
  const Ka3_description = "Third rate constant for insulin absorption model.";
  const [Ka3_hover, setKa3_hover] = useState(false); // Ka3 hover state for tooltip

  // SI1: Insulin sensitivity
  const [SI1_mean, setSI1_mean] = useState(51.2); // SI1 mean value in min^-1/(mU/L)
  const [SI1_stdDev, setSI1_stdDev] = useState(32.09); // SI1 standard deviation in min^-1/(mU/L)
  const SI1_step = 0.1; // SI1 step size for input field
  const [SI1_value, setSI1_value] = useState(generateValueGivenMeanAndStdDev(SI1_mean, SI1_stdDev, SI1_step)); // SI1 initial value in min^-1/(mU/L)
  const SI1_unit = "min⁻¹/(mU/L)"; // SI1 unit
  const SI1_description = "Insulin sensitivity parameter affecting glucose transport from plasma.";
  const [SI1_hover, setSI1_hover] = useState(false); // SI1 hover state for tooltip

  // SI2: Insulin sensitivity
  const [SI2_mean, setSI2_mean] = useState(8.2); // SI2 mean value in min^-1/(mU/L)
  const [SI2_stdDev, setSI2_stdDev] = useState(7.84); // SI2 standard deviation in min^-1/(mU/L)
  const SI2_step = 0.1; // SI2 step size for input field
  const [SI2_value, setSI2_value] = useState(generateValueGivenMeanAndStdDev(SI2_mean, SI2_stdDev, SI2_step)); // SI2 initial value in min^-1/(mU/L)
  const SI2_unit = "min⁻¹/(mU/L)"; // SI2 unit
  const SI2_description = "Insulin sensitivity parameter for the disposal of glucose.";
  const [SI2_hover, setSI2_hover] = useState(false); // SI2 hover state for tooltip

  // SI3: Insulin sensitivity
  const [SI3_mean, setSI3_mean] = useState(520); // SI3 mean value in L/mU
  const [SI3_stdDev, setSI3_stdDev] = useState(306.2); // SI3 standard deviation in L/mU
  const SI3_step = 1; // SI3 step size for input field
  const [SI3_value, setSI3_value] = useState(generateValueGivenMeanAndStdDev(SI3_mean, SI3_stdDev, SI3_step)); // SI3 initial value in L/mU
  const SI3_unit = "L/mU"; // SI3 unit
  const SI3_description = "Insulin sensitivity parameter affecting endogenous glucose production.";

  // ke: Insulin elimination rate
  const [ke_mean, setKe_mean] = useState(0.14); // ke mean value in min^-1
  const [ke_stdDev, setKe_stdDev] = useState(0.035); // ke standard deviation in min^-1
  const ke_step = 0.01; // ke step size for input field
  const [ke_value, setKe_value] = useState(generateValueGivenMeanAndStdDev(ke_mean, ke_stdDev, ke_step)); // ke initial value in min^-1
  const ke_unit = "min⁻¹"; // ke unit
  const ke_description = "Insulin elimination rate constant, representing the rate at which insulin is cleared from the bloodstream.";

  // VI: Insulin distribution volume
  const [VI_mean, setVI_mean] = useState(0.12); // VI mean value in L/kg
  const [VI_stdDev, setVI_stdDev] = useState(0.012); // VI standard deviation in L/kg
  const VI_step = 0.01; // VI step size for input field
  const [VI_value, setVI_value] = useState(generateValueGivenMeanAndStdDev(VI_mean, VI_stdDev, VI_step)); // VI initial value in L/kg
  const VI_unit = "L/kg"; // VI unit
  const VI_description = "Insulin distribution volume, representing the volume in which insulin is distributed in the body.";

  // VG: Volume of distribution for glucose
  const [VG_mean, setVG_mean] = useState(1.16); // VG mean value in L/kg
  const [VG_stdDev, setVG_stdDev] = useState(0.23); // VG standard deviation in L/kg
  const VG_step = 0.01; // VG step size for input field
  const [VG_value, setVG_value] = useState(generateValueGivenMeanAndStdDev(VG_mean, VG_stdDev, VG_step, "exp")); // VG initial value in L/kg
  const VG_unit = "L/kg"; // VG unit
  const VG_description = "Volume of distribution for glucose, representing the volume in which glucose is distributed in the body.";

  // tauI: Insulin infusion time constant
  const [tauI_mean, setTauI_mean] = useState(0.018); // tauI mean value in hours
  const [tauI_stdDev, setTauI_stdDev] = useState(0.0045); // tauI standard deviation in hours
  const tauI_step = 0.001; // tauI step size for input field
  const [tauI_value, setTauI_value] = useState(generateValueGivenMeanAndStdDev(tauI_mean, tauI_stdDev, tauI_step, "div")); // tauI initial value in hours
  const tauI_unit = "min"; // tauI unit
  const tauI_description = "Insulin infusion time constant, representing the time it takes for insulin to reach its peak effect after infusion.";

  // tauG: Glucose infusion time constant
  const [tauG_mean, setTauG_mean] = useState(-3.689); // tauG mean value in hours
  const [tauG_stdDev, setTauG_stdDev] = useState(0.25); // tauG standard deviation in hours
  const tauG_step = 0.001; // tauG step size for input field
  const [tauG_value, setTauG_value] = useState(generateValueGivenMeanAndStdDev(tauG_mean, tauG_stdDev, tauG_step, "divln")); // tauG initial value in hours
  const tauG_unit = "min"; // tauG unit
  const tauG_description = "Glucose infusion time constant, representing the time it takes for glucose to reach its peak effect after infusion.";

  // AG: Glucose absorption rate
  const [AG_min, setAG_min] = useState(0.7); // AG mean value
  const [AG_max, setAG_max] = useState(1.2); // AG standard deviation
  const AG_step = 0.1; // AG step size for input field
  const [AG_value, setAG_value] = useState(generateValueGivenMeanAndStdDev(AG_min, AG_max, AG_step, "uniform")); // AG initial value
  const AG_unit = "Unitless"; // AG unit
  const AG_description = "Glucose absorption rate, representing the rate at which glucose is absorbed from the gastrointestinal tract into the bloodstream.";

  // BW: Body weight
  const [BW_min, setBW_min] = useState(65); // BW mean value in kg
  const [BW_max, setBW_max] = useState(95); // BW standard deviation in kg
  const BW_step = 1; // BW step size for input field
  const [BW_value, setBW_value] = useState(generateValueGivenMeanAndStdDev(BW_min, BW_max, BW_step, "uniform")); // BW initial value in kg
  const BW_unit = "kg"; // BW unit
  const BW_description = "Body weight of the patient, which influences insulin sensitivity and glucose metabolism.";


  const [unitMgDl, setUnitMgDl] = useState<boolean>(true);

  const initMinGlyc = () => unitMgDl ? 50 : 2.8;
  const initMaxGlyc = () => unitMgDl ? 300 : 16.7;
  const [minGlycemia, setMinGlycemia] = useState<number>(initMinGlyc());
  const [maxGlycemia, setMaxGlycemia] = useState<number>(initMaxGlyc());
  const [startGlycemia, setStartGlycemia] = useState<number>(initGlyc);
  const [dCho, setDCho] = useState<number[]>(initDCho(days));
  const [uIns, setUIns] = useState<number[]>(initUIns(days));
  const [result, setResult] = useState<number[]>([]);
  const [conversionFactor, setConversionFactor] = useState<number>(18.01528);

  const setParams = (new_value: number, name?: string) => {
    if (name=="days") {
      setDays(new_value);
      setTime(initTime(new_value));
      setDCho(initDCho(new_value));
      setUIns(initUIns(new_value));
      setResult([]);
    } else {
      switch (name) {
        case "EGP0":
          setEGP0_value(new_value);
          break;
        case "F01":
          setF01_value(new_value);
          break;
        case "K12":
          setK12_value(new_value);
          break;
        case "Ka1":
          setKa1_value(new_value);
          break;
        case "Ka2":
          setKa2_value(new_value);
          break;
        case "Ka3":
          setKa3_value(new_value);
          break;
        case "SI1":
          setSI1_value(new_value);
          break;
        case "SI2":
          setSI2_value(new_value);
          break;
        case "SI3":
          setSI3_value(new_value);
          break;
        case "ke":
          setKe_value(new_value);
          break;
        case "VI":
          setVI_value(new_value);
          break;
        case "VG":
          setVG_value(new_value);
          break;
        case "tauI":
          setTauI_value(new_value);
          break;
        case "tauG":
          setTauG_value(new_value);
          break;
        case "AG":
          setAG_value(new_value);
          break;
        case "BW":
          setBW_value(new_value);
          break;
        }
      }
  }

  const repeatArray = (arr: number[]) => {
    const repeatedArray = [];
    for (let i = 0; i < days; i++) {
      repeatedArray.push(...arr);
    }
    return repeatedArray;
  }

  const handleExecute = () => {
    /*
    // @ts-ignore
    const model = new HovorkaModel({});

    const parameters = model.getParameter();
    const MwG = parameters.MwG.value;
    setConversionFactor(MwG / 10)

    console.log("Start glycemia:", startGlycemia,  unitMgDl ? "mg/dL" : "mmol/L");
    console.log("Time:", time);
    console.log("Carbohydrate intake:", dCho);
    console.log("Insulin infusion:", uIns);



    const result = model.simulate(time, startGlycemia/ (unitMgDl ? MwG * 10 : 1), dCho, uIns);
    console.log(result);

     */
    // @ts-ignore
    const model = new HovorkaModelODE({});
    const parameters = model.getParameter();
    const MwG = parameters.MwG.value;
    setConversionFactor(MwG / 10);

    const patient: PatientInput = {

      //"Gstart": startGlycemia / (unitMgDl ? MwG * 10 : 1),
      //"dCho": repeatArray(dCho),
      //"uIns": repeatArray(uIns),
    }

    //const result = Simulator(days, startGlycemia/ (unitMgDl ? MwG * 10 : 1), patient, model);
    //if (result) setResult(result[0]);

    const inputGlyc = startGlycemia / (unitMgDl ? MwG * 10 : 1);
    const basicArray = [initMinGlyc(), inputGlyc, initMaxGlyc()];
    const result = repeatArray(Array(8).fill(0).flatMap(() => basicArray));
    setResult(result);

  }

  function changeUnit(toMgDl: boolean) {
    const factor = toMgDl ? conversionFactor : 1 / conversionFactor;
    const roundToDecimal = (value: number, decimals: number): number => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    }
    const newGlycemia = roundToDecimal(startGlycemia * factor, toMgDl ? 0 : 1);
    setStartGlycemia(newGlycemia);
    setUnitMgDl(toMgDl);
    setMinGlycemia(initMinGlyc());
    setMaxGlycemia(initMaxGlyc());
  }

  // @ts-ignore
  return (
    <section className="p-8 max-w-4xl mx-auto overflow-visible relative">
      <h1 className="text-3xl font-bold mb-4">DTU Special course Diabetes 1 Simulator</h1>
      {/*<p className="mb-4">
        In this project we develop simulation and control software for diabetes technology. The main focus will be related to simulation models, user-experiences, and web-enabled user interfaces. We will study numerical algorithms for simulation in web-enabled programming languages such as JavaScript/TypeScript. In this respect we will seek inspiration in both lt1.org and t2d.aau.dk. We will apply full stack development (html/css/JavaScript/TypeScript) and scientific computing for simulation to diabetes applications.
      </p>
      <h2 className="text-2xl font-semibold mb-2">Activities</h2>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          Literature study and software architecture. We will investigate the <a href={"https://lt1.org"} target="_blank" rel="noopener noreferrer">lt1.org</a> and <a href={"https://t2d.aau.dk"} target="_blank" rel="noopener noreferrer">t2d.aau.dk</a> open-source software.
        </li>
        <li>
          Modeling and simulation of diabetes models (JavaScript/TypeScript).
        </li>
        <li>
          Controllers for automated insulin dosing (AID) and closed-loop simulation. We will use very simple controllers and only dig deep into this if time permits.
        </li>
        <li>
          GUI (web-based using HTML/CSS/JavaScript/TypeScript).
        </li>
        <li>Documentation.</li>
        <li>
          Presentation and dissemination (slides/oral/demonstration/software/code).
        </li>
      </ol>
      <p className="mt-4">
        We will make a project plan in the beginning of the project and scientific software project management is part of the learning objectives.
      </p>*/}

      <div className="mt-8">
        <div className="">
        <h2 className="text-2xl font-semibold mb-4">Simulation Parameters</h2>
        <label htmlFor="days" className="block text-lg font-medium mb-2">
          Simulation time: <input
            type="number"
            id="days"
            name="days"
            value={days}
            onChange={(e) => setParams(Number(e.target.value), "days")}
            min="1"
            max="7"
            data-np-intersection-state="observed"
          /> day{days > 1 ? "s" : ""}
        </label>
        </div>

        <div className="flex flex-row" id="start-glycemia-div">
          <label className="block text-lg font-medium mb-2">
            Blood sugar unit: {/*<input
            type="number"
            id="glycemia"
            name="glycemia"
            min={minGlycemia}
            max={maxGlycemia}
            step={unitMgDl ? "1" : "0.1"}
            value={startGlycemia}
            onChange={(e) => setStartGlycemia(Number(e.target.value))}
            data-np-intersection-state="observed"
            style={{
              color: "var(--primary)",
              width: "45px",
            }}
          />*/}
            <select
              id="unit"
              name="unit"
              onChange={(e) => {
                changeUnit(e.target.value === "mg/dL");
              }}
              defaultValue={"mmol/L"}
            >
              <option value="mg/dL">mg/dL</option>
              <option value="mmol/L">mmol/L</option>
            </select>
          </label>
        </div>
        {/*<input
          type="range"
          id="glycemia"
          name="glycemia"
          min={unitMgDl ? "50" : "2.8"}
          max={unitMgDl ? "300" : "16.7"}
          step={unitMgDl ? "1" : "0.1"}
          value={startGlycemia}
          onChange={(e) => setStartGlycemia(Number(e.target.value))}
          className="w-full"
          data-np-intersection-state="observed"
          style={{
            color: "var(--primary)",
            //width: "50px",
          }}
        />*/}

        <div className="mt-8 overflow-visible relative">
          <h2 className="text-2xl font-semibold mb-4 overflow-visible relative">Patient Parameters</h2>
          <div className="overflow-x-auto overflow-visible relative" >
            <table className="min-w-full border-collapse border overflow-visible relative" style={{borderColor: "var(--primary)"}}>
              <thead>
              <tr className="bg-blue-950 text-white" style={{borderColor: "var(--primary)"}}>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Parameter</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Value</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Unit</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Distribution</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Description</th>
              </tr>
              </thead>
              <tbody>


              <tr>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}><i>EGP</i><sub>0</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={EGP0_value}
                    onChange={(e) => setParams(Number(e.target.value), "EGP0")}
                    min={EGP0_mean - 3 * EGP0_stdDev}
                    max={EGP0_mean + 3 * EGP0_stdDev}
                    step={EGP0_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{EGP0_unit}</td>
                <td className="border border px-4 py-2 text-left" style={{borderColor: "var(--primary)"}}>~ N({<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 mean"
                  onChange={(e) => setEGP0_mean(Number(e.target.value))} value={EGP0_mean} data-np-intersection-state="observed"/>}, {<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 std dev"
                  onChange={(e) => setEGP0_stdDev(Number(e.target.value))} value={EGP0_stdDev} data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={()=>setEGP0_hover(true)}
                    onMouseLeave={()=>setEGP0_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"  style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {EGP0_hover ? EGP0_description : <b>?</b>}
                  </div>
                  {/*
                  <div className="inline-block group">
                    <span className="font-bold cursor-help relative overflow-visible text-lg" style={{borderColor: "var(--primary)", color: "var(--primary)"}}>?</span>
                    <div className="absolute z-50 p-2 bg-gray-800 text-white rounded shadow-lg text-sm text-left
                    left-1/2 transform -translate-x-1/2 bottom-full mb-2
                    w-max max-w-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    whitespace-pre-wrap break-words">
                      {EGP0_description}
                    </div>
                  </div>
                  */}
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}><i>F</i><sub>01</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={F01_value}
                    onChange={(e) => setParams(Number(e.target.value), "F01")}
                    min={F01_mean - 3 * F01_stdDev}
                    max={F01_mean + 3 * F01_stdDev}
                    step={F01_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{F01_unit}</td>
                <td className="border border px-4 py-2 text-left" style={{borderColor: "var(--primary)"}}>~ N({<input
                  type="text" step={F01_step} className="w-[6.5ch] px-1 text-right" name="F01 mean"
                  onChange={(e) => setF01_mean(Number(e.target.value))} value={F01_mean} data-np-intersection-state="observed"/>}, {<input
                  type="text" step={F01_step} className="w-[6.5ch] px-1 text-right" name="F01 std dev"
                  onChange={(e) => setF01_stdDev(Number(e.target.value))} value={F01_stdDev} data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={()=>setF01_hover(true)}
                    onMouseLeave={()=>setF01_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"  style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {F01_hover ? F01_description : <b>?</b>}
                  </div>
                </td>
              </tr>



              </tbody>
            </table>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Carbohydrate Intake</h2>



        <button
          onClick={handleExecute}
          className="mt-4 px-4 py-2 text-white text-base font-extrabold rounded w-full"
          style={{
            backgroundColor: "var(--quaternary)",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Execute
        </button>
        {result.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Simulation result</h2>
            <LineChart
              className="mt-4"
              xAxis={[{data: time, label: "Time (hours)", fill: "var(--primary)"}]}
              yAxis={[{data: result, label: unitMgDl ? "Glucose (mg/dL)" : "Glucose (mmol/L)"}]}
              series={
                [{curve: "catmullRom", data: result.map((value: number) => (value ? value : null))}]
              }
              width={900}
              height={300}
            />
          </div>)}
        {/*result.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Result:</h3>
            <ul className="list-disc list-inside">
              {result.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          </div>
        )*/}
      </div>
      <footer className="fixed bottom-4 right-4 text-sm text-gray-500">
              developed by Federico Marra
      </footer>
    </section>
  );
};

export default Home;