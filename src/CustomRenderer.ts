import { Renderer } from './deps.ts';
import { CyblogBuildArgs } from './utils.ts';

const addCheckBox = (str: string) => {
    if (/^\s*\[.?\].*$/.test(str)) {
        return str.replace(/^\[ ?\]/, '<input type="checkbox">').replace(/^\[[^ ]\]/, '<input type="checkbox" checked>')
    }
    return str;
}

export class CustomRenderer extends Renderer {
    args: CyblogBuildArgs;
    
    constructor(args: CyblogBuildArgs) {
        super();
        this.args = args;
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
}