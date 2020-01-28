require('dotenv').config();
const express = require('express');
const path = require('path');
const lineMiddleware = require('@line/bot-sdk').middleware
const https = require('https');
const fs = require('fs');

const lineBot = require('./line/line-bot');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const lineConfig = {
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

app.post('/line/webhook', lineMiddleware(lineConfig), lineBot);


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
