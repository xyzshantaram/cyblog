import { flags, path, fs } from './deps.ts';
import { Path, PathTypes, CyblogBuildArgs, getType, scream, getFileName, getExtension, getConfigDir } from './utils.ts';
import { CYBLOG_VALID_SUFFIXES } from './constants.ts';
import { parse } from './parser.ts';
import { help, warn, info } from './logging.ts';

async function buildFile(from: Path, args?: CyblogBuildArgs) {
    const src = from.toString();

    const userConfigDir = getConfigDir();
    if (!userConfigDir || !await fs.exists(userConfigDir)) {
        throw new Deno.errors.NotFound('Could not find configuration directory. Did you run the cyblog install script?');
    }
    const configPath = path.join(userConfigDir, 'cyblog');
    const defaultStyleSheet = path.join(configPath, 'cyblog-defaults.css');

    const styles: Path[] = [defaultStyleSheet];
    if (args?.applyStyles) styles.push(...args.applyStyles);


    const extn = getExtension(src);

    if (!extn || !CYBLOG_VALID_SUFFIXES.includes(extn)) {
        throw new Error(`Supplied file ${src} is not of a type supported by Cyblog. Cyblog supports the types '.md' and '.cyblog.'`)
    }

    let dest = getFileName(src, extn);
    dest += '-dist.html';

    if (args?.to) {
        dest = args.to.toString();
    }

    if (await fs.exists(dest)) {
        if (args?.overwrite) {
            info(`Path ${dest} exists, removing because of --force...`);
            await Deno.remove(dest, { recursive: true });
        }
        else {
            scream(1, `Destination path ${dest} exists!`);
        }
    }

    info('Building file', from);
    const contents = await Deno.readTextFile(from);

    const final = await parse(contents, {
        cyblog: extn === '.cyblog',
        applyStyles: styles,
        pwd: args?.pwd
    });

    await Deno.writeTextFile(dest, final);

    info(`Built ${dest} successfully!`)
}

async function buildDir(from: Path, args?: CyblogBuildArgs) {
    let dest = args?.to?.toString();
    const srcPath = path.normalize(from.toString());

    info('Building directory', srcPath);

    if (!dest) {
        dest = path.basename(srcPath) + '-dist';
    }

    dest = path.normalize(dest);

    if (await fs.exists(dest)) {
        if (args?.overwrite) {
            info(`Path ${dest} exists, removing because of --force...`);
            await Deno.remove(dest, { recursive: true });
        }
        else {
            scream(1, `Destination path ${dest} exists!`);
        }
    }

    Deno.mkdir(dest);
    const edirs = args?.['exclude-dirs']?.map((elem) => path.resolve(path.join(srcPath, elem))) || [];
    const epaths = args?.['exclude-files']?.map((elem) => path.resolve(path.join(srcPath, elem))) || [];

    dirloop:
    for await (const entry of fs.walk(srcPath)) {
        if (srcPath === entry.path) continue;
        const name = path.resolve(path.dirname(entry.path));
        const abs = path.resolve(entry.path);
        for (const dir of edirs) if (name.startsWith(dir)) continue dirloop;
        for (const path of epaths) if (abs.endsWith(path)) continue dirloop;

        const relative = path.relative(srcPath, entry.path);
        let dir = path.join(dest, relative);
        if (entry.isDirectory) {
            Deno.mkdir(dir);
            info(`Created directory ${dir}.`)
        }
        else if (entry.isFile) {
            const extn = getExtension(entry.name);
            if (extn && CYBLOG_VALID_SUFFIXES.includes(extn)) {
                dir = dir.replace(extn, '.html');
                buildFile(entry.path, {
                    to: dir,
                    applyStyles: args?.applyStyles,
                    pwd: name
                })
            }
            else {
                // warn(`File ${entry.path} has unknown type, left it alone.`)
                Deno.copyFile(entry.path, dir);
            }
        }
    }
    info(`Built ${dest} successfully!`)
}

function showHelp() {
    help(`USAGE:\n    cyblog <sourcefile|sourcedir> [-f] [-a additionalStyle.css] [-o output] [-e dirname]`);
    help(`
    -o, --output: The name of the output directory or file.
    -a, --apply-style: The name of a stylesheet to include, same as @apply-style.
    -e, --exclude-file: Exclude a file from being built.
    -E, --exclude-dir: Don't process any directories or children of those directories that have the given dirname.
    -f, --force: overwrite destination path if it exists.`)
}

async function main() {
    const args: flags.Args = flags.parse(Deno.args, {
        string: ['--apply-style', '-a', '--output', '-o', '-e', '-E', '--exclude-file', '--exclude-dir'],
        boolean: ['--force', '-f', '--help', '-h'],
        alias: {
            a: 'apply-style',
            o: 'output',
            f: 'force',
            h: 'help',
            e: 'exclude-file',
            E: 'exclude-dir'
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
    let type = null;
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

    Deno.chdir(path.dirname(src));
    if (type == PathTypes.Directory) {
        buildDir(src, {
            to: args.output,
            applyStyles: styles,
            overwrite: args.force,
            'exclude-dirs': edirs,
            'exclude-files': efiles
        });
    }
    else {
        buildFile(src, {
            to: args.output,
            applyStyles: styles,
            overwrite: args.force,
        });
    }
}

if (import.meta.main) {
    await main();
}