const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");
const tf = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");

const bot = new Telegraf(process.env.TELEGRAM_BOT_API_KEY);

bot.on("message", async (ctx) => {
  const files = ctx.update.message.photo;
  const fileId = files[1].file_id;
  ctx.telegram.getFileLink(fileId).then((data) => {
    const imageLink = data.href;
    axios({ url: imageLink, responseType: "stream" }).then((response) => {
      return new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(`${__dirname}/images/image.jpg`))
          .on("finish", () =>
            resolve(
              bot.telegram.sendMessage(
                ctx.chat.id,
                "Image received please wait for processing ⌛",
                {}
              ),
              Detection()
            )
          )
          .on("error", (e) =>
            reject(
              bot.telegram.sendMessage(
                ctx.chat.id,
                "Error in receiving image",
                {}
              )
            )
          );
      });
    });
  });

  const Detection = async () => {
    const image = await fs.readFileSync(`${__dirname}/images/image.jpg`);
    const decodedImage = tf.node.decodeImage(image, 3);
    const model = await mobilenet.load();
    const predictions = await model.classify(decodedImage);
    const pred = JSON.stringify(predictions, undefined, 2);
    const cname = predictions[0].className;
    const prob = predictions[0].probability * 100;
    const msg = `Detected ${cname} with ${prob}% probability.`;
    console.log(pred);
    bot.telegram.sendMessage(ctx.chat.id, msg, {});
  };
});

bot.launch();
