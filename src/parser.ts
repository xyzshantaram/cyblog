import { Marked, Parsed, path } from './deps.ts';
import { Path, CyblogBuildArgs, scream, createElementWithAttrs, createTag, getDataDirOrDie, Template } from './utils.ts';
import { DOCTYPE, HTML_OPEN, HTML_CLOSE, CYBLOG_PLUG, HEAD_DEFAULT_META, HEADING_RE, CLEAN_HEADING_RE, HTML_COMMENT_RE, DECL_BLOCK_CLOSE_RE, DECL_BLOCK_OPEN_RE, DECL_ONELINE_RE, DECL_PARSE_RE } from './constants.ts';
import { parseDecl, DeclState } from './declarations.ts';
import { warn, error } from './logging.ts';
import { CustomRenderer } from './CustomRenderer.ts';

async function buildStyleElement(styles: Path[]) {
    let styleString = '';
    for (const x of styles) {
        const name = x.toString();
        let filename = name;
        const basename = path.basename(name);
        if (/^@builtin-(.+)/.test(basename)) {
            const matches = basename.match(/^@builtin-(.+)/);
            if (!matches) continue;

            const dataDir = getDataDirOrDie();
            filename = path.join(dataDir, 'cyblog', 'builtins', `${matches[1]}.css`);
        }
        try {
            styleString += `${await Deno.readTextFile(filename)}\n`;
        }
        catch (e) {
            error(`Caught error "${e}" while processing style ${basename}`);
        }
    }

    return createTag('style', styleString);
}

export const mustache = (string: string, data: Record<string, string> = {}): string => {
    const escapeExpr = new RegExp("\\\\({{\\s*" + Object.keys(data).join("|") + "\\s*}})", "gi");
    new RegExp(Object.keys(data).join("|"), "gi");
    return string.replace(
        new RegExp("(^|[^\\\\]){{\\s*(" + Object.keys(data).join("|") + ")\\s*}}", "gi"),
        (_matched, p1, p2) => `${p1 || ""}${data[p2]}`
    ).replace(escapeExpr, '$1');
}

export const parseMd = (markup: string, args: CyblogBuildArgs): Parsed => {
    Marked.setOptions({
        gfm: true,
        tables: true,
        smartLists: true,
        smartypants: false,
        renderer: new CustomRenderer(args)
    });

    return Marked.parse(markup);
}

export async function buildDoc(toParse: string, args: CyblogBuildArgs): Promise<string> {
    const parseResult = await parseCyblog(toParse, args);
    const { template, stylePaths, htmlMetadata, templatingData, title, lines } = parseResult;
    let doc = DOCTYPE + HTML_OPEN;

    if (template! && template.stylePath) {
        stylePaths.push(template.stylePath);
    }

    const styleString = await buildStyleElement(stylePaths);
    const metaTags: string = [...HEAD_DEFAULT_META, ...Object.values(htmlMetadata)]
        .map(elem => createElementWithAttrs('meta', elem)).join('\n');

    const headContents = metaTags + createTag('title', title) + styleString;

    doc += createTag('head', headContents);

    const finalBody = lines.join('\n');

    let bodyContents = finalBody;

    if (template!) {
        if (template.header) bodyContents = mustache(template.header, templatingData) + bodyContents;
        if (template.footer) bodyContents += mustache(template.footer, templatingData);
    }

    if (args.plug) bodyContents += CYBLOG_PLUG;

    doc += createTag('body', bodyContents);
    doc += HTML_CLOSE;

    return doc;
}

