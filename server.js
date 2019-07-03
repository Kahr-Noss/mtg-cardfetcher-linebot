const path = require('path');
const linebot = require('linebot');
const express = require('express');
const https = require('https');
const fs = require('fs');
const cron = require('node-cron');

const getCardUtil = require('./utils/get-card-util');
const getSpoilersUtil = require('./utils/get-spoilers-util');
const { saveStats, resetDaily } = require('./utils/save-stats');

require('dotenv').config();
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});


bot.on('message', function (event) {
  const message = event.message.text;
  if (message) {
    getCardUtil(message)
      .then((answer) => {
        console.log(JSON.stringify(answer, null, 2));
        event.reply(answer);
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

bot.on('follow', function (event) {
  event.reply(JSON.parse(fs.readFileSync('./json/presentation-msg.json')));
  saveStats('friends', 1);
});

bot.on('join', function (event) {
  event.reply(JSON.parse(fs.readFileSync('./json/presentation-msg.json')));
  saveStats('groups', 1);
});

// check the spoilers every 5 min
cron.schedule('*/5 * * * *', () => {
  console.log('Checking new spoilers...')
  getSpoilersUtil()
    .then((messageList) => {
      console.log(messageList);
      if (process.env.ENVIRONMENT === 'production') {
        bot.broadcast(messageList);
      }
      if (process.env.ENVIRONMENT === 'test') {
        bot.push(process.env.TEST_LINE_ID, messageList);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});


// send stats every morning and reset stats
cron.schedule('0 0 * * *', () => {
  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  const msg = `Here are today stats:
  New friends: ${data.daily.friends} (${data.general.friends})
  New groups: ${data.daily.groups} (${data.general.groups})
  calls: ${data.daily.calls} (${data.general.calls})
  matchs: ${data.daily.matchs} (${data.general.matchs})`;
  bot.push(process.env.TEST_LINE_ID, msg);

  resetDaily();
});


const linebotParser = bot.parser();
app.post('/webhook', linebotParser);


if (process.env.ENVIRONMENT === 'test') {
  app.listen(3000, () => {
    // bot.push(process.env.TEST_LINE_ID,  JSON.parse(fs.readFileSync('./json/presentation-msg.json')));

    // getCardUtil('((sol ring)) ((anneau solaire)) ((sol ring@alpha))')
    //   .then((answer) => {
    //     // console.log(JSON.stringify(answer, null, 2));
    //     bot.push(process.env.TEST_LINE_ID, answer);
    //   });

    // getSpoilersUtil()
    //   .then((messageList) => {
    //     if (process.env.ENVIRONMENT === 'production') {
    //       bot.broadcast(messageList);
    //     }
    //     if (process.env.ENVIRONMENT === 'test') {
    //       bot.push(process.env.TEST_LINE_ID, messageList);
    //     }
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
  });
}
if (process.env.ENVIRONMENT === 'production') {
  const options = {
    key: fs.readFileSync('encryption/privkey.pem', 'utf8'),
    cert: fs.readFileSync('encryption/fullchain.pem', 'utf8')
  };
  const server = https.createServer(options, app);
  server.listen(8443, () => {
    console.log('server started');
  });
}
