import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { KineticSettings, ProjectConfig } from "../lib/types";
import { ANIM_IDLE, ANIM_IN, ANIM_OUT, KINETIC_TEMPLATES, defaultKinetic } from "../lib/kinetic";

const FONT_FAMILIES = ["Inter", "Arial", "Impact", "Georgia", "Courier New", "Montserrat"];
const WORD_COUNTS = [1, 2, 3, 4, 5];
const SAMPLE = "This clip will go viral today".split(" ");

const IN_DUR = 700;
const IDLE_DUR = 1500;
const OUT_DUR = 600;

type Phase = "in" | "idle" | "out";

/* Live loop: in → idle → out → next chunk of words, restarting the CSS
   animation on every phase change via key. */
function KineticPreview({ k }: { k: KineticSettings }) {
  const chunks = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < SAMPLE.length; i += k.words) {
      const c = SAMPLE.slice(i, i + k.words);
      if (c.length) out.push(c);
    }
    return out.length ? out : [[SAMPLE[0]]];
  }, [k.words]);

  const [chunk, setChunk] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    setChunk(0);
    setPhase("in");
  }, [k.words, k.templateId, k.animIn, k.animIdle, k.animOut]);

  useEffect(() => {
    const dur = phase === "in" ? IN_DUR : phase === "idle" ? IDLE_DUR : OUT_DUR;
    const t = setTimeout(() => {
      if (phase === "in") setPhase("idle");
      else if (phase === "idle") setPhase("out");
      else {
        setChunk((c) => (c + 1) % chunks.length);
        setPhase("in");
      }
    }, dur);
    return () => clearTimeout(t);
  }, [phase, chunk, chunks.length]);

  const words = chunks[chunk];
  const activeIdx = Math.min(Math.floor(words.length / 2), words.length - 1);

  const anim =
    phase === "in"
      ? `kcin-${k.animIn} ${IN_DUR}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`
      : phase === "idle"
        ? k.animIdle === "none"
          ? undefined
          : `kcidle-${k.animIdle} ${IDLE_DUR}ms ease-in-out infinite`
        : `kcout-${k.animOut} ${OUT_DUR}ms ease-in both`;

  const base: React.CSSProperties = {
    fontFamily: k.fontFamily,
    fontSize: k.fontSize,
    letterSpacing: `${k.letterSpacing}px`,
    textTransform: k.caps ? "uppercase" : "none",
    fontWeight: 800,
    color: k.colorPrimary,
    lineHeight: 1.25,
    textAlign: "center",
  };

  const isStroked = k.templateId === "simple_stroked" || k.templateId === "glow_stroked";
  const isGlow = k.templateId === "glow" || k.templateId === "glow_stroked" || k.templateId === "neon_flicker";
  const isSticker = k.templateId === "sticker";

  const wordStyle = (i: number): React.CSSProperties => {
    const s: React.CSSProperties = {};
    if (k.templateId === "karaoke") {
      s.color = i <= activeIdx ? k.colorActive : k.colorPrimary;
    } else if (i === activeIdx) {
      s.color = k.colorActive;
      if (k.templateId === "paper") {
        s.transform = "rotate(-4deg)";
        s.display = "inline-block";
      }
      if (k.templateId === "rounded_box") {
        s.background = k.colorActive;
        s.color = "#08181c";
        s.borderRadius = 999;
        s.padding = "0.05em 0.35em";
        s.display = "inline-block";
      }
      if (k.templateId === "highlight") {
        s.background = `linear-gradient(transparent 55%, ${k.colorAccent}66 55%)`;
        s.borderRadius = 4;
        s.padding = "0 0.1em";
      }
    }
    if (isStroked) {
      s.color = i === activeIdx && k.templateId === "glow_stroked" ? k.colorActive : s.color ?? k.colorPrimary;
      if (i !== activeIdx || k.templateId === "simple_stroked") {
        s.color = "transparent";
        s.WebkitTextStroke = `2px ${i === activeIdx ? k.colorActive : k.colorPrimary}`;
      }
    }
    if (isGlow) {
      s.textShadow = `0 0 8px ${i === activeIdx ? k.colorActive : k.colorPrimary}, 0 0 24px ${
        i === activeIdx ? k.colorActive : k.colorPrimary
      }55`;
    }
    if (isSticker) {
      s.textShadow = `2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 3px 0 #000`;
    }
    return s;
  };

  const wrapper: React.CSSProperties =
    k.templateId === "rounded_box"
      ? { border: `3px solid ${k.colorAccent}`, borderRadius: 999, padding: "0.2em 0.5em", display: "inline-block" }
      : k.templateId === "paper"
        ? { background: "#f5f1e6", padding: "0.3em 0.6em", display: "inline-block", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }
        : {};

  return (
    <div style={{ ...base, ...wrapper }}>
      <span
        key={`${chunk}-${phase}-${k.animIn}-${k.animIdle}-${k.animOut}-${k.templateId}`}
        style={{ display: "inline-block", animation: anim }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ ...wordStyle(i), display: "inline-block", whiteSpace: "pre" }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
        {k.templateId === "typewriter" && <span className="kc-caret" />}
      </span>
    </div>
  );
}

