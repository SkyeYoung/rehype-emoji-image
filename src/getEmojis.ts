import type { Gemoji } from 'gemoji';
import { gemoji, nameToEmoji, emojiToName } from 'gemoji';
import emojiRegex from 'emoji-regex';

const shortCodeRegExp = /:(\+1|[-\w]+):/g;

type EmojiInfo = {
  emoji: string;
  shortCode: string;
  gemoji?: Gemoji;
  from: number;
  to: number;
};

const emojiRegExp = emojiRegex();

const getEmojis = (str: string): EmojiInfo[] => {
  const res: EmojiInfo[] = [];

  for (const match of str.matchAll(shortCodeRegExp)) {
    const emoji = nameToEmoji[match[1]];
    const ge = gemoji.find((v) => v.emoji === emoji);
    if (!ge) continue;

    const rawCode = match[0];
    const from = match.index || 0;

    res.push({
      emoji,
      shortCode: match[1],
      gemoji: ge,
      from,
      to: from + rawCode.length,
    });
  }

  for (const match of str.matchAll(emojiRegExp)) {
    const emoji = match[0];
    const from = match.index || 0;
    res.push({
      emoji,
      shortCode: emojiToName[emoji],
      gemoji: gemoji.find((v) => v.emoji === emoji),
      from,
      to: from + emoji.length,
    });
  }

  return res;
};

export default getEmojis;
