import {error} from './logging.ts';

export type Path = string | URL;

export enum PathTypes {
    File = 0,
    Directory
}

export interface CyblogBuildArgs {
    to?: Path;
    applyStyles?: Path[];
    cyblog?: boolean,
    overwrite?: boolean
}

export function scream(code: number, ...data: unknown[]) {
    if (code == 0) console.log(...data);
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

export function getConfigDir(): string | null {
    switch (Deno.build.os) {
        case "linux": {
            const xdg = Deno.env.get("XDG_DATA_HOME");
            if (xdg) return xdg;

            const home = Deno.env.get("HOME");
            if (home) return `${home}/.local/share`;
            break;
        }
        case "darwin": {
            const home = Deno.env.get("HOME");
            if (home) return `${home}/Library/Application Support`;
            break;
        }
        case "windows":
            return Deno.env.get("FOLDERID_RoamingAppData") ?? null;
    }

    return null;
}

export function createElementWithAttrs(name: string, args: Record<string, unknown>) {
    let tagString = `<${name}`
    for (const key in args) {
        tagString += ` ${key}="${args[key]}"`
    }
    tagString += '>';
    return tagString;
}

export function createClosingTag(name: string) {
    return `</${name}>`
}
