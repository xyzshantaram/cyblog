use rand::RngCore;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

#[tauri::command]
fn parent_dir(path: PathBuf) -> Result<std::path::PathBuf, ()> {
    if let Some(parent) = path.parent() {
        return if parent.as_os_str() != "" {
            Ok(parent.to_owned())
        } else {
            Err(())
        };
    }
    Err(())
}

#[tauri::command]
fn ensure_dir(path: PathBuf) -> Result<(), &'static str> {
    let exists = path.exists();
    if exists && path.is_dir() {
        Ok(())
    } else if exists && path.is_file() {
        Err("Path exists and is a file. Bailing.")
    } else {
        std::fs::create_dir_all(path)
            .map(|_| ())
            .map_err(|_| "Could not create dir.")
    }
}

#[tauri::command]
fn atomic_write(target: String, contents: String) -> Result<(), String> {
    let mut rng = rand::rng();
    let mut n: u64 = rng.next_u64();

    if std::path::Path::new(&target).is_dir() {
        return Err("Path exists and is a dir!".into());
    }

    let mut random_path = format!("{}.tmp-{}", target, n);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&random_path);
    while file.is_err() {
        n = rng.next_u64();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            atomic_write,
            parent_dir,
            ensure_dir
        ])
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
