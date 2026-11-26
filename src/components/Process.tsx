import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const un = listen<LogLine>("processing-log", (e) =>
      setLogs((l) => [...l, e.payload]),
    );
    return () => {
      un.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs.length]);

  const start = async () => {
    setRunning(true);
    setError(null);
    setLogs([]);
    try {
      const hasVideo = config.videos.some((v) => v.path);
      const hasImage = config.images.some((i) => i.path);
      if (project.mode === "clip_from_images" ? !hasImage : !hasVideo) {
        throw new Error(
          project.mode === "clip_from_images"
            ? "Add at least one image first"
            : "Add at least one video source first",
        );
      }
      const out = await invoke<string>("process_project", {
        projectId: project.id,
        mode: project.mode,
        config: {
          videos: config.videos.map((v) => ({ path: v.path, title: v.title })),
          images: config.images.map((i) => ({ path: i.path ?? null, kind: i.kind, prompt: i.prompt ?? null })),
          imageSource: config.imageSource,
          kinetic: config.kinetic ?? {},
        },
        outputDir: `${project.id}-output`,
        audioPath: config.audio.choice === "file" ? config.audio.path ?? null : null,
        srtPath: config.subtitle.choice === "file" ? config.subtitle.path ?? null : null,
      });
      setOutput(out);
      onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const summary = [
    { icon: "lucide:film", label: "sources", value: String(config.videos.length) },
    { icon: "lucide:volume-2", label: "audio", value: config.audio.choice },
    { icon: "lucide:captions", label: "subs", value: config.subtitle.choice },
    { icon: "lucide:type", label: "kinetic", value: config.kinetic?.templateId ?? "none" },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Process</Typography>
        <Typography variant="body2" color="text.secondary">
          Render your clip as a 9:16 vertical short. Progress and logs stream below.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
        {summary.map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1.25 }}>
            <Icon icon={s.icon} width={16} height={16} style={{ color: "var(--mui-palette-primary-main)" }} />
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
              {s.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
              {s.value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <Button
          variant="contained"
          size="large"
          onClick={start}
          disabled={running}
          startIcon={<Icon icon={running ? "lucide:loader-2" : "lucide:play"} width={18} height={18} />}
        >
          {running ? "Rendering…" : "Start render"}
        </Button>
        {output && <Chip color="success" label={`Output: ${output}`} variant="outlined" />}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      <Paper
        ref={logRef}
        variant="outlined"
        sx={{
          p: 2,
          minHeight: 260,
          maxHeight: 420,
          overflow: "auto",
          bgcolor: "#0a0c0e",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        {logs.length === 0 && !running && (
          <Typography variant="caption" color="text.secondary">
            Logs will appear here…
          </Typography>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              color:
                l.level === "error" ? "#ef5350" : l.level === "warn" ? "#ffb74d" : "rgba(232,234,237,0.8)",
              whiteSpace: "pre-wrap",
            }}
          >
            [{l.ts.slice(11, 19)}] {l.level.toUpperCase()}: {l.message}
          </div>
        ))}
      </Paper>
    </Stack>
  );
}
