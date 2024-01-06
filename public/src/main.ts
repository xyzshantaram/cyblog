import { initTabs } from "./tabs";
import cf, { ListStore, r } from "campfire.js";
import { message, confirm, input } from "cf-alert";
import { Store as TauriStore } from "tauri-plugin-store-api";
import { path, tauri, dialog as tauriDialog } from "@tauri-apps/api";
import { basename } from '@tauri-apps/api/path';
import feather from 'feather-icons';
import { readDir } from "@tauri-apps/api/fs";
import { watchImmediate, RawEvent as RawFsEvent } from "tauri-plugin-fs-watch-api";

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

type RawEventTypeKind = "metadata" | "file" | "data" | "kind" | "close";

interface RawFsEventExpanded {
    paths: string[],
    attrs: Record<string, any>,
    type: {
        modify?: {
            kind: "rename",
            mode: "from" | "to" | "both"
        } | {
            kind: RawEventTypeKind,
            mode: string
        }
        access?: {
            kind: RawEventTypeKind,
            mode: string
        }
        create?: {
            kind: RawEventTypeKind
        }
        rename?: {
            kind: RawEventTypeKind
            mode: "from" | "to" | "both"
        }
        remove?: {
            kind: RawEventTypeKind
        }
    } | "any"
}

const createWatcher = async (workspace: string, posts: ListStore<string>) => {
    const stopWatching = await watchImmediate(workspace, async (x: RawFsEvent) => {
        console.info(x.paths);
        const e = x as RawFsEventExpanded;
        if (typeof e.type === 'string') return;
        const filename = await path.basename(e.paths[0]);
        if (e.type.create) {
            posts.push(filename);
        }
        else if (e.type.remove) {
            let idx = posts.value.indexOf(filename);
            if (idx >= 0) {
                posts.remove(idx);
            }
        }
        else if (e.type.modify?.kind === 'data') {
            console.warn('todo: figure out what happens when data modified');
        }
        else if (e.type.modify?.kind === 'rename') {
            if (e.type.modify.mode === 'from') {
                let idx = posts.value.indexOf(filename);
                if (idx >= 0) {
                    posts.remove(idx);
                }
            }
            else if (e.type.modify.mode === 'to') {
                posts.push(filename);
            }
        }

    }, { recursive: true });
    return [stopWatching];
}

const Workspace = async (config: CyblogConfig) => {
    await tauri.invoke<void>('ensure_dir', { path: config.workspace });

    const postsDir = await path.join(config.workspace, '_posts');
    await tauri.invoke<void>('ensure_dir', { path: postsDir });

    const [elt, list] = cf.nu('div#workspace', {
        raw: true,
        gimme: ['.post-list'],
        c: cf.html`
        <div class=workspace-header-bar>
            <div id=workspace-title>${await basename(config.workspace)}</div>
            <button id=workspace-settings class=icon>${icon('settings')}</button>

            <span class=workspace-separator></span>
            <button class=button id=publish-site>Publish site ${icon('upload')}</button>
            <button class=button id=new-post>${icon('file-plus')} New post</button>
        </div>

        <div class=work-area>
            <div class=post-list></div>
            <div class=editor></div>
        </div>
        `
    });

    const store = new cf.ListStore<string>([]);
    const [stopWatching] = await createWatcher(config.workspace, store);

    store.on('push', (e) => {
        if (store.value.length === 1) list.innerHTML = '';
        list.append(cf.nu('div.post-item', {
            c: cf.html`${e.value}`,
            a: { 'data-idx': e.idx }
        })[0]);
    })

    store.on('remove', (e) => {
        list.querySelector(`[data-idx="${e.idx}"]`)?.remove();
        const getIdx = (elt: HTMLElement) => parseInt(elt.getAttribute('data-idx')!);
        Array.from<HTMLElement>
            (list.querySelectorAll(`[data-idx]`))
            .filter(elt => getIdx(elt) > e.idx)
            .forEach(elt => elt.setAttribute('data-idx', `${getIdx(elt) - 1}`));

        if (store.value.length === 0) list.innerHTML = 'No posts found.';
    })

    await readDir(postsDir).then(posts => {
        if (posts.length) {
            posts.forEach(post => {
                if (!post.name) return;
                if (post.children) return;
                store.push(post.name);
            })
        }
        else {
            list.innerHTML = 'No posts found.';
        }
    });

    const close = () => {
        stopWatching();
    }

    return [elt, close];
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

    const [wrapper, close] = await Workspace({
        pat, useGithub, workspace, toNamespaced
    });

    cf.select('#root')?.append(wrapper as HTMLElement);

    initTabs();
}

window.addEventListener('DOMContentLoaded', init);