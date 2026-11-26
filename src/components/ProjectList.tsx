import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { EDIT_MODES, emptyConfig, type EditMode } from "../lib/types";
import { createProject, deleteProject, isTauri, listProjects, type Project } from "../lib/api";

export default function ProjectList({ onOpen }: { onOpen: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<EditMode>("clip_moment");

  const refresh = () => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  };
  useEffect(refresh, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const p = await createProject(title.trim(), mode, emptyConfig());
    setTitle("");
    setCreating(false);
    onOpen(p);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    refresh();
  };

  const modeTitle = (m: string) => EDIT_MODES.find((e) => e.id === m)?.title ?? m;

  return (
    <>
      <div className="list-header">
        <h2 className="step-title">Your projects</h2>
        <button className="primary" onClick={() => setCreating(true)}>
          <Icon icon="lucide:plus" width={16} height={16} /> New Project
        </button>
      </div>

      {creating && (
        <div className="new-project card-row">
          <input
            placeholder="Project title"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <select value={mode} onChange={(e) => setMode(e.target.value as EditMode)}>
            {EDIT_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <button className="primary" onClick={handleCreate} disabled={!title.trim()}>
            Create
          </button>
          <button onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}

      {projects.length === 0 && !creating && (
        <p className="empty-state">
          No projects yet. Create one to start cutting shorts.
          {!isTauri() && " (Running in browser mode — projects save to localStorage.)"}
        </p>
      )}

      <div className="project-list">
        {projects.map((p) => (
          <div key={p.id} className="card-row project-card">
            <div className="project-info" onClick={() => onOpen(p)}>
              <strong>{p.title}</strong>
              <span className="mode-sub">{modeTitle(p.mode)}</span>
              <span className="project-status">{p.status}</span>
            </div>
            <button
              className="icon-btn danger"
              onClick={() => handleDelete(p.id)}
              aria-label={`Delete ${p.title}`}
              title="Delete"
            >
              <Icon icon="lucide:trash-2" width={16} height={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
