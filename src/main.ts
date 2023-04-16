import getEmojis from "./getEmojis";
import { FluentEmojiTypeEnum, cacheFluentEmojis, getFluentEmoji } from "./transformFluentEmojis";

const a = getEmojis(":+1: test :hello: 😸 ni 😶‍🌫️ shi 🚀 .")

console.log(a);

(async ()=>{
  const b = await cacheFluentEmojis();

  await Promise.all(
    a.map(async ({emoji})=> getFluentEmoji(b, emoji, FluentEmojiTypeEnum._3D))
  ).then(console.log)
})();
