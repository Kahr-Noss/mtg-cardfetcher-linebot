const path = require('path');
const linebot = require('linebot');
const express = require('express');
const https = require('https');
const fs = require('fs');
const cron = require('node-cron');

const getCardUtil = require('./utils/get_card_util');
const getSpoilersUtil = require('./utils/get_spoilers_util');

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

// check the spoilers every 5 min
cron.schedule('*/5 * * * *', () => {
  console.log('Checking new spoilers...')
  getSpoilersUtil('m20')
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



const linebotParser = bot.parser();
app.post('/webhook', linebotParser);


if (process.env.ENVIRONMENT === 'test') {
  app.listen(3000, () => {
    getCardUtil('((ajani tyrant))')
      .then((answer) => {
        console.log(JSON.stringify(answer, null, 2));
        bot.push(process.env.TEST_LINE_ID, answer);
      })
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
