import { useState } from "react";
import type { ImageSource, ProjectConfig, VideoSource } from "../lib/types";
import {
  newImageSource,
  newVideoSource,
  pickVideoFile,
  probeVideo,
  ytdlpInfo,
} from "../lib/media";

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
      // Desktop fallback: add with a placeholder title if yt-dlp lookup fails
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
    <>
      <h2 className="step-title">Attach raw video / images</h2>
      <p className="step-sub">Add one or more sources. Online sources get their title automatically.</p>

      <section className="sources-section">
        <div className="section-head">
          <h3>Videos</h3>
          <div className="add-row">
            <button onClick={addLocal}>📁 Local video</button>
          </div>
        </div>
        <div className="add-row online-row">
          <input
            placeholder="https://… (YouTube or other online video URL)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="narrow"
            placeholder="Title (fallback if lookup fails)"
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
          />
          <button className="primary" onClick={addOnline} disabled={fetching || !url.trim()}>
            {fetching ? "Fetching…" : "Add online"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {config.videos.map((v) => (
          <div key={v.id} className="source-card">
            <span className="source-kind">{v.kind === "local" ? "📁" : "🌐"}</span>
            <div className="source-main">
              <input
                value={v.title}
                onChange={(e) =>
                  setVideos(config.videos.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))
                }
              />
              <span className="source-meta">
                {v.kind === "online" ? v.path : v.path.split("/").pop()}
                {v.description ? ` — ${v.description}` : ""}
                {v.duration ? ` · ${fmtDur(v.duration)}` : ""}
              </span>
            </div>
            <button
              onClick={() => setVideos(config.videos.filter((x) => x.id !== v.id))}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      <section className="sources-section">
        <div className="section-head">
          <h3>Images</h3>
          <div className="toggle-row">
            <label>
              <input
                type="radio"
                checked={config.imageSource === "upload"}
                onChange={() => onChange({ ...config, imageSource: "upload" })}
              />
              Upload
            </label>
            <label>
              <input
                type="radio"
                checked={config.imageSource === "ai"}
                onChange={() => onChange({ ...config, imageSource: "ai" })}
              />
              Generate by AI
            </label>
          </div>
        </div>
        {config.imageSource === "upload" ? (
          <div className="add-row">
            <input
              placeholder="Image file path (or add later from file dialog in desktop app)"
              value={config.images[0]?.path ?? ""}
              onChange={(e) => {
                const path = e.target.value;
                setImages(
                  path
                    ? [newImageSource("upload", path), ...config.images.slice(1)]
                    : config.images.slice(1),
                );
              }}
            />
          </div>
        ) : (
          <div className="add-row">
            <input
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
          </div>
        )}
        {config.images.length > 1 && (
          <div className="source-card">
            <span className="source-kind">🖼️</span>
            <div className="source-main">
              <span className="source-meta">
                {config.images.length - 1} more image(s) queued
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
