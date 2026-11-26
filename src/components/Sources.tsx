import { useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ImageSource, ProjectConfig, VideoSource } from "../lib/types";
import {
  newImageSource,
  newVideoSource,
  pickImageFiles,
  pickVideoFile,
  probeVideo,
  ytdlpInfo,
} from "../lib/media";
import { isTauri } from "../lib/api";

export default function Sources({
  config,
  onChange,
}: {
  config: ProjectConfig;
  onChange: (c: ProjectConfig) => void;
}) {
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const setVideos = (videos: VideoSource[]) => onChange({ ...config, videos });
  const setImages = (images: ImageSource[]) => onChange({ ...config, images });

  const addLocal = async () => {
    setError(null);
    const path = await pickVideoFile();
    if (!path) return;
    const meta = await probeVideo(path).catch(() => null);
    const name = path.split("/").pop() ?? path;
    const src = newVideoSource("local", path, meta?.title || name, "", meta?.duration ?? undefined);
    setVideos([...config.videos, src]);
  };

  const addOnline = async () => {
    setError(null);
    if (!url.trim()) return;
    setFetching(true);
    try {
      const meta = await ytdlpInfo(url.trim());
      setVideos([
        ...config.videos,
        newVideoSource(
          "online",
          url.trim(),
          meta.title,
          meta.uploader ? `by ${meta.uploader}` : "",
          meta.duration ?? undefined,
        ),
      ]);
      setUrl("");
      setUrlTitle("");
    } catch (e) {
      // Desktop fallback: add with a manual title if the yt-dlp lookup fails
      if (urlTitle.trim()) {
        setVideos([...config.videos, newVideoSource("online", url.trim(), urlTitle.trim())]);
        setUrl("");
        setUrlTitle("");
      } else {
        setError(String(e));
      }
    } finally {
      setFetching(false);
    }
  };

  const fmtDur = (d?: number) =>
    d == null
      ? ""
      : `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}`;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Attach raw video / images</Typography>
        <Typography variant="body2" color="text.secondary">
          Add one or more sources. Online sources get their title automatically from yt-dlp.
        </Typography>
      </Box>

      <Paper sx={{ p: 2.5 }} variant="outlined">
        <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Videos</Typography>
          <Button variant="contained" startIcon={<Icon icon="lucide:folder" width={16} height={16} />} onClick={addLocal}>
            Local video
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            placeholder="https://… (YouTube or other online video URL)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <TextField
            fullWidth
            sx={{ maxWidth: { sm: 280 } }}
            placeholder="Title (fallback if lookup fails)"
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
          />
          <Button
            variant="outlined"
            onClick={addOnline}
            disabled={fetching || !url.trim()}
            startIcon={fetching ? <Icon icon="lucide:loader-2" width={16} height={16} /> : <Icon icon="lucide:globe" width={16} height={16} />}
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {fetching ? "Fetching…" : "Add online"}
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {config.videos.map((v) => (
          <Stack
            key={v.id}
            direction="row"
            spacing={1.5}
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid",
              borderColor: "divider",
              alignItems: "center",
            }}
          >
            <Icon
              icon={v.kind === "local" ? "lucide:folder" : "lucide:globe"}
              width={18}
              height={18}
              style={{ color: "var(--mui-palette-primary-main)", flexShrink: 0 }}
            />
            <TextField
              fullWidth
              size="small"
              value={v.title}
              onChange={(e) =>
                setVideos(config.videos.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }} noWrap>
              {v.kind === "online" ? v.path : v.path.split("/").pop()}
              {v.description ? ` — ${v.description}` : ""}
              {v.duration ? ` · ${fmtDur(v.duration)}` : ""}
            </Typography>
            <IconButton
              onClick={() => setVideos(config.videos.filter((x) => x.id !== v.id))}
              aria-label={`Remove ${v.title}`}
              title="Remove"
              size="small"
            >
              <Icon icon="lucide:x" width={16} height={16} />
            </IconButton>
          </Stack>
        ))}
        {config.videos.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
            No videos yet.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }} variant="outlined">
        <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Images</Typography>
          <RadioGroup
            row
            value={config.imageSource}
            onChange={(e) => onChange({ ...config, imageSource: e.target.value as "upload" | "ai" })}
          >
            <FormControlLabel value="upload" control={<Radio size="small" />} label="Upload" />
            <FormControlLabel value="ai" control={<Radio size="small" />} label="Generate by AI" />
          </RadioGroup>
        </Stack>
        {config.imageSource === "upload" ? (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                const urls: Record<string, string> = {};
                const sources = files.map((f) => {
                  const src = newImageSource("upload", f.name);
                  urls[src.id] = URL.createObjectURL(f);
                  return src;
                });
                setPreviews((p) => ({ ...p, ...urls }));
                setImages([...sources, ...config.images]);
                e.target.value = "";
              }}
            />
            <Button
              variant="outlined"
              startIcon={<Icon icon="lucide:image-plus" width={18} height={18} />}
              onClick={async () => {
                if (isTauri()) {
                  const paths = await pickImageFiles();
                  if (paths.length) setImages([...paths.map((p) => newImageSource("upload", p)), ...config.images]);
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              Upload images
            </Button>
            {config.images.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2 }}>
                {config.images.map((img) => (
                  <Box
                    key={img.id}
                    sx={{
                      position: "relative",
                      width: 96,
                      height: 96,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      component="img"
                      src={previews[img.id] ?? (isTauri() && img.path ? convertFileSrc(img.path) : undefined)}
                      alt={img.path ?? "image"}
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <IconButton
                      size="small"
                      aria-label={`Remove image ${img.path ?? ""}`}
                      onClick={() => {
                        setPreviews(({ [img.id]: _gone, ...rest }) => rest);
                        setImages(config.images.filter((x) => x.id !== img.id));
                      }}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                      }}
                    >
                      <Icon icon="lucide:x" width={14} height={14} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Describe the images to generate (prompt) — images will be created during processing"
            value={config.images[0]?.prompt ?? ""}
            onChange={(e) => {
              const prompt = e.target.value;
              setImages(
                prompt
                  ? [newImageSource("ai", undefined, prompt), ...config.images.slice(1)]
                  : config.images.slice(1),
              );
            }}
          />
        )}
        {config.images.length > 1 && (
          <Chip
            sx={{ mt: 1.5 }}
            icon={<Icon icon="lucide:image" width={14} height={14} />}
            label={`${config.images.length - 1} more image(s) queued`}
            variant="outlined"
          />
        )}
      </Paper>
    </Stack>
  );
}
