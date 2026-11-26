import { Icon } from "@iconify/react";
import {
  Box,
  Button,
  CardActionArea,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ProjectConfig } from "../lib/types";
import { pickAudioFile, pickSrtFile } from "../lib/media";

const AUDIO_ICONS: Record<string, string> = {
  none: "lucide:volume-x",
  file: "lucide:file-audio",
  ai: "lucide:sparkles",
};
const SUB_ICONS: Record<string, string> = {
  none: "lucide:captions-off",
  file: "lucide:file-text",
  ai: "lucide:sparkles",
};

function ChoiceCards<T extends string>({
  value,
  options,
  icons,
  onPick,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  icons: Record<string, string>;
  name: string;
  onPick: (v: T) => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: `repeat(${options.length}, 1fr)` },
        gap: 1.5,
      }}
    >
      {options.map(([v, label]) => {
        const active = value === v;
        return (
          <Paper
            key={v}
            variant="outlined"
            sx={{
              borderColor: active ? "primary.main" : "divider",
              boxShadow: active ? (t) => `0 0 0 1px ${t.palette.primary.main}` : "none",
            }}
          >
            <CardActionArea
              onClick={() => onPick(v)}
              sx={{ p: 1.75, display: "flex", alignItems: "center", gap: 1.25 }}
            >
              <Icon
                icon={icons[v]}
                width={18}
                height={18}
                style={{ color: active ? "var(--mui-palette-primary-main)" : "inherit" }}
              />
              <Typography variant="body2" sx={{ fontWeight: active ? 700 : 400 }}>
                {label}
              </Typography>
            </CardActionArea>
          </Paper>
        );
      })}
    </Box>
  );
}

export default function AudioSubtitle({
  config,
  onChange,
}: {
  config: ProjectConfig;
  onChange: (c: ProjectConfig) => void;
}) {
  const { audio, subtitle } = config;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Audio &amp; Subtitles</Typography>
        <Typography variant="body2" color="text.secondary">
          Optional — skip audio entirely if your clips already have sound.
        </Typography>
      </Box>

      <Paper sx={{ p: 2.5 }} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Audio
        </Typography>
        <ChoiceCards
          name="audio"
          value={audio.choice}
          options={[
            ["none", "Skip audio"],
            ["file", "Attach audio file"],
            ["ai", "Generate by AI (TTS)"],
          ] as const}
          icons={AUDIO_ICONS}
          onPick={(v) => onChange({ ...config, audio: { ...audio, choice: v } })}
        />
        {audio.choice === "file" && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <TextField fullWidth slotProps={{ input: { readOnly: true } }} placeholder="No file selected" value={audio.path ?? ""} />
            <Button
              variant="outlined"
              onClick={async () => {
                const p = await pickAudioFile();
                if (p) onChange({ ...config, audio: { ...audio, path: p } });
              }}
            >
              Browse…
            </Button>
          </Stack>
        )}
        {audio.choice === "ai" && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="Text to speak (TTS)"
              value={audio.ttsText ?? ""}
              onChange={(e) => onChange({ ...config, audio: { ...audio, ttsText: e.target.value } })}
            />
            <FormControl fullWidth sx={{ maxWidth: { sm: 200 } }}>
              <InputLabel>Voice</InputLabel>
              <Select
                value={audio.voice ?? "alloy"}
                label="Voice"
                onChange={(e) => onChange({ ...config, audio: { ...audio, voice: e.target.value } })}
              >
                {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Subtitles
        </Typography>
        <ChoiceCards
          name="subs"
          value={subtitle.choice}
          options={[
            ["none", "No subtitles"],
            ["file", "Attach .srt file"],
            ["ai", "Transcribe by AI"],
          ] as const}
          icons={SUB_ICONS}
          onPick={(v) => onChange({ ...config, subtitle: { ...subtitle, choice: v } })}
        />
        {subtitle.choice === "file" && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <TextField fullWidth slotProps={{ input: { readOnly: true } }} placeholder="No file selected" value={subtitle.path ?? ""} />
            <Button
              variant="outlined"
              onClick={async () => {
                const p = await pickSrtFile();
                if (p) onChange({ ...config, subtitle: { ...subtitle, path: p } });
              }}
            >
              Browse…
            </Button>
          </Stack>
        )}
        {subtitle.choice === "ai" && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2, alignItems: "center" }}>
            <FormControl fullWidth sx={{ maxWidth: { sm: 220 } }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={subtitle.language ?? "en"}
                label="Language"
                onChange={(e) =>
                  onChange({ ...config, subtitle: { ...subtitle, language: e.target.value } })
                }
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="id">Indonesian</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="ja">Japanese</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Audio is transcribed (Whisper) during processing.
            </Typography>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
