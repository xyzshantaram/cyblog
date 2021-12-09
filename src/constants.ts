export const HEAD_DEFAULT_META = [{
    charset: 'UTF-8',
}, {
    'http-equiv': 'X-UA-Compatible',
    content: 'IE=edge',
}, {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1.0'
}]

export const DOCTYPE = '<!DOCTYPE html>\n'
export const HTML_OPEN = '<html lang="en">\n'
export const HTML_CLOSE = '</html>'

export const CYBLOG_VALID_SUFFIXES = ['.md', '.cyblog'];

export const CYBLOG_PLUG = `
<p id="cyblog-plug-footer">
    <em>Built with <a href="https://xyzshantaram.github.io/cyblog/">Cyblog</a></em>
</p>
`

export const CYBLOG_TABLE = `\
<div class='cyblog-table-wrapper'>
<table>
<thead>
{{ header }}
</thead>
<tbody>
{{ body }}
</tbody>
</table>
</div>
`;

export const BLOCK_NAME_RE = /^[a-z][a-z\-]+[a-z]/;
export const META_NAME_RE = /^meta-[a-z][a-z\-]+[a-z]/;
export const CLEAN_META_RE = /^meta-(.+)/;
export const HEADING_RE = /<h[1-6].*>(.*)<\/h[1-6]>/gi;
export const CLEAN_HEADING_RE = /<h[1-6].*>(.*)<\/h[1-6]>/;
export const HTML_META_RE = /^html-meta/;
export const HTML_COMMENT_RE = /^\s*<!--/;
export const DECL_ONELINE_RE = /<!-- @([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+) -->/;
export const DECL_BLOCK_OPEN_RE = /<!-- cyblog-meta/;
export const DECL_BLOCK_CLOSE_RE = /^-->$/;
export const DECL_PARSE_RE = /^@([a-z][a-z\-]+[a-z])([ ]+|[\t])(.+)$/;
export const DECL_KEY_PARSE_RE = /meta-(.+)/;
export const DECL_VAL_PARSE_RE = /display:(\w{4,5})\s+(.+)/;
export const MATH_STYLESHEET = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css">`;