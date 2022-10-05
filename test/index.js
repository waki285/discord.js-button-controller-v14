const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { ButtonController } = require("../dist/index.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});

client.on("ready", () => {
  console.log("ready");
});

client.on("messageCreate", (m) => {
  if (m.content === "!test-page") {
    const controller = new ButtonController(client);
    controller.addPages([
      new EmbedBuilder().setImage('https://github.com/yyx990803.png'),
      new EmbedBuilder().setImage('https://github.com/egoist.png'),
      new EmbedBuilder().setImage('https://github.com/vercel.png'),
      new EmbedBuilder().setImage('https://github.com/Google.png'),
      new EmbedBuilder().setImage('https://github.com/Microsoft.png')
    ]);
    controller.sendTo(m.channel, m.author);
  }
});

client.login();