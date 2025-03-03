import Image from "next/image";
import { NextPage } from "next";

export default function Home() {
  return (
    <section className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Course Description</h1>
      <p className="mb-4">
        In this project we develop simulation and control software for diabetes technology. The main focus will be related to simulation models, user\-experiences, and web\-enabled user interfaces. We will study numerical algorithms for simulation in web\-enabled programming languages such as JavaScript/TypeScript. In this respect we will seek inspiration in both lt1\.org and t2d\.aau\.dk. We will apply full stack development (html/css/JavaScript/TypeScript) and scientific computing for simulation to diabetes applications.
      </p>
      <h2 className="text-2xl font-semibold mb-2">Activities</h2>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          Literature study and software architecture. We will investigate the lt1\.org and t2d\.aau\.dk open\-source software.
        </li>
        <li>
          Modeling and simulation of diabetes models (JavaScript/TypeScript).
        </li>
        <li>
          Controllers for automated insulin dosing (AID) and closed\-loop simulation. We will use very simple controllers and only dig deep into this if time permits.
        </li>
        <li>
          GUI (web\-based using HTML/CSS/JavaScript/TypeScript).
        </li>
        <li>Documentation.</li>
        <li>
          Presentation and dissemination (slides/oral/demonstration/software/code).
        </li>
      </ol>
      <p className="mt-4">
        We will make a project plan in the beginning of the project and scientific software project management is part of the learning objectives.
      </p>
    </section>
  );
}
