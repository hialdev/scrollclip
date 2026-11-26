import type { KineticSettings, ProjectConfig } from "../lib/types";
import { ANIM_IDLE, ANIM_IN, ANIM_OUT, KINETIC_TEMPLATES, defaultKinetic } from "../lib/kinetic";

const FONT_FAMILIES = ["Inter", "Arial", "Impact", "Georgia", "Courier New", "Montserrat"];
const WORD_COUNTS = [1, 2, 3, 4, 5];

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

  const previewStyle: React.CSSProperties = {
    fontFamily: k.fontFamily,
    fontSize: k.fontSize,
    letterSpacing: `${k.letterSpacing}px`,
    textTransform: k.caps ? "uppercase" : "none",
    color: k.colorPrimary,
  };

  return (
    <>
      <h2 className="step-title">Kinetic Style</h2>
      <p className="step-sub">Pick a template, then tune animations and typography.</p>

      <section className="sources-section">
        <h3>Template</h3>
        <div className="template-grid">
          {KINETIC_TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`mode-card template-card ${k.templateId === t.id ? "selected" : ""}`}
              onClick={() => applyTemplate(t.id)}
            >
              <h3>{t.name}</h3>
              <p>{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="sources-section">
        <h3>Animations</h3>
        <div className="anim-row">
          <label>
            In
            <select value={k.animIn} onChange={(e) => set({ animIn: e.target.value })}>
              {ANIM_IN.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Idle
            <select value={k.animIdle} onChange={(e) => set({ animIdle: e.target.value })}>
              {ANIM_IDLE.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Out
            <select value={k.animOut} onChange={(e) => set({ animOut: e.target.value })}>
              {ANIM_OUT.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="sources-section">
        <h3>Typography</h3>
        <div className="anim-row">
          <label>
            Font
            <select
              value={k.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              type="number"
              min={12}
              max={120}
              value={k.fontSize}
              onChange={(e) => set({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label>
            Spacing
            <input
              type="number"
              min={-4}
              max={20}
              value={k.letterSpacing}
              onChange={(e) => set({ letterSpacing: Number(e.target.value) })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={k.caps}
              onChange={(e) => set({ caps: e.target.checked })}
            />
            CAPS
          </label>
          <label>
            Words
            <select
              value={k.words}
              onChange={(e) => set({ words: Number(e.target.value) })}
            >
              {WORD_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="anim-row">
          {(
            [
              ["colorPrimary", "Primary"],
              ["colorActive", "Active"],
              ["colorAccent", "Accent"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="color-label">
              {label}
              <input
                type="color"
                value={k[key]}
                onChange={(e) => set({ [key]: e.target.value } as Partial<KineticSettings>)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="sources-section">
        <h3>Preview</h3>
        <div className="preview-stage">
          <span
            style={{
              ...previewStyle,
              fontWeight: 800,
            }}
          >
            <span style={{ color: k.colorPrimary }}>this is </span>
            <span style={{ color: k.colorActive }}>active </span>
            <span style={{ color: k.colorAccent }}>accent</span>
          </span>
        </div>
      </section>
    </>
  );
}
