use serde::Serialize;
use tauri::State;
use std::sync::Mutex;

use crate::storage::Db;

#[derive(Serialize, Clone)]
pub struct VideoMeta {
    pub title: String,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ProbeResult {
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub title: Option<String>,
}

fn run(cmd: &str, args: &[&str]) -> Option<String> {
    let out = std::process::Command::new(cmd)
        .args(args)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).to_string())
}

/// Probe a local video file with ffprobe for duration and title metadata.
#[tauri::command]
pub fn probe_video(path: String) -> Result<ProbeResult, String> {
    let out = run(
        "ffprobe",
        &[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &path,
        ],
    )
    .ok_or("ffprobe not available".to_string())?;

    let json: serde_json::Value =
        serde_json::from_str(&out).map_err(|e| e.to_string())?;
    let format = &json["format"];
    let duration = format["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok());
    let title = format["tags"]["title"].as_str().map(|s| s.to_string());
    let width = json["streams"][0]["width"].as_u64().map(|v| v as u32);
    let height = json["streams"][0]["height"].as_u64().map(|v| v as u32);
    Ok(ProbeResult { duration, width, height, title })
}

/// Fetch online video metadata via yt-dlp without downloading the media.
#[tauri::command]
pub fn yt_dlp_info(url: String) -> Result<VideoMeta, String> {
    let out = run(
        "yt-dlp",
        &[
            "--no-warnings",
            "--skip-download",
            "--print", "%(title)s|%(duration)s|%(uploader)s",
            &url,
        ],
    )
    .ok_or_else(|| "yt-dlp not installed — install with: pip install yt-dlp".to_string())?;

    let line = out.lines().last().unwrap_or("").to_string();
    let parts: Vec<&str> = line.split('|').collect();
    if parts.is_empty() || parts[0].is_empty() {
        return Err(format!("yt-dlp could not read metadata for {}", url));
    }
    Ok(VideoMeta {
        title: parts[0].to_string(),
        duration: parts.get(1).and_then(|s| s.trim().parse::<f64>().ok()),
        uploader: parts.get(2).map(|s| s.trim().to_string()),
    })
}

/// Download an online video to the given directory via yt-dlp, returning the file path.
#[tauri::command]
pub async fn yt_dlp_download(
    db: State<'_, Db>,
    app: tauri::AppHandle,
    url: String,
    dest_dir: String,
) -> Result<String, String> {
    let _ = db; // reserved: cache index in DB later
    let app = app.clone();
    let url2 = url.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
        let out_tpl = format!("{}/%(title).80s [%(id)s].%(ext)s", dest_dir);
        let out = std::process::Command::new("yt-dlp")
            .args([
                "--no-warnings",
                "-f", "bv*+ba/b",
                "-o", &out_tpl,
                "--print", "after_move:filepath",
                &url2,
            ])
            .output()
            .map_err(|_| "yt-dlp not installed".to_string())?;
        if !out.status.success() {
            return Err(format!(
                "yt-dlp failed: {}",
                String::from_utf8_lossy(&out.stderr)
            ));
        }
        let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
        Ok(path)
    })
    .await
    .map_err(|e| e.to_string())?
}
