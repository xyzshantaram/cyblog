import { CLEAN_META_RE, HTML_META_RE, META_NAME_RE } from './constants.ts';
import { fs, path } from "./deps.ts";
import { warn, error } from "./logging.ts";
import { getDataDirOrDie } from "./utils.ts";
import { Template } from './utils.ts';

export const KNOWN_DECLS = ['title', 'apply-style', 'template', 'include', 'block-start', 'block-end'];

export interface ParsedBlock {
    name: string
    id: string,
    cls: string,
    templating: boolean
}

const divFromBlockStart = (data: ParsedBlock) => {
    const id = data.id;
    const cls = data.cls;

    let rval = "div";

    if (id) rval += ` id="${id}"`;
    if (cls) rval += ` class="${cls}"`;

    return `<${rval}>`;
}

const parseBlockStart = (blockStart: string) => {
    let parts = blockStart.split(' ');
    const rval: ParsedBlock = {
        name: parts[0],
        id: parts[0],
        cls: '',
        templating: false
    };

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
            rval.templating = true;
        }
    }

    rval.cls = classes.join(" ").trim();
    return rval;
}

interface DeclarationState {
    inBlock: boolean;
    divString: string;
    shouldTemplate: boolean;
    openedBlock: string,
    closedBlock: string
    include: string[];
    pwd: string;
    styles: string[];
    template: null | Template;
    cybMetadata: Record<string, string>,
    htmlMetadata: Record<string, Record<string, string>>,
    templatingData: Record<string, string>,
    declarations: Record<string, string>
}

export type DeclState = Partial<DeclarationState>;


const loadTemplate = async (name: string) => {
    const templateRoot = path.join(getDataDirOrDie(), 'cyblog', 'templates', name);
    if (!await fs.exists(templateRoot)) {
        warn(`Template ${name} does not exist.`);
        return null;
    }
    const paths = {
        header: path.join(templateRoot, 'header.html'),
        footer: path.join(templateRoot, 'footer.html'),
        style: path.join(templateRoot, `prefab-${name}.css`)
    };

    if (!(await fs.exists(paths.footer) || await fs.exists(paths.header))) {
        warn(`Template ${name} is incomplete.`);
        return null;
    }

    return {
        header: await Deno.readTextFile(paths.header),
        footer: await Deno.readTextFile(paths.footer),
        stylePath: paths.style
    }
}

const parsers: Record<string, (value: string, state: DeclState) => Promise<DeclState> | DeclState> = {
    'block-start': (value, _) => {
        const parsed = parseBlockStart(value);
        
        const result: DeclState = {
            inBlock: true,
            openedBlock: parsed.name
        }

        result.divString = divFromBlockStart(parsed);
        result.shouldTemplate = !!parsed.templating;
        return result;
    },
    'block-end': (value, _) => {
        const parts = value.split(' ');
        return {
            inBlock: false,
            shouldTemplate: false,
            divString: '</div>',
            closedBlock: parts[0]
        }
    },
    'include': async (value, state) => {
        const result: DeclState = {}

        try {
            const fpath = path.join(state.pwd || '', value);
            const contents = await Deno.readTextFile(fpath);
            result.include = contents.split('\n');
        }
        catch (_e) {
            error(`Error reading included file ${value}`);
            result.include = [];
        }

        return result;
    },
    'apply-style': (value, state) => {
        const fpath = path.join(state.pwd || '', value);
        const result = {
            styles: state.styles || []
        }
        result.styles.push(fpath);
        return result;
    },
    'template': async (value, state) => {
        const result: DeclState = {};
        if (state.template) {
            return result;
        }

        const found = await loadTemplate(value);
        if (found) result.template = found;

        return result;
    }
}

export const parseDecl = async (name: string, value: string, existing: DeclState) => {
    const result: DeclState = {
        pwd: existing.pwd,
        htmlMetadata: existing.htmlMetadata || {},
        templatingData: existing.templatingData || {},
        declarations: existing.declarations || {},
        cybMetadata: existing.declarations || {}
    };

    if (Object.keys(parsers).includes(name)) {
        Object.assign(result, await parsers[name](value, result));
    }
    else if (name.match(META_NAME_RE)) {
        result.templatingData![name.replace(CLEAN_META_RE, '$1')] = value.split(' ').slice(1).join(' ');
        result.cybMetadata![name] = value;
    }
    else if (name.match(HTML_META_RE)) {
        const values: Record<string, string> = {};
        const split = value.split(',');
        for (const value of split) {
            const singlesplit = value.split(":");
            values[singlesplit[0]] = singlesplit[1];
        }
        result.htmlMetadata![name] = values;
    }
    else {
        result.declarations![name] = value;
    }

    return result;
}