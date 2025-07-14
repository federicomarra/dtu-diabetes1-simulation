'use client'

import {NextPage} from "next";
import {useState} from "react";
import {HovorkaModel} from "@/app/HovorkaModel";
import {LineChart} from '@mui/x-charts/LineChart';
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
    } else if (distrName === "uniform") { // Uniform distribution
      rawValue = mean + (stdDev - mean) * Math.random();  // mean==min and stdDev==max
    }
    return Math.max(step, Math.floor(rawValue / step) * step); // Round to the nearest step
    //return Math.floor(rawValue / step) * step; // Round to the nearest step
  }

  const [conversionFactor, setConversionFactor] = useState<number>(18.01528);

  // SIMULATION PARAMETERS
  // Number of days for the simulation
  const possibleDays = [1, 2, 3, 4, 5, 6, 7, 14]; // Possible days for the simulation
  const defaultDays = possibleDays[0]; // Default number of days for the simulation
  const [days, setDays] = useState<number>(defaultDays);
  const possibleTimeSteps = [1, 5, 10, 30, 60]; // Possible time steps in minutes
  const defaultTimeStep = possibleTimeSteps[possibleTimeSteps.length - 1]; // Default time step in minutes
  const [timeStep, setTimeStep] = useState<number>(defaultTimeStep); // Time step in minutes
  const timeLength_days = (days: number, timeStep: number) => days * 24 * 60 / timeStep + 1; // Total time length in minutes, +1 to include the 24:00
  const [timeLength, setTimeLength] = useState<number>(timeLength_days(days, timeStep)); // Total time length in minutes if timeStep is 1 minute
  const initTime = (time_length: number) => Array.from({length: time_length}, (_, i) => i)
  const [time, setTime] = useState<number[]>(initTime(timeLength));

  const possibleModels = ["Hovorka"]; // Possible models
  const defaultModel = possibleModels[0]; // Default model
  const [modelName, setModelName] = useState<string>(defaultModel); // Initialize the model
  const possibleControllers = ["P"]//, "PI", "PID"]; // Possible controllers
  const defaultController = possibleControllers[0]; // Default controller
  const [controllerName, setControllerName] = useState<string>(defaultController); // Initialize the controller

  // Glycemia unit: false for mmol/L, true for mg/dL
  const [unitMgDl, setUnitMgDl] = useState<boolean>(false); // false for mmol/L, true for mg/dL
  const initMinGlyc = () => unitMgDl ? 50 : 2.8;
  const initMaxGlyc = () => unitMgDl ? 300 : 16.7;
  const [minGlycemia, setMinGlycemia] = useState<number>(initMinGlyc());
  const [maxGlycemia, setMaxGlycemia] = useState<number>(initMaxGlyc());

  const repeatArray = (arr: number[], days_to_repeat: number) => {
    const repeatedArray = [];
    for (let i = 0; i < days_to_repeat; i++) {
      repeatedArray.push(...arr.slice(0, arr.length - 1));
    }
    repeatedArray.push(arr[arr.length - 1]); // Ensure the last element is included
    //console.log("Array repeated for", days, "days:", repeatedArray);
    return repeatedArray;
  }

  const convertGlycemia = (glycemia: number, toMgDl: boolean): number => {
    const factor = toMgDl ? conversionFactor : 1 / conversionFactor;
    const roundToDecimal = (value: number, decimals: number): number => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    }
    return roundToDecimal(glycemia * factor, toMgDl ? 0 : 1);
  }

  function changeUnit(toMgDl: boolean) {
    setUnitMgDl(toMgDl);
    setMinGlycemia(initMinGlyc());
    setMaxGlycemia(initMaxGlyc());
    setResult(result.map(glycemia => convertGlycemia(glycemia, toMgDl)));
  }


  // PATIENT PARAMETERS
  // EGP0: Endogenous Glucose Production rate
  const [EGP0_mean, setEGP0_mean] = useState(0.0161); // EGP0 mean value in mmol/min/kg
  const [EGP0_stdDev, setEGP0_stdDev] = useState(0.0039); // EGP0 standard deviation in mmol/min/kg
  const EGP0_step = 0.0001; // EGP0 step size for input field
  const [EGP0_value, setEGP0_value] = useState(generateValueGivenMeanAndStdDev(EGP0_mean, EGP0_stdDev, EGP0_step)); // EGP0 initial value in mmol/min/kg
  const EGP0_unit = "mmol / min / kg"; // EGP0 unit
  const EGP0_description = "Endogenous glucose production rate is the rate at which glucose is produced by the liver in the absence of food intake or insulin stimulation. It is a key parameter in glucose metabolism and regulation.";
  const [EGP0_hover, setEGP0_hover] = useState(false); // EGP0 hover state for tooltip

  // F01: Insulin-independent glucose flux
  const [F01_mean, setF01_mean] = useState(0.0097); // F01 mean value in mmol/kg/min
  const [F01_stdDev, setF01_stdDev] = useState(0.0022); // F01 standard deviation in mmol/kg/min
  const F01_step = 0.0001; // F01 step size for input field
  const [F01_value, setF01_value] = useState(generateValueGivenMeanAndStdDev(F01_mean, F01_stdDev, F01_step)); // F01 initial value in mmol/kg/min
  const F01_unit = "mmol / kg / min"; // F01 unit
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
  const SI1_unit = "min⁻¹ / (mU / L)"; // SI1 unit
  const SI1_description = "Insulin sensitivity parameter affecting glucose transport from plasma.";
  const [SI1_hover, setSI1_hover] = useState(false); // SI1 hover state for tooltip

  // SI2: Insulin sensitivity
  const [SI2_mean, setSI2_mean] = useState(8.2); // SI2 mean value in min^-1/(mU/L)
  const [SI2_stdDev, setSI2_stdDev] = useState(7.84); // SI2 standard deviation in min^-1/(mU/L)
  const SI2_step = 0.1; // SI2 step size for input field
  const [SI2_value, setSI2_value] = useState(generateValueGivenMeanAndStdDev(SI2_mean, SI2_stdDev, SI2_step)); // SI2 initial value in min^-1/(mU/L)
  const SI2_unit = "min⁻¹ / (mU / L)"; // SI2 unit
  const SI2_description = "Insulin sensitivity parameter for the disposal of glucose.";
  const [SI2_hover, setSI2_hover] = useState(false); // SI2 hover state for tooltip

  // SI3: Insulin sensitivity
  const [SI3_mean, setSI3_mean] = useState(520); // SI3 mean value in L/mU
  const [SI3_stdDev, setSI3_stdDev] = useState(306.2); // SI3 standard deviation in L/mU
  const SI3_step = 1; // SI3 step size for input field
  const [SI3_value, setSI3_value] = useState(generateValueGivenMeanAndStdDev(SI3_mean, SI3_stdDev, SI3_step)); // SI3 initial value in L/mU
  const SI3_unit = "L / mU"; // SI3 unit
  const SI3_description = "Insulin sensitivity parameter affecting endogenous glucose production.";
  const [SI3_hover, setSI3_hover] = useState(false); // SI3 hover state for tooltip

  // Ke: Insulin elimination rate
  const [Ke_mean, setKe_mean] = useState(0.14); // Ke mean value in min^-1
  const [Ke_stdDev, setKe_stdDev] = useState(0.035); // Ke standard deviation in min^-1
  const Ke_step = 0.01; // Ke step size for input field
  const [Ke_value, setKe_value] = useState(generateValueGivenMeanAndStdDev(Ke_mean, Ke_stdDev, Ke_step)); // Ke initial value in min^-1
  const Ke_unit = "min⁻¹"; // Ke unit
  const Ke_description = "Insulin elimination rate constant, representing the rate at which insulin is cleared from the bloodstream.";
  const [Ke_hover, setKe_hover] = useState(false); // Ke hover state for tooltip

  // VI: Insulin distribution volume
  const [VI_mean, setVI_mean] = useState(0.12); // VI mean value in L/kg
  const [VI_stdDev, setVI_stdDev] = useState(0.012); // VI standard deviation in L/kg
  const VI_step = 0.01; // VI step size for input field
  const [VI_value, setVI_value] = useState(generateValueGivenMeanAndStdDev(VI_mean, VI_stdDev, VI_step)); // VI initial value in L/kg
  const VI_unit = "L / kg"; // VI unit
  const VI_description = "Insulin distribution volume, representing the volume in which insulin is distributed in the body.";
  const [VI_hover, setVI_hover] = useState(false); // VI hover state for tooltip

  // VG: Volume of distribution for glucose
  const [VG_mean, setVG_mean] = useState(1.16); // VG mean value in L/kg
  const [VG_stdDev, setVG_stdDev] = useState(0.23); // VG standard deviation in L/kg
  const VG_step = 0.01; // VG step size for input field
  const [VG_value, setVG_value] = useState(generateValueGivenMeanAndStdDev(VG_mean, VG_stdDev, VG_step, "exp")); // VG initial value in L/kg
  const VG_unit = "L / kg"; // VG unit
  const VG_description = "Volume of distribution for glucose, representing the volume in which glucose is distributed in the body.";
  const [VG_hover, setVG_hover] = useState(false); // VG hover state for tooltip

  // TauI: Insulin infusion time constant
  const [TauI_mean, setTauI_mean] = useState(0.018); // TauI mean value in hours
  const [TauI_stdDev, setTauI_stdDev] = useState(0.0045); // TauI standard deviation in hours
  const TauI_step = 0.001; // TauI step size for input field
  const [TauI_value, setTauI_value] = useState(generateValueGivenMeanAndStdDev(TauI_mean, TauI_stdDev, TauI_step, "div")); // TauI initial value in hours
  const TauI_unit = "min"; // TauI unit
  const TauI_description = "Insulin infusion time constant, representing the time it takes for insulin to reach its peak effect after infusion.";
  const [TauI_hover, setTauI_hover] = useState(false); // TauI hover state for tooltip

  // TauG: Glucose infusion time constant
  const [TauG_mean, setTauG_mean] = useState(-3.689); // TauG mean value in hours
  const [TauG_stdDev, setTauG_stdDev] = useState(0.25); // TauG standard deviation in hours
  const TauG_step = 0.001; // TauG step size for input field
  const [TauG_value, setTauG_value] = useState(generateValueGivenMeanAndStdDev(TauG_mean, TauG_stdDev, TauG_step, "divln")); // TauG initial value in hours
  const TauG_unit = "min"; // TauG unit
  const TauG_description = "Glucose infusion time constant, representing the time it takes for glucose to reach its peak effect after infusion.";
  const [TauG_hover, setTauG_hover] = useState(false); // TauG hover state for tooltip

  // AG: Glucose absorption rate
  const [AG_min, setAG_min] = useState(0.7); // AG mean value
  const [AG_max, setAG_max] = useState(1.2); // AG standard deviation
  const AG_step = 0.1; // AG step size for input field
  const [AG_value, setAG_value] = useState(generateValueGivenMeanAndStdDev(AG_min, AG_max, AG_step, "uniform")); // AG initial value
  const AG_unit = "Unitless"; // AG unit
  const AG_description = "Glucose absorption rate, representing the rate at which glucose is absorbed from the gastrointestinal tract into the bloodstream.";
  const [AG_hover, setAG_hover] = useState(false); // AG hover state for tooltip

  // BW: Body weight
  const [BW_min, setBW_min] = useState(65); // BW mean value in kg
  const [BW_max, setBW_max] = useState(95); // BW standard deviation in kg
  const BW_step = 1; // BW step size for input field
  const [BW_value, setBW_value] = useState(generateValueGivenMeanAndStdDev(BW_min, BW_max, BW_step, "uniform")); // BW initial value in kg
  const BW_unit = "kg"; // BW unit
  const BW_description = "Body weight of the patient, which influences insulin sensitivity and glucose metabolism.";
  const [BW_hover, setBW_hover] = useState(false); // BW hover state for tooltip


  // MEAL PARAMETERS
  const carbs_step = 5; // Step size for carbohydrate intake in grams
  const carbs_hours = [8, 12, 16, 20]; // Meal times in hours for breakfast, lunch, snack, and dinner
  const meal_time = (i: number, time_step: number) => carbs_hours[i] * 60 / time_step; // Convert meal hours to minutes based on timeStep
  const [breakfastValue, setBreakfastValue] = useState(generateValueGivenMeanAndStdDev(40, 10, carbs_step));
  const [lunchValue, setLunchValue] = useState(generateValueGivenMeanAndStdDev(70, 15, carbs_step));
  const [snackValue, setSnackValue] = useState(generateValueGivenMeanAndStdDev(10, 35, carbs_step, "uniform"));
  const [dinnerValue, setDinnerValue] = useState(generateValueGivenMeanAndStdDev(50, 10, carbs_step));
  let carbs = [
    {
      "mealName": "Breakfast",
      "hour": "0" + carbs_hours[0] +  ":00",
      "time": meal_time(0, timeStep),
      "value": breakfastValue
    },
    {
      "mealName": "Lunch",
      "hour": carbs_hours[1] + ":00",
      "time": meal_time(1, timeStep),
      "value": lunchValue
    },
    {
      "mealName": "Snack",
      "hour": carbs_hours[2] + ":00",
      "time": meal_time(2, timeStep),
      "value": snackValue
    },
    {
      "mealName": "Dinner",
      "hour": carbs_hours[3] + ":00",
      "time": meal_time(3, timeStep),
      "value": dinnerValue
    }
  ];

  const getDCho = (days_to_repeat: number, time_step: number) => {
    const length_one_day = 24 * 60 / time_step + 1; // Length of one day in minutes based on timeStep
    //console.log("Length of one day in minutes:", length_one_day);
    const array_to_repeat = Array.from({length: length_one_day}, (_, i) => {
      for (const meal of carbs) {
        if (i === meal.time) {
          return meal.value; // Return the carbohydrate intake value for the meal at that hour
        }
      }
      return 0; // No carbohydrate intake at other times
    })
    //console.log("length of array to repeat:", array_to_repeat.length, "for", days_to_repeat, "days");
    //console.log("array to repeat:", array_to_repeat);
    return repeatArray(array_to_repeat, days_to_repeat); // Repeat the array for the specified number of days
  }

  // INSULIN PARAMETERS
  const ins_step = 0.05; // Step size for insulin values in U/h
  const basal_stdDev = ins_step * 2; // Standard deviation for basal insulin values
  const basal_hour_starts = [0, 8, 12, 20]; // Basal insulin times in hours for breakfast, lunch, snack, and dinner
  const basal_time = (i: number, time_step: number) => basal_hour_starts[i] * 60 / time_step; // Convert meal hours to minutes based on timeStep
  const [basal00, setBasal00] = useState(generateValueGivenMeanAndStdDev(1.5, basal_stdDev, ins_step));
  const [basal08, setBasal08] = useState(generateValueGivenMeanAndStdDev(1.3, 0.4, ins_step));
  const [basal12, setBasal12] = useState(generateValueGivenMeanAndStdDev(1.9, 0.1, ins_step));
  const [basal20, setBasal20] = useState(generateValueGivenMeanAndStdDev(1.7, 0.2, ins_step));
  let basal = [
    {
      "hour_start": "0" + basal_hour_starts[0] +  ":00",
      "hour_end": String(basal_hour_starts[1] - 1) + ":59",
      "time_start": basal_time(0, timeStep),
      "time_end": basal_time(1, timeStep) - 1,
      "value": basal00
    },
    {
      "hour_start": "0" + basal_hour_starts[1] + ":00",
      "hour_end": String(basal_hour_starts[2] - 1) + ":59",
      "time_start": basal_time(1, timeStep),
      "time_end": basal_time(2, timeStep) - 1,
      "value": basal08
    },
    {
      "hour_start": basal_hour_starts[2] + ":00",
      "hour_end": String(basal_hour_starts[3] - 1) + ":59",
      "time_start": basal_time(2, timeStep),
      "time_end": basal_time(3, timeStep) - 1,
      "value": basal12
    },
    {
      "hour_start": basal_hour_starts[3] + ":00",
      "hour_end": "24:00",
      "time_start": basal_time(3, timeStep),
      "time_end": timeLength, // Last minute of the day
      "value": basal20
    }
  ];

  const getUIns = (days_to_repeat: number, time_step: number) => {
    const length_one_day = 24 * 60 / time_step + 1; // Length of one day in minutes based on timeStep
    //console.log("Length of one day in minutes:", length_one_day);
    const array_to_repeat = Array.from({length: length_one_day}, (_, i) => {
      for (const slot of basal) {
        if (slot.time_start <= i && i <= slot.time_end) {
          return slot.value / (60 / timeStep); // Return the basal intake value for that hour
        }
      }
      return 0; // No basal intake at other times
    })
    //console.log("length of array to repeat:", array_to_repeat.length, "for", days_to_repeat, "days");
    //console.log("array to repeat:", array_to_repeat);
    return repeatArray(array_to_repeat, days_to_repeat); // Repeat the array for the specified number of days
  }


  const uIns_days = (days: number) => Array.from({length: 24 * days}, (_, i) => i % 24 < 7 ? 1.5 : i % 24 < 12 ? 1.3 : i % 24 < 20 ? 1.4 : 0);
  const [uIns, setUIns] = useState<number[]>(uIns_days(days));
  const [result, setResult] = useState<number[]>([]);

  const setParams = (new_value: number, name: string) => {
    if (name == "days"){
      setDays(new_value);
      setTimeLength(timeLength_days(new_value, timeStep));
      setTime(initTime(timeLength_days(new_value, timeStep)));

      console.log("Updated days or timeStep", name, "=", new_value);
    } else if (name == "timeStep") {
      setTimeStep(new_value);

      setTimeLength(timeLength_days(days, new_value));
      setTime(initTime(timeLength_days(days, new_value)));

      for (let i = 0; i < carbs.length; i++) {
        carbs[i].time = meal_time(i, new_value);
      }
      for (let i = 0; i < basal.length; i++) {
        basal[i].time_start = basal_time(i, new_value);
      }



      //setUIns(uIns_days(days));
      setResult([]);

      console.log("Updated carbs", carbs);

      console.log("Updated basal", basal);

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
        case "Ke":
          setKe_value(new_value);
          break;
        case "VI":
          setVI_value(new_value);
          break;
        case "VG":
          setVG_value(new_value);
          break;
        case "TauI":
          setTauI_value(new_value);
          break;
        case "TauG":
          setTauG_value(new_value);
          break;
        case "AG":
          setAG_value(new_value);
          break;
        case "BW":
          setBW_value(new_value);
          break;

        default:
          console.warn("Unknown parameter type:", name);
      }
    }
    console.log("Updated parameter", name, "=", new_value);
  }

  const setMeal = (mealName: string, value: number) => {
    switch (mealName) {
      case "Breakfast":
        carbs[0].value = value;
        setBreakfastValue(value);
        break;
      case "Lunch":
        carbs[1].value = value;
        setLunchValue(value);
        break;
      case "Snack":
        carbs[2].value = value;
        setSnackValue(value);
        break;
      case "Dinner":
        carbs[3].value = value;
        setDinnerValue(value);
        break;
      default:
        console.warn("Unknown meal type:", mealName);
    }
  }

  const setBasal = (hour_start: string, value: number) => {
    for (let i = 0; i < basal.length; i++) {
      if (basal[i].hour_start === hour_start) {
        basal[i].value = value;
        switch (i) {
          case 0:
            setBasal00(value);
            break;
          case 1:
            setBasal08(value);
            break;
          case 2:
            setBasal12(value);
            break;
          case 3:
            setBasal20(value);
            break;
          default:
            console.warn("Unknown basal hour:", hour_start);
        }
        break;
      }
    }
  }

  const handleExecute = () => {

    const params = {  // Parameters for the Hovorka model multiplied by timeStep or divided by timeStep as needed
      "days": days,
      "timeStep": timeStep,
      "time": time,
      "unitMgDl": unitMgDl,
      "EGP0": EGP0_value / timeStep,
      "F01": F01_value * timeStep,
      "K12": K12_value / timeStep,
      "Ka1": Ka1_value / timeStep,
      "Ka2": Ka2_value / timeStep,
      "Ka3": Ka3_value / timeStep,
      "SI1": SI1_value / timeStep,
      "SI2": SI2_value / timeStep,
      "SI3": SI3_value,
      "Ke": Ke_value / timeStep,
      "VI": VI_value,
      "VG": VG_value,
      "TauI": TauI_value * timeStep,
      "TauG": TauG_value * timeStep,
      "AG": AG_value,
      "BW": BW_value
    };

    const dCho = getDCho(days, timeStep);

    const uIns = getUIns(days, timeStep);


    //console.log("Parameters:", params);
    //console.log("Time step = ", timeStep, "minutes");
    //console.log("Time length=", timeLength, ", time.length=", time.length);
    //console.log("Carbs = ", carbs)
    //console.log("dCho=", dCho);

    //console.log("Basal insulin:", basal);
    //console.log("uIns:", uIns);

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
    /*

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

    const inputGlyc = 100 / (unitMgDl ? MwG * 10 : 1);
    const basicArray = [initMinGlyc(), inputGlyc, initMaxGlyc()];
    //const result = repeatArray(Array(8).fill(0).flatMap(() => basicArray));
    setResult(result);
    */
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
        <div className="mt-8 overflow-visible relative">
          <h2 className="text-2xl font-semibold mb-4 overflow-visible relative">Simulation Parameters</h2>
          <div className="overflow-x-auto overflow-visible relative">
            <table className="w-2/3 mx-auto border-collapse border overflow-visible relative"
                   style={{borderColor: "var(--primary)"}}>
              <thead>
              <tr className="bg-blue-950 text-white" style={{borderColor: "var(--primary)"}}>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Parameter</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Value</th>
              </tr>
              </thead>
              <tbody className="text-center">
              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>Days to simulate
                </td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <select
                    id="days"
                    name="days"
                    onChange={(e) => {
                      setParams(Number(e.target.value), "days");
                    }}
                    data-np-intersection-state="observed"
                    defaultValue={defaultDays}
                  >
                    {possibleDays.map((dayNumber) => (
                      <option key={dayNumber} value={dayNumber}>{dayNumber}</option>
                    ))}
                  </select> day{days != 1 ? "s" : ""}
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>Time step</td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <select
                    id="unit"
                    name="unit"
                    onChange={(e) => {
                      setParams(Number(e.target.value), "timeStep");
                    }}
                    data-np-intersection-state="observed"
                    defaultValue={defaultTimeStep}
                  >
                    {possibleTimeSteps.map((step) => (
                      <option key={step} value={step}>{step}</option>
                    ))}
                  </select> minute{timeStep != 1 ? "s" : ""}
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>Blood glucose
                  unit
                </td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <select
                    id="unit"
                    name="unit"
                    onChange={(e) => {
                      changeUnit(e.target.value === "mg/dL");
                    }}
                    data-np-intersection-state="observed"
                    defaultValue={unitMgDl ? "mg/dL" : "mmol/L"}
                  >
                    <option value="mmol/L">mmol/L</option>
                    <option value="mg/dL">mg/dL</option>
                  </select>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>Diabates Model</td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <select
                    id="model"
                    name="model"
                    onChange={(e) => {
                      setModelName(String(e.target.value));
                    }}
                    data-np-intersection-state="observed"
                    defaultValue={defaultModel}
                  >
                    {possibleModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>Controller</td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <select
                    id="model"
                    name="model"
                    onChange={(e) => {
                      setControllerName(String(e.target.value));
                    }}
                    data-np-intersection-state="observed"
                    defaultValue={defaultController}
                  >
                    {possibleControllers.map((controller) => (
                      <option key={controller} value={controller}>{controller}</option>
                    ))}
                  </select>
                </td>
              </tr>

              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-visible relative">
          <h2 className="text-2xl font-semibold mb-4 overflow-visible relative">Patient Parameters</h2>
          <div className="overflow-x-auto overflow-visible relative">
            <table className="min-w-full border-collapse border overflow-visible relative"
                   style={{borderColor: "var(--primary)"}}>
              <thead>
              <tr className="bg-blue-950 text-white" style={{borderColor: "var(--primary)"}}>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Parameter</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Value</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Unit</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Distribution</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Description</th>
              </tr>
              </thead>
              <tbody className="text-center">


              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>EGP</i><sub>0</sub></td>
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
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 mean"
                  onChange={(e) => setEGP0_mean(Number(e.target.value))} value={EGP0_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={EGP0_step} className="w-[6.5ch] px-1 text-right" name="EGP0 std dev"
                  onChange={(e) => setEGP0_stdDev(Number(e.target.value))} value={EGP0_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setEGP0_hover(true)}
                    onMouseLeave={() => setEGP0_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {EGP0_hover ? EGP0_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>F</i><sub>01</sub></td>
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
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={F01_step} className="w-[6.5ch] px-1 text-right" name="F01 mean"
                  onChange={(e) => setF01_mean(Number(e.target.value))} value={F01_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={F01_step} className="w-[6.5ch] px-1 text-right" name="F01 std dev"
                  onChange={(e) => setF01_stdDev(Number(e.target.value))} value={F01_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setF01_hover(true)}
                    onMouseLeave={() => setF01_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {F01_hover ? F01_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>k</i><sub>12</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={K12_value}
                    onChange={(e) => setParams(Number(e.target.value), "K12")}
                    min={K12_mean - 3 * K12_stdDev}
                    max={K12_mean + 3 * K12_stdDev}
                    step={K12_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup></td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={K12_step} className="w-[6.5ch] px-1 text-right" name="K12 mean"
                  onChange={(e) => setK12_mean(Number(e.target.value))} value={K12_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={K12_step} className="w-[6.5ch] px-1 text-right" name="K12 std dev"
                  onChange={(e) => setK12_stdDev(Number(e.target.value))} value={K12_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setK12_hover(true)}
                    onMouseLeave={() => setK12_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {K12_hover ? K12_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>k</i><sub><i>a</i>,1</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={Ka1_value}
                    onChange={(e) => setParams(Number(e.target.value), "Ka1")}
                    min={Ka1_mean - 3 * Ka1_stdDev}
                    max={Ka1_mean + 3 * Ka1_stdDev}
                    step={Ka1_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup></td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={Ka1_step} className="w-[6.5ch] px-1 text-right" name="Ka1 mean"
                  onChange={(e) => setKa1_mean(Number(e.target.value))} value={Ka1_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={Ka1_step} className="w-[6.5ch] px-1 text-right" name="Ka1 std dev"
                  onChange={(e) => setKa1_stdDev(Number(e.target.value))} value={Ka1_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setKa1_hover(true)}
                    onMouseLeave={() => setKa1_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {Ka1_hover ? Ka1_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>k</i><sub><i>a</i>,2</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={Ka2_value}
                    onChange={(e) => setParams(Number(e.target.value), "Ka2")}
                    min={Ka2_mean - 3 * Ka2_stdDev}
                    max={Ka2_mean + 3 * Ka2_stdDev}
                    step={Ka2_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup></td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={Ka2_step} className="w-[6.5ch] px-1 text-right" name="Ka2 mean"
                  onChange={(e) => setKa2_mean(Number(e.target.value))} value={Ka2_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={Ka2_step} className="w-[6.5ch] px-1 text-right" name="Ka2 std dev"
                  onChange={(e) => setKa2_stdDev(Number(e.target.value))} value={Ka2_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setKa2_hover(true)}
                    onMouseLeave={() => setKa2_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {Ka2_hover ? Ka2_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>k</i><sub><i>a</i>,3</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={Ka3_value}
                    onChange={(e) => setParams(Number(e.target.value), "Ka3")}
                    min={Ka3_mean - 3 * Ka3_stdDev}
                    max={Ka3_mean + 3 * Ka3_stdDev}
                    step={Ka3_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup></td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={Ka3_step} className="w-[6.5ch] px-1 text-right" name="Ka3 mean"
                  onChange={(e) => setKa3_mean(Number(e.target.value))} value={Ka3_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={Ka3_step} className="w-[6.5ch] px-1 text-right" name="Ka3 std dev"
                  onChange={(e) => setKa3_stdDev(Number(e.target.value))} value={Ka3_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setKa3_hover(true)}
                    onMouseLeave={() => setKa3_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {Ka3_hover ? Ka3_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>S</i><sub><i>I</i>,1</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={SI1_value}
                    onChange={(e) => setParams(Number(e.target.value), "SI1")}
                    min={SI1_mean - 3 * SI1_stdDev}
                    max={SI1_mean + 3 * SI1_stdDev}
                    step={SI1_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup> / (mU
                  / L)
                </td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={SI1_step} className="w-[6.5ch] px-1 text-right" name="SI1 mean"
                  onChange={(e) => setSI1_mean(Number(e.target.value))} value={SI1_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={SI1_step} className="w-[6.5ch] px-1 text-right" name="SI1 std dev"
                  onChange={(e) => setSI1_stdDev(Number(e.target.value))} value={SI1_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setSI1_hover(true)}
                    onMouseLeave={() => setSI1_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {SI1_hover ? SI1_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>S</i><sub><i>I</i>,2</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={SI2_value}
                    onChange={(e) => setParams(Number(e.target.value), "SI2")}
                    min={SI2_mean - 3 * SI2_stdDev}
                    max={SI2_mean + 3 * SI2_stdDev}
                    step={SI2_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup> / (mU
                  / L)
                </td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={SI2_step} className="w-[6.5ch] px-1 text-right" name="SI2 mean"
                  onChange={(e) => setSI2_mean(Number(e.target.value))} value={SI2_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={SI2_step} className="w-[6.5ch] px-1 text-right" name="SI2 std dev"
                  onChange={(e) => setSI2_stdDev(Number(e.target.value))} value={SI2_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setSI2_hover(true)}
                    onMouseLeave={() => setSI2_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {SI2_hover ? SI2_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>S</i><sub><i>I</i>,3</sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={SI3_value}
                    onChange={(e) => setParams(Number(e.target.value), "SI3")}
                    min={SI3_mean - 3 * SI3_stdDev}
                    max={SI3_mean + 3 * SI3_stdDev}
                    step={SI3_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{SI3_unit}</td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={SI3_step} className="w-[6.5ch] px-1 text-right" name="SI3 mean"
                  onChange={(e) => setSI3_mean(Number(e.target.value))} value={SI3_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={SI3_step} className="w-[6.5ch] px-1 text-right" name="SI3 std dev"
                  onChange={(e) => setSI3_stdDev(Number(e.target.value))} value={SI3_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setSI3_hover(true)}
                    onMouseLeave={() => setSI3_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {SI3_hover ? SI3_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>k</i><sub><i>e</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={Ke_value}
                    onChange={(e) => setParams(Number(e.target.value), "Ke")}
                    min={Ke_mean - 3 * Ke_stdDev}
                    max={Ke_mean + 3 * Ke_stdDev}
                    step={Ke_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>min<sup>-1</sup></td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={Ke_step} className="w-[6.5ch] px-1 text-right" name="Ke mean"
                  onChange={(e) => setKe_mean(Number(e.target.value))} value={Ke_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={Ke_step} className="w-[6.5ch] px-1 text-right" name="Ke std dev"
                  onChange={(e) => setKe_stdDev(Number(e.target.value))} value={Ke_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setKe_hover(true)}
                    onMouseLeave={() => setKe_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {Ke_hover ? Ke_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>V</i><sub><i>I</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={VI_value}
                    onChange={(e) => setParams(Number(e.target.value), "VI")}
                    min={VI_mean - 3 * VI_stdDev}
                    max={VI_mean + 3 * VI_stdDev}
                    step={VI_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{VI_unit}</td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>~ <i>N</i> ({<input
                  type="text" step={VI_step} className="w-[6.5ch] px-1 text-right" name="VI mean"
                  onChange={(e) => setVI_mean(Number(e.target.value))} value={VI_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={VI_step} className="w-[6.5ch] px-1 text-right" name="VI std dev"
                  onChange={(e) => setVI_stdDev(Number(e.target.value))} value={VI_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setVI_hover(true)}
                    onMouseLeave={() => setVI_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {VI_hover ? VI_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>V</i><sub><i>G</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={VG_value}
                    onChange={(e) => setParams(Number(e.target.value), "VG")}
                    min={VG_mean - 3 * VG_stdDev}
                    max={VG_mean + 3 * VG_stdDev}
                    step={VG_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{VG_unit}</td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}>exp(<i>V</i><sub><i>G</i></sub>) ~ <i>N</i> ({<input
                  type="text" step={VG_step} className="w-[6.5ch] px-1 text-right" name="VG mean"
                  onChange={(e) => setVG_mean(Number(e.target.value))} value={VG_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={VG_step} className="w-[6.5ch] px-1 text-right" name="VG std dev"
                  onChange={(e) => setVG_stdDev(Number(e.target.value))} value={VG_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setVG_hover(true)}
                    onMouseLeave={() => setVG_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {VG_hover ? VG_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>&tau;</i><sub><i>I</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={TauI_value}
                    onChange={(e) => setParams(Number(e.target.value), "TauI")}
                    min={TauI_mean - 3 * TauI_stdDev}
                    max={TauI_mean + 3 * TauI_stdDev}
                    step={TauI_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{TauI_unit}</td>
                <td className="border border px-4 py-2 text-right" style={{borderColor: "var(--primary)"}}>
                  <sup>1</sup> &frasl; <sub><i>&tau;</i><sub><i>I</i></sub></sub> ~ <i>N</i> ({<input
                  type="text" step={TauI_step} className="w-[6.5ch] px-1 text-right" name="TauI mean"
                  onChange={(e) => setTauI_mean(Number(e.target.value))} value={TauI_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={TauI_step} className="w-[6.5ch] px-1 text-right" name="TauI std dev"
                  onChange={(e) => setTauI_stdDev(Number(e.target.value))} value={TauI_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setTauI_hover(true)}
                    onMouseLeave={() => setTauI_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {TauI_hover ? TauI_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>&tau;</i><sub><i>G</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={TauG_value}
                    onChange={(e) => setParams(Number(e.target.value), "TauG")}
                    min={TauG_mean - 3 * TauG_stdDev}
                    max={TauG_mean + 3 * TauG_stdDev}
                    step={TauG_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{TauG_unit}</td>
                <td className="border border px-4 py-2 text-right" style={{borderColor: "var(--primary)"}}>
                  <sup>1</sup> &frasl; <sub>ln(<i>&tau;</i><sub><i>G</i></sub>)</sub> ~ <i>N</i> ({<input
                  type="text" step={TauG_step} className="w-[6.5ch] px-1 text-right" name="TauG mean"
                  onChange={(e) => setTauG_mean(Number(e.target.value))} value={TauG_mean}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={TauG_step} className="w-[6.5ch] px-1 text-right" name="TauG std dev"
                  onChange={(e) => setTauG_stdDev(Number(e.target.value))} value={TauG_stdDev}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setTauG_hover(true)}
                    onMouseLeave={() => setTauG_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {TauG_hover ? TauG_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>
                  <i>A</i><sub><i>G</i></sub></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={AG_value}
                    onChange={(e) => setParams(Number(e.target.value), "AG")}
                    min={AG_min - 3 * AG_max}
                    max={AG_min + 3 * AG_max}
                    step={AG_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{AG_unit}</td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}> ~ <i>U</i> ({<input
                  type="text" step={AG_step} className="w-[3.5ch] px-1 text-right" name="AG min"
                  onChange={(e) => setAG_min(Number(e.target.value))} value={AG_min}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={AG_step} className="w-[3.5ch] px-1 text-right" name="AG max"
                  onChange={(e) => setAG_max(Number(e.target.value))} value={AG_max}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setAG_hover(true)}
                    onMouseLeave={() => setAG_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {AG_hover ? AG_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              <tr>
                <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}><i>BW</i></td>
                <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                  <input
                    type="number"
                    value={BW_value}
                    onChange={(e) => setParams(Number(e.target.value), "BW")}
                    min={BW_min - 3 * BW_max}
                    max={BW_min + 3 * BW_max}
                    step={BW_step}
                    data-np-intersection-state="observed"
                    className="w-[8ch] px-1 text-right"
                  />
                </td>
                <td className="border border px-4 py-2" style={{borderColor: "var(--primary)"}}>{BW_unit}</td>
                <td className="border border px-4 py-2 text-right"
                    style={{borderColor: "var(--primary)"}}> ~ <i>U</i> ({<input
                  type="text" step={BW_step} className="w-[3.5ch] px-1 text-right" name="BW min"
                  onChange={(e) => setBW_min(Number(e.target.value))} value={BW_min}
                  data-np-intersection-state="observed"/>}, {<input
                  type="text" step={BW_step} className="w-[3.5ch] px-1 text-right" name="BW max"
                  onChange={(e) => setBW_max(Number(e.target.value))} value={BW_max}
                  data-np-intersection-state="observed"/>}<sup>2</sup>)
                </td>
                <td className="border px-4 py-2 text-center relative w-20" style={{borderColor: "var(--primary)"}}>
                  <div
                    onMouseEnter={() => setBW_hover(true)}
                    onMouseLeave={() => setBW_hover(false)}
                    className="cursor-help relative overflow-visible text-lg"
                    style={{borderColor: "var(--primary)", color: "var(--primary)"}}
                  >
                    {BW_hover ? BW_description : <b>?</b>}
                  </div>
                </td>
              </tr>

              </tbody>
            </table>
          </div>
        </div>


        <div className="mt-8 overflow-visible relative">
          <h2 className="text-2xl font-semibold mb-4 overflow-visible relative">Carbohydrate Intake</h2>
          <div className="overflow-x-auto overflow-visible relative">
            <table className="w-2/3 mx-auto border-collapse border overflow-visible relative"
                   style={{borderColor: "var(--primary)"}}>
              <thead>
              <tr className="bg-blue-950 text-white" style={{borderColor: "var(--primary)"}}>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Meal</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Time</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Value [g]</th>
              </tr>
              </thead>
              <tbody className="text-center">

              {carbs.map((meal, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>{meal.mealName}</td>
                  <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>{meal.hour}</td>
                  <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                    <input
                      type="number"
                      value={
                        meal.mealName === "Breakfast" ? breakfastValue :
                          meal.mealName === "Lunch" ? lunchValue :
                            meal.mealName === "Snack" ? snackValue :
                              meal.mealName === "Dinner" ? dinnerValue : 0
                      }
                      onChange={(e) => setMeal(meal.mealName, Number(e.target.value))}
                      min={0}
                      max={150}
                      step={carbs_step}
                      data-np-intersection-state="observed"
                      className="w-[5.7ch] px-1 text-right"
                    /> g
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-visible relative">
          <h2 className="text-2xl font-semibold mb-4 overflow-visible relative">Insulin Intake</h2>
          <div className="overflow-x-auto overflow-visible relative">
            <table className="w-2/3 mx-auto border-collapse border overflow-visible relative"
                   style={{borderColor: "var(--primary)"}}>
              <thead>
              <tr className="bg-blue-950 text-white" style={{borderColor: "var(--primary)"}}>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Start Time</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>End Time</th>
                <th className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>Value [U/h]</th>
              </tr>
              </thead>
              <tbody className="text-center">

              {basal.map((slot, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2 font-bold" style={{borderColor: "var(--primary)"}}>{slot.hour_start}</td>
                  <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>{slot.hour_end}</td>
                  <td className="border px-4 py-2" style={{borderColor: "var(--primary)"}}>
                    <input
                      type="number"
                      value={
                        slot.hour_start === "0" + basal_hour_starts[0] + ":00" ? basal00 :
                          slot.hour_start === "0" + basal_hour_starts[1] + ":00" ? basal08 :
                            slot.hour_start === basal_hour_starts[2] + ":00" ? basal12 :
                              slot.hour_start === basal_hour_starts[3] + ":00" ? basal20 : 0
                      }
                      onChange={(e) => setBasal(slot.hour_start, Number(e.target.value))}
                      min={0}
                      max={2.5}
                      step={ins_step}
                      data-np-intersection-state="observed"
                      className="w-[6.7ch] px-1 text-left"
                    /> U/h
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 overflow-visible relative">
          <button
            onClick={handleExecute}
            className="mt-4 px-4 py-2.5 text-base font-extrabold rounded-full w-full cursor-pointer"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--secondary)",
              fontSize: "22px",
            }}
          >
            Simulate
          </button>
        </div>

        {result.length > 0 && (
          <div className="mt-8 overflow-visible relative">
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

      <div className="mt-8 overflow-visible relative"></div>

      <footer
        className="absolute mt-8 bottom-4 right-4 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        style={{borderColor: "var(--primary)", color: "var(--primary)"}}
        onClick={() => window.open('https://github.com/federicomarra', '_blank', 'noopener,noreferrer')}
      >
        developed by Federico Marra
      </footer>
    </section>
  );
};

export default Home;