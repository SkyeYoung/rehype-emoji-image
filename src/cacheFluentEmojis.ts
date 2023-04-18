import { fetchOrUpdateCache, needUpdate, traverseFolder } from './common';
import { readFile, writeFile, stat } from 'fs/promises';

type CacheFluentEmojisRes = {
  cacheDir: string;
  metaFile: string;
  headIdFile: string;
  emojiDir: string;
};
export const cacheFluentEmojis = async (): Promise<CacheFluentEmojisRes> => {
  const rootDir = '.emoji-cache';
  const cacheDir = `${rootDir}/fluent-emojis`;
  const metaFile = `${rootDir}/fluent-emojis.json`;
  const headIdFile = `${rootDir}/fluent-emojis-head-id.txt`;
  const emojiDir = `assets`;

  const git = await fetchOrUpdateCache({
    path: cacheDir,
    url: 'https://github.com/microsoft/fluentui-emoji.git',
    sparsePaths: [emojiDir],
  });

  if (await needUpdate(git, headIdFile)) {
    const emojiMap = {};
    await traverseFolder(`${cacheDir}/${emojiDir}`, async ({ filePath }) => {
      if (filePath.endsWith('metadata.json')) {
        const data = JSON.parse(await readFile(filePath, 'utf-8'));
        emojiMap[data.glyph] = data;
      }
      return { continue: true };
    });

    await writeFile(metaFile, JSON.stringify(emojiMap), 'utf-8');
  }

  return {
    cacheDir,
    metaFile,
    headIdFile,
    emojiDir,
  };
};

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export enum FluentEmojiTypeEnum {
  _3D = '3D',
  Color = 'Color',
  Flat = 'Flat',
  HighContrast = 'High Contrast',
}
export const getFluentEmoji = async (
  config: CacheFluentEmojisRes,
  emoji: string,
  type: FluentEmojiTypeEnum
) => {
  const emojiMap = JSON.parse(await readFile(config.metaFile, 'utf8'));
  const emojiInfo = emojiMap[emoji];
  if (!emojiInfo) {
    return;
  }

  const cldr: string = emojiInfo?.cldr || '';
  const realCldr =  capitalizeFirstLetter(cldr);
  const ext = type === FluentEmojiTypeEnum._3D ? 'png' : 'svg';
  const filename = `${cldr.split(' ').join('_')}_${type.toLowerCase()}`;
  let file = `${filename}.${ext}`;
  let p = `${config.emojiDir}/${realCldr}/${type}/${file}`;

  if (!await stat(`${config.cacheDir}/${p}`).then((v) => v.isFile).catch(() => false)) {
    file = `${filename}_default.${ext}`;
    p = `${config.emojiDir}/${realCldr}/Default/${type}/${file}`
  }

  return {
    meta: emojiInfo,
    file,
    filename,
    path: `${config.cacheDir}/${p}`,
    remotePath: p,
  };
};
