import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

export const isDirExisted = async (p: string) => {
  return stat(p)
    .then((v) => v.isDirectory())
    .catch(() => false);
};

const execFileAsync = promisify(execFile);

type Config = {
  path: string;
  url: string;
  sparsePaths: string[];
};

export const fetchOrUpdateCache = async (config: Config) => {
  const { path, url, sparsePaths } = config;
  if (await isDirExisted(path)) {
    await execFileAsync('git', [`-C`, path, 'fetch', '--prune', '--filter=blob:none', '--recurse-submodules=no']);
  } else {
    await execFileAsync('git', ['clone', url, path, '--filter=blob:none', '--depth=1', '--sparse', '--recurse-submodules=no', '--no-checkout']);
    await execFileAsync('git', [`-C`, path, 'sparse-checkout', 'set', ...sparsePaths]);
    await execFileAsync('git', [`-C`, path, 'checkout', 'HEAD']);
  }
};

type TraverseFolderCallback = (params: {
  err?: Error | null;
  filePath: string;
}) => Promise<{ continue?: boolean; break?: boolean } | void>;
export async function traverseFolder(
  folderPath: string,
  callback: TraverseFolderCallback,
  { stopOnError = true } = {}
) {
  try {
    const files = await readdir(folderPath);
    for await (const filename of files) {
      const fullFilePath = join(folderPath, filename);
      const stats = await stat(fullFilePath);
      if (stats.isDirectory()) {
        await traverseFolder(fullFilePath, callback, { stopOnError });
      } else if (stats.isFile()) {
        const res = await callback({ filePath: fullFilePath });
        if (res) {
          if (res?.break) break;
          if (res?.continue) continue;
        }
      }
    }
  } catch (err) {
    if (stopOnError) {
      throw err;
    } else {
      return callback({ err: new Error(err), filePath: folderPath });
    }
  }
}

export const needUpdate = async (config: Config, headIdFile: string) => {
  const [headId, oldHeadId] = await Promise.all([
    execFileAsync('git', [`--git-dir=${config.path}/.git`, 'rev-parse', 'HEAD']),
    readFile(headIdFile, 'utf-8').catch(() => ''),
  ]);

  if (headId.stdout.trim() === oldHeadId.trim()) {
    return false;
  }

  await writeFile(headIdFile, headId.stdout, 'utf-8');
  return true;
};
