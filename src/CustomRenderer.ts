import { Renderer, highlight} from './deps.ts';
import { CyblogBuildArgs } from './utils.ts';
import { HL_KEYWORDS } from './constants.ts';

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
    
        code = code.replace(/\n$/, '') + '\n';
    
        if (!lang) {
          return '<pre><code>'
            + (escaped ? code : escape(code, true))
            + '</code></pre>\n';
        }
    
        return '<pre><code>'
          + (escaped ? code : escape(code, true))
          + '</code></pre>\n';
    }

    table(header: string, body: string): string {
        return `\
<div class='cyblog-table-wrapper'>
<table>
<thead>
${header}
</thead>
<tbody>
${body}
</tbody>
</table>
</div>
`;
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
}