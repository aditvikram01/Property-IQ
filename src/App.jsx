import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import Home from "./pages/Home";
import Eligibility from "./pages/Eligibility";
import CompareCosts from "./pages/CompareCosts";
import Toolkit from "./pages/Toolkit";
import DecodeContract from "./pages/DecodeContract";

export default function App() {
  // Tab keys match the redesigned pages' own navigation:
  // home · eligibility · contract (Decode Contract) · costs (Compare Costs) · toolkit.
  const [tab, setTab] = useState("home");

  // Each page is a full-height view with its own header; jump to the top on switch.
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  return (
    <div className="app">
      {tab === "home" && <Home onNavigate={setTab} />}
      {tab === "eligibility" && <Eligibility onNavigate={setTab} />}
      {tab === "contract" && <DecodeContract onNavigate={setTab} />}
      {tab === "costs" && <CompareCosts onNavigate={setTab} />}
      {tab === "toolkit" && <Toolkit onNavigate={setTab} />}
      <Analytics />
    </div>
  );
}
