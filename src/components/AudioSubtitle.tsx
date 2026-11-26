import type { ProjectConfig } from "../lib/types";
import { Icon } from "@iconify/react";
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

export default function AudioSubtitle({
  config,
  onChange,
}: {
  config: ProjectConfig;
  onChange: (c: ProjectConfig) => void;
}) {
  const { audio, subtitle } = config;

  return (
    <>
      <h2 className="step-title">Audio &amp; Subtitles</h2>
      <p className="step-sub">Optional — skip audio entirely if your clips already have sound.</p>

      <section className="sources-section">
        <h3>Audio</h3>
        <div className="choice-row">
          {(
            [
              ["none", "Skip audio"],
              ["file", "Attach audio file"],
              ["ai", "Generate by AI (TTS)"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`choice ${audio.choice === v ? "selected" : ""}`}>
              <input
                type="radio"
                name="audio"
                checked={audio.choice === v}
                onChange={() => onChange({ ...config, audio: { ...audio, choice: v } })}
              />
              <Icon icon={AUDIO_ICONS[v]} width={16} height={16} />
              {label}
            </label>
          ))}
        </div>
        {audio.choice === "file" && (
          <div className="add-row">
            <input readOnly placeholder="No file selected" value={audio.path ?? ""} />
            <button
              onClick={async () => {
                const p = await pickAudioFile();
                if (p) onChange({ ...config, audio: { ...audio, path: p } });
              }}
            >
              Browse…
            </button>
          </div>
        )}
        {audio.choice === "ai" && (
          <div className="add-row">
            <textarea
              rows={3}
              placeholder="Text to speak (TTS)"
              value={audio.ttsText ?? ""}
              onChange={(e) =>
                onChange({ ...config, audio: { ...audio, ttsText: e.target.value } })
              }
            />
            <select
              value={audio.voice ?? "alloy"}
              onChange={(e) => onChange({ ...config, audio: { ...audio, voice: e.target.value } })}
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </div>
        )}
      </section>

      <section className="sources-section">
        <h3>Subtitles</h3>
        <div className="choice-row">
          {(
            [
              ["none", "No subtitles"],
              ["file", "Attach .srt file"],
              ["ai", "Transcribe by AI"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`choice ${subtitle.choice === v ? "selected" : ""}`}>
              <input
                type="radio"
                name="subs"
                checked={subtitle.choice === v}
                onChange={() => onChange({ ...config, subtitle: { ...subtitle, choice: v } })}
              />
              <Icon icon={SUB_ICONS[v]} width={16} height={16} />
              {label}
            </label>
          ))}
        </div>
        {subtitle.choice === "file" && (
          <div className="add-row">
            <input readOnly placeholder="No file selected" value={subtitle.path ?? ""} />
            <button
              onClick={async () => {
                const p = await pickSrtFile();
                if (p) onChange({ ...config, subtitle: { ...subtitle, path: p } });
              }}
            >
              Browse…
            </button>
          </div>
        )}
        {subtitle.choice === "ai" && (
          <div className="add-row">
            <select
              value={subtitle.language ?? "en"}
              onChange={(e) =>
                onChange({ ...config, subtitle: { ...subtitle, language: e.target.value } })
              }
            >
              <option value="en">English</option>
              <option value="id">Indonesian</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
            <span className="hint">Audio is transcribed (Whisper) during processing.</span>
          </div>
        )}
      </section>
    </>
  );
}
