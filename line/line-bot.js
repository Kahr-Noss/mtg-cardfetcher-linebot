const fs = require("fs");
const line = require("@line/bot-sdk");
const cron = require("node-cron");

const matchCardsUtil = require("../utils/match-cards-util");
const getSpoilersUtil = require("../utils/get-spoilers-util");
const { saveStats, resetDaily } = require("../utils/save-stats");
const compileCardMessages = require('./compile-messages');
const createMessage = require('./create-card-message');
const lineConfig = {
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new line.Client(lineConfig);

function handleEvent(event) {
  if (event.type === "message" && event.message.type === "text") {
    // test webhook from line
    if (event.replyToken === "00000000000000000000000000000000") {
      console.log("webhook test");
      return Promise.resolve(null);
    }

    // the event is a text message
    return matchCardsUtil(event.message.text)
      .then((cardList) => {
        if(cardList.length === 0){
          throw new Error('No card matched');
        }
        return compileCardMessages('Cards displayed', cardList.map((card) => createMessage(card, false) ));
      })
      .then((answer) => {
        console.log(JSON.stringify(answer, null, 2));
        return client.replyMessage(event.replyToken, answer);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  if (event.type === "follow") {
    saveStats("friends", 1);
    return client.replyMessage(event.replyToken, JSON.parse(fs.readFileSync("./json/presentation-msg.json")));
  }

  if (event.type === "join") {
    saveStats("groups", 1);
    return client.replyMessage(event.replyToken, JSON.parse(fs.readFileSync("./json/presentation-msg.json")));
  }

  // ignore non-text-message event
  return Promise.resolve(null);
}



// check the spoilers every 5 min
cron.schedule('0 8 * * *', () => {
  console.log('Checking new spoilers...')
  getSpoilersUtil()
    .then((messageList) => {
      if(messageList.length === 0){
        return null;
      }
      if (process.env.ENVIRONMENT === 'production') {
        return client.broadcast(messageList);
      }
      if (process.env.ENVIRONMENT === 'test') {
        return client.pushMessage(process.env.TEST_LINE_ID, messageList);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// send stats every morning and reset stats
cron.schedule('0 0 * * 0', () => {
  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  const msg = `Here are today stats:
  New friends: ${data.daily.friends} (${data.general.friends})
  New groups: ${data.daily.groups} (${data.general.groups})
  calls: ${data.daily.calls} (${data.general.calls})
  matchs: ${data.daily.matchs} (${data.general.matchs})`;
  console.log('sending msg')
  client.pushMessage(process.env.TEST_LINE_ID, {type:'text', text:msg})
  .catch(console.log)

  resetDaily();
});

function lineBot(req, res) {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(console.log);
}

module.exports = lineBot;
