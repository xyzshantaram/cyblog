import { flags, path, fs, Marked } from './deps.ts';
import { Path, PathTypes, CyblogBuildArgs, getType, scream, getFileName, getExtension, getConfigDir, createElementWithAttrs, createClosingTag } from './utils.ts';
import { CYBLOG_VALID_SUFFIXES, CYBLOG_KNOWN_DECLS, DOCTYPE, HTML_OPEN, HTML_CLOSE } from './constants.ts';
import { warn, error, info } from './logging.ts';

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

const mustache = (string: string, data: Record<string, string | number> = {}) =>
    Object.entries(data).reduce((res, [key, value]) => res.replace(
        new RegExp(`(?<!\\\\){{\\s*${key}\\s*}}`, "g"), value.toString()), string);

async function parse(toParse: string, args: CyblogBuildArgs): Promise<string> {
    if (args.cyblog && !toParse.startsWith('<!-- cyblog-meta')) {
        warn('Cyblog document with no document meta block. Falling back to title detection');
    }
    Marked.setOptions({
        gfm: true,
        tables: true,
        smartLists: true,
        smartypants: false
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
            const parts = declValue.split(' ');
            closedBlocks.push(parts[0]);
            final.push('</div>');
        }
        else if (declName === 'apply-style') {
            applyStyles.push(declValue);
        }
        else if (declName === 'template') {
            if (headerString || footerString) {
                warn(`Extra template declaration ${declValue} found`);
                return;
            }
            const userConfigDir = getConfigDir();
            if (!userConfigDir || !await fs.exists(userConfigDir)) {
                scream(1, `Could not find configuration directory while looking for template ${declValue} Did you run the cyblog install script?`);
            }
            else {
                const templatePath = path.join(userConfigDir, 'cyblog', 'templates', declValue);
                if (await fs.exists(templatePath)) {
                    const headerPath = path.join(templatePath, 'header.html');
                    const footerPath = path.join(templatePath, 'footer.html');
                    if (await fs.exists(headerPath) && await fs.exists(footerPath)) {
                        headerString = await Deno.readTextFile(headerPath);
                        footerString = await Deno.readTextFile(footerPath);
                    }
                    else {
                        error(`Incomplete template ${declValue}`);
                    }

                    applyStyles.push(path.join(templatePath, `prefab-${declValue}.css`));
                }
                else {
                    warn(`Skipping nonexistent template ${declValue}`);
                }
            }
        }
        else {
            cyblogDeclarations[declName] = declValue;
        }
    }

    let inCodeBlock = false;
    let title = 'Cyblog Document';
    let headerCount = 0;

    const addCheckBox = (str: string) => {
        if (/\[.?\]/.test(str)) {
            return str.replace(/\[ ?\]/, '<input type="checkbox">').replace(/\[[^ ]\]/, '<input type="checkbox" checked>')
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
                final.push(line);
            }
        }
        else if (/<h[1-6].*>(.*)<\/h[1-6]>/gi.test(line)) {
            final.push(line);
            headerCount += 1;
            const content = line.replace(/<h[1-6].*>(.*)<\/h[1-6]>/, '$1');
            if (headerCount == 1) {
                title = content;
                final.push('<div class="cyblog-metadata">');
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
                            final.push(createElementWithAttrs('span', { class: 'cyb-' + key }) + split[1] + ': ' + values.slice(1).join(' ') + '</span>');
                        }
                    }
                }
                final.push('</div>');
            }
        }
        else if (line.includes('<li>')) {
            final.push(addCheckBox(line));
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


    if (args.cyblog && closedBlocks.length !== openedBlocks.length) {
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

    const templatingData: Record<string, string | number> = {}

    Object.keys(cyblogDeclarations).filter((elem) => /^meta-(.+)/.test(elem)).forEach((elem) => {
        const name = elem.replace(/^meta-(.*)/, '$1');
        const split = cyblogDeclarations[elem].split(' ');
        if (split[0] == 'display:true') return;

        if (split.length < 2) {
            warn(`Invalid value for ${elem}: ${cyblogDeclarations[elem]}`)
        }
        templatingData[name] = split.slice(1).join(' ');
    });

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
    if (headerString) doc += mustache(headerString, templatingData);
    doc += '\n' + final.join('\n') + '\n';
    if (footerString) doc += mustache(footerString, templatingData);
    doc += createClosingTag('body');
    doc += HTML_CLOSE;

    return doc;
}

async function buildFile(from: Path, args?: CyblogBuildArgs) {
    const src = from.toString();

    const userConfigDir = getConfigDir();
    if (!userConfigDir || !await fs.exists(userConfigDir)) {
        throw new Deno.errors.NotFound('Could not find configuration directory. Did you run the cyblog install script?');
    }
    const configPath = path.join(userConfigDir, 'cyblog');
    const defaultStyleSheet = path.join(configPath, 'cyblog-defaults.css');

    const styles: Path[] = [defaultStyleSheet];
    if (args?.applyStyles) styles.push(...args.applyStyles);


    const extn = getExtension(src);

    if (!extn || !CYBLOG_VALID_SUFFIXES.includes(extn)) {
        throw new Error(`Supplied file ${src} is not of a type supported by Cyblog. Cyblog supports the types '.md' and '.cyblog.'`)
    }

    let dest = getFileName(src, extn);
    dest += '-dist.html';

    if (args?.to) {
        dest = args.to.toString();
    }

    if (await fs.exists(dest)) {
        if (args?.overwrite) {
            info(`Path ${dest} exists, removing because of --force...`);
            await Deno.remove(dest, { recursive: true });
        }
        else {
            scream(1, `Destination path ${dest} exists!`);
        }
    }

    info('Building file', from);
    const contents = await Deno.readTextFile(from);

    const final = await parse(contents, {
        cyblog: extn === '.cyblog',
        applyStyles: styles
    });

    await Deno.writeTextFile(dest, final);

    info(`Built ${dest} successfully!`)
}

async function buildDir(from: Path, args?: CyblogBuildArgs) {
    let dest = args?.to?.toString();
    const srcPath = path.normalize(from.toString());

    info('Building directory', srcPath);

    if (!dest) {
        dest = path.basename(srcPath) + '-dist';
    }

    dest = path.normalize(dest);

    if (await fs.exists(dest)) {
        if (args?.overwrite) {
            info(`Path ${dest} exists, removing because of --force...`);
            await Deno.remove(dest, { recursive: true });
        }
        else {
            scream(1, `Destination path ${dest} exists!`);
        }
    }

    Deno.mkdir(dest);

    for await (const entry of fs.walk(srcPath)) {
        if (srcPath === entry.path) continue;
        const relative = path.relative(srcPath, entry.path);
        let dir = path.join(dest, relative);
        if (entry.isDirectory) {
            Deno.mkdir(dir);
            info(`Created directory ${dir}.`)
        }
        else if (entry.isFile) {
            const extn = getExtension(entry.name);
            if (extn && CYBLOG_VALID_SUFFIXES.includes(extn)) {
                dir = dir.replace(extn, '.html');
                buildFile(entry.path, {
                    to: dir,
                    applyStyles: args?.applyStyles
                })
            }
            else {
                warn("Found file with unknown type, left it alone.")
                Deno.copyFile(entry.path, dir);
            }
        }
    }
    info(`Built ${dest} successfully!`)
}

function showHelp() {
    console.log(`USAGE:\n\tcyblog <sourcefile|sourcedir> [-f] [-a additionalStyle.css] [-o output]`);
    console.log(`
    -o, --output: The name of the output directory or file.
    -a, --apply-style: The name of a stylesheet to include, same as @apply-style
    -f, --force: overwrite destination path if it exists.`)
}

async function main() {
    const args: flags.Args = flags.parse(Deno.args, {
        string: ['--apply-style', '-a', '--output', '-o'],
        boolean: ['--force', '-f', '--help', '-h'],
        alias: {
            a: 'apply-style',
            o: 'output',
            f: 'force',
            h: 'help'
        }
    });

    const positional: string[] = args._.map((itm) => itm.toString());

    if (positional.length == 0) {
        args.help = true;
    }

    if (args.help) {
        showHelp();
        Deno.exit(0);
    }

    if (positional.length === 0) {
        scream(1, 'You must provide the source path');
    }

    const path = positional[0];
    let type = null;
    try {
        type = await getType(path);
    }
    catch (e) {
        if (e instanceof Deno.errors.NotFound) scream(2, 'File or directory not found:', path);
        else scream(1, e);
    }
    const styles: Path[] = typeof args['apply-style'] == 'string' ? [args['apply-style']] : args['apply-style'];

    if (type == PathTypes.Directory) {
        buildDir(path, {
            to: args.output,
            applyStyles: styles,
            overwrite: args.force
        });
    }
    else {
        buildFile(path, {
            to: args.output,
            applyStyles: styles,
            overwrite: args.force
        });
    }
}

if (import.meta.main) {
    await main();
}