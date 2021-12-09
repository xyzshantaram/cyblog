import { Renderer, highlight, HL_KEYWORDS, katex } from './deps.ts';
import { CyblogBuildArgs } from './utils.ts';
import { CYBLOG_TABLE } from './constants.ts';
import { mustache } from "./parser.ts";

const mathsExpression = (expr: string, mode: 'block' | 'span'): string | null => {
    if (expr.match(/^(?<!\\)\$\$[\s\S]*\$\$$/)) {
        expr = expr.substr(2, expr.length - 4);
        return katex.renderToString(expr, { displayMode: true });
    } else if (expr.match(/^(?<!\\)\$[\s\S]*\$$/)) {
        expr = expr.substr(1, expr.length - 2);
        return katex.renderToString(expr, { displayMode: false });
    }

    const tag = mode === 'block' ? '<pre><code>' : '<code>';
    const closing = mode === 'block' ? '</code></pre>' : '</code>';

    if (expr.match(/^\\\$\$[\s\S]*\$\$$/) || expr.match(/^\\\$[\s\S]*\$$/)) {
        return tag + expr.substring(1) + closing;
    }

    return null;
}

const addCheckBox = (str: string) => {
    if (/^\s*\[.?\].*$/.test(str)) {
        return str.replace(/^\[ ?\]/, '<input type="checkbox">').replace(/^\[[^ ]\]/, '<input type="checkbox" checked>')
    }
    return str;
}

// Snippet from https://github.com/markedjs/marked/blob/master/src/helpers.js
const escapeTest = /[&<>"']/;
const escapeReplace = /[&<>"']/g;
const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
const escapeReplacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
const getEscapeReplacement = (ch: string) => escapeReplacements[ch];
function escape(html: string, encode = false) {
    if (encode) {
        if (escapeTest.test(html)) {
            return html.replace(escapeReplace, getEscapeReplacement);
        }
    } else {
        if (escapeTestNoEncode.test(html)) {
            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
    }

    return html;
}
// ==================================================

export class CustomRenderer extends Renderer {
    args: CyblogBuildArgs;

    constructor(args: CyblogBuildArgs) {
        super();
        this.args = args;
    }

    code(code: string, _lang: string | undefined, escaped: boolean | undefined) {
        const langMatches = (_lang || '').match(/\S*/);
        let lang = '';
        if (langMatches) {
            lang = langMatches[0];
        }
        if (lang) {
            code = highlight(code, {
                keywords: HL_KEYWORDS[lang] || []
            });
            escaped = true;
        }
        else {
            if (this.args.math) {
                const math = mathsExpression(code, 'block');
                if (math) {
                    return math;
                }
            }
        }
        return `\n<pre><code>${(escaped ? code : escape(code, true))}</code></pre>\n`;
    }

    table(header: string, body: string): string {
        return mustache(CYBLOG_TABLE, {
            header: header,
            body: body
        });
    }

    link(href: string, title: string, text: string): string {
        if (this.options.sanitize) {
            let prot: string;
            if (this.options.unescape) {
                prot = decodeURIComponent(this.options.unescape(href))
                    .replace(/[^\w:]/g, '')
                    .toLowerCase();
            }
            else {
                return text;
            }

            if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
                return text;
            }
        }

        const isAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i');
        if (!isAbsolute.test(href)) {
            if (href.endsWith('README.md') && this.args.convertReadmes) {
                href = href.replace(/(.*)README\.md$/, '$1index.html');
            }
            else if (href.endsWith('.md') || href.endsWith('.cyblog')) {
                href = href.replace(/(\.cyblog|\.md)$/, '.html');
            }
        }

        let out = `<a href="${href}" `

        if (title) {
            out += `title="${title}"`
        }

        out += `>${text}</a>`
        return out;
    }

    listitem(text: string): string {
        return `<li>${addCheckBox(text)}</li>\n`;
    }

    image(href: string, title: string, text: string): string {
        let out = `<div class='cyb-img-wrapper'><img src='${href}' alt='${text}'`

        if (title) {
            out += ` title=${title}`;
        }

        out += this.options.xhtml ? "/>" : ">";
        out += '</div>';
        return out;
    }

    codespan(text: string) {

        if (this.args.math) {
            const math = mathsExpression(text, 'span');
            if (math) return math;
        }

        return super.codespan(text);
    }
}