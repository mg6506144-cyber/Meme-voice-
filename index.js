import { Telegraf, Markup } from "telegraf";
import fs from "fs-extra";
import axios from "axios";
import { exec } from "child_process";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

/* ================= TEMP FOLDER ================= */

if (!fs.existsSync("./temp")) {
  fs.mkdirSync("./temp");
}

/* ================= USER STORAGE ================= */

const voiceStore = {};

/* ================= START ================= */

bot.start(async (ctx) => {

  await ctx.reply(
`🎭 Welcome To Voice Meme Bot

🎤 Send Any Voice Message

🔥 Available Effects:
🐿 Chipmunk
🐻 Deep
🤖 Robot
👻 Echo`,
    Markup.keyboard([
      ["🗑 Delete Temp"]
    ]).resize()
  );

});

/* ================= DOWNLOAD VOICE ================= */

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

  } catch (e) {

    console.log(e);

    ctx.reply("❌ Voice Download Error");

  }

});

/* ================= PROCESS FUNCTION ================= */

async function processVoice(ctx, effect, command) {

  try {

    const id = ctx.from.id;

    const input = voiceStore[id];

    if (!input || !fs.existsSync(input)) {

      return ctx.answerCbQuery(
        "❌ Send Voice First",
        { show_alert: true }
      );

    }

    const output = `./temp/${id}_${effect}.mp3`;

    exec(command(input, output), async (err) => {

      if (err) {

        console.log(err);

        return ctx.reply(
`❌ FFmpeg Error

Make Sure FFmpeg Installed`
        );

      }

      if (!fs.existsSync(output)) {

        return ctx.reply(
          "❌ Output File Not Created"
        );

      }

      await ctx.replyWithAudio({
        source: output
      });

    });

  } catch (e) {

    console.log(e);

    ctx.reply("❌ Processing Error");

  }

}

/* ================= CHIPMUNK ================= */

bot.action("chipmunk", async (ctx) => {

  await ctx.answerCbQuery(
    "🐿 Processing..."
  );

  processVoice(
    ctx,
    "chipmunk",
    (input, output) =>
`ffmpeg -i "${input}" -filter:a "asetrate=44100*1.25,aresample=44100" "${output}" -y`
  );

});

/* ================= DEEP ================= */

bot.action("deep", async (ctx) => {

  await ctx.answerCbQuery(
    "🐻 Processing..."
  );

  processVoice(
    ctx,
    "deep",
    (input, output) =>
`ffmpeg -i "${input}" -filter:a "asetrate=44100*0.8,aresample=44100" "${output}" -y`
  );

});

/* ================= ROBOT ================= */

bot.action("robot", async (ctx) => {

  await ctx.answerCbQuery(
    "🤖 Processing..."
  );

  processVoice(
    ctx,
    "robot",
    (input, output) =>
`ffmpeg -i "${input}" -filter_complex "afftfilt=real='hypot(re,im)':imag='0'" "${output}" -y`
  );

});

/* ================= ECHO ================= */

bot.action("echo", async (ctx) => {

  await ctx.answerCbQuery(
    "👻 Processing..."
  );

  processVoice(
    ctx,
    "echo",
    (input, output) =>
`ffmpeg -i "${input}" -filter:a "aecho=0.8:0.9:1000:0.3" "${output}" -y`
  );

});

/* ================= DELETE TEMP ================= */

bot.hears("🗑 Delete Temp", async (ctx) => {

  try {

    const id = ctx.from.id;

    const files = [

      `./temp/${id}.ogg`,
      `./temp/${id}_chipmunk.mp3`,
      `./temp/${id}_deep.mp3`,
      `./temp/${id}_robot.mp3`,
      `./temp/${id}_echo.mp3`

    ];

    for (const file of files) {

      if (fs.existsSync(file)) {
        fs.removeSync(file);
      }

    }

    delete voiceStore[id];

    ctx.reply("✅ Temp Deleted");

  } catch {

    ctx.reply("❌ Delete Error");

  }

});

/* ================= ERROR ================= */

bot.catch((err) => {

  console.log("BOT ERROR:", err);

});

/* ================= START BOT ================= */

bot.launch();

console.log("🎭 Voice Meme Bot Running...");
