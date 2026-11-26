import { useState } from "react";
import { Icon } from "@iconify/react";
import { Box, Button, IconButton, Step, StepButton, Stepper, Tooltip, Typography } from "@mui/material";
import { WIZARD_STEPS, type EditMode, type ProjectConfig } from "./lib/types";
import { updateProject, type Project } from "./lib/api";
import ModeSelect from "./components/ModeSelect";
import ProjectList from "./components/ProjectList";
import Sources from "./components/Sources";
import AudioSubtitle from "./components/AudioSubtitle";
import KineticStyle from "./components/KineticStyle";
import Process from "./components/Process";

interface Draft {
  project: Project;
  mode: EditMode | null;
  config: ProjectConfig;
}

function HeaderTitle({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.title);

  const commit = () => {
    setEditing(false);
    const t = value.trim();
    if (t && t !== project.title) {
      updateProject({ ...project, title: t }).catch(() => {});
      window.dispatchEvent(new CustomEvent("scrollclip:renamed", { detail: { id: project.id, title: t } }));
    } else {
      setValue(project.title);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(project.title);
            setEditing(false);
          }
        }}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: "2px solid #4cc0ce",
          color: "inherit",
          font: "inherit",
          fontWeight: 800,
          fontSize: "1rem",
          outline: "none",
        }}
      />
    );
  }
  return (
    <Tooltip title="Double-click to rename">
      <Typography
        variant="h6"
        component="span"
        onDoubleClick={() => {
          setValue(project.title);
          setEditing(true);
        }}
        sx={{ cursor: "text", userSelect: "none" }}
      >
        {project.title}
      </Typography>
    </Tooltip>
  );
}

export default function App() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);

  const openProject = (project: Project) => {
    setDraft({ project, mode: project.mode, config: project.config });
    setStep(0);
  };
  const backToList = () => setDraft(null);

  const saveConfig = (config: ProjectConfig, mode: EditMode | null, project: Project) => {
    const p = mode ? { ...project, mode } : project;
    setDraft({ project: p, mode, config });
    if (mode) updateProject({ ...p, mode, config }).catch(() => {});
  };

  // ---- Home (project list) ----
  if (!draft) {
    return (
      <Box className="app">
        <header className="header">
          <span className="logo-mark">
            <Icon icon="lucide:clapperboard" width={18} height={18} />
          </span>
          <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
            Scroll<span style={{ color: "#4cc0ce" }}>Clip</span>
          </Typography>
        </header>
        <main className="content">
          <ProjectList onOpen={openProject} />
        </main>
      </Box>
    );
  }

  // ---- Wizard ----
  const { project, mode, config } = draft;
  const canNext = step !== 0 || mode !== null;

  return (
    <Box className="app">
      <header className="header">
        <Tooltip title="Back to projects">
          <IconButton onClick={backToList} aria-label="Back to projects" size="small">
            <Icon icon="lucide:arrow-left" width={18} height={18} />
          </IconButton>
        </Tooltip>
        <span className="logo-mark">
          <Icon icon="lucide:clapperboard" width={18} height={18} />
        </span>
        <Typography variant="h6" component="span" sx={{ fontWeight: 800, mr: 2 }}>
          Scroll<span style={{ color: "#4cc0ce" }}>Clip</span>
        </Typography>
        <span className="header-sep" />
        <HeaderTitle project={project} />
        <Box sx={{ flex: 1 }} />
        <Stepper nonLinear activeStep={step} className="stepper">
          {WIZARD_STEPS.map((label, i) => (
            <Step key={label} completed={i < step}>
              <StepButton color="inherit" onClick={() => setStep(i)}>
                {label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </header>

      <main className="content">
        {step === 0 && <ModeSelect selected={mode} onSelect={(m) => saveConfig(config, m, project)} />}
        {step === 1 && <Sources config={config} onChange={(c) => saveConfig(c, mode, project)} />}
        {step === 2 && <AudioSubtitle config={config} onChange={(c) => saveConfig(c, mode, project)} />}
        {step === 3 && <KineticStyle config={config} onChange={(c) => saveConfig(c, mode, project)} />}
        {step === 4 && (
          <Process
            project={project}
            config={config}
            onDone={() => updateProject({ ...project, status: "rendered" }).catch(() => {})}
          />
        )}
      </main>

      <footer className="footer">
        <Button variant="outlined" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
          disabled={!canNext || step === WIZARD_STEPS.length - 1}
        >
          Next
        </Button>
      </footer>
    </Box>
  );
}
