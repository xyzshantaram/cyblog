import { r } from "campfire.js";
import { message } from "cf-alert";
import feather from "feather-icons";
import { Store as TauriStore } from "@tauri-apps/plugin-store";
import * as dialog from "@tauri-apps/plugin-dialog"

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


export const icon = (name: feather.FeatherIconNames) => {
    return r(feather.icons[name].toSvg());
}