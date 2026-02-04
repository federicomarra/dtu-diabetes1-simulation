export function Controller(name: string, controllerParameters: any, timeStep: number, desired: number, y: number[], basal: number) {

  const param = name === "P" || name === "PD" || name === "PI" || name === "PID" ? controllerParameters.PID : {};

  const min: number = controllerParameters.min;
  const max: number = controllerParameters.max;

  const n: number = y.length;
  const err: number = n > 0 ? y[n - 1] - desired : 0;
  const errPrev: number = n > 1 ? y[n - 2] - desired : 0;

  //console.log(name, "error:", err);
  //console.log("y:", y);
  //console.log(name, "error:", err);


  let u_diff: number = 0;

  switch (name.toUpperCase()) {
    case "P":   // Proportional controller
    case "PD":  // Proportional derivative controller
    case "PI":  // Proportional integrative controller
    case "PID": // Proportional integrative derivative controller

      // Proportional
      const P = param.Kp * err;

      // Integrative
      const integral_err: number =  y.reduce((acc, _, i) => {
        return acc + (y[i] - desired);  // Integral sum of all previous errors
      }, 0);
      const I = name === "PI" || name === "PID" ? param.Ki * integral_err * timeStep : 0;

      // Derivative
      const D = name === "PD" || name === "PID" ? param.Kd * (err - errPrev) / timeStep : 0;

      u_diff = P + I + D;
      console.log(name, "control DIFF:", u_diff);

      break;


    default:
      console.error("Controller", name, "not supported yet");
  }
  console.log(name, "BASAL:", basal);
  const u_insulin = (u_diff / param.InsulinSensitivity ) + basal;
  console.log(name, "control INSUL:", u_insulin);
  const u_bound = Math.max(min, Math.min(max, u_insulin));
  console.log(name, "control BOUND:", u_bound);

  const u = u_bound / 1000;  // [mU/min]

  return u;
}