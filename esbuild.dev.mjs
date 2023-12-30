import { context } from 'esbuild';

const ctx = await context({
    bundle: true,
    entryPoints: ['public/src/main.ts'],
    outfile: 'public/bundle.js',
    minify: true,
    treeShaking: true,
    platform: 'browser',
    format: 'esm'
});

await ctx.watch();