import { visit } from 'unist-util-visit';
import getEmojis from './getEmojis';
import { FluentEmojiTypeEnum, cacheFluentEmojis, getFluentEmoji } from './cacheFluentEmojis';
import { copyFile } from 'fs/promises';
import { join } from 'path';
import { fromHtml } from 'hast-util-from-html';

type CopySet = Set<Pick<Awaited<ReturnType<typeof getFluentEmoji>>, 'file' | 'path'>>;
const copyImg2Public = async (copySet: CopySet, option: Option) => {
  await Promise.all(Array.from(copySet).map((v) => copyFile(
    join(process.cwd(),v.path), 
    join(process.cwd(),option.publicDir, v.file))));
};

const transformer = async (
  str: string,
  option: Option,
  cacheConfig: Awaited<ReturnType<typeof cacheFluentEmojis>>
): Promise<[true, string] | [false]> => {
  const emojis = getEmojis(str);  
  if (!emojis.length) return [false];

  const fluentEmojis = await Promise.all(
    emojis.map(async ({ emoji }) => getFluentEmoji(cacheConfig, emoji, option.emojiType))
  );

  let finalStr = str;
  const copySet= new Set() as CopySet;
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

        p = join(dir, fluentEmoji.file);
        copySet.add({
          file: fluentEmoji.file,
          path: fluentEmoji.path,
        });
      } else {
        p = fluentEmoji.remotePath;
      }

      res = /*html*/ `<img style="display: inline-block;" src="${p}" width="${option.emojiSize}" height="${option.emojiSize}" alt="${v.gemoji?.description || v.shortCode}" title="${
        v.emoji
      }" />`;
    }
    
    console.log(`Get ${v.emoji}, converting to ${res}`);

    finalStr = finalStr.replace(v.raw, res);
  });

  await copyImg2Public(copySet, option);

  return [true, finalStr];
};

type Option = {
  publicDir?: string;
  emojiType?: FluentEmojiTypeEnum;
  emojiSize?: string;
  cacheDir?: string;
  location?: 'local' | 'remote';
  publicPrefix?: string;
};

const main = (option: Option) => async (tree: Parameters<typeof visit>[0]) => new Promise(async (resolve, reject ) =>{
  const cacheConfig = await cacheFluentEmojis();

  const nodesShouldCheck = [];

  visit(tree, 'text', (node) => {
    nodesShouldCheck.push(node);
  }); 

  for (const node of nodesShouldCheck) {
    const [hasEmojis, value ] = await transformer(
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

    if (hasEmojis) {
      node.type = "element";
      node.tagName = "span";
      node.properties = {};
      node.children = fromHtml(value, {fragment: true}).children;
    }
  }
  
  resolve(tree);
}); 

export default main;
