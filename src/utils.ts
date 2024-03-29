import { error, info } from './logging.ts';
import { path } from './deps.ts';

export type Path = string;

export enum PathTypes {
    File = 0,
    Directory
}

export interface Template {
    header: string,
    footer: string,
    stylePath: string
}

export interface CyblogBuildArgs {
    to?: Path;
    applyStyles?: Path[];
    cyblog?: boolean,
    overwrite?: boolean,
    excludeFiles?: string[],
    excludeDirs?: string[],
    pwd?: string,
    launchDir?: string,
    convertReadmes?: boolean,
    forceCyblog?: boolean,
    plug?: boolean,
    customHead?: string | null,
    math?: boolean
}

export function scream(code: number, ...data: unknown[]) {
    if (code == 0) info(...data);
    else error(...data);
    Deno.exit(code);
}

export function getFileName(name: string, type: string) {
    return name.slice(undefined, name.length - type.length);
}

export function getExtension(name: string): string | null {
    const idx = name.lastIndexOf('.');
    if (idx) {
        return name.slice(idx);
    }
    return null;
}

export async function getType(path: Path) {
    if ((await Deno.stat(path)).isFile) return PathTypes.File;
    return PathTypes.Directory;
}

export function getDataDir(): string | null {
    let rval: string | null = null;

    rval = Deno.env.get("CYBLOG_DATA_DIR") || null; // respect CYBLOG_DATA_DIR env setting
    // to override default cyblog data path

    switch (Deno.build.os) {
        case "linux": {
            if (rval) break;
            // look for XDG_DATA_HOME, if not found, default to $HOME/.local/share
            const xdg = Deno.env.get("XDG_DATA_HOME");
            let fallback: string | undefined | null = Deno.env.get("HOME");
            fallback = fallback ? `${fallback}/.local/share` : null;

            rval = xdg || fallback || null;
            break;
        }
        case "darwin": {
            if (rval) break;
            // Look for $HOME, return $HOME/Library/Application Support
            // if it exists
            let home: string | null | undefined = Deno.env.get("HOME");
            home = home ? `${home}/Library/Application Support` : null;

            rval = home;
            break;
        }
        case "windows": {
            if (rval) break;
            // Look for appdata, use it if it is set
            rval = Deno.env.get("APPDATA") || null;
            break;
        }
        default: {
            // fall back to CYBLOG_DATA_DIR again if we don't know what OS this is.
            rval = Deno.env.get("CYBLOG_DATA_DIR") || null;
            break;
        }
    }

    if (rval && !path.isAbsolute(rval)) {
        scream(1, "Configuration path isn't absolute!");
    }

    return rval;
}

export const getDataDirOrDie = (): string => {
    const path = getDataDir();
    if (!path) scream(1, "Unable to get data directory!");
    return <string>path;
}

export function createElementWithAttrs(name: string, args: Record<string, unknown> = {}) {
    let tagString = `<${name}`
    for (const key in args) {
        if (key && args[key]) tagString += ` ${key}="${args[key]}"`
    }
    tagString += '>';
    return tagString;
}

export function createClosingTag(name: string) {
    return `</${name}>`
}

export const createTag = (name: string, contents: string, attrs: Record<string, unknown> = {}): string => {
    return `\n${createElementWithAttrs(name, attrs)}\n${contents}\n${createClosingTag(name)}\n`;
}

export const matchOrDie = (str: string, pattern: RegExp, msg: string) => {
    const matches = str.match(pattern);
    if (!matches) scream(1, msg);
    return matches!;
}