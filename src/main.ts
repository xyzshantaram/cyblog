import { flags, path, fs } from './deps.ts';
import { Path, PathTypes, CyblogBuildArgs, getType, scream, getFileName, getExtension, getDataDirOrDie } from './utils.ts';
import { CYBLOG_VALID_SUFFIXES } from './constants.ts';
import { buildDoc } from './parser.ts';
import { help, info } from './logging.ts';

const getDest = (launch: string | undefined, dest: string): string => {
    let destLoc = '.';

    const resolvedDestPath = path.resolve(dest);
    if (resolvedDestPath.startsWith(Deno.cwd())) {
        destLoc = path.join(path.resolve(launch || Deno.cwd()), dest);
    }
    else {
        destLoc = resolvedDestPath;
    }
    return destLoc;
}

async function buildFile(from: Path, args?: CyblogBuildArgs) {
    const src = from.toString();

    const userConfigDir = getDataDirOrDie();
    const configPath = path.join(userConfigDir, 'cyblog');
    const defaultStyleSheet = path.join(configPath, 'cyblog-defaults.css');

    const styles: Path[] = [defaultStyleSheet];
    if (args?.applyStyles) styles.push(...args.applyStyles);

    const extn = getExtension(src);

    if (!extn || !CYBLOG_VALID_SUFFIXES.includes(extn)) {
        throw new Error(`Supplied file ${src} is not of a type supported by Cyblog. Cyblog supports the types '.md' and '.cyblog.'`)
    }

    const name = getFileName(src, extn) + '-dist.html';
    let dest = name;

    let destLoc = '.';

    if (args?.to) {
        dest = args.to.toString();
    }

    if (src.endsWith('README.md') && args?.convertReadmes) {
        dest = path.join(path.dirname(dest), 'index.html');
    }

    if (!path.isAbsolute(dest)) {
        const resolvedDestPath = path.resolve(dest);
        if (resolvedDestPath.startsWith(Deno.cwd())) {
            destLoc = path.join(path.resolve(args?.launchDir || Deno.cwd()), dest);
        }
        else {
            destLoc = resolvedDestPath;
        }
    }
    else {
        destLoc = dest;
    }

    if (await fs.exists(destLoc)) {
        if (args?.overwrite) {
            info(`Path ${destLoc} exists, removing because of --force...`);
            await Deno.remove(destLoc, { recursive: true });
        }
        else {
            const info = await Deno.stat(destLoc);
            if (info.isDirectory) {
                destLoc += name;
            }
            else {
                scream(1, `Destination path ${destLoc} exists!`);
            }
        }
    }

    info('Building file', from);
    const contents = await Deno.readTextFile(from);

    const final = await buildDoc(contents, {
        ...args,
        cyblog: extn === '.cyblog' || args?.forceCyblog,
        applyStyles: styles,
    });

    await Deno.writeTextFile(destLoc, final);
    info(`Built ${destLoc} successfully!`)
}

async function buildDir(from: Path, args?: CyblogBuildArgs) {
    let dest = args?.to?.toString();
    const srcPath = path.normalize(from.toString());

    info('Building directory', srcPath);

    if (!dest) {
        dest = path.basename(srcPath) + '-dist';
    }

    dest = getDest(args?.launchDir, dest);

    if (await fs.exists(dest)) {
        if (args?.overwrite) {
            info(`Path ${dest} exists, removing because of --force...`);
            await Deno.remove(dest, { recursive: true });
        }
        else {
            scream(1, `Destination path ${dest} exists!`);
        }
    }

    await Deno.mkdir(dest);
    const edirs = args?.excludeDirs?.map((elem) => path.resolve(path.join(srcPath, elem))) || [];
    const epaths = args?.excludeFiles?.map((elem) => path.resolve(path.join(srcPath, elem))) || [];

    dirloop:
    for await (const entry of fs.walk(srcPath)) {
        if (srcPath === entry.path) continue;
        const name = path.resolve(path.dirname(entry.path));
        const abs = path.resolve(entry.path);
        for (const dir of edirs) if (name.startsWith(dir)) continue dirloop;
        for (const path of epaths) if (abs.endsWith(path)) continue dirloop;

        const relative = path.relative(srcPath, entry.path);
        let dir = path.join(dest, relative);
        if (entry.isDirectory && !edirs.includes(abs)) {
            await Deno.mkdir(dir);
            info(`Created directory ${dir}.`)
        }
        else if (entry.isFile) {
            const extn = getExtension(entry.name);
            if (extn && CYBLOG_VALID_SUFFIXES.includes(extn)) {
                dir = dir.replace(extn, '.html');
                await buildFile(entry.path, {
                    ...args,
                    to: dir,
                    pwd: name,
                })
            }
            else {
                await Deno.copyFile(entry.path, dir);
            }
        }
    }
    info(`Built ${dest} successfully!`);
}

