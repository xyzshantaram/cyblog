import { path } from "@tauri-apps/api";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { basename, ensureDir, icon } from "./utils/methods.ts";
import cf, { Store, callbackify } from "campfire.js";
import { confirm, fatal } from "cf-alert";
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
    const post = (p: PostItem, i: number) =>
        cf.html`<div class=post-item data-idx="${i}" data-path="${p.path}">${basename(p.name)}</div>`

    const list = cf.nu('.post-list')
        .deps({ posts })
        .html(({ posts }) => posts.length ? posts.map(post).join('\n') : 'No posts found.'
        ).on('click', async (e) => {
            const target = e.target as HTMLElement;
            if (!target?.classList.contains('post-item')) return;
            const attr = cf.unescape(target.getAttribute('data-name') || '');
            if (!attr) return;
            const p = await path.join(wkPath, attr);
            currentPost.update(p);
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

    const root = cf.nu('.editor-root').ref();
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
        for (const [post, i] of posts.value.map((item, i) => [item, i] as const)) {
            if (post.path !== value) {
                if (post.editor) post.editor.parent.style.display = 'none';
                return;
            }
            if (post.editor) {
                post.editor.parent.style.display = 'unset';
            }
            else {
                const [elt, editor] = await createEditor(posts, value);
                cf.insert(elt, { into: wrapper });
                posts.set(i, { ...post, editor });
            }
        }
    });

    currentPost.on('update', async (evt) => {
        handleCurrentPostChange((err) => {
            if (err) fatal(`Error: could not set up editor for file ${evt.value}: ${err}`)
        }, evt);
    })

    const close = () => {
        stopWatching();
    }

    return { elt, close };
}

export default { init };