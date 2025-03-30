'use client'

import { NextPage } from "next";
import { useState } from "react";
import { HovorkaModel } from "@/app/HovorkaModel";
import { LineChart } from '@mui/x-charts/LineChart';
import {width} from "@mui/system";

const Home: NextPage = () => {
  const initDays = 1;
  const [days, setDays] = useState<number>(initDays);
  const initTime = (days: number) => Array.from({ length: 24 * days }, (_, i) => i + 1)
  const [time, setTime] = useState<number[]>(initTime(days));
  const initGlyc = 100;
  const initDCho = (days: number) => Array.from({length: 24 * days}, (_, i) => i % 24 == 7 ? 50 : i % 24 == 12 ? 75 : i % 24 == 20 ? 40 : 0);
  const initUIns = (days: number) => Array.from({ length: 24 * days }, (_, i) => i % 24 < 7 ? 1.5 : i % 24 < 12 ? 1.3 : i % 24 < 20 ? 1.4 : 0);

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

  const setParams = (days: number) => {
    setDays(days);
    setTime(initTime(days));
    setDCho(initDCho(days));
    setUIns(initUIns(days));
    setResult([]);
  }

  const repeatArray = (arr: number[]) => {
    const repeatedArray = [];
    for (let i = 0; i < days; i++) {
      repeatedArray.push(...arr);
    }
    return repeatedArray;
  }

  const handleExecute = () => {
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
    if (result) setResult(result);
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
            onChange={(e) => setParams(Number(e.target.value))}
            min="1"
            max="7"
            data-np-intersection-state="observed"
          /> day{days > 1 ? "s" : ""}
        </label>
        </div>

        <div className="flex flex-row" id="start-glycemia-div">
          <label className="block text-lg font-medium mb-2">
            Glucose blood level: <input
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
          />
            <select
              id="unit"
              name="unit"
              onChange={(e) => {
                changeUnit(e.target.value === "mg/dL");
              }}
              defaultValue={"mg/dL"}
            >
              <option value="mg/dL">mg/dL</option>
              <option value="mmol/L">mmol/L</option>
            </select>
          </label>
        </div>
        <input
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
        />

        <button
          onClick={handleExecute}
          className="mt-4 px-4 py-2 text-white rounded"
          style={{
            backgroundColor: "var(--quaternary)",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Execute
        </button>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Carbohydrate Intake</h2>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Simulation result</h2>
        <LineChart
          className="mt-4"
          xAxis={[{ data: time }]}
          series={
          [{ data: result.map((value: number) => (value ? value : null)) }]
        }
          width={900}
          height={300}
        />
        {result.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Result:</h3>
            <ul className="list-disc list-inside">
              {result.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className="absolute bottom-4 right-4 text-sm text-gray-500">
              developed by Federico Marra
      </footer>
    </section>
  );
};

export default Home;