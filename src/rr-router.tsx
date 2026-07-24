import { Navigate, type RouteObject } from "react-router-dom";

import Home from "@/pages/Home";
import Legacy2021 from "@/pages/Legacy2021";
import Grading from "@/pages/Grading";
import SelfQuery from "@/pages/SelfQuery";
import ProjectList from "@/pages/ProjectList";
import ProjectDetail from "@/pages/ProjectDetail";

export const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/legacy-2021", element: <Legacy2021 /> },
  { path: "/grading", element: <Grading /> },
  { path: "/query", element: <SelfQuery /> },
  { path: "/projects", element: <ProjectList /> },
  { path: "/projects/:id", element: <ProjectDetail /> },
  { path: "*", element: <Navigate to="/" replace /> },
];
