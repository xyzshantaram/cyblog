import { initTabs } from "./tabs";
import cf, { r } from "campfire.js";
import { message, confirm, input } from "cf-alert";
import { Store as TauriStore } from "tauri-plugin-store-api";
import { dialog as tauriDialog } from "@tauri-apps/api";
import { basename } from '@tauri-apps/api/path';
import feather from 'feather-icons';

const getWorkspaceDir = async (settings: TauriStore): Promise<string> => {
    const selection = await tauriDialog.open({
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

interface CyblogConfig {
    pat: string | null;
    useGithub: boolean;
    workspace: string;
    toNamespaced: (str: string) => string;
}

const icon = (name: feather.FeatherIconNames) => {
    return r(feather.icons[name].toSvg());
}

const Workspace = async (config: CyblogConfig) => {
    const [elt] = cf.nu('div#workspace', {
        raw: true,
        c: cf.html`
        <div class=workspace-header-bar>
            <div id=workspace-title>${await basename(config.workspace)}</div>
            <button id=workspace-settings class=icon>${icon('settings')}</button>

            <span class=workspace-separator></span>
            <button class=button id=publish-site>Publish site ${icon('upload')}</button>
            <button class=button id=new-post>${icon('file-plus')} New post</button>
        </div>

        <div class=work-area>
            <div class=post-list>

            </div>

            <div class=editor>
            </div>
        </div>
        `
    })

    return [elt];
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
    const toNamespaced = (str: string) => `${workspaceB64};${str}`;

    let useGithub = await settings.get<boolean>(toNamespaced('use_github'));
    let pat = await settings.get<string>(toNamespaced('github_pat'));

    if (useGithub == null) {
        useGithub = await confirm('Would you like to use Cyblog with a GitHub Pages site?', { no: 'No', yes: 'Yes' }, 'Use GitHub?') as boolean;
        if (!useGithub) await message('Push functionality will be unavailable for this site.');
        console.table({ useGithub });
        await settings.set(toNamespaced('use_github'), useGithub);
    }

    if (useGithub && !pat) {
        pat = await input('text', 'Enter the Personal Access Token for the GitHub account associated with this site.') as string;
        console.table({ pat });
        await settings.set(toNamespaced('github_pat'), pat);
    }

    await settings.save();

    const [wrapper] = await Workspace({
        pat, useGithub, workspace, toNamespaced
    });

    cf.select('#root')?.append(wrapper!);

    initTabs();
}

window.addEventListener('DOMContentLoaded', init);