export default function KineticStyle({
  config,
  onChange,
}: {
  config: ProjectConfig;
  onChange: (c: ProjectConfig) => void;
}) {
  const k = config.kinetic ?? defaultKinetic();
  const set = (patch: Partial<KineticSettings>) =>
    onChange({ ...config, kinetic: { ...k, ...patch } });

  const applyTemplate = (id: string) => {
    const t = KINETIC_TEMPLATES.find((x) => x.id === id);
    if (t) set({ templateId: id, ...t.defaults });
  };

  const selectProps = { variant: "outlined" as const, fullWidth: true };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Kinetic Style</Typography>
        <Typography variant="body2" color="text.secondary">
          Pick a template, then tune animations and typography. The preview loops in → idle → out.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 380px" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Template
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {KINETIC_TEMPLATES.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  onClick={() => applyTemplate(t.id)}
                  color={k.templateId === t.id ? "primary" : "default"}
                  variant={k.templateId === t.id ? "filled" : "outlined"}
                  title={t.description}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {KINETIC_TEMPLATES.find((t) => t.id === k.templateId)?.description ?? ""}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Animations
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              <FormControl {...selectProps}>
                <InputLabel>In</InputLabel>
                <Select value={k.animIn} label="In" onChange={(e) => set({ animIn: e.target.value })}>
                  {ANIM_IN.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl {...selectProps}>
                <InputLabel>Idle</InputLabel>
                <Select value={k.animIdle} label="Idle" onChange={(e) => set({ animIdle: e.target.value })}>
                  {ANIM_IDLE.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl {...selectProps}>
                <InputLabel>Out</InputLabel>
                <Select value={k.animOut} label="Out" onChange={(e) => set({ animOut: e.target.value })}>
                  {ANIM_OUT.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Typography
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <FormControl {...selectProps}>
                <InputLabel>Font</InputLabel>
                <Select
                  value={k.fontFamily}
                  label="Font"
                  onChange={(e) => set({ fontFamily: e.target.value })}
                >
                  {FONT_FAMILIES.map((f) => (
                    <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
                      {f}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                select
                label="Words shown"
                fullWidth
                value={k.words}
                onChange={(e) => set({ words: Number(e.target.value) })}
              >
                {WORD_COUNTS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Font size — {k.fontSize}px
                </Typography>
                <Slider
                  min={12}
                  max={120}
                  value={k.fontSize}
                  onChange={(_, v) => set({ fontSize: v as number })}
                  aria-label="Font size"
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Letter spacing — {k.letterSpacing}px
                </Typography>
                <Slider
                  min={-4}
                  max={20}
                  value={k.letterSpacing}
                  onChange={(_, v) => set({ letterSpacing: v as number })}
                  aria-label="Letter spacing"
                />
              </Box>
              {(
                [
                  ["colorPrimary", "Primary"],
                  ["colorActive", "Active"],
                  ["colorAccent", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <input
                    type="color"
                    aria-label={`${label} color`}
                    value={k[key]}
                    onChange={(e) => set({ [key]: e.target.value } as Partial<KineticSettings>)}
                    style={{
                      width: 42,
                      height: 30,
                      border: "1px solid rgba(255,255,255,0.23)",
                      borderRadius: 8,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                  <Typography variant="body2">{label}</Typography>
                </Box>
              ))}
              <FormControlLabel
                control={<Checkbox checked={k.caps} onChange={(e) => set({ caps: e.target.checked })} />}
                label="UPPERCASE"
              />
            </Box>
          </Paper>
        </Stack>

        <Paper
          sx={{
            p: 2.5,
            position: "sticky",
            top: 16,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Typography variant="h6">Preview</Typography>
          <Box
            sx={{
              aspectRatio: "9 / 16",
              maxWidth: "100%",
              mx: "auto",
              width: 300,
              borderRadius: 6,
              border: "1px solid",
              borderColor: "divider",
              background:
                "radial-gradient(120% 100% at 20% 0%, #1d2733 0%, #0e1116 60%), #0e1116",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              overflow: "hidden",
            }}
          >
            <KineticPreview k={k} />
          </Box>
          <Divider />
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            in: {ANIM_IN.find((a) => a.id === k.animIn)?.name} · idle:{" "}
            {ANIM_IDLE.find((a) => a.id === k.animIdle)?.name} · out:{" "}
            {ANIM_OUT.find((a) => a.id === k.animOut)?.name}
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
