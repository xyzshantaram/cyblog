import { Marked, fs, path } from './deps.ts';
import { Path, CyblogBuildArgs, scream, getConfigDir, createElementWithAttrs, createClosingTag } from './utils.ts';
import { CYBLOG_KNOWN_DECLS, DOCTYPE, HTML_OPEN, HTML_CLOSE } from './constants.ts';
import { warn, error } from './logging.ts';
import { CustomRenderer } from './CustomRenderer.ts';

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
                error(e);
            }
        }
        ret += '\n';
    }
    ret += `\n</style>\n`;

    return ret;
}

export const mustache = (string: string, data: Record<string, string> = {}) => {
    return Object.entries(data).reduce((res, [key, value]) => {
        const mainRe = new RegExp(`(?<!\\\\){{\\s*${key}\\s*}}`, 'g')
        // lookbehind expression, only replaces if mustache was not preceded by a backslash
        // this regex is actually (?<!\\){{\s*<key>\s*}} but because of escaping it looks like that...
        const escapeRe = new RegExp(`\\\\({{\\s*${key}\\s*}})`, 'g')
        // the second regex now handles the cases that were skipped in the first case.
        return res.replace(mainRe, value || "").replace(escapeRe, '$1');
    }, string);
}

export async function parse(toParse: string, args: CyblogBuildArgs): Promise<string> {
    if (args.cyblog && !(/^<!--\s(@|cyblog-meta)/).test(toParse)) {
        warn('Cyblog document with no document meta block.');
    }

    Marked.setOptions({
        gfm: true,
        tables: true,
        smartLists: true,
        smartypants: false,
        renderer: new CustomRenderer()
    });

    const applyStyles = args?.applyStyles || [];
    const markup = Marked.parse(toParse);
    const builtHTML = markup.content;
    const lines = builtHTML.split('\n');
    const openedBlocks: string[] = [];
    const closedBlocks: string[] = [];

    const final: string[] = [];

    const cyblogDeclarations: Record<string, string> = {}

    let headerString: string | null = null;
    let footerString: string | null = null;

    let inBlock = false;
    let templatingCurrentBlock = false;
    const htmlMetadata: Record<string, Record<string, string>> = {};
    const templatingData: Record<string, string> = {};
    const cyblogMetadata: Record<string, string> = {};

    const getValidTemplate = async (value: string): Promise<Record<string, string> | null> => {
        const userConfigDir = getConfigDir();
        if (!userConfigDir || !await fs.exists(userConfigDir)) {
            scream(1, `Could not find configuration directory while looking for template ${value}. Did you run the cyblog install script?`);
        }
        else {
            const templatePath = path.join(userConfigDir, 'cyblog', 'templates', value);
            if (await fs.exists(templatePath)) {
                const headerPath = path.join(templatePath, 'header.html');
                const footerPath = path.join(templatePath, 'footer.html');
                const stylePath = path.join(templatePath, `prefab-${value}.css`);
                if (await fs.exists(headerPath) && await fs.exists(footerPath) && await fs.exists(stylePath)) {
                    return {
                        header: await Deno.readTextFile(headerPath),
                        footer: await Deno.readTextFile(footerPath),
                        stylePath: stylePath
                    }
                }
                else {
                    error(`Incomplete template ${value}`);
                }
            }
            else {
                warn(`Skipping nonexistent template ${value}`);
            }
        }
        return null;
    }

    const processBlockStart = (declValue: string) => {
        const rval: Record<string, string> = {};
        let parts = declValue.split(' ');
        rval.name = parts[0];
        rval.id = parts[0];
        parts = parts.slice(1);

        const classes = [];

        for (const x of parts) {
            if (x.startsWith("#")) {
                rval.id = x.replace("#", '');
            }
            if (x.startsWith(".")) {
                classes.push(...x.split('.'));
            }

            if (x.startsWith("template:true")) {
                rval.templating = 'on';
            }
        }

        rval.classes = classes.join(" ");
        return rval;
    }

    const processDecl = async (declName: string, declValue: string) => {
        if (!CYBLOG_KNOWN_DECLS.includes(declName) && !declName.includes('meta')) {
            warn(`Ignoring unknown declaration ${declName}.`)
            return;
        }
        if (declName === 'block-start') {
            if (!declValue.match(/^[a-z][a-z\-]+[a-z]/)) scream(1, `Invalid syntax for block name: ${declValue}`);
            const val = processBlockStart(declValue);
            inBlock = true;
            final.push(`<div id="${val.id.trim()}" class="${val.classes}">`)
            if (val.templating === 'on') {
                templatingCurrentBlock = true;
            }
            if (openedBlocks.includes(val.name) || closedBlocks.includes(val.name)) scream(1, `Attempt to reopen ${val.name} is not permitted`);
            openedBlocks.push(val.name);
        }
        else if (declName === 'include') {
            try {
                const fpath = path.join(args?.pwd || '', declValue);
                const contents = await Deno.readTextFile(fpath);
                final.push(...contents.split('\n'));
            }
            catch (_e) {
                error(`Error reading included file ${declValue}`)
            }
        }
        else if (declName === 'block-end') {
            inBlock = false;
            templatingCurrentBlock = false;
            const parts = declValue.split(' ');
            if (!openedBlocks.includes(parts[0]) || closedBlocks.includes(parts[0])) scream(1, `Attempt to close block ${parts[0]} is not permitted as it has not been opened yet, or already been closed`);
            closedBlocks.push(parts[0]);
            final.push('</div>');
        }
        else if (declName === 'apply-style') {
            const fpath = path.join(args?.pwd || '', declValue);
            applyStyles.push(fpath);
        }
        else if (declName === 'template') {
            if (headerString || footerString) {
                warn(`Redundant template declaration ${declValue} found`);
                return;
            }
            const found = await getValidTemplate(declValue);
            if (found) {
                headerString = found.header;
                footerString = found.footer;
                applyStyles.push(found.stylePath);
            }
        }
        else if (declName.match(/^meta-[a-z][a-z\-]+[a-z]/)) {
            templatingData[declName.replace(/^meta-(.+)/, '$1')] = declValue.split(' ').slice(1).join(' ');
            cyblogMetadata[declName] = declValue;
        }
        else if (declName.match(/^html-meta/)) {
            const values: Record<string, string> = {};
            const split = declValue.split(',');
            for (const value of split) {
                const singlesplit = value.split(":");
                values[singlesplit[0]] = singlesplit[1];
            }
            htmlMetadata[declName] = values;
        }
        else {
            cyblogDeclarations[declName] = declValue;
        }
    }

    let inCodeBlock = false;
    let title = 'Cyblog Document';
    let headerCount = 0;

    const getTemplated = (str: string): string => {
        if (inBlock && !inCodeBlock && templatingCurrentBlock) {
            return mustache(str, templatingData);
        }
        return str;
    }

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
            else {
                final.push(getTemplated(line));
            }
        }
        else if (/<h[1-6].*>(.*)<\/h[1-6]>/gi.test(line)) {
            final.push(getTemplated(line));
            headerCount += 1;
            const content = line.replace(/<h[1-6].*>(.*)<\/h[1-6]>/, '$1');
            if (headerCount == 1) {
                title = content;
                final.push('<div class="cyblog-metadata">');
                keyLoop:
                for (const key in cyblogMetadata) {
                    const val = cyblogMetadata[key];
                    const split = key.split('-');
                    const values = val.replace(/\s+/, ' ').split(' ');
                    if (values.length < 2) {
                        warn(`Invalid value for meta declaration ${key}: ${val}. Missing display attribute.`);
                        continue keyLoop;
                    }
                    if (values[0] == 'display:true') {
                        final.push(createElementWithAttrs('span', { class: 'cyb-' + key }) + split[1] + ': ' + values.slice(1).join(' ') + '</span>');
                    }
                }
                final.push('</div>');
            }
        }
        else if (line.startsWith('<pre><code>')) {
            final.push(getTemplated(line));
            inCodeBlock = true;
        }
        else if (line.includes('</code></pre>')) {
            final.push(getTemplated(line));
            inCodeBlock = false;
        }
        else {
            final.push(getTemplated(line));
        }
    }


    if (args.cyblog && closedBlocks.length !== openedBlocks.length) {
        scream(1, `Mismatched number of opening and closing blocks!\nOpened blocks:\n * ${openedBlocks.join('\n * ')}\nClosed blocks:\n * ${closedBlocks.join('\n * ')}`)

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

    for (const key in htmlMetadata) doc += createElementWithAttrs('meta', htmlMetadata[key]);

    doc += await buildStyleElement(applyStyles);

    doc += createClosingTag('head');

    doc += createElementWithAttrs('body', {});
    if (headerString) doc += mustache(headerString, templatingData);
    doc += '\n' + final.join('\n') + '\n';
    if (footerString) doc += mustache(footerString, templatingData);
    doc += createClosingTag('body');

    doc += HTML_CLOSE;

    return doc;
}