import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy } from "react";

const AppDesk = lazy(() =>
  import("../desks/app/AppDesk").then((module) => ({ default: module.AppDesk }))
);
const HealthPage = lazy(() =>
  import("../public/health/HealthPage").then((module) => ({ default: module.HealthPage }))
);
const LoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const ConnectPage = lazy(() =>
  import("../public/connect/ConnectPage").then((module) => ({ default: module.ConnectPage }))
);
const LandingLoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LandingLoginPage }))
);
const SuperAdminLoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.SuperAdminLoginPage }))
);
const SaDesk = lazy(() =>
  import("../desks/sa/SaDesk").then((module) => ({ default: module.SaDesk }))
);

const rootRoute = createRootRoute();
const routeTree = rootRoute.addChildren([
  createRoute({ component: LandingLoginPage, getParentRoute: () => rootRoute, path: "/" }),
  createRoute({ component: HealthPage, getParentRoute: () => rootRoute, path: "/status" }),
  createRoute({ component: LoginPage, getParentRoute: () => rootRoute, path: "/login" }),
  createRoute({ component: ConnectPage, getParentRoute: () => rootRoute, path: "/connect" }),
  createRoute({ component: SuperAdminLoginPage, getParentRoute: () => rootRoute, path: "/sa/login" }),
  createRoute({ component: SaDesk, getParentRoute: () => rootRoute, path: "/sa" }),
  createRoute({ component: SaDesk, getParentRoute: () => rootRoute, path: "/sa/$" }),
  createRoute({ component: AppDesk, getParentRoute: () => rootRoute, path: "/app/$" })
]);

export const router = createRouter({ routeTree });
