use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use std::sync::Mutex;

use crate::storage::Db;

#[derive(Serialize, Clone)]
pub struct LogLine {
    pub project_id: String,
    pub ts: String,
    pub level: String,
    pub message: String,
}

fn log(db: &Db, app: &AppHandle, project_id: &str, level: &str, message: &str) {
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

/// Render a clip with ffmpeg: 9:16 vertical (1080x1920) with blurred-background fill,
/// optional mixed audio track and optional burned-in ASS subtitles.
#[tauri::command]
pub async fn process_project(
    db: State<'_, Db>,
    app: AppHandle,
    project_id: String,
    input_paths: Vec<String>,
    output_dir: String,
    audio_path: Option<String>,
    ass_path: Option<String>,
) -> Result<String, String> {
    let db2 = Db(db.inner().0.clone());

    tauri::async_runtime::spawn_blocking(move || {
        std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
        let stamp = chrono::Utc::now().timestamp_millis();
        let out = format!("{}/clip_{stamp}.mp4", output_dir);

        log(&db2, &app, &project_id, "info", "Starting render…");

        let input = input_paths.first().ok_or("no input media")?.clone();

        let mut cmd = std::process::Command::new("ffmpeg");
        cmd.arg("-y").arg("-i").arg(&input).args([
            "-vf",
            "split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[bgk];[fg]scale=1080:-2[fgk];[bgk][fgk]overlay=(W-w)/2:(H-h)/2",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
        ]);

        if let Some(a) = &audio_path {
            cmd.arg("-i").arg(a).args([
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:a", "aac", "-shortest",
            ]);
        } else {
            cmd.args(["-map", "0:v:0"]);
        }
        if let Some(ass) = &ass_path {
            cmd.args(["-vf", &format!("ass={}", ass.replace(':', "\\:"))]);
        }
        cmd.arg(&out);

        log(&db2, &app, &project_id, "info", "Running ffmpeg render…");

        let output = cmd.output().map_err(|e| format!("ffmpeg missing: {e}"))?;

        if output.status.success() {
            log(&db2, &app, &project_id, "success", &format!("Rendered {out}"));
            Ok(out)
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            log(&db2, &app, &project_id, "error", &format!("ffmpeg failed: {}", &err[..err.len().min(400)]));
            Err(err.lines().last().unwrap_or("ffmpeg failed").to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Read processing logs for a project, newest last.
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
