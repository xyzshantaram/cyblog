import { path, tauri } from "@tauri-apps/api";
import { readDir, readTextFile } from "@tauri-apps/api/fs";
import { basename } from "@tauri-apps/api/path";
import { ListStore } from "campfire.js";
import { watchImmediate, RawEvent as RawFsEvent } from "tauri-plugin-fs-watch-api";
import { icon } from "./utils/methods";
import { RawFsEventExpanded, CyblogConfig } from "./utils/types";
import cf from "campfire.js";
import { confirm } from "cf-alert";
import { InkEditor } from "ink-editor";

interface PostEntry {
    title: string;
}

const createWatcher = async (workspace: string, posts: ListStore<string>) => {
    const stopWatching = await watchImmediate(workspace, async (x: RawFsEvent) => {
        console.info(x.paths);
        const e = x as RawFsEventExpanded;
        if (typeof e.type === 'string') return;
        const filename = await path.basename(e.paths[0]);
        if (e.type.create) {
            console.warn("TODO: notify user when file created and we don't have metadata for it");
            posts.push(filename);
        }
        else if (e.type.remove) {
            console.warn('TODO: warn that file was deleted instead of unceremoniously deleting it');
            if (await confirm(`The file "${filename}" was deleted from disk. Do you want to remove it or restore it?`, { yes: 'Remove', no: 'Restore' })) {
                let idx = posts.value.indexOf(filename);
                if (idx >= 0) {
                    posts.remove(idx);
                }
            }
        }
        else if (e.type.modify?.kind === 'data') {
            console.warn('TODO: figure out what happens when data modified');
        }
        else if (e.type.modify?.kind === 'rename') {
            if (e.type.modify.mode === 'from') {
                let idx = posts.value.indexOf(filename);
                if (idx >= 0) {
                    posts.remove(idx);
                }
            }
            else if (e.type.modify.mode === 'to') {
                console.warn("TODO: notify user when file moved and we don't have metadata for it");
                posts.push(filename);
            }
        }

    }, { recursive: true });
    return [stopWatching];
}

export const Workspace = async (config: CyblogConfig) => {
    await tauri.invoke<void>('ensure_dir', { path: config.workspace });

    const postsDir = await path.join(config.workspace, '_posts');
    await tauri.invoke<void>('ensure_dir', { path: postsDir });

    const [elt, list, editorRoot] = cf.nu('div#workspace', {
        raw: true,
        gimme: ['.post-list', '.editor-root'],
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
            <div class="editor-root compact"></div>
        </div>
        `
    });

    console.log(elt, list, editorRoot);

    const store = new cf.ListStore<string>([]);
    const [stopWatching] = await createWatcher(config.workspace, store);
    const currentPost = new cf.Store<string>('');

    const editor = new InkEditor(editorRoot, {
        defaultContents: '',
        placeholder: "A new post! How exciting.",
        height: '100%',
        width: undefined,
    })

    store.on('push', async (e) => {
        if (store.value.length === 1) list.innerHTML = '';
        list.append(...cf.nu('div.post-item', {
            c: cf.html`${e.value}`,
            a: { 'data-idx': e.idx },
            on: {
                'click': async () => {
                    const contents = await readTextFile(e.value);
                    editor.setContents(contents);
                }
            }
        }));
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
                console.log(post);
                store.push(post.path);
            })
        }
        else {
            list.innerHTML = 'No posts found.';
        }
    });

    const close = () => {
        stopWatching();
    }

    return { elt, close, currentPost, editor };
}