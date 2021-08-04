import { Renderer } from './deps.ts';

const addCheckBox = (str: string) => {
    if (/^\s*\[.?\].*$/.test(str)) {
        return str.replace(/^\[ ?\]/, '<input type="checkbox">').replace(/^\[[^ ]\]/, '<input type="checkbox" checked>')
    }
    return str;
}

export class CustomRenderer extends Renderer
{
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
    listitem(text: string): string {
        return `<li>${addCheckBox(text)}</li>\n`;
    }
}