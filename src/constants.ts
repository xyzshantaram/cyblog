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
export const CYBLOG_KNOWN_DECLS = ['title', 'apply-style', 'template', 'include', 'block-start', 'block-end'];

export const CYBLOG_PLUG =
`
<p id="cyblog-plug-footer">
    <em>Built with <a href="https://xyzshantaram.github.io/cyblog/">Cyblog</a></em>
</p>
`