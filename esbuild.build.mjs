import { build } from 'esbuild';

await build({
    bundle: true,
    entryPoints: ['public/src/main.ts'],
    outfile: 'public/bundle.js',
    minify: true,
    treeShaking: true,
    platform: 'browser',
    format: 'esm'
});
