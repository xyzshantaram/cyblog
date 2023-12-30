import { initTabs } from "./tabs";
import cf from "campfire.js";
import { message, confirm, input } from "cf-alert";
import { Store as TauriStore } from "tauri-plugin-store-api";
import { dialog as tauriDialog } from "@tauri-apps/api";

const getWorkspaceDir = async (settings: TauriStore): Promise<string> => {
    const selection = await tauriDialog.open({
        directory: true,
        multiple: false,
        recursive: true,
        title: 'Select workspace.'
    })

    if (!Array.isArray(selection) && selection !== null) {
        await settings.set('last_workspace', selection);
        await settings.save();
        return selection;
    }
    else {
        await message("Woops. That didn't work, let's try it again.");
        return getWorkspaceDir(settings);
    }
}

const Workspace = (dir: string, config) => {
    const [elt] = cf.nu('div#workspace', {
        raw: true,
        c: cf.html`foo`
    })
}

const init = async () => {
    const settings = new TauriStore('.settings.json');

    let workspace: string | null = null;
    if (!(workspace = await settings.get<string>('last_workspace'))) {
        await message(`Hi! Welcome to Cyblog. Looks like you haven't used Cyblog before. 
            Let's pick out a folder for your blog's files.`);
        workspace = await getWorkspaceDir(settings);
    }

    const workspaceB64 = btoa(workspace);
    const toNamespaced = (str: string) => workspaceB64 + str;

    let useGithub = await settings.get<boolean>(toNamespaced('use_github'));
    let pat = await settings.get<string>(toNamespaced('github_pat'));

    if (useGithub == null) {
        useGithub = await confirm('Would you like to use Cyblog with a GitHub Pages site?', { no: 'No', yes: 'Yes' }, 'Use GitHub?') as boolean;
        if (!useGithub) await message('Push functionality will be unavailable for this site.');
        console.table({ useGithub });
    }

    if (useGithub && !pat) {
        pat = await input('text', 'Enter the Personal Access Token for the GitHub account associated with this site.') as string;
        console.table({ pat });
    }

    const config = {
        pat, useGithub, workspace, toNamespaced
    }

    initTabs();
}

window.addEventListener('DOMContentLoaded', init);