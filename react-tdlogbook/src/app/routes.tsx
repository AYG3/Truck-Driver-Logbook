import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { TripPlannerPage } from "../features/trip-planner/TripPlannerPage";
import { TripStatus } from "../features/trip-planner/TripStatus";
import { LogViewer } from "../features/logbook/LogViewer";
import { Dashboard } from "../features/dashboard/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "trips",
        children: [
          {
            index: true,
            element: <TripPlannerPage />,
          },
          {
            path: ":tripId",
            element: <TripStatus />,
          },
        ],
      },
      {
        path: "logs",
        children: [
          {
            index: true,
            element: <LogViewer />,
          },
          {
            path: ":tripId",
            element: <LogViewer />,
          },
        ],
      },
    ],
  },
]);
