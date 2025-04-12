import { r } from "campfire.js";
import { message } from "cf-alert";
import feather from "feather-icons";
import { Store as TauriStore } from "@tauri-apps/plugin-store";
import * as dialog from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core";

export const getWorkspaceDir = async (settings: TauriStore): Promise<string> => {
    const selection = await dialog.open({
        directory: true,
        multiple: false,
        recursive: true,
        title: 'Select workspace.'
    })

    if (!Array.isArray(selection) && selection !== null) {
        await settings.set('last_workspace', selection);
        return selection;
    }
    else {
        await message("Woops. That didn't work, let's try it again.");
        return getWorkspaceDir(settings);
    }
}

export const ensureDir = (path: string) => {
    return invoke<void>('ensure_dir', { path });
}

export const getParentDir = (path: string) => {
    return invoke<string>('parent_dir', { path });
}

export const writeAtomic = (path: string, contents: string) => {
    return invoke<void>('atomic_write', { target: path, contents });
}



export const icon = (name: feather.FeatherIconNames, className?: string) => {
    return r(
        `<span class="icon${' ' + className || ""}">${feather.icons[name].toSvg()}</span>`
    );
}