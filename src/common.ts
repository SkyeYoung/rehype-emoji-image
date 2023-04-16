import simpleGit, {SimpleGit} from 'simple-git';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const isDirExisted = async (p: string) => {
  return stat(p)
    .then((v) => v.isDirectory())
    .catch(() => false);
};

type Config = {
  path: string;
  url: string;
  sparsePaths: string[];
}

export const fetchOrUpdateCache = async (config: Config) => {
  let git: SimpleGit;
  const { path, url, sparsePaths } = config;
  if (await isDirExisted(path)) {
    git = simpleGit(path);
    await git.cwd(path).fetch(['--prune', '--filter=blob:none', '--recurse-submodules=no']);
  } else {
    git = simpleGit();
    await git
    .clone(
      url, 
      path, 
      {
        '--filter': 'blob:none',
        '--sparse': null, 
        '--recurse-submodules': 'no',
      })
    .cwd(path)
    .raw(['sparse-checkout', 'set', ...sparsePaths]);
  }

  return git;
}

type TraverseFolderCallback = (params: {
  err?: Error | null;
  filePath: string;
}) => Promise<{ continue?: boolean, break?: boolean} | void>;
export async function traverseFolder(folderPath: string, callback: TraverseFolderCallback, { stopOnError = true } = {}) {
  try {
    const files = await readdir(folderPath);
    for await (const filename of files) {
      const fullFilePath = join(folderPath, filename);
      const stats = await stat(fullFilePath);
      if (stats.isDirectory()) {
        await traverseFolder(fullFilePath, callback, { stopOnError });
      } else if (stats.isFile()) {
        const res = await callback({ filePath: fullFilePath});
        if (res?.break) break;
        if (res?.continue) continue;
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

export const needUpdate = async (git: SimpleGit, headIdFile: string)=> Promise.all([
  git.revparse(['HEAD']),
  readFile(headIdFile, 'utf-8').catch(() => ''),
])
.then(async ([headId, oldHeadId]) => {
  if (headId === oldHeadId) {
    return false;
  }

  await writeFile(headIdFile, headId, 'utf-8');
  return true;
});