// Shared kinetic-typography settings used by the ASS subtitle renderer.
// Mirrors KineticSettings in src/lib/types.ts.

pub struct KineticSettings {
    pub font_family: String,
    pub font_size: f64,
    pub letter_spacing: f64,
    pub caps: bool,
    pub color_primary: String,
    pub color_active: String,
    pub color_accent: String,
    pub words: i32,
}

fn s(v: Option<&serde_json::Value>, default: &str) -> String {
    v.and_then(|x| x.as_str()).unwrap_or(default).to_string()
}

fn n(v: Option<&serde_json::Value>, default: f64) -> f64 {
    v.and_then(|x| x.as_f64()).unwrap_or(default)
}

pub fn kinetic_settings_from_json(v: &serde_json::Value) -> KineticSettings {
    let empty = serde_json::Value::Null;
    let k = v.get("kinetic").unwrap_or(&empty);
    KineticSettings {
        font_family: s(k.get("fontFamily"), "Plus Jakarta Sans"),
        font_size: n(k.get("fontSize"), 72.0),
        letter_spacing: n(k.get("letterSpacing"), 0.0),
        caps: k.get("caps").and_then(|x| x.as_bool()).unwrap_or(false),
        color_primary: s(k.get("colorPrimary"), "#FFFFFF"),
        color_active: s(k.get("colorActive"), "#4CC0CE"),
        color_accent: s(k.get("colorAccent"), "#FFFFFF"),
        words: n(k.get("words"), 3.0) as i32,
    }
}

/// Escape ASS override characters in plain text.
pub fn escape_ass(text: &str) -> String {
    text.replace('\\', "\\\\")
        .replace('{', "\\{")
        .replace('}', "\\}")
}