function showHelp() {
    help(`USAGE:\n    cyblog <sourcefile|sourcedir> [options]`);
    help(`OPTIONS:
    -a, --apply-style: The name of a stylesheet to include, same as @apply-style.
    -c, --force-cyblog: Forces markdown files to be treated as Cyblog files.
    -d, --custom-head: The absolute path to a file whose contents will be inserted into the <head> tag of 
        generated HTML, after any <meta> tags and before the <style> tag.
    -e, --exclude-file: Exclude a file from being built.
    -E, --exclude-dir: Don't process any directories or children of those directories that have the given dirname.
    -f, --force: overwrite destination path if it exists.
    -m, --math: enable math support using KaTeX.
    -o, --output: The name of the output directory or file.
    -p, --plug: add a link to Cyblog in the footer of the page to show your support. Will always be opt-in.
    -r, --convert-readmes: Convert files named 'README.md' to 'index.html'. Useful for converting GitHub repos.`)
}

async function main() {
    const args: flags.Args = flags.parse(Deno.args, {
        string: ['--apply-style', '-a', '--output', '-o', '--custom-head', '-d'],
        boolean: ['--force', '-f', '--help', '-h', '-r', '--convert-readmes', '-c', '--force-cyblog', '-p', '--plug', '-m', '--math'],
        alias: {
            a: 'apply-style',
            o: 'output',
            f: 'force',
            h: 'help',
            e: 'exclude-file',
            E: 'exclude-dir',
            r: 'convert-readmes',
            c: 'force-cyblog',
            p: 'plug',
            d: 'custom-head',
            m: 'math'
        }
    });

    const positional: string[] = args._.map((itm) => itm.toString());

    if (positional.length == 0) {
        args.help = true;
    }

    if (args.help) {
        showHelp();
        Deno.exit(0);
    }

    if (positional.length === 0) {
        scream(1, 'You must provide the source path');
    }

    const src = positional[0];
    let type: PathTypes | null = null;
    try {
        type = await getType(src);
    }
    catch (e) {
        if (e instanceof Deno.errors.NotFound) scream(2, 'File or directory not found:', src);
        else scream(1, e);
    }
    const styles: Path[] = typeof args['apply-style'] == 'string' ? [args['apply-style']] : args['apply-style'] || [];
    const efiles: string[] = typeof args['exclude-file'] == 'string' ? [args['exclude-file']] : args['exclude-file'] || [];
    const edirs: string[] = typeof args['exclude-dir'] == 'string' ? [args['exclude-dir']] : args['exclude-dir'] || [];

    const buildArgs: CyblogBuildArgs = {
        to: args.output,
        applyStyles: styles,
        overwrite: args.force,
        excludeDirs: edirs,
        excludeFiles: efiles,
        convertReadmes: args['convert-readmes'],
        launchDir: Deno.cwd(),
        forceCyblog: args['force-cyblog'],
        plug: args.plug,
        customHead: args['custom-head'],
        math: args.math,
    }

    Deno.chdir(path.dirname(src));
    const srcName = path.basename(src);

    ((type === PathTypes.Directory) ? buildDir : buildFile)(srcName, buildArgs);
}

if (import.meta.main) {
    await main();
}