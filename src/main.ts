import { visit } from 'unist-util-visit';
import getEmojis from './getEmojis';
import { FluentEmojiTypeEnum, cacheFluentEmojis, getFluentEmoji } from './cacheFluentEmojis';
import { copyFile } from 'fs/promises';

const copyImg2Public = async (copySet: Set<string>, option: Option) => {
  await Promise.all(Array.from(copySet).map((path) => copyFile(path, option.publicDir)));
};

const transformer = async (
  str: string,
  option: Option,
  cacheConfig: Awaited<ReturnType<typeof cacheFluentEmojis>>
) => {
  const emojis = getEmojis(str);
  if (!emojis.length) return str;

  const fluentEmojis = await Promise.all(
    emojis.map(async ({ emoji }) => getFluentEmoji(cacheConfig, emoji, option.emojiType))
  );

  let finalStr = str;
  const copySet = new Set<string>();
  emojis.forEach((v, i) => {
    const fluentEmoji = fluentEmojis[i];

    let res: string;
    if (!fluentEmoji) {
      res = /*html*/ `<span aria-label="${v.gemoji?.description || v.shortCode}" role="img">${
        v.emoji
      }</span>`;
    } else {
      let p: string;
      if (option.location === 'local') {
        const dir = option.publicPrefix
          ? option.publicDir.replace(option.publicPrefix, '')
          : option.publicDir;
        p = `${dir}/${fluentEmoji.filename}`;
        copySet.add(fluentEmoji.path);
      } else {
        p = fluentEmoji.remotePath;
      }

      res = /*html*/ `<img src="${p}" alt="${v.gemoji?.description || v.shortCode}" title="${
        v.emoji
      }" />`;
    }
    finalStr = finalStr.replace(str.substring(v.from, v.to + 1), res);
  });

  await copyImg2Public(copySet, option);

  return finalStr;
};

type Option = {
  publicDir: string;
  emojiType: FluentEmojiTypeEnum;
  emojiSize?: string;
  cacheDir?: string;
  location?: 'local' | 'remote';
  publicPrefix?: string;
};

const main = (option: Option) => async (tree: Parameters<typeof visit>[0]) => {
  const cacheConfig = await cacheFluentEmojis();

  (visit as any)(tree, 'text', async (node, idx) => {
    await transformer(
      (node as any).value,
      {
        ...{
          publicDir: 'public',
          emojiType: FluentEmojiTypeEnum._3D,
          emojiSize: '24',
          location: 'local',
          publicPrefix: 'public',
        },
        ...option,
      },
      cacheConfig
    );

    return [idx, 'SKIP'] as unknown as any;
  });
};

export default main;
