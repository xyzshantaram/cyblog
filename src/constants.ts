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

export const CYBLOG_PLUG = `\
<p id="cyblog-plug-footer">
    <em>Built with <a href="https://xyzshantaram.github.io/cyblog/">Cyblog</a></em>
</p>
`

export const HL_KEYWORDS: Record<string, string[]> = {
    js: ["goto", "in", "instanceof", "static", "finally", "arguments", "public", "do", "else", "const", "function", "class", "return", "let", "catch", "eval", "for", "if", "this", "try", "break", "debugger", "yield", "extends", "enum", "continue", "export", "null", "switch", "private", "new", "throw", "while", "case", "await", "delete", "super", "default", "void", "var", "protected", "package", "interface", "false", "typeof", "implements", "with", "import", "true"],
    c: ["auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern", "float", "for", "goto", "if", "int", "long", "register", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"],
    html: ["doctype", "a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio", "b", "base", "basefont", "bb", "bdo", "big", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "command", "datagrid", "datalist", "dd", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "em", "embed", "eventsource", "fieldset", "figcaption", "figure", "font", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "isindex", "kbd", "keygen", "label", "legend", "li", "link", "map", "mark", "menu", "meta", "meter", "nav", "noframes", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strike", "strong", "style", "sub", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"],
    python: ["False", "await", "else", "import", "pass", "None", "break", "except", "in", "raise", "True", "class", "finally", "is", "return", "and", "continue", "for", "lambda", "try", "as", "def", "from", "nonlocal", "while", "assert", "del", "global", "not", "with", "async", "elif", "if", "or", "yield"]
};

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