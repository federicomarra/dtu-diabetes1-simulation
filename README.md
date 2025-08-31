# DTU Diabetes 1 Simulation

[![TypeScript](https://img.shields.io/badge/Typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)](https://nodejs.org/)
[![React.js](https://img.shields.io/badge/-ReactJs-61DAFB?logo=react&logoColor=blue&style=for-the-badge)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Mui](https://img.shields.io/badge/Material%20UI-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/material-ui/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)


[![GitHub last commit](https://img.shields.io/github/last-commit/federicomarra/dtu-diabetes1-simulation?style=for-the-badge)](https://github.com/federicomarra/dtu-diabetes1-simulation/commits/master/)
[![GitHub repo size](https://img.shields.io/github/repo-size/federicomarra/dtu-diabetes1-simulation?style=for-the-badge)](https://github.com/federicomarra/dtu-diabetes1-simulation)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/federicomarra/dtu-diabetes1-simulation?style=for-the-badge&logo=github&color=ED8B00)](https://github.com/federicomarra/dtu-diabetes1-simulation/releases)

This project implements a diabetes type 1 simulator based on the Hovorka model. The simulator is designed to test different control strategies for insulin delivery in type 1 diabetes patients.

The project is versioned on GitHub at **[github.com/federicomarra/dtu-diabetes1-simulation](https://github.com/federicomarra/dtu-diabetes1-simulation)**

The project is hosted on Vercel at **[dtu-diabetes1-simulation.vercel.app](https://dtu-diabetes1-simulation.vercel.app/)**

## Project Structure

The simulator is organized into the following components:

- `app/page.tsx`: Main page component that provides the user interface and visualization of the simulation
- `app/HovorkaModel.tsx`: Implementation of the Hovorka model ordinary differential equations
- `app/Simulator.ts`: Main simulator implementation that handles the simulation loop and integrates all components
- `app/Controller.ts`: Different control strategies (P, PD, PI, PID controllers)
- `app/SolverRK4.ts`: 4th order Runge-Kutta numerical solver
- `app/types.ts`: TypeScript type definitions used throughout the project

## Technical Prerequisites

Before running the project locally, ensure you have `Node.js` installed on your system. You can download it
from **[nodejs.org](https://nodejs.org/)**.

This project has been developed with version `15.2.0`, but any newer should still work.

## Local Setup

To run the project locally on your computer:

1. **Clone the repository from GitHub**
   1. Clone via terminal with the commands:
      ```bash
      git clone https://github.com/federicomarra/dtu-diabetes1-simulation.git
      cd dtu-diabetes1-simulation
      ```
   1. Or [download the project here](https://github.com/federicomarra/dtu-diabetes1-simulation/archive/refs/heads/main.zip), unzip it and open the terminal in the folder.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)**

## Credits

The project was developed by Federico Marra as part of a specialcourse at Technical University of Denmark (DTU).

### Author

- **Federico Marra** - Main and only developer and researcher, student id: 243138

### Acknowledgments

- **John Bagterp Jørgensen** from Technical University of Denmark (DTU) - For providing resources and support.
- **Roman Hovorka** - For the original mathematical model of type 1 diabetes.
- **Dimitri Boiroux** - For providing explanation to the Hovorka model in his PhD Thesis "Model Predictive Control Algorithms for Pen and Pump Insulin Administration".
- [**Loopinsight1**](https://lt1.org/open-source/) - For providing good ideas on development.