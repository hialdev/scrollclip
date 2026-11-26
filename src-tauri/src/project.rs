use serde::{Deserialize, Serialize};
use crate::storage::Db;
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub mode: String,
    pub status: String,
    pub config: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

fn row_to_project(row: &rusqlite::Row) -> rusqlite::Result<Project> {
    let config: String = row.get("config")?;
    Ok(Project {
        id: row.get("id")?,
        title: row.get("title")?,
        mode: row.get("mode")?,
        status: row.get("status")?,
        config: serde_json::from_str(&config).unwrap_or(serde_json::Value::Null),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

#[tauri::command]
pub fn create_project(
    db: State<Db>,
    title: String,
    mode: String,
    config: Option<serde_json::Value>,
) -> Result<Project, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let config_json = config
        .unwrap_or(serde_json::Value::Object(Default::default()))
        .to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO projects (id, title, mode, status, config, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'draft', ?4, ?5, ?5)",
        rusqlite::params![id, title, mode, config_json, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(Project {
        id,
        title,
        mode,
        status: "draft".into(),
        config: serde_json::from_str(&config_json).unwrap(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_projects(db: State<Db>) -> Result<Vec<Project>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, mode, status, config, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_project)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(db: State<Db>, id: String) -> Result<Option<Project>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, title, mode, status, config, created_at, updated_at FROM projects WHERE id = ?1",
        [&id],
        row_to_project,
    )
    .map(Some)
    .or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        e => Err(e.to_string()),
    })
}

#[tauri::command]
pub fn update_project(db: State<Db>, project: Project) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE projects SET title=?2, mode=?3, status=?4, config=?5, updated_at=?6 WHERE id=?1",
        rusqlite::params![
            project.id,
            project.title,
            project.mode,
            project.status,
            project.config.to_string(),
            chrono::Utc::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
