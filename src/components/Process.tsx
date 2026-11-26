import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauri, type Project } from "../lib/api";
import type { ProjectConfig } from "../lib/types";

interface LogLine {
  project_id: string;
  ts: string;
  level: string;
  message: string;
}

export default function Process({
  project,
  config,
  onDone,
}: {
  project: Project;
  config: ProjectConfig;
  onDone: () => void;
}) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const un = listen<LogLine>("processing-log", (e) =>
      setLogs((l) => [...l, e.payload]),
    );
    return () => {
      un.then((f) => f());
    };
  }, []);

  const start = async () => {
    setRunning(true);
    setError(null);
    setLogs([]);
    try {
      const inputs = config.videos.map((v) => v.path);
      if (inputs.length === 0) throw new Error("Add at least one video source first");
      const out = await invoke<string>("process_project", {
        projectId: project.id,
        inputPaths: inputs,
        outputDir: `${project.id}-output`,
        audioPath: config.audio.choice === "file" ? config.audio.path ?? null : null,
        assPath: null,
      });
      setOutput(out);
      onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <h2 className="step-title">Process</h2>
      <p className="step-sub">
        Render your clip as a 9:16 vertical short. Progress and logs stream below.
      </p>

      <div className="process-summary">
        <div>
          <strong>{config.videos.length}</strong> video source(s)
        </div>
        <div>
          Audio: <strong>{config.audio.choice}</strong>
        </div>
        <div>
          Subtitles: <strong>{config.subtitle.choice}</strong>
        </div>
        <div>
          Kinetic: <strong>{config.kinetic?.templateId ?? "none"}</strong>
        </div>
      </div>

      <div className="add-row">
        <button className="primary" onClick={start} disabled={running}>
          {running ? "Rendering…" : <><Icon icon="lucide:play" width={16} height={16} /> Start render</>}
        </button>
        {output && <span className="hint">Output: {output}</span>}
        {error && <span className="error">{error}</span>}
      </div>

      <div className="log-box">
        {logs.length === 0 && !running && (
          <span className="source-meta">Logs will appear here…</span>
        )}
        {logs.map((l, i) => (
          <div key={i} className={`log-line log-${l.level}`}>
            [{l.ts.slice(11, 19)}] {l.level.toUpperCase()}: {l.message}
          </div>
        ))}
      </div>
    </>
  );
}
