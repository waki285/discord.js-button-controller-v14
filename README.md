# discord.js-button-controller-v14

![Discord.js Button Controller](https://i.imgur.com/a/weXYdjV.gif)

## Install

### Requirements

- Discord.js v14.0.0 or later

### NPM

```bash
npm install discord.js-button-controller-v14
```

### Yarn

```bash
yarn add discord.js-button-controller-v14
```

## Example of usage

```js
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js")
const { ButtonController } = require("discord.js-button-controller-v14")

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on("messageCreate", (message) => {
  if (message.content.startsWith('>pagination')) {
    const controller = new ButtonController(client)

    controller.addPages([
      new EmbedBuilder().setImage('https://github.com/yyx990803.png'),
      new EmbedBuilder().setImage('https://github.com/egoist.png'),
      new EmbedBuilder().setImage('https://github.com/vercel.png'),
      new EmbedBuilder().setImage('https://github.com/Google.png'),
      new EmbedBuilder().setImage('https://github.com/Microsoft.png')
    ])

    controller.sendTo(message.channel, message.author)
      .catch(console.error)
  }
});

client.login()
  .catch(console.error)
```

### Using Promise (Lazy Loading)

It is recommended to create a function that returns MessageEmbed with Promise and put it in the argument of addPages and addPage when there are many processes to access externally through the network.

That way, "discord.js-reaction-controller" will resolve the promises as needed and cache and display the MessageEmbed.

```js
const { Client, EmbedBuilder } = require('discord.js')
const { ButtonController } = require('discord.js-button-controller-v14')
const { getBasicInfo } = require('ytdl-core')

const client = new Client(/* Please make sure intents */)

const fetchYouTubeVideoInfo = (videoUrl) => async () => {
  const { videoDetails } = await getBasicInfo(videoUrl)

  return new EmbedBuilder()
    .setColor('RED')
    .setTitle(videoDetails.title)
    .setURL(videoDetails.video_url)
    .setImage(videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url)
    .setTimestamp(Date.parse(videoDetails.publishDate))
    .setFooter({ text: 'Uploaded on' })
    .setAuthor({ name: videoDetails.author.name, icon_url: videoDetails.author.thumbnails[0].url, url: videoDetails.author.channel_url })
}


const videos = [
  'https://youtu.be/sWbD5q769Ms',
  'https://youtu.be/0-zJNiSvz8Q',
  'https://youtu.be/1x2izJEN9p0',
  'https://youtu.be/gNp4VNr44hg',
  'https://youtu.be/Vi_asBY5UX8',
  'https://youtu.be/plqoPcKQnyE',
  'https://youtu.be/308I91ljCWg'
]

client.on('messageCreate', (message) => {
  if (message.content.startsWith('>pagination')) {
    const controller = new ButtonController(client)

    controller.addPages(videos.map(url => fetchYouTubeVideoInfo(url)))

    controller.sendTo(message.channel, message.author)
      .catch(console.error)
  }
})

client.login()
```
