import { path } from "@tauri-apps/api";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { enumerate, ListStore } from "campfire.js";
import { basename, ensureDir, icon } from "./utils/methods.ts";
import { CyblogConfig } from "./utils/types.ts";
import cf, { Store, callbackify } from "campfire.js";
import { fatal } from "cf-alert";
import { InkEditor } from "ink-editor";
import { createWatcher } from "./utils/watcher.ts";

export interface PostItem {
    path: string,
    name: string,
    editor: InkEditor | null,
};

const Workspace = ({ posts, path: wkPath, currentPost }: {
    posts: ListStore<PostItem>,
    currentPost: Store<string>,
    path: string
}) => {
    const post = (p: PostItem, i: number, selected = false) =>
        cf.html`<div class="post-item${selected ? " selected" : ""}" data-idx="${i.toString()}" data-path="${p.path}">${basename(p.name)}</div>`

    const list = cf.nu('.post-list')
        .deps({ posts, currentPost })
        .html(({ posts }) => posts.length ? posts.map((item, i) =>
            post(item, i, currentPost.value === item.path)
        ).join('\n') : 'No posts found.'
        ).on('click', async (e) => {
            const target = e.target as HTMLElement;
            if (!target?.closest('.post-item')) return;
            const attr = cf.unescape(target.getAttribute('data-path') || '');
            if (!attr) return;
            currentPost.update(attr);
        })
        .ref();

    const name = basename(wkPath);

    return cf.nu('#workspace')
        .gimme('.editors')
        .html(cf.html`
            <div class=workspace-header-bar>
                <cf-slot name='settings'></cf-slot>
                <div id=workspace-title>${name}</div>
                <span class=workspace-separator></span>
                <button class=button id=publish-site>Publish site ${icon('upload', 'icon-sm')}</button>
                <button class=button id=new-post>${icon('file-plus', 'icon-sm')} New post</button>
            </div>

            <div class=work-area>
                <cf-slot name='list'></cf-slot>
                <div class="editors"></div>
            </div>
        `)
        .children({
            list,
            settings: cf.nu('button#workspace-settings.icon-btn')
                .style('color', 'white')
                .html(cf.html`${icon('settings', 'icon-sm')}`)
                .ref()
        })
        .done();
}

const createEditor = async (posts: ListStore<PostItem>, path: string) => {
    const idx = posts.value.findIndex(item => item.path === path);
    if (idx < 0) return [];
    const value = posts.get(idx);
    if (!value) return [];
    if (value.editor) return [];

    let contents = '';
    try {
        contents = await readTextFile(path);
    }
    catch (e) {
        if (typeof e !== 'string' || !e.includes('No such file or directory')) {
            await fatal(`Error loading file ${path}: ${e}`)
        }
    }

    const root = cf.nu('.editor-root.compact').ref();
    const editor = new InkEditor(root, {
        defaultContents: '',
        placeholder: 'A new post! How exciting.',
        height: "100%",
        fontFamily: "Sono",
        autosaveDelayMs: 5 * 60 * 1000,
        width: '100%'
    })

    editor.setContents(contents);
    posts.set(idx, { ...value, editor });

    return [root, editor] as const;
}

const init = async (config: CyblogConfig) => {
    await ensureDir(config.workspace);

    const postsDir = await path.join(config.workspace, '_posts');
    await ensureDir(postsDir);

    const currentPost = cf.store({ value: '' });
    const posts = cf.store<PostItem>({ type: 'list' });
    const [stopWatching] = await createWatcher(config.workspace, posts);

    const [elt, wrapper] = Workspace({ posts, path: config.workspace, currentPost });

    await readDir(postsDir).then(entries => Promise.all(
        entries.map(async ({ name, isDirectory }) => {
            if (!name) return;
            if (isDirectory) return;
            posts.push({
                name,
                path: await path.join(postsDir, name),
                editor: null
            })
        })
    ));

    const handleCurrentPostChange = callbackify(async ({ value }: { value: string }) => {
        console.log(`Current post set to: ${value}`);

        for (const [i, post] of enumerate(posts.value)) {
            if (post.path !== value) {
                if (post.editor) post.editor.parent.style.display = 'none';
                continue;
            }

            if (!post.editor) {
                const [elt, editor] = await createEditor(posts, value);
                cf.insert(elt, { into: wrapper });
                posts.set(i, { ...post, editor });
            }
            else {
                post.editor.parent.style.display = 'flex';
            }
        }
    });

    currentPost.on('update', (evt) => handleCurrentPostChange((err) => {
        if (err) fatal(`Error: could not set up editor for file ${evt.value}: ${err}`);
        console.log(evt);
    }, evt))

    const close = () => {
        stopWatching();
    }

    return { elt, close };
}

export default { init };