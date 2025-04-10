import { initTabs } from "./utils/tabs";
import cf from "campfire.js";
import { message, confirm, input } from "cf-alert";
import { Store as TauriStore } from "@tauri-apps/plugin-store";
import { getWorkspaceDir } from "./utils/methods";
import { Workspace } from "./Workspace";

const init = async () => {
    const settings = new TauriStore('.settings.json');

    let workspace: string | null = null;
    if (!(workspace = await settings.get<string>('last_workspace'))) {
        await message(`Hi! Welcome to Cyblog. Looks like you haven't used Cyblog before. 
            Let's pick out a folder for your blog's files.`);
        workspace = await getWorkspaceDir(settings);
    }

    const workspaceB64 = btoa(workspace);
    const namespaced = (str: string) => `${workspaceB64};${str}`;

    let useGithub = await settings.get<boolean>(namespaced('use_github'));
    let pat = await settings.get<string>(namespaced('github_pat'));

    if (useGithub == null) {
        useGithub = await confirm('Would you like to use Cyblog with a GitHub Pages site?', { no: 'No', yes: 'Yes' }, 'Use GitHub?') as boolean;
        if (!useGithub) await message('Push functionality will be unavailable for this site.');
        console.table({ useGithub });
        await settings.set(namespaced('use_github'), useGithub);
    }

    if (useGithub && !pat) {
        pat = await input('text', 'Enter the Personal Access Token for the GitHub account associated with this site.') as string;
        console.table({ pat });
        await settings.set(namespaced('github_pat'), pat);
    }

    await settings.save();

    const { elt, editor, close, currentPost } = await Workspace({
        pat, useGithub, workspace, namespaced
    });

    cf.select('#root')?.append(elt as HTMLElement);

    initTabs();
}

window.addEventListener('DOMContentLoaded', init);