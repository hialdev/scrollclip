use serde::Serialize;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, State};

use crate::storage::Db;
use crate::subs;

#[derive(Serialize, Clone)]
pub struct LogLine {
    pub project_id: String,
    pub ts: String,
    pub level: String,
    pub message: String,
}

fn log_line(db: &Db, app: &AppHandle, project_id: &str, level: &str, message: &str) {
    let line = LogLine {
        project_id: project_id.to_string(),
        ts: chrono::Utc::now().to_rfc3339(),
        level: level.to_string(),
        message: message.to_string(),
    };
    if let Ok(conn) = db.0.lock() {
        let _ = conn.execute(
            "INSERT INTO processing_logs (project_id, ts, level, message) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![project_id, line.ts, level, message],
        );
    }
    let _ = app.emit("processing-log", &line);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderConfig {
    #[serde(default)]
    videos: Vec<VideoRef>,
    #[serde(default)]
    images: Vec<ImageRef>,
    #[serde(default)]
    image_source: String,
    #[serde(default)]
    kinetic: serde_json::Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VideoRef {
    path: String,
    #[serde(default)]
    title: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImageRef {
    path: Option<String>,
    #[serde(default)]
    kind: String,
    #[serde(default)]
    prompt: Option<String>,
}

fn escape_filter_path(p: &str) -> String {
    p.replace('\\', "\\\\")
        .replace(':', "\\:")
        .replace('\'', "\\'")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace(',', "\\,")
}

fn probe_duration(path: &str) -> Option<f64> {
    let out = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path])
        .output()
        .ok()?;
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    s.parse::<f64>().ok()
}

fn find_font() -> Option<&'static str> {
    [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:\\Windows\\Fonts\\arialbd.ttf",
    ]
    .into_iter()
    .find(|p| std::path::Path::new(p).exists())
}

const VIDEO_VF: &str = "split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[bgk];[fg]scale=1080:-2[fgk];[bgk][fgk]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p";

/// Normalize one video input into a 9:16 30fps h264+aac segment (blurred-background fill).
fn video_segment(input: &str, out: &str, rank_overlay: Option<&str>) -> Result<(), String> {
    let mut cmd = std::process::Command::new("ffmpeg");
    cmd.arg("-y").arg("-i").arg(input);
    cmd.args(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]);
    let mut vf = VIDEO_VF.to_string();
    if let Some(overlay) = rank_overlay {
        match find_font() {
            Some(font) => vf.push_str(&format!(
                ",drawtext=fontfile={}:text='{}':fontsize=120:fontcolor=white:borderw=8:bordercolor=black:x=(w-text_w)/2:y=h*0.10",
                escape_filter_path(font),
                escape_filter_path(overlay)
            )),
            None => {}
        }
    }
    cmd.args(["-vf", &vf]);
    cmd.args(["-map", "0:v:0", "-map", "1:a:0", "-shortest"]);
    cmd.args(["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-ar", "44100"]);
    cmd.arg(out);
    let output = cmd.output().map_err(|e| format!("ffmpeg missing: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err.lines().last().unwrap_or("ffmpeg segment failed").to_string())
    }
}

