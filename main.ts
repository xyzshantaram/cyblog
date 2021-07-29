import { flags, path, fs, Marked } from './deps.ts';
import { Path, PathTypes, CyblogBuildArgs, getType, scream, getFileName, getExtension, getConfigDir, createElementWithAttrs, createClosingTag } from './utils.ts';
import { CYBLOG_VALID_SUFFIXES, CYBLOG_KNOWN_DECLS, DOCTYPE, HTML_OPEN, HTML_CLOSE } from './constants.ts';
import { warn, error } from './logging.ts';

async function buildStyleElement(styles: (Path | undefined)[]) {
    let ret = `<style>\n`;
    for (const x of styles) {
        try {
            if (x) {
                const contents = await Deno.readTextFile(x);
                ret += contents;
            }
        }
        catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                warn(`Stylesheet ${x} not found, continuing`);
            }
            else {
                console.error(e);
            }
        }
    }
    ret += `</style>\n`;

    return ret;
}

async function parse(toParse: string, args: CyblogBuildArgs): Promise<string> {
    if (args.cyblog && !toParse.startsWith('<!-- cyblog-meta')) {
        warn('Cyblog document with no document meta block');
    }
    Marked.setOptions
        ({
            gfm: true,
            tables: true,
            smartLists: true,
            smartypants: false
        });

    const applyStyles = args?.applyStyles instanceof Array ? args?.applyStyles : [args?.applyStyles] || [];
    const markup = Marked.parse(toParse);
    const builtHTML = markup.content;
    const lines = builtHTML.split('\n');
    const openedBlocks: string[] = [];
    const closedBlocks: string[] = [];

    const final: string[] = [];

    const cyblogDeclarations: Record<string, string> = {}

    const processDecl = async (declName: string, declValue: string) => {
        if (!CYBLOG_KNOWN_DECLS.includes(declName) && !declName.includes('meta')) {
            warn(`Ignoring unknown declaration ${declName}.`)
            return;
        }
        if (declName === 'block-start') {
            if (!declValue.match(/^[a-z][a-z\-]+[a-z]/)) {
                scream(1, `Invalid syntax for block name: ${declValue}`);
            }
            const parts = declValue.split(' ');
            openedBlocks.push(parts[0]);
            let id = parts[0];
            const classes = [];
            for (const x of parts) {
                if (x.startsWith("#")) {
                    id = x.replace("#", '');
                }
                if (x.startsWith(".")) {
                    classes.push(...x.split('.'));
                }
            }
            final.push(`<div id="${id.trim()}" class="${classes.join(' ').trim()}">`)
            console.log(final[final.length - 1]);
        }
        else if (declName === 'include') {
            const contents = await Deno.readTextFile(declValue);
            final.push(...contents.split('\n'));
        }
        else if (declName === 'block-end') {
            closedBlocks.push(declValue);
            final.push('</div>');
        }
        else if (declName === 'apply-style') {
            applyStyles.push(declValue);
        }
        else {
            cyblogDeclarations[declName] = declValue;
        }
    }

    let inCodeBlock = false;
    let title = 'Cyblog Document';
    let headerCount = 0;


    for (let lidx = 0; lidx < lines.length; lidx += 1) {
        const line = lines[lidx];
        if (/^\s*<!--/.test(line) && !inCodeBlock) {
            if (args.cyblog) {
                const matches = line.match(/<!-- @([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+) -->/);
                if (matches) {
                    await processDecl(matches[1], matches[3]);
                }
                if (!(/<!-- cyblog-meta/.test(line))) continue;
                while (!(/^-->$/.test(lines[++lidx]))) {
                    const matches = lines[lidx].match(/^@([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+)$/);
                    if (matches) await processDecl(matches[1], matches[3]);
                }
            }
        }
        else if (/<h[1-6]>(.*)<\/h[1-6]>/gi.test(line)) {
            final.push(line);
            headerCount += 1;
            if (headerCount == 1) {
                title = line.replace(/<h[1-6]>(.*)<\/h[1-6]>/, '$1');
            }
        }
        else if (line.startsWith('<pre><code>')) {
            final.push(line);
            inCodeBlock = true;
        }
        else if (line.includes('</code></pre>')) {
            final.push(line);
            inCodeBlock = false;
        }
        else {
            final.push(line);
        }
    }

    if (closedBlocks.length !== openedBlocks.length) {
        scream(1, `Unclosed blocks present!\nUnclosed blocks:\n * ${openedBlocks.filter(elem => !closedBlocks.includes(elem)).join('\n * ')}`)
    }

    if (args.cyblog) {
        if (Object.keys(cyblogDeclarations).includes('title')) {
            title = cyblogDeclarations['title'];
        }
        else {
            warn('No @title declaration in Cyblog document - falling back to first header');
        }
    }

    let doc = DOCTYPE + HTML_OPEN;
    doc += createElementWithAttrs('head', {});
    doc += createElementWithAttrs('meta', { charset: 'UTF-8' });
    doc += createElementWithAttrs('meta', { name: 'viewport', content: "width=device-width, initial-scale=1.0" });
    doc += createElementWithAttrs('title', {});
    doc += title + '\n';
    doc += createClosingTag('title');
    for (const key in cyblogDeclarations) {
        if (key.startsWith('html-meta')) {
            const split = key.split('-');
            if (split.length < 3) {
                error(`Invalid html-meta declaration ${key}`);
                continue;
            }
            doc += createElementWithAttrs('meta', { name: split[2], content: cyblogDeclarations[key] })
        }
    }
    doc += await buildStyleElement(applyStyles);
    doc += createClosingTag('head');
    doc += createElementWithAttrs('body', {});
    doc += final.join('\n');
    doc += createClosingTag('body');
    doc += HTML_CLOSE;

    return doc;
}

async function buildFile(from: Path, args?: CyblogBuildArgs) {
    const src = from.toString();

    const userConfigDir = getConfigDir();
    if (!userConfigDir) {
        throw new Deno.errors.NotFound('Could not find configuration directory. Did you run the cyblog install script?');
    }
    const configPath = path.join(userConfigDir, 'cyblog');
    const defaultStyleSheet = path.join(configPath, 'cyblog-defaults.css');

    let styles: Path[] = [defaultStyleSheet];
    if (args?.applyStyles instanceof Array) {
        styles = [...styles, ...args?.applyStyles];
    }

    const extn = getExtension(src);

    if (!extn || !CYBLOG_VALID_SUFFIXES.includes(extn)) {
        throw new Error(`supplied file ${src} is not of a type supported by Cyblog. Cyblog supports the types '.md' and '.cyblog.'`)
    }

    let dest = getFileName(src, extn);
    dest += '-dist.html';

    if (args?.to) {
        dest = args.to.toString();
    }

    if (await fs.exists(dest)) {
        scream(1, `Error: Destination path ${dest} exists!`,);
    }
    const contents = await Deno.readTextFile(from);

    const final = await parse(contents, {
        cyblog: extn === '.cyblog',
        applyStyles: styles
    });
    const encoder = new TextEncoder();

    await Deno.writeFile(dest, encoder.encode(final));
}

// deno-lint-ignore no-unused-vars
async function buildDir(from: Path, args?: CyblogBuildArgs) {
}

async function main() {
    const args: flags.Args = flags.parse(Deno.args, {
        string: ['--apply-style', '-a', '--output', '-o'],
        alias: {
            a: 'apply-style',
            o: 'output'
        }
    });

    const positional: string[] = args._.map((itm) => itm.toString());
    if (positional.length === 0) {
        scream(1, 'ERROR: you must provide the source path');
    }

    const path = positional[0];
    let type = null;
    try {
        type = await getType(path);
    }
    catch (e) {
        if (e instanceof Deno.errors.NotFound) scream(2, 'ERROR: File not found: ', path);
        else scream(1, e);
    }

    if (type == PathTypes.Directory) {
        buildDir(path);
    }
    else {
        buildFile(path);
    }
}

if (import.meta.main) {
    main();
}