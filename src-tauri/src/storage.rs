use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

pub fn init_db(dir: PathBuf) -> Result<Connection> {
    std::fs::create_dir_all(&dir).ok();
    let conn = Connection::open(dir.join("scrollclip.db"))?;
    migrate(&conn)?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS projects (
             id TEXT PRIMARY KEY,
             title TEXT NOT NULL,
             mode TEXT NOT NULL,
             status TEXT NOT NULL DEFAULT 'draft',
             config TEXT NOT NULL DEFAULT '{}',
             created_at TEXT NOT NULL,
             updated_at TEXT NOT NULL
         );",
    )
}
