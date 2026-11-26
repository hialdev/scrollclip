import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./api";
import type { VideoSource, ImageSource } from "./types";

export async function pickVideoFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const sel = await open({
    multiple: false,
    filters: [
      { name: "Video", extensions: ["mp4", "mkv", "mov", "webm", "avi"] },
    ],
  });
  return typeof sel === "string" ? sel : null;
}

export async function pickAudioFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const sel = await open({
    multiple: false,
    filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "ogg", "flac"] }],
  });
  return typeof sel === "string" ? sel : null;
}

export async function pickSrtFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const sel = await open({
    multiple: false,
    filters: [{ name: "Subtitle", extensions: ["srt", "vtt"] }],
  });
  return typeof sel === "string" ? sel : null;
}

export interface YtMeta {
  title: string;
  duration: number | null;
  uploader: string | null;
}

export async function ytdlpInfo(url: string): Promise<YtMeta> {
  if (!isTauri()) throw new Error("yt-dlp is only available in the desktop app");
  return invoke("yt_dlp_info", { url });
}

export async function probeVideo(path: string) {
  if (!isTauri()) return null;
  return invoke<{ duration: number | null; width: number | null; height: number | null; title: string | null }>(
    "probe_video",
    { path },
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newVideoSource(
  kind: "local" | "online",
  path: string,
  title: string,
  description = "",
  duration?: number,
): VideoSource {
  return { id: uid(), kind, path, title, description, duration };
}

export function newImageSource(kind: "upload" | "ai", path?: string, prompt?: string): ImageSource {
  return { id: uid(), kind, path, prompt };
}
