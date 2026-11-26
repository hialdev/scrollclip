import { useState } from "react";
import { WIZARD_STEPS, type EditMode } from "./lib/types";
import ModeSelect from "./components/ModeSelect";

export default function App() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<EditMode | null>(null);

  const canNext = step === 0 ? mode !== null : true;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          Scroll<span>Clip</span>
        </div>
        <nav className="stepper">
          {WIZARD_STEPS.map((label, i) => (
            <span key={label} style={{ display: "contents" }}>
              <span
                className={`step-chip ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              >
                <span className="dot">{i < step ? "✓" : i + 1}</span>
                {label}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <span className="step-arrow">→</span>
              )}
            </span>
          ))}
        </nav>
      </header>

      <main className="content">
        {step === 0 && (
          <ModeSelect selected={mode} onSelect={(m) => setMode(m)} />
        )}
        {step === 1 && <div className="step-title">Sources</div>}
        {step === 2 && <div className="step-title">Audio &amp; Subs</div>}
        {step === 3 && <div className="step-title">Kinetic Style</div>}
        {step === 4 && <div className="step-title">Process</div>}
      </main>

      <footer className="footer">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        <button
          className="primary"
          onClick={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
          disabled={!canNext || step === WIZARD_STEPS.length - 1}
        >
          Next
        </button>
      </footer>
    </div>
  );
}
