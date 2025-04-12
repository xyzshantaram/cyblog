import { watchImmediate, WatchEvent } from "@tauri-apps/plugin-fs";
import { ListStore } from "campfire.js";
import { PostItem } from "../Workspace";
import { basename, getParentDir } from "./methods.ts";
import { RawFsEventExpanded } from "./types.ts";
import { confirm } from "cf-alert";

const confirmRemoval = (file: string) => confirm(`The file "${file}" was removed or deleted. ` +
    `Do you want to remove it or restore it?`, { yes: 'Remove', no: 'Restore' });

const handleFsEvent = async ({ e, posts }: {
    e: RawFsEventExpanded,
    posts: ListStore<PostItem>
}) => {
    if (typeof e.type === 'string') return;
    const pathParents = await Promise.all(e.paths.map(async path => [path, await getParentDir(path)]));
    const findIdx = (p: string) => posts.value.findIndex(item => item.path === p);

    const handleAdd = (path: string, parent: string) => {
        if (!parent.endsWith("_posts")) return;
        posts.push({ editor: null, path, name: basename(path) });
    }

    const handleRemove = (path: string) => {
        const idx = findIdx(path);
        if (idx >= 0) posts.remove(idx);
    }

    if (e.type.create) {
        console.warn("TODO: notify user when file created and we don't have metadata for it");
        const [[path, parent]] = pathParents;
        handleAdd(path, parent);
    }
    else if (e.type.remove) {
        const [[deleted]] = pathParents;
        if (await confirmRemoval(deleted)) handleRemove(deleted);
    }
    else if (e.type.modify?.kind === 'data') {
        console.warn('TODO: figure out what happens when data modified');
    }
    else if (e.type.modify?.kind === 'rename') {
        if (e.type.modify.mode === 'from') {
            const [[moved]] = pathParents;
            if (await confirmRemoval(moved)) handleRemove(moved);
        }
        else if (e.type.modify.mode === 'to') {
            console.warn("TODO: notify user when file moved and we don't have metadata for it");
            const [[path, parent]] = pathParents;
            handleAdd(path, parent);
        }
        else if (e.type.modify.mode === 'both') {
            const [[fromPath, fromParent], [toPath, toParent]] = pathParents;
            if (fromParent.endsWith('_posts')) {
                if (await confirmRemoval(fromPath)) handleRemove(fromPath);
            }
            if (!toParent.endsWith('_posts')) return;
            handleAdd(toPath, toParent);
        }
    }
}

export const createWatcher = async (workspace: string, posts: ListStore<PostItem>) => {
    const stopWatching = await watchImmediate(workspace, async (x: WatchEvent) => {
        const e = x as RawFsEventExpanded;
        await handleFsEvent({ e, posts });
    }, { recursive: true });
    return [stopWatching];
}