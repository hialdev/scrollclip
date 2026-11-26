import { invoke } from "@tauri-apps/api/core";
import type { EditMode, ProjectConfig } from "./types";

export interface Project {
  id: string;
  title: string;
  mode: EditMode;
  status: string;
  config: ProjectConfig;
  created_at: string;
  updated_at: string;
}

export const isTauri = () => "__TAURI_INTERNALS__" in window;

const LS_KEY = "scrollclip.projects";

function lsLoad(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function lsSave(list: Project[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export async function createProject(
  title: string,
  mode: EditMode,
  config: ProjectConfig,
): Promise<Project> {
  if (isTauri()) return invoke("create_project", { title, mode, config });
  const now = new Date().toISOString();
  const p: Project = {
    id: crypto.randomUUID(),
    title,
    mode,
    status: "draft",
    config,
    created_at: now,
    updated_at: now,
  };
  lsSave([p, ...lsLoad()]);
  return p;
}

export async function listProjects(): Promise<Project[]> {
  if (isTauri()) return invoke("list_projects");
  return lsLoad().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function updateProject(project: Project): Promise<void> {
  if (isTauri()) return invoke("update_project", { project });
  const updated = { ...project, updated_at: new Date().toISOString() };
  lsSave(lsLoad().map((p) => (p.id === project.id ? updated : p)));
}

export async function deleteProject(id: string): Promise<void> {
  if (isTauri()) return invoke("delete_project", { id });
  lsSave(lsLoad().filter((p) => p.id !== id));
}
