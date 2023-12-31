// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rand::Rng;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

#[tauri::command]
fn ensure_parent_dir(path: PathBuf) {
    if path.is_dir() {
        return;
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .unwrap_or_else(|e| panic!("Error trying to create dir {}: {:#?}", path.display(), e));
    }
}

#[tauri::command]
fn atomic_write(target: String, contents: String) -> Result<(), String> {
    let mut rng = rand::thread_rng();
    let mut n: u64 = rng.gen();

    if std::path::Path::new(&target).is_dir() {
        return Err("Path exists and is a dir!".into());
    }

    let mut random_path = format!("{}.tmp-{}", target, n);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&random_path);
    while file.is_err() {
        n = rng.gen();
        random_path = format!("{}.tmp-{}", target, n);
        file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&random_path);
    }

    match file {
        Ok(mut handle) => {
            if let Err(err) = handle.write(contents.as_bytes()) {
                return Err(err.to_string());
            } else {
                drop(handle);
            }

            if let Err(rename_err) = std::fs::rename(&random_path, target) {
                if let Err(rm_err) = std::fs::remove_file(&random_path) {
                    return Err(rm_err.to_string());
                } else {
                    return Err(rename_err.to_string());
                }
            }
        }
        Err(err) => {
            return Err(err.to_string());
        }
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ensure_parent_dir, atomic_write])
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
