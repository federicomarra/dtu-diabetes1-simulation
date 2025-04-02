import { HovorkaModel } from "@/app/HovorkaModel";
import { describe, beforeEach, it, expect, test } from '@jest/globals';
import {ModelType} from "@/app/types";

describe("Hovorka Model test", () => {

  test("should return a new instance of HovorkaModel", () => {
    const model = new HovorkaModel();
    expect(model).not.toBeNull();
    expect(model).not.toBeUndefined();

    const result = simulate(model);

    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result?.length).toBe(3);

    printGlycemia(result);
  });

  function simulate(model: HovorkaModel): number[] | null {
    const time = [0, 1, 2];
    const Gstart = 5;
    const dCho = [50, 60, 70];
    const uIns = [1, 2, 3];
    const glycemia = model.simulate(time, Gstart, dCho, uIns);
    expect(glycemia).not.toBeNull();
    expect(glycemia).not.toBeUndefined();
    printGlycemia(glycemia);
    return glycemia;
  }

  function printGlycemia(glycemia: number[] | null) {
    if (glycemia){
      for (let i = 0; i < glycemia.length; i++) {
        expect(glycemia[i]).not.toBeNaN();
        expect(glycemia[i]).toBeGreaterThan(0);
        console.log(glycemia[i]);
      }
    }
  }

  // @ts-ignore
  let model: HovorkaModel;

  beforeEach(() => {
    // @ts-ignore
    model = new HovorkaModel({});
  });

  it("simulate should return the new glucose level", () => {

  });

});