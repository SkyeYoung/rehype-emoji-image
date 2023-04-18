import { visit } from 'unist-util-visit';
import getEmojis from './getEmojis';
import { FluentEmojiTypeEnum, cacheFluentEmojis, getFluentEmoji } from './cacheFluentEmojis';
import { copyFile } from 'fs/promises';
import { join } from 'path';

type CopySet = Set<Pick<Awaited<ReturnType<typeof getFluentEmoji>>, 'filename' | 'path'>>;
const copyImg2Public = async (copySet: CopySet, option: Option) => {
  await Promise.all(Array.from(copySet).map((v) => copyFile(
    join(process.cwd(),v.path), 
    join(process.cwd(),option.publicDir, v.filename))));
};

const transformer = async (
  str: string,
  option: Option,
  cacheConfig: Awaited<ReturnType<typeof cacheFluentEmojis>>
): Promise<[boolean, string]> => {
  const emojis = getEmojis(str);
  console.log(str, emojis);
  
  if (!emojis.length) return [false, str];

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
        p = `${dir}/${fluentEmoji.filename}`;
        copySet.add({
          filename: fluentEmoji.filename,
          path: fluentEmoji.path,
        });
      } else {
        p = fluentEmoji.remotePath;
      }

      res = /*html*/ `<img src="${p}" alt="${v.gemoji?.description || v.shortCode}" title="${
        v.emoji
      }" />`;
    }
    
    console.log(`Get ${v.emoji}, converting to ${res}`);

    finalStr = finalStr.replace(v.raw, res);
  });

  console.log("finalStr", finalStr);

  await copyImg2Public(copySet, option);

  return [true, finalStr];
};

type Option = {
  publicDir: string;
  emojiType: FluentEmojiTypeEnum;
  emojiSize?: string;
  cacheDir?: string;
  location?: 'local' | 'remote';
  publicPrefix?: string;
};

const main = (option: Option) => async (tree: Parameters<typeof visit>[0]) => new Promise(async (resolve, reject ) =>{
  const cacheConfig = await cacheFluentEmojis();

  const nodesShouldCheck = [];
  (visit as any)(tree, 'text', async (node) => {
    console.log(node);
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
      const n  = node as any;
      (node as any).value = value;
      (node as any).position.end = {
        line: n.position.end.line,
        column: n.position.start.column + value.length,
        offset:  n.position.start.offset + value.length,
      };
    }

  }


  resolve(true);
}); 

export default main;
