
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const getCardUtil = require('../utils/get-card-util');
const getSpoilersUtil = require('../utils/get-spoilers-util');
const { saveStats, resetDaily } = require('../utils/save-stats');

const lineConfig = {
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new line.Client(lineConfig);

// bot.on('message', function (event) {
//   const message = event.message.text;
//   if (message) {
//     getCardUtil(message)
//       .then((answer) => {
//         console.log(JSON.stringify(answer, null, 2));
//         event.reply(answer);
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }
// });

// bot.on('follow', function (event) {
//   event.reply(JSON.parse(fs.readFileSync('./json/presentation-msg.json')));
//   saveStats('friends', 1);
// });

// bot.on('join', function (event) {
//   event.reply(JSON.parse(fs.readFileSync('./json/presentation-msg.json')));
//   saveStats('groups', 1);
// });

// // check the spoilers every 5 min
// cron.schedule('0 8 * * *', () => {
//   console.log('Checking new spoilers...')
//   getSpoilersUtil()
//     .then((messageList) => {
//       console.log(messageList);
//       if (process.env.ENVIRONMENT === 'production') {
//         bot.broadcast(messageList);
//       }
//       if (process.env.ENVIRONMENT === 'test') {
//         bot.push(process.env.TEST_LINE_ID, messageList);
//       }
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// });


// // send stats every morning and reset stats
// cron.schedule('0 0 * * *', () => {
//   const data = JSON.parse(fs.readFileSync('./data/stats.json'));
//   const msg = `Here are today stats:
//   New friends: ${data.daily.friends} (${data.general.friends})
//   New groups: ${data.daily.groups} (${data.general.groups})
//   calls: ${data.daily.calls} (${data.general.calls})
//   matchs: ${data.daily.matchs} (${data.general.matchs})`;
//   bot.push(process.env.TEST_LINE_ID, msg);

//   resetDaily();
// });
function handleEvent(event){
  console.log(event);
  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('PLOP SKIP THIS SHIT')
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create a echoing text message
  const echo = { type: 'text', text: event.message.text };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

function lineBot(req,res){
  Promise
  .all(req.body.events.map(handleEvent))
  .then((result) => res.json(result))
  .catch((err) => {
    console.log(err);
    res.json({});
  });
}

module.exports = lineBot;
