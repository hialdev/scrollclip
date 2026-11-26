import { EDIT_MODES, type EditMode } from "../lib/types";
import { Icon } from "@iconify/react";

const ICONS: Record<string, string> = {
  moment: "lucide:zap",
  maker: "lucide:scissors",
  ranking: "lucide:trophy",
  compilation: "lucide:film",
  quotes: "lucide:message-circle",
  images: "lucide:image",
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
            <span className="mode-icon"><Icon icon={ICONS[m.icon]} width={16} height={16} /></span>
            <h3>{m.title}</h3>
            <span className="mode-sub">{m.subtitle}</span>
            <p>{m.description}</p>
          </button>
        ))}
      </div>
    </>
  );
}