async function parseCyblog(toParse: string, args: CyblogBuildArgs) {
    if (args.cyblog && !(/^<!--\s(@|cyblog-meta)/).test(toParse)) {
        warn('Cyblog document with no document meta block.');
    }

    const styleList = args?.applyStyles || [];
    const parsed = parseMd(toParse, args);
    const initialHTML = parsed.content;
    const lines = initialHTML.split('\n');
    const openedBlocks: string[] = [];
    const closedBlocks: string[] = [];

    const final: string[] = [];

    const declarations: Record<string, string> = {}

    let template: Template | null;
    let inBlock = false;
    let templatingCurrentBlock = false;
    const htmlMetadata: Record<string, Record<string, string>> = {};
    const templatingData: Record<string, string> = {};
    const cyblogMetadata: Record<string, string> = {};

    let inCodeBlock = false;
    let title = 'Cyblog Document';
    let headerCount = 0;

    const getTemplated = (str: string): string => {
        if (inBlock && !inCodeBlock && templatingCurrentBlock) {
            return mustache(str, templatingData);
        }
        return str;
    }

    const declStoreActions: Record<string, (state: DeclState) => void> = {
        'closedBlock': (state) => {
            if (state.closedBlock) closedBlocks.push(state.closedBlock);
        },
        'cybMetadata': (state) => {
            Object.assign(cyblogMetadata, state.cybMetadata)
        },
        'declarations': (state) => {
            Object.assign(declarations, state.declarations);
        },
        'divString': (state) => {
            final.push(state.divString!);
        },
        'htmlMetadata': (state) => {
            Object.assign(htmlMetadata, state.htmlMetadata);
        },
        'inBlock': (state) => {
            console.log(state);
            inBlock = !!(state.inBlock);
        },
        'include': (state) => {
            final.push(...(state.include || []));
        },
        'openedBlock': (state) => {
            if (state.openedBlock) openedBlocks.push(state.openedBlock);
        },
        'pwd': (_) => { },
        'shouldTemplate': (state) => {
            templatingCurrentBlock = !!(state.shouldTemplate);
        },
        'styles': (state) => {
            styleList.push(...(state.styles || []));
        },
        'template': (state) => {
            template = state.template || null;
        },
        'templatingData': (state) => {
            Object.assign(templatingData, state.templatingData);
        }
    }

    const storeDecl = async (name: string, value: string) => {
        const currentState: DeclState = {
            pwd: args?.pwd,
            styles: styleList,
            template: template,
            cybMetadata: cyblogMetadata,
            htmlMetadata: htmlMetadata,
            templatingData: templatingData,
            declarations: declarations
        };

        const newState = await parseDecl(name, value, currentState);
        // deno-lint-ignore no-explicit-any
        Object.entries(newState).forEach(([key, _]: [string, any]) => {
            declStoreActions[key](newState);
        })
    }

    for (let lidx = 0; lidx < lines.length; lidx += 1) {
        const line = lines[lidx];
        if (HTML_COMMENT_RE.test(line) && !inCodeBlock) {
            if (args.cyblog) {
                const matches = line.match(DECL_ONELINE_RE);
                if (matches) {
                    await storeDecl(matches[1], matches[3]);
                }
                if (!(DECL_BLOCK_OPEN_RE.test(line))) continue;
                while (!(DECL_BLOCK_CLOSE_RE.test(lines[++lidx]))) {
                    const matches = lines[lidx].match(DECL_PARSE_RE);
                    if (matches) await storeDecl(matches[1], matches[3]);
                }
            }
            else {
                final.push(getTemplated(line));
            }
        }
        else if (HEADING_RE.test(line)) {
            final.push(getTemplated(line));
            headerCount += 1;
            const content = line.replace(CLEAN_HEADING_RE, '$1');
            if (headerCount == 1) {
                title = content;
                final.push('<div class="cyblog-metadata">');
                keyLoop:
                for (const key in cyblogMetadata) {
                    const val = cyblogMetadata[key];
                    const split = key.split('-');
                    // split on all whitespace, replacing many subsequent chunks with single spaces.
                    const values = val.replace(/\s+/, ' ').split(' ');
                    if (values.length < 2) {
                        warn(`Invalid value for meta declaration ${key}: ${val}. Missing display attribute.`);
                        continue keyLoop;
                    }
                    if (values[0] == 'display:true') {
                        final.push(createTag(
                            'span',
                            // key: value, basically
                            `${split[1]}: ${values.slice(1).join(' ')}`,
                            { class: 'cyb-' + key }
                        ));
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
        scream(1, `Mismatched number of opening (${openedBlocks.length}) and closing (${closedBlocks.length}) blocks!`
            + `\nOpened blocks:\n * ${openedBlocks.join('\n * ')}\nClosed blocks:\n * ${closedBlocks.join('\n * ')}`);
    }

    if (args.cyblog) {
        if (Object.keys(declarations).includes('title')) {
            title = declarations['title'];
        }
        else {
            warn('No @title declaration in Cyblog document - falling back to first header');
        }
    }

    return {
        lines: final,
        title: title,
        template: template!,
        stylePaths: styleList,
        htmlMetadata: htmlMetadata,
        templatingData: templatingData
    };
}