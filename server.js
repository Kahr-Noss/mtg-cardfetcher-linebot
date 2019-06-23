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

bot.on('follow', function (event) {
  const answerEn = `Hello!!
I'm a Magic the Gathering card fetcher bot. Just ask me any card name and I'll show it for you.
You can add me to a LINE discussion group about Magic, and I'll make your conversation easier to understant for everyone by showing the card you are talking about.
No more need to copy paste the card by yourself.

Just write the name of a card in double parenthesis like this :
((sol ring))

If you want a special set version, you can specify it's code (usually 3 letters) it with @ :
((sol ring @ alpha))

You can also specify multiple cards in one message, and mix them in setences:

"Did you see the combo with ((kiki jiki)) and ((zealous conscripts)) ? That's nuts."

I work the best in English, where I can match a card even if you don't write the full name as long as it's not ambiguous.
I also can search in any other language, but the name has to be the exact one.

If I match more than one card or no card, I won't answer anything, so check if your input is correct.

Also, during spoiler season, I'll notify you with the last spoiled card as they are revealed.

I hope I'll be helpful to you! `
  event.reply(answerEn);

  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  fs.writeFileSync('./data/stats.json', JSON.stringify({
    daily: {
      ...data.daily,
      friends: data.daily.friends + 1
    },
    general: {
      ...data.general,
      friends: data.general.friends + 1
    }
  }, null, 2));
});

bot.on('join', function (event) {
  const answerEn = `Hello!!
I'm a Magic the Gathering card fetcher bot. Just ask me any card name and I'll show it for you.
You can add me to a LINE discussion group about Magic, and I'll make your conversation easier to understant for everyone by showing the card you are talking about.
No more need to copy paste the card by yourself.

Just write the name of a card in double parenthesis like this :
((sol ring))

If you want a special set version, you can specify it's code (usually 3 letters) it with @ :
((sol ring @ alpha))

You can also specify multiple cards in one message, and mix them in setences:

"Did you see the combo with ((kiki jiki)) and ((zealous conscripts)) ? That's nuts."

I work the best in English, where I can match a card even if you don't write the full name as long as it's not ambiguous.
I also can search in any other language, but the name has to be the exact one.

If I match more than one card or no card, I won't answer anything, so check if your input is correct.

Also, during spoiler season, I'll notify you with the last spoiled card as they are revealed.

I hope I'll be helpful to you! `
  event.reply(answerEn);

  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  fs.writeFileSync('./data/stats.json', JSON.stringify({
    daily: {
      ...data.daily,
      groups: data.daily.groups + 1
    },
    general: {
      ...data.general,
      groups: data.general.groups + 1
    }
  }, null, 2));
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

  fs.writeFileSync('./data/stats.json', JSON.stringify({
    ...data,
    daily: {
      friends: 0,
      groups: 0,
      calls: 0,
      matchs: 0
    }
  }, null, 2));
  bot.push(process.env.TEST_LINE_ID, msg);
});


const linebotParser = bot.parser();
app.post('/webhook', linebotParser);


if (process.env.ENVIRONMENT === 'test') {
  app.listen(3000, () => {
    // getCardUtil('((sol ring)) ((anneau solaire)) ((sol ring@alpha))')
    //   .then((answer) => {
    //     console.log(JSON.stringify(answer, null, 2));
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
