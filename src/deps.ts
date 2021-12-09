export * as flags from "https://deno.land/std@0.102.0/flags/mod.ts";
export * as path from "https://deno.land/std@0.102.0/path/mod.ts";
export * as fs from "https://deno.land/std@0.102.0/fs/mod.ts";
export { Marked, Renderer } from "https://deno.land/x/markdown@v2.0.0/mod.ts";
export { highlight } from 'https://esm.sh/macrolight@1.4.1';

export type { Parsed } from "https://deno.land/x/markdown@v2.0.0/mod.ts";
import katex from 'https://cdn.jsdelivr.net/npm/katex@0.15.0/dist/katex.mjs';
export { katex };

import { HL_KEYWORDS as _HL_KEYWORDS } from 'https://esm.sh/macrolight@1.4.1';
export const HL_KEYWORDS: Record<string, string[]> = _HL_KEYWORDS;