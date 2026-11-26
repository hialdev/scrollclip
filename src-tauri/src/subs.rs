use serde::Serialize;

use crate::kinetic::{escape_ass, kinetic_settings_from_json};

#[derive(Serialize, Clone)]
pub struct SubsResult {
    pub ass_path: String,
    pub line_count: usize,
}

fn parse_timestamp(ts: &str) -> Option<f64> {
    let ts = ts.trim().trim_start_matches('-');
    let (hms, ms) = ts.split_once(',')?;
    let parts: Vec<&str> = hms.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let h: f64 = parts[0].trim().parse().ok()?;
    let m: f64 = parts[1].trim().parse().ok()?;
    let s: f64 = parts[2].trim().parse().ok()?;
    let ms: f64 = ms.trim().parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + s + ms / 1000.0)
}

pub struct SubLine {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

/// Parse an .srt file into timed lines. Tolerates blank-line noise and BOM.
pub fn parse_srt(content: &str) -> Vec<SubLine> {
    let mut out: Vec<SubLine> = Vec::new();
    let mut cur: Option<SubLine> = None;
    for raw in content.lines() {
        let line = raw.trim().trim_start_matches('\u{feff}');
        if line.is_empty() || line.contains("-->") {
            if let Some(l) = cur.take() {
                if !l.text.is_empty() {
                    out.push(l);
                }
            }
            if line.contains("-->") {
                let mut it = line.split("-->");
                let start = it.next().and_then(parse_timestamp);
                let end = it.next().and_then(parse_timestamp);
                if let (Some(start), Some(end)) = (start, end) {
                    cur = Some(SubLine { start, end, text: String::new() });
                }
            }
            continue;
        }
        if line.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let clean = line
            .replace("<i>", "")
            .replace("</i>", "")
            .replace("<b>", "")
            .replace("</b>", "")
            .replace("<u>", "")
            .replace("</u>", "");
        if let Some(l) = cur.as_mut() {
            if !l.text.is_empty() {
                l.text.push(' ');
            }
            l.text.push_str(&clean);
        }
    }
    if let Some(l) = cur.take() {
        if !l.text.is_empty() {
            out.push(l);
        }
    }
    out
}

fn hex_to_bgr_ass(hex: &str) -> String {
    // ASS colours are &HAABBGGRR&; we use opaque colours so alpha = 00.
    let h = hex.trim_start_matches('#');
    let v = u32::from_str_radix(h, 16).unwrap_or(0xFFFFFF);
    let r = (v >> 16) & 0xFF;
    let g = (v >> 8) & 0xFF;
    let b = v & 0xFF;
    format!("&H00{b:02X}{g:02X}{r:02X}")
}

fn format_ass_time(secs: f64) -> String {
    let s = secs.max(0.0);
    format!(
        "{}:{:02}:{:05.2}",
        (s / 3600.0).floor() as i32,
        ((s / 60.0).floor() as i32) % 60,
        s % 60.0
    )
}

/// Convert SRT content into a kinetic ASS file: per-word karaoke timing so the
/// active word can be recoloured, using the project's kinetic typography
/// settings (font, size, spacing, caps, colors). Written to `ass_path`.
pub fn srt_to_kinetic_ass(
    srt_path: &str,
    k_json: serde_json::Value,
    ass_path: &str,
) -> Result<SubsResult, String> {
    let content = std::fs::read_to_string(srt_path).map_err(|e| format!("cannot read srt: {e}"))?;
    let lines = parse_srt(&content);
    if lines.is_empty() {
        return Err("srt has no timed lines".to_string());
    }

    let k = kinetic_settings_from_json(&k_json);
    let primary = hex_to_bgr_ass(&k.color_primary);
    let active = hex_to_bgr_ass(&k.color_active);
    let font = if k.caps {
        k.font_family.to_uppercase().replace(' ', "")
    } else {
        k.font_family.replace(' ', "")
    };

    let mut ass = String::new();
    ass.push_str("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n");
    ass.push_str("[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n");
    ass.push_str(&format!(
        "Style: Kinetic,{font},{},{primary},&H00000000,&H00000000,&H64000000,1,0,0,0,100,100,{},0,1,4,1,2,80,80,340,1\n",
        k.font_size.round() as i32,
        k.letter_spacing.round() as i32,
    ));
    ass.push_str("\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n");

    let mut count = 0usize;
    for l in &lines {
        let words: Vec<&str> = l.text.split_whitespace().collect();
        if words.is_empty() {
            continue;
        }
        let dur = (l.end - l.start).max(0.2);
        let per_cs = ((dur / words.len() as f64) * 100.0).round().max(10.0) as i32;
        let mut text = String::new();
        for (i, w) in words.iter().enumerate() {
            let word = if k.caps { w.to_uppercase() } else { w.to_string() };
            text.push_str(&format!("{{\\k{per_cs}}}{}", escape_ass(&word)));
            if i + 1 < words.len() {
                text.push(' ');
            }
        }
        ass.push_str(&format!(
            "Dialogue: 0,{},{},Kinetic,,0,0,0,,{{\\2a{}}}{}\n",
            format_ass_time(l.start),
            format_ass_time(l.end),
            active,
            text
        ));
        count += 1;
    }

    std::fs::write(ass_path, ass).map_err(|e| format!("cannot write ass: {e}"))?;
    Ok(SubsResult { ass_path: ass_path.to_string(), line_count: count })
}
