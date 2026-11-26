import { useState } from "react";
import { WIZARD_STEPS, type EditMode, type ProjectConfig, EDIT_MODES } from "./lib/types";
import type { Project } from "./lib/api";
import ModeSelect from "./components/ModeSelect";
import ProjectList from "./components/ProjectList";

interface Draft {
  project: Project | null;
  mode: EditMode | null;
  config: ProjectConfig;
}

export default function App() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);

  const openProject = (project: Project) => {
    setDraft({ project, mode: project.mode, config: project.config });
    setStep(0);
  };
  const backToList = () => setDraft(null);

  const saveConfig = async (config: ProjectConfig, mode: EditMode | null, project: Project | null) => {
    if (!project || !mode) return;
    const { updateProject } = await import("./lib/api");
    const updated = { ...project, mode, config };
    setDraft({ project: updated, mode, config });
    updateProject(updated).catch(() => {});
  };

  // ---- Home (project list) ----
  if (!draft) {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">
            Scroll<span>Clip</span>
          </div>
        </header>
        <main className="content">
          <ProjectList onOpen={openProject} />
        </main>
      </div>
    );
  }

  // ---- Wizard ----
  const { project: proj, mode, config } = draft;
  const project = proj!;
  const canNext = step === 0 ? mode !== null : true;
  const modeTitle = mode ? EDIT_MODES.find((m) => m.id === mode)?.title : "";

  return (
    <div className="app">
      <header className="header">
        <button onClick={backToList} title="Back to projects">
          ←
        </button>
        <div className="logo">
          Scroll<span>Clip</span>
          <span className="project-badge">{project.title}</span>
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
              {i < WIZARD_STEPS.length - 1 && <span className="step-arrow">→</span>}
            </span>
          ))}
        </nav>
      </header>

      <main className="content">
        {step === 0 && (
          <ModeSelect
            selected={mode}
            onSelect={(m) => saveConfig(config, m, project)}
          />
        )}
        {step === 1 && <div className="step-title">Sources — {modeTitle}</div>}
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
