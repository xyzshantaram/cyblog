import { scream, getConfigDir } from '../src/utils.ts';
import { fs, path } from '../src/deps.ts';
import { error, warn, info } from '../src/logging.ts';

if (import.meta.main) {
    const dir = getConfigDir();
    if (dir == null) {
        scream(1, 'Unable to detect configuration directory.')
    }
    else {
        const cybConfig = path.join(dir, 'cyblog');
        await Deno.mkdir(cybConfig, { recursive: true });

        info('Copying configuration files...');

        Deno.chdir('install/install-files');
        for await (const entry of fs.walk('.')) {
            if (entry.path == '.') continue;
            const destPath = path.join(cybConfig, entry.path);
            const destDir = path.dirname(destPath);

            if (!fs.exists(destDir)) {
                warn(`Path ${destDir} not found, creating.`);
                await Deno.mkdir(destDir, { recursive: true });
            }
            try {
                info(entry.path, '->', destPath);
                await fs.copy(entry.path, destPath, { overwrite: true });
            }
            catch (e) {
                if (e.toString().includes('already exists')) {
                    await Deno.remove(destPath);
                    await fs.copy(entry.path, destPath, { overwrite: true });
                }
                else {
                    error(e);
                }
            }
        }
    }
}