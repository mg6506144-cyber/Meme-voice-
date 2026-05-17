const TelegramBot = require("node-telegram-bot-api");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");

const { BOT_TOKEN, WATERMARK_TEXT } = require("./config");

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const TEMP = path.join(__dirname, "temp");
fs.ensureDirSync(TEMP);

// ✅ FFmpeg check
exec("ffmpeg -version", (err, stdout) => {
  console.log("FFMPEG STATUS:");
  console.log(stdout || "FFmpeg NOT found");
});

// 📥 Video receive
bot.on("video", async (msg) => {
  const chatId = msg.chat.id;

  try {
    const file = await bot.getFile(msg.video.file_id);

    const input = path.join(TEMP, "input.mp4");
    const output = path.join(TEMP, "output.mp4");

    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(input, Buffer.from(buffer));

    bot.sendMessage(chatId, "⏳ Watermark add হচ্ছে...");

    ffmpeg(input)
      .videoFilters({
        filter: "drawtext",
        options: {
          text: WATERMARK_TEXT,
          fontsize: 24,
          fontcolor: "white",
          x: 10,
          y: "(h-text_h-10)"
        }
      })
      .output(output)
      .on("end", async () => {
        await bot.sendVideo(chatId, output);
        bot.sendMessage(chatId, "✅ Done!");
      })
      .on("error", (err) => {
        console.log(err);
        bot.sendMessage(chatId, "❌ FFmpeg error");
      })
      .run();

  } catch (e) {
    console.log(e);
    bot.sendMessage(chatId, "❌ Error");
  }
});
