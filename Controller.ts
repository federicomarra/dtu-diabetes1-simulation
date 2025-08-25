export function Controller(name: string, controllerParameters: any, timeStep: number, desired: number, y: number[]) {

  const param = name === "P" || name === "PD" || name === "PI" || name === "PID" ? controllerParameters.PID :
    (name === "EKF" ? controllerParameters.EFK :
      (name === "MPC" ? controllerParameters.MPC : {}));

  const n: number = y.length;
  const err: number = n > 0 ? y[n - 1] - desired : 0;
  const errPrev: number = n > 1 ? y[n - 2] - desired : 0;

  //console.log(name, "error:", err);
  //console.log("y:", y);
  //console.log(name, "error:", err);


  let u: number = 0;

  switch (name.toUpperCase()) {
    case "P":   // Proportional controller
    case "PD":  // Proportional derivative controller
    case "PI":  // Proportional integrative controller
    case "PID": // Proportional integrative derivative controller
      // Integral sum of previous errors
      const integral_err: number = name === "PI" || name === "PID" ? y.reduce((acc, _, i) => {
        return acc + (y[i] - desired);
      }, 0) : 0;

      const derivative_err = name === "PD" || name === "PID" ? err - errPrev : 0;

      //console.log(name, "integral_err:", integral_err);
      //console.log(name, "derivative_err:", derivative_err);

      u =
        param.Kp * err +                          // Proportional
        param.Kd * derivative_err / timeStep +    // Derivative
        param.Ki * integral_err * timeStep;       // Integrative

      break;


    

    default:
      throw new Error("Controller type not recognised");
  }

  //console.log(name, "control:", u);

  return u;
}