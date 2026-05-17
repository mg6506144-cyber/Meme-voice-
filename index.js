import { Telegraf, Markup } from "telegraf";
import fs from "fs-extra";
import axios from "axios";
import { exec } from "child_process";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

if (!fs.existsSync("./temp")) {
  fs.mkdirSync("./temp");
}

const voiceStore = {};

bot.start((ctx) => {

  ctx.reply(
`🎭 Welcome To Voice Meme Bot

🎤 Send Any Voice Message`,
    Markup.keyboard([
      ["🗑 Delete Temp"]
    ]).resize()
  );

});

bot.on("voice", async (ctx) => {

  try {

    const fileId = ctx.message.voice.file_id;

    const file = await ctx.telegram.getFile(fileId);

    const url =
`https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const id = ctx.from.id;

    const input = `./temp/${id}.ogg`;

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(input);

    response.data.pipe(writer);

    writer.on("finish", async () => {

      voiceStore[id] = input;

      await ctx.reply(
`🎭 Select Voice Effect`,
        {
          reply_markup: {
            inline_keyboard: [

              [
                {
                  text: "🐿 Chipmunk",
                  callback_data: "chipmunk"
                },

                {
                  text: "🐻 Deep",
                  callback_data: "deep"
                }
              ],

              [
                {
                  text: "🤖 Robot",
                  callback_data: "robot"
                },

                {
                  text: "👻 Echo",
                  callback_data: "echo"
                }
              ]

            ]
          }
        }
      );

    });

  } catch {

    ctx.reply("❌ Error");

  }

});

async function processVoice(ctx, effect, ffmpegCmd) {

  const id = ctx.from.id;

  const input = voiceStore[id];

  if (!input) {
    return ctx.answerCbQuery("❌ Send Voice First");
  }

  const output = `./temp/${id}_${effect}.mp3`;

  exec(ffmpegCmd(input, output), async (err) => {

    if (err) {
      return ctx.reply("❌ FFmpeg Error");
    }

    await ctx.replyWithAudio({
      source: output
    });

  });

}

bot.action("chipmunk", async (ctx) => {

  await ctx.answerCbQuery();

  processVoice(
    ctx,
    "chipmunk",
    (input, output) =>
`ffmpeg -i ${input} -filter:a "asetrate=44100*1.25,aresample=44100" ${output} -y`
  );

});

bot.action("deep", async (ctx) => {

  await ctx.answerCbQuery();

  processVoice(
    ctx,
    "deep",
    (input, output) =>
`ffmpeg -i ${input} -filter:a "asetrate=44100*0.8,aresample=44100" ${output} -y`
  );

});

bot.action("robot", async (ctx) => {

  await ctx.answerCbQuery();

  processVoice(
    ctx,
    "robot",
    (input, output) =>
`ffmpeg -i ${input} -filter_complex "afftfilt=real='hypot(re,im)':imag='0'" ${output} -y`
  );

});

bot.action("echo", async (ctx) => {

  await ctx.answerCbQuery();

  processVoice(
    ctx,
    "echo",
    (input, output) =>
`ffmpeg -i ${input} -filter:a "aecho=0.8:0.9:1000:0.3" ${output} -y`
  );

});

bot.hears("🗑 Delete Temp", async (ctx) => {

  const id = ctx.from.id;

  fs.removeSync(`./temp/${id}.ogg`);
  fs.removeSync(`./temp/${id}_chipmunk.mp3`);
  fs.removeSync(`./temp/${id}_deep.mp3`);
  fs.removeSync(`./temp/${id}_robot.mp3`);
  fs.removeSync(`./temp/${id}_echo.mp3`);

  delete voiceStore[id];

  ctx.reply("✅ Temp Deleted");

});

bot.launch();

console.log("🎭 Voice Meme Bot Running...");
