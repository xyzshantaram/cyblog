import { Renderer } from './deps.ts';

export class CustomRenderer extends Renderer
{
  table(header: string, body: string): string {
    return `
<div class='cyblog-table-wrapper'>
<table>
<thead>
${header}</thead>
<tbody>
${body}</tbody>
</table>
</div>
`;
  }
}