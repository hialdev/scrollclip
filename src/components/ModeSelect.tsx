import { EDIT_MODES, type EditMode } from "../lib/types";

const ICONS: Record<string, string> = {
  moment: "⚡",
  maker: "✂️",
  ranking: "🏆",
  compilation: "🎬",
  quotes: "💬",
  images: "🖼️",
};

export default function ModeSelect({
  selected,
  onSelect,
}: {
  selected: EditMode | null;
  onSelect: (m: EditMode) => void;
}) {
  return (
    <>
      <h2 className="step-title">Choose your editing type</h2>
      <p className="step-sub">
        Pick how ScrollClip should turn your raw media into short clips.
      </p>
      <div className="mode-grid">
        {EDIT_MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-card ${selected === m.id ? "selected" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <span className="mode-icon">{ICONS[m.icon]}</span>
            <h3>{m.title}</h3>
            <span className="mode-sub">{m.subtitle}</span>
            <p>{m.description}</p>
          </button>
        ))}
      </div>
    </>
  );
}
