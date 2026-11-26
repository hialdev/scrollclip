import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { createProject, deleteProject, isTauri, listProjects, updateProject, type Project } from "../lib/api";
import { EDIT_MODES, emptyConfig, type EditMode } from "../lib/types";

const modeInfo = (m: string) => EDIT_MODES.find((x) => x.id === m);
const MODE_ICONS: Record<string, string> = {
  clip_moment: "lucide:zap",
  clip_maker: "lucide:scissors",
  clip_maker_ranking: "lucide:trophy",
  clip_maker_compilation: "lucide:layers",
  clip_quotes: "lucide:quote",
  clip_from_images: "lucide:image",
};

function TitleLine({ project, onRename }: { project: Project; onRename: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const t = value.trim();
    if (t && t !== project.title) onRename(t);
    else setValue(project.title);
  };

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        value={value}
        size="small"
        fullWidth
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(project.title);
            setEditing(false);
          }
        }}
        slotProps={{ input: { sx: { fontWeight: 700 } } }}
      />
    );
  }
  return (
    <Typography
      variant="subtitle1"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
      sx={{ fontWeight: 700, cursor: "text", userSelect: "none" }}
    >
      {project.title}
    </Typography>
  );
}

export default function ProjectList({ onOpen }: { onOpen: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState<{ p: Project; el: HTMLElement } | null>(null);

  const refresh = () => listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const p = await createProject("Untitled project", "clip_maker", emptyConfig());
      await refresh();
      onOpen(p);
    } finally {
      setCreating(false);
    }
  };

  const rename = async (p: Project, title: string) => {
    const updated = { ...p, title };
    setProjects((ps) => ps!.map((x) => (x.id === p.id ? updated : x)));
    await updateProject(updated).catch(() => {});
  };

  const remove = async (p: Project) => {
    await deleteProject(p.id).catch(() => {});
    refresh();
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4">Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            {isTauri()
              ? "Double-click a title to rename it."
              : "Browser preview — projects are saved locally in this tab."}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Icon icon="lucide:plus" width={18} height={18} />}
          onClick={create}
          disabled={creating}
        >
          {creating ? "Creating…" : "Add project"}
        </Button>
      </Box>

      {projects === null && <Typography color="text.secondary">Loading…</Typography>}

      {projects !== null && projects.length === 0 && (
        <Paper sx={{ p: 6, textAlign: "center" }} variant="outlined">
          <Icon icon="lucide:clapperboard" width={40} height={40} style={{ opacity: 0.5 }} />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            No projects yet — click “Add project” to start your first clip.
          </Typography>
        </Paper>
      )}

      {projects !== null && projects.length > 0 && (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <List disablePadding>
            {projects.map((p) => {
              const mi = modeInfo(p.mode);
              return (
                <ListItem
                  key={p.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`Actions for ${p.title}`}
                      onClick={(e) => setMenuFor({ p, el: e.currentTarget })}
                    >
                      <Icon icon="lucide:more-horizontal" width={18} height={18} />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => onOpen(p)} sx={{ py: 1.5 }}>
                    <Icon
                      icon={MODE_ICONS[p.mode] ?? "lucide:film"}
                      width={20}
                      height={20}
                      style={{ marginRight: 14, color: "var(--mui-palette-primary-main)" }}
                    />
                    <ListItemText
                      slotProps={{ primary: { component: "div" }, secondary: { component: "div" } }}
                      primary={<TitleLine project={p} onRename={(t) => rename(p, t)} />}
                      secondary={
                        <Box component="span" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip size="small" label={mi?.title ?? p.mode} variant="outlined" />
                          <Typography variant="caption" color="text.secondary" component="span">
                            {p.status} · updated {new Date(p.updated_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      <Menu open={menuFor !== null} anchorEl={menuFor?.el} onClose={() => setMenuFor(null)}>
        <MenuItem
          onClick={() => {
            if (menuFor) onOpen(menuFor.p);
            setMenuFor(null);
          }}
        >
          <Icon icon="lucide:folder-open" width={16} height={16} style={{ marginRight: 10 }} /> Open
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) remove(menuFor.p);
            setMenuFor(null);
          }}
          sx={{ color: "error.main" }}
        >
          <Icon icon="lucide:trash-2" width={16} height={16} style={{ marginRight: 10 }} /> Delete
        </MenuItem>
      </Menu>
    </Stack>
  );
}

export type { EditMode };