/// Turn one image into a 3-second 9:16 segment with a slow Ken Burns zoom.
fn image_segment(input: &str, out: &str, secs: f64) -> Result<(), String> {
    let frames = (secs * 30.0).round() as i32;
    // zoompan with d=1 keeps a 1:1 frame mapping (d>1 would multiply every
    // input frame); the zoom is driven by the input frame number instead.
    let vf = format!(
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(1+0.0008*on,1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1,format=yuv420p"
    );
    let output = std::process::Command::new("ffmpeg")
        .arg("-y")
        .args(["-loop", "1", "-framerate", "30", "-t", &format!("{secs:.2}")])
        .arg("-i").arg(input)
        .args(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])
        .args(["-vf", &vf])
        .args(["-map", "0:v:0", "-map", "1:a:0", "-shortest"])
        .args(["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-ar", "44100"])
        .arg(out)
        .output()
        .map_err(|e| format!("ffmpeg missing: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err.lines().last().unwrap_or("ffmpeg image segment failed").to_string())
    }
}

/// Concat segments (re-encode), optionally burning kinetic ASS subtitles and
/// mixing an external audio track over the result.
fn finalize(segments: &[String], out: &str, ass_path: Option<&str>, audio_path: Option<&str>, out_dir: &str) -> Result<(), String> {
    let list_path = format!("{out_dir}/concat_{}.txt", chrono::Utc::now().timestamp_millis());
    let mut list = String::new();
    for s in segments {
        list.push_str(&format!("file '{}'\n", s.replace('\'', "'\\''")));
    }
    std::fs::write(&list_path, list).map_err(|e| e.to_string())?;

    let mut cmd = std::process::Command::new("ffmpeg");
    cmd.arg("-y");
    if let Some(a) = audio_path {
        cmd.arg("-i").arg(a);
    }
    cmd.args(["-f", "concat", "-safe", "0", "-i"]).arg(&list_path);
    if let Some(ass) = ass_path {
        cmd.args(["-vf", &format!("ass={}", escape_filter_path(ass))]);
    }
    if audio_path.is_some() {
        cmd.args(["-map", "0:v:0", "-map", "1:a:0", "-shortest"]);
    } else {
        cmd.args(["-map", "0:v:0", "-map", "0:a:0?"]);
    }
    cmd.args(["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100"]);
    cmd.arg(out);
    let output = cmd.output().map_err(|e| format!("ffmpeg missing: {e}"))?;
    let _ = std::fs::remove_file(&list_path);
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err.lines().last().unwrap_or("ffmpeg concat failed").to_string())
    }
}

fn collect_image_paths(config: &RenderConfig, log: &mut dyn FnMut(&str, &str)) -> Result<Vec<String>, String> {
    let mut paths = Vec::new();
    for (i, img) in config.images.iter().enumerate() {
        match &img.path {
            Some(p) if !p.is_empty() => paths.push(p.clone()),
            _ => log("warn", &format!(
                "image #{} (kind: {}) has no file yet — AI generation happens in the app's image step; skipped",
                i + 1, img.kind
            )),
        }
    }
    if paths.is_empty() {
        return Err("no image files available — upload images or generate them with AI first".to_string());
    }
    Ok(paths)
}

/// Mode-dispatching render entry point, shared by the Tauri command and tests.
pub fn render_sync(
    mode: &str,
    config: serde_json::Value,
    output_dir: &str,
    audio_path: Option<&str>,
    srt_path: Option<&str>,
    mut log: impl FnMut(&str, &str),
) -> Result<String, String> {
    std::fs::create_dir_all(output_dir).map_err(|e| e.to_string())?;
    let stamp = chrono::Utc::now().timestamp_millis();
    let out = format!("{output_dir}/clip_{stamp}.mp4");
    let cfg: RenderConfig = serde_json::from_value(config.clone())
        .map_err(|e| format!("bad config: {e}"))?;

    log("info", &format!("Starting render — mode: {mode}"));

    // Kinetic subtitles: convert SRT to ASS using the project's kinetic settings.
    let mut ass_path: Option<String> = None;
    if let Some(srt) = srt_path {
        let target = format!("{output_dir}/kinetic_{stamp}.ass");
        match subs::srt_to_kinetic_ass(srt, config.clone(), &target) {
            Ok(r) => {
                log("info", &format!("Kinetic subtitles: {} lines -> {}", r.line_count, target));
                ass_path = Some(r.ass_path);
            }
            Err(e) => log("warn", &format!("Subtitle conversion failed, rendering without burn-in: {e}")),
        }
    }

    let result: Result<(), String> = match mode {
        "clip_from_images" => {
            let images = collect_image_paths(&cfg, &mut log)?;
            log("info", &format!("Slideshow: {} images, 3s each", images.len()));
            let mut segments = Vec::new();
            for (i, img) in images.iter().enumerate() {
                let seg = format!("{output_dir}/seg_{stamp}_{i}.mp4");
                image_segment(img, &seg, 3.0)?;
                segments.push(seg);
            }
            finalize(&segments, &out, ass_path.as_deref(), audio_path, output_dir)
        }
        "clip_maker_ranking" => {
            if cfg.videos.is_empty() {
                return Err("no video sources — add at least one video".to_string());
            }
            let n = cfg.videos.len();
            let mut segments = Vec::new();
            for (i, v) in cfg.videos.iter().enumerate() {
                let rank = n - i; // first source = top rank
                let seg = format!("{output_dir}/seg_{stamp}_{i}.mp4");
                log("info", &format!("Segment {}: {} (TOP {rank})", i + 1, v.title));
                video_segment(&v.path, &seg, Some(&format!("TOP {rank}")))?;
                segments.push(seg);
            }
            finalize(&segments, &out, ass_path.as_deref(), audio_path, output_dir)
        }
        "clip_maker_compilation" => {
            if cfg.videos.is_empty() {
                return Err("no video sources — add at least one video".to_string());
            }
            let mut segments = Vec::new();
            for (i, v) in cfg.videos.iter().enumerate() {
                let seg = format!("{output_dir}/seg_{stamp}_{i}.mp4");
                log("info", &format!("Segment {}: {}", i + 1, v.title));
                video_segment(&v.path, &seg, None)?;
                segments.push(seg);
            }
            finalize(&segments, &out, ass_path.as_deref(), audio_path, output_dir)
        }
        _ => {
            // clip_moment, clip_maker, clip_quotes: single-clip render.
            let input = cfg
                .videos
                .first()
                .map(|v| v.path.clone())
                .ok_or("no video sources — add at least one video")?;
            match probe_duration(&input) {
                Some(d) => log("info", &format!("Source duration: {d:.1}s")),
                None => log("warn", "Could not probe source duration"),
            }
            let seg = format!("{output_dir}/seg_{stamp}_0.mp4");
            video_segment(&input, &seg, None)?;
            finalize(&[seg], &out, ass_path.as_deref(), audio_path, output_dir)
        }
    };

    // Clean up intermediate segments.
    for entry in std::fs::read_dir(output_dir).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&format!("seg_{stamp}_")) {
            let _ = std::fs::remove_file(entry.path());
        }
    }

    result?;
    log("success", &format!("Rendered {out}"));
    Ok(out)
}

