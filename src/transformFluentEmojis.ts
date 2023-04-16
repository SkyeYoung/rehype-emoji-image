import { fetchOrUpdateCache, needUpdate, traverseFolder } from "./common"
import { readFile, writeFile } from 'fs/promises';

type CacheFluentEmojisRes = {
    cacheDir: string,
    metaFile: string,
    headIdFile: string,
}
export const cacheFluentEmojis = async (): Promise<CacheFluentEmojisRes> => {
  const rootDir = '.emoji-cache'
  const cacheDir = `${rootDir}/fluent-emojis`;
  const metaFile = `${rootDir}/fluent-emojis.json`;
  const headIdFile = `${rootDir}/fluent-emojis-head-id.txt`;
  const emojiDir = `assets`;

  const git = await fetchOrUpdateCache({
    path: cacheDir,
    url: 'https://github.com/microsoft/fluentui-emoji.git',
    sparsePaths: [emojiDir]
  })

  if (await needUpdate(git, headIdFile)) {
    const emojiMap = {}
    await traverseFolder(`${cacheDir}/${emojiDir}`, async ({ filePath }) => {
      if (filePath.endsWith('metadata.json')) {
        const data = JSON.parse(await readFile(filePath, 'utf-8'));
        emojiMap[data.glyph] = data;
      }
      return { continue: true };
    });
  
    await writeFile(metaFile, JSON.stringify(emojiMap), 'utf-8')
  }

  return {
    cacheDir: cacheDir + '/' + emojiDir,
    metaFile,
    headIdFile,
  }
}

export enum FluentEmojiTypeEnum {
  _3D = '3D',
  Color = 'Color',
  Flat = 'Flat',
  HighContrast = 'High Contrast',
}
export const getFluentEmoji = async (config: CacheFluentEmojisRes, emoji: string, type: FluentEmojiTypeEnum) => {
  const emojiMap = JSON.parse(await readFile(config.metaFile, 'utf8'));
  const emojiInfo = emojiMap[emoji];
  if (!emojiInfo) {
    return 
  }

  const emojiPath: string = emojiInfo?.cldr || '';
  const ext = type === FluentEmojiTypeEnum._3D ? 'png' : 'svg';
  const filename = `${emojiPath.split(' ').join('_')}_${type}.${ext}`;

  return {
    meta: emojiInfo,
    path: `${config.cacheDir}/${emojiPath}/${type}/${filename}`,
  };
}