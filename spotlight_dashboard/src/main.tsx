import { createRoot } from "react-dom/client";

if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const path = window.location.pathname.slice(base.length) || "/";
const root = createRoot(document.getElementById("root")!);

if (/^\/student(\/|$)/.test(path)) {
  import("./student/main.tsx").then((m) => m.mountStudentApp(root));
} else {
  import("./app/mountDashboard.tsx").then((m) => m.mountDashboard(root));
}