/// Render a project with ffmpeg, honouring the project's edit mode:
/// - clip_moment / clip_maker / clip_quotes: first video source, 9:16 blur-fill clip
/// - clip_maker_ranking: every source as a clip with a TOP-N badge, concatenated in order
/// - clip_maker_compilation: every source concatenated (no badges)
/// - clip_from_images: image slideshow (3s per image, Ken Burns zoom)
/// Kinetic subtitles are burned in from the SRT (converted to ASS) when present.
#[tauri::command]
pub async fn process_project(
    db: State<'_, Db>,
    app: AppHandle,
    project_id: String,
    mode: String,
    config: serde_json::Value,
    output_dir: String,
    audio_path: Option<String>,
    srt_path: Option<String>,
) -> Result<String, String> {
    let db2 = Db(db.inner().0.clone());

    let project_id2 = project_id.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let app2 = app.clone();
        let log = move |level: &str, message: &str| {
            log_line(&db2, &app2, &project_id2, level, message);
        };
        render_sync(&mode, config, &output_dir, audio_path.as_deref(), srt_path.as_deref(), log)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Read processing logs for a project, oldest first.
#[tauri::command]
pub fn get_logs(db: State<'_, Db>, project_id: String) -> Result<Vec<LogLine>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT project_id, ts, level, message FROM processing_logs WHERE project_id=?1 ORDER BY ts")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(LogLine {
                project_id: row.get(0)?,
                ts: row.get(1)?,
                level: row.get(2)?,
                message: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_srt() {
        let srt = "1\n00:00:01,000 --> 00:00:03,500\nHello world\n\n2\n00:00:04,000 --> 00:00:05,000\nSecond line\n";
        let lines = subs::parse_srt(srt);
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].start, 1.0);
        assert_eq!(lines[0].end, 3.5);
        assert_eq!(lines[0].text, "Hello world");
        assert_eq!(lines[1].text, "Second line");
    }

    fn fixture(name: &str) -> String {
        let p = std::path::Path::new("/tmp/sc-test").join(name);
        assert!(p.exists(), "fixture {} missing — run the fixture setup", name);
        p.to_string_lossy().to_string()
    }

    fn render_config(videos: &[&str], images: &[&str]) -> serde_json::Value {
        serde_json::json!({
            "videos": videos.iter().map(|v| serde_json::json!({"path": v, "title": "Test source"})).collect::<Vec<_>>(),
            "images": images.iter().map(|i| serde_json::json!({"path": i, "kind": "upload", "prompt": null})).collect::<Vec<_>>(),
            "imageSource": "upload",
            "kinetic": {"fontFamily": "DejaVu Sans", "fontSize": 72, "letterSpacing": 0, "caps": true,
                         "colorPrimary": "#FFFFFF", "colorActive": "#4CC0CE", "colorAccent": "#FFFFFF", "words": 3}
        })
    }

    fn probe_clip(path: &str) -> (f64, f64, f64) {
        // (duration, width, height) of the rendered file
        let out = std::process::Command::new("ffprobe")
            .args(["-v", "error", "-select_streams", "v:0", "-show_entries",
                   "stream=width,height:format=duration", "-of", "json", path])
            .output()
            .expect("ffprobe");
        let v: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
        (
            v["format"]["duration"].as_str().unwrap().parse().unwrap(),
            v["streams"][0]["width"].as_i64().unwrap() as f64,
            v["streams"][0]["height"].as_i64().unwrap() as f64,
        )
    }

    #[test]
    fn render_clip_maker_single_video() {
        let out_dir = std::env::temp_dir().join(format!("sc-e2e-cm-{}", std::process::id()));
        let out = render_sync(
            "clip_maker",
            render_config(&[&fixture("v1.mp4")], &[]),
            out_dir.to_str().unwrap(),
            None,
            None,
            |_, _| {},
        ).unwrap();
        let (dur, w, h) = probe_clip(&out);
        assert!((dur - 4.0).abs() < 1.5, "expected ~4s, got {dur}");
        assert_eq!((w, h), (1080.0, 1920.0), "output must be 9:16");
        let _ = std::fs::remove_file(&out);
        let _ = std::fs::remove_dir_all(&out_dir);
    }

    #[test]
    fn render_ranking_two_videos_with_subs() {
        let out_dir = std::env::temp_dir().join(format!("sc-e2e-rank-{}", std::process::id()));
        let out = render_sync(
            "clip_maker_ranking",
            render_config(&[&fixture("v1.mp4"), &fixture("v2.mp4")], &[]),
            out_dir.to_str().unwrap(),
            None,
            Some(&fixture("test.srt")),
            |level, msg| eprintln!("[{level}] {msg}"),
        ).unwrap();
        let (dur, w, h) = probe_clip(&out);
        assert!((dur - 7.0).abs() < 2.0, "expected ~7s (4+3), got {dur}");
        assert_eq!((w, h), (1080.0, 1920.0));
        let _ = std::fs::remove_file(&out);
        let _ = std::fs::remove_dir_all(&out_dir);
    }

    #[test]
    fn render_compilation_two_videos() {
        let out_dir = std::env::temp_dir().join(format!("sc-e2e-comp-{}", std::process::id()));
        let out = render_sync(
            "clip_maker_compilation",
            render_config(&[&fixture("v2.mp4"), &fixture("v1.mp4")], &[]),
            out_dir.to_str().unwrap(),
            None,
            None,
            |_, _| {},
        ).unwrap();
        let (dur, _, _) = probe_clip(&out);
        assert!((dur - 7.0).abs() < 2.0, "expected ~7s, got {dur}");
        let _ = std::fs::remove_file(&out);
        let _ = std::fs::remove_dir_all(&out_dir);
    }

    #[test]
    fn render_clip_from_images_slideshow() {
        let out_dir = std::env::temp_dir().join(format!("sc-e2e-img-{}", std::process::id()));
        let out = render_sync(
            "clip_from_images",
            render_config(&[], &[&fixture("img1.png"), &fixture("img2.png")]),
            out_dir.to_str().unwrap(),
            None,
            None,
            |_, _| {},
        ).unwrap();
        let (dur, w, h) = probe_clip(&out);
        assert!((dur - 6.0).abs() < 1.5, "expected ~6s (2 images x 3s), got {dur}");
        assert_eq!((w, h), (1080.0, 1920.0));
        let _ = std::fs::remove_file(&out);
        let _ = std::fs::remove_dir_all(&out_dir);
    }

    #[test]
    fn render_errors_without_sources() {
        let out_dir = std::env::temp_dir().join(format!("sc-e2e-err-{}", std::process::id()));
        let err = render_sync(
            "clip_maker",
            render_config(&[], &[]),
            out_dir.to_str().unwrap(),
            None,
            None,
            |_, _| {},
        ).unwrap_err();
        assert!(err.contains("no video sources"), "unexpected error: {err}");
        let _ = std::fs::remove_dir_all(&out_dir);
    }
}
