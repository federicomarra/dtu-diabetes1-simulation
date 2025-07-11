'use client'

import { NextPage } from "next";
import { useState } from "react";
import { HovorkaModel } from "@/app/HovorkaModel";
import { LineChart } from '@mui/x-charts/LineChart';
import {width} from "@mui/system";
import {Simulator} from "@/app/Simulator";
import {HovorkaModelODE} from "@/app/HovorkaModelODE";
import {PatientInput} from "@/app/types";

const Home: NextPage = () => {

  const generateValueGivenMeanAndStdDev = (mean: number, stdDev: number, step: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const rawValue = z0 * stdDev + mean;
    return Math.floor(rawValue / step) * step; // Round to the nearest step
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
  const [EGP0_value,setEGP0_value] = useState(generateValueGivenMeanAndStdDev(EGP0_mean, EGP0_stdDev,EGP0_step)); // EGP0 initial value in mmol/min/kg
  const EGP0_description = "Endogenous glucose production rate (EGP0) is the rate at which glucose is produced by the liver in the absence of food intake or insulin stimulation. It is a key parameter in glucose metabolism and regulation.";

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
        case "glycemia":

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
    <section className="p-8 max-w-4xl mx-auto">
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

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Patient Parameters</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
              <tr className="bg-blue-950 text-white">
                <th className="border border-gray-300 px-4 py-2">Parameter</th>
                <th className="border border-gray-300 px-4 py-2">Value</th>
                <th className="border border-gray-300 px-4 py-2">Unit</th>
                <th className="border border-gray-300 px-4 py-2">Distribution</th>
                <th className="border border-gray-300 px-4 py-2">Description</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">EGP<sub>0</sub></td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    id="EGP0"
                    name="EGP0"
                    value={EGP0_value}
                    onChange={(e) => setParams(Number(e.target.value), "EGP0")}
                    min={EGP0_mean - 3 * EGP0_stdDev}
                    max={EGP0_mean + 3 * EGP0_stdDev}
                    step={EGP0_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">mmol/min/kg</td>
                <td className="border border-gray-300 px-4 py-2">~N({<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 mean"
                  onChange={(e) => setEGP0_mean(Number(e.target.value))} value={EGP0_mean} data-np-intersection-state="observed"/>}, {<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 std dev"
                  onChange={(e) => setEGP0_stdDev(Number(e.target.value))} value={EGP0_stdDev} data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <div className="relative inline-block group">
                    <span className="text-white font-bold cursor-help inline-block text-lg">?</span>
                    <div className="absolute z-10 p-2 bg-gray-800 text-white rounded shadow-lg text-sm text-left left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 invisible group-hover:visible break-words whitespace-pre-wrap">
                      {EGP0_description}
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

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
        <h2 className="text-2xl font-semibold mt-8 mb-4">Carbohydrate Intake</h2>
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