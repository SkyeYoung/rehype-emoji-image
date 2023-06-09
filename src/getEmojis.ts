import type { Gemoji } from 'gemoji';
import { gemoji } from 'gemoji';
import emojiRegex from 'emoji-regex';

const shortCodeRegExp = /:(\+1|[-\w]+):/g;

type EmojiInfo = {
  emoji: string;
  shortCode: string;
  gemoji?: Gemoji;
  from: number;
  to: number;
  raw: string;
};

const emojiRegExp = emojiRegex();

const getEmojis = (str: string): EmojiInfo[] => {
  const res: EmojiInfo[] = [];

  for (const match of str.matchAll(shortCodeRegExp)) {
    const shortCode = match[1];
    const ge = gemoji.find((v) => v.names.includes(shortCode));
    if (!ge) continue;

    const rawCode = match[0];
    const from = match.index || 0;

    res.push({
      emoji: ge.emoji,
      shortCode: match[1],
      gemoji: ge,
      from,
      to: from + rawCode.length,
      raw: rawCode,
    });
  }

  for (const match of str.matchAll(emojiRegExp)) {
    const emoji = match[0];
    const from = match.index || 0;
    const ge = gemoji.find((v) => v.emoji === emoji);
    res.push({
      emoji,
      shortCode: ge.names[0],
      gemoji: ge,
      from,
      to: from + emoji.length,
      raw: emoji,
    });
  }

  return res;
};

export default getEmojis;
