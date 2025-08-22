export function Controller(name: string, controllerParameters: any, timeStep: number, desired: number, y: number[]) {

  const param = name === "P" || name === "PD" || name === "PI" || name === "PID" ? controllerParameters.PID :
    (name === "EKF" ? controllerParameters.EFK :
      (name === "MPC" ? controllerParameters.MPC : {}));


  const n: number = y.length;
  const err: number = n > 0 ? desired - y[n - 1] : 0;
  const errPrev: number = n > 1 ? desired - y[n - 2] : 0;

  let u: number = 0;

  switch (name.toUpperCase()) {
    case "P":   // Proportional controller
    case "PD":  // Proportional derivative controller
    case "PI":  // Proportional integrative controller
    case "PID": // Proportional integrative derivative controller
      // Integral sum of previous errors
      const integral_err: number = name === "PI" || name === "PID" ? y.reduce((acc, _, i) => {
        return acc + (desired - y[i]);
      }, 0) : 0;

      const derivative_err = name === "PD" || name === "PID" ? err - errPrev : 0;

      u =
        param.Kp * err +                          // Proportional
        param.Kd * derivative_err / timeStep +    // Derivative
        param.Ki * integral_err * timeStep;       // Integrative

      break;


    /*
    case "EKF":
      const A: number = param.A || 1; // State transition matrix
      const B: number = param.B || 1; // Control input matrix
      const C = param.C || 1; // Measurement matrix
      const Q_Kalman = param.Q || 1e-3; // Process noise covariance (smaller value for more trust in model)
      const R_Kalman = param.R || 0.1; // Measurement noise covariance (smaller value for more trust in measurements)

      if (!param.P) {
        console.error("Initial error covariance P must be provided for Kalman filter");
      }

      // Get current state and input
      const x = y[n - 1];
      const u_prev = n > 1 ? y[n - 2] : 0;

      // Calculate Jacobians
      const F = A + B * Math.sin(x); // Jacobian of state transition
      const H = C * Math.cos(x); // Jacobian of measurement function

      // Predict state
      const xPred = A * x + B * Math.sin(x) * u_prev;
      const pPred = F * param.P * F + Q_Kalman;

      // Update state
      const innovation = desired - (C * x + H * xPred);
      const S = H * pPred * H + R_Kalman;
      const K_gain = pPred * H / S;

      const xEst = xPred + K_gain * innovation;
      param.P = (1 - K_gain * H) * pPred; // Update error covariance

      // Calculate control output
      u = param.Kp * (desired - xEst);
      break;
   

    case "MPC":
      const horizon = param.horizon || 10; // Prediction horizon
      const controlHorizon = param.controlHorizon || 5; // Control horizon
      const Q_MPC = param.Q || 1; // State weight
      const R_MPC = param.R || 0.1; // Control weight

      // Get the current state from past measurements
      const currentState = y[n - 1];

      // Initialize optimization variables
      let bestU = 0;
      let minCost = Infinity;

      // Simple gradient descent optimization
      const learningRate = 0.1;
      const iterations = 100;
      let tempU = 0;

      for (let i = 0; i < iterations; i++) {
        let cost = 0;
        let predictedState = currentState;

        // Simulate the system forward over prediction horizon
        for (let j = 0; j < horizon; j++) {
          // Simple linear prediction model
          const controlInput = j < controlHorizon ? tempU : 0;
          predictedState = predictedState + controlInput * timeStep;

          // Calculate cost (tracking error and control effort)
          cost += Q_MPC * Math.pow(desired - predictedState, 2) +
            R_MPC * Math.pow(controlInput, 2);
        }

        // Update the best solution if current cost is lower
        if (cost < minCost) {
          minCost = cost;
          bestU = tempU;
        }

        // Update control input using gradient descent
        tempU -= learningRate * (cost - minCost);
      }

      u = bestU;
      break;


     */

    default:
      throw new Error("Controller type not recognised");
  }

  console.log(name, "control:", u);

  return u;
}