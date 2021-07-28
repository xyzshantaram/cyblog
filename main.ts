import { flags, path, fs } from './deps.ts';
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
        }
    }

    ret += `</style>\n`;

    return ret;
}

async function parse(toParse: string, args: CyblogBuildArgs): Promise<string> {
    if (args.cyblog && !toParse.startsWith('<!-- cyblog-meta')) {
        warn('Cyblog document with no document meta block');
    }
    function clean(str: string) {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    const applyStyles = args?.applyStyles instanceof Array ? args?.applyStyles : [args?.applyStyles] || [];

    const prelim = toParse
        .replace(/(?<!\\)!\[(.+)]\((.+)\)/gim, '<div><img src="$2" alt="$1"></div>')
        .replace(/(?<!\\)\[(.+)]\((.+)\)/gim, '<a href="$2">$1</a>')
        .replace(/(?<!\\)\*\*(.+)(?<!\\)\*\*/gi, '<strong>$1</strong>')
        .replace(/\w*(?<!\\)\*(.+)(?<!\\)\*/gi, '<em>$1</em>')
        .replace(/\w*(?<!\\)__(.+)(?<!\\)__/gi, '<strong>$1</strong>')
        .replace(/\w*(?<!\\)_(.+)(?<!\\)_/gi, '<em>$1</em>')
        .replace(/\\\*/g, '*')

    const lines = prelim.split('\n');
    const final = [];
    let lastParaWasOpen = false;

    const addCheckBox = (str: string) => {
        if (/\[.?\]/.test(str)) {
            return str.replace(/\[ ?\]/, '<input type="checkbox">').replace(/\[[^ ]\]/, '<input type="checkbox" checked>')
        }
        return str;
    }

    function isList(line: string, indent: number) {
        if (new RegExp(`^\ {${indent}}` + '[0-9]+(\\)|\\.) .*').test(line)) return 0;
        if (new RegExp(`^\ {${indent}}` + '(\\*|\\-) .*').test(line)) return 1;
        return -1;
    }

    function buildList(lines: string[], type: number) {
        const tag = type == 0 ? 'ol' : 'ul';
        return `<${tag}> ${lines.filter(Boolean).map(line => `<li>${line}</li>`).join('\n')}</${tag}>`
    }

    function consumeList(lines: string[], lidx: number, type: number, indent: number) {
        const re = `^ {${indent}}` + (type == 0 ? '[0-9]+(\\)|\\.) .*' : '(\\*|\\-) .*'); // Either numbered or bulleted
        const cleanNumbered = (line: string) => line.replace(/^ *[0-9]+(\)|\.) +/, '').trim()
        const cleanBulleted = (line: string) => line.replace(/^ *(\*|\-) +/, '').trim()
        const cleaner = type == 0 ? cleanNumbered : cleanBulleted;

        const curList = [addCheckBox(cleaner(lines[lidx]))];

        while (new RegExp(re).test(lines[lidx + 1])) {
            curList.push(addCheckBox(cleaner(lines[++lidx])));
        }
        const childType = isList(lines[lidx + 1], indent + 2);
        if (childType !== -1) {
            const childContents = consumeList(lines, lidx + 1, childType, indent + 2);
            curList[curList.length - 1] += (buildList(childContents, childType));
            for (const _ of childContents) {
                curList.push('');
            }
        }
        return curList;
    }

    const cyblogDeclarations: Record<string, string> = {}
    let metaBlockCount = 0;
    let headerCount = 0;
    let fallBackTitle = '';
    const closedBlocks: string[] = [];
    const openedBlocks: string[] = [];

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

    const toId = (str: string) => str.toLocaleLowerCase().replace(/ /g, '-').replace(/[^a-z0-9\-]/g, '');

    for (let lidx = 0; lidx < lines.length; lidx++) {
        const listType = isList(lines[lidx], 0);
        if (/^<!--/.test(lines[lidx])) {
            if (args.cyblog) {
                const matches = lines[lidx].match(/<!-- @([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+) -->/);
                if (matches) {
                    processDecl(matches[1], matches[3]);
                    metaBlockCount += 1;
                }
                if (!(/<!-- cyblog-meta/.test(lines[lidx]))) continue;
                metaBlockCount += 1;
                while (!(/^-->$/.test(lines[lidx]))) {
                    lidx += 1;
                    const matches = lines[lidx].match(/^@([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+)$/);
                    if (matches) processDecl(matches[1], matches[3]);
                }
            }
        }
        else if (/^#{1,6}.+$/gi.test(lines[lidx])) {
            headerCount += 1;
            let idx = 0;
            while (lines[lidx][idx] == '#') idx++;
            const matches = lines[lidx].match(/^#{1,6} (.+)/);
            let content = '';
            if (matches) {
                content = clean(matches[1]);
            }
            final.push(lines[lidx].replace(/^#{1,6}(.+)$/, `<h${idx} id='${toId(content)}'>`) + content + `</h${idx}>`);

            if (headerCount == 1) {
                fallBackTitle = content;
                keyLoop:
                for (const key in cyblogDeclarations) {
                    if (key.startsWith('meta-')) {
                        const split = key.split('-');
                        if (split.length < 2) {
                            warn(`Invalid meta declaration ${key}`);
                            continue keyLoop;
                        }
                        const values = cyblogDeclarations[key].replace(/\s+/, ' ').split(' ');
                        if (values.length < 2) {
                            warn(`Invalid value for meta declaration ${key}: ${cyblogDeclarations[key]}`);
                            continue keyLoop;
                        }
                        if (values[0] == 'display:true') {
                            final.push(createElementWithAttrs('span', { class: 'cyb-' + key }) + values.slice(1).join(' ') + '</span>');
                        }
                    }
                }
            }
        }
        else if (listType !== -1) {
            const contents = consumeList(lines, lidx, listType, 0);
            final.push(buildList(contents, listType));
            lidx += contents.length - 1;
        }
        else if (/^```/.test(lines[lidx])) {
            const codeBlock = [];
            while (!(/^```/.test(lines[++lidx]))) {
                codeBlock.push(lines[lidx]);
            }
            final.push(`<pre>${codeBlock.map((ln) => `<code>${ln}</code>`).join("\n")}</pre>`);
        }
        else if (/^> .*/.test(lines[lidx])) {
            const quoteBlock = [lines[lidx].replace(/> /, '')];
            while (/^> .*/.test(lines[++lidx])) {
                quoteBlock.push(lines[lidx].replace(/> /, ''));
            }
            final.push(`<blockquote>${quoteBlock.join("\n")}</blockquote>`);
        }
        else if (/(?<!``)`.+`/.test(lines[lidx])) {
            final.push(lines[lidx].replace(/(?<!\\)(?<!``)`(.+)`/, '<code>$1</code>'))
        }
        else if (/.+\|.+/.test(lines[lidx])
            && lidx + 1 < lines.length
            && /-+|-+/.test(lines[lidx + 1])) {
            const occurrences = (str: string, pattern: string) => (str.match(new RegExp(`\\${pattern}`)) || []).length;
            const first = occurrences(lines[lidx], '|');
            const header = lines[lidx].split('|');
            lidx += 1;
            const rows = []
            while (occurrences(lines[++lidx], '|') === first) {
                rows.push(lines[lidx].split('|'));
            }
            final.push(
                `<table><tr>${header.map(cell => `<th>${cell.trim()}</th>`).join(' ')}</tr>\n${rows.map(row => `<tr>${row.map(cell => `<td>${cell.trim()}</td>`).join(' ')}</tr>`).join('\n')}</table>`
            );
        }
        else if (lines[lidx].trim() === '' && lines[lidx - 1]?.trim() != '' && lines[lidx + 1]?.trim() != '') {
            if (lastParaWasOpen) {
                final.push("</div>");
            }
            else {
                if (lidx + 1 < lines.length) final.push("<div class='cyblog-para'>");
            }
            lastParaWasOpen = !lastParaWasOpen;
        }
        else {
            final.push(lines[lidx]);
        }
    }

    if (closedBlocks.length !== openedBlocks.length) {
        scream(1, `Unclosed blocks present!\nUnclosed blocks:\n * ${openedBlocks.filter(elem => !closedBlocks.includes(elem)).join('\n * ')}`)
    }

    let title = fallBackTitle;
    if (args.cyblog && !Object.keys(cyblogDeclarations).includes('title')) {
        warn('No @title declaration in Cyblog document - falling back to first header');
    }
    else {
        title = cyblogDeclarations['title'];
    }

    const result = final.join('\n').replace(/\n*<div class='cyblog-para'>\s*<\/div>\n*/, '');
    let doc = DOCTYPE + HTML_OPEN;
    doc += createElementWithAttrs('head', {});
    doc += createElementWithAttrs('meta', { charset: 'UTF-8' });
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
    doc += result;
    doc += createClosingTag('body');
    doc += HTML_CLOSE;

    return doc;
}

async function buildFile(from: Path, args?: CyblogBuildArgs) {
    const src = from.toString();

    const configDir = getConfigDir();
    if (!configDir) {
        throw new Deno.errors.NotFound('Could not find configuration directory. Did you run the cyblog install script?');
    }
    const configPath = path.join(configDir, 'cyblog-defaults.css');

    let styles: Path[] = [configPath];
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