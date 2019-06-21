const shiritori = require('./shiritori/shiritori.js');
const NodeWebcam = require("node-webcam");
const async = require('async');
require('dotenv').config();
const Promise = require('promise');
const request = require('request');
const querystring = require('querystring');
const express = require('express');
const builder = require('botbuilder');
const bodyParser = require('body-parser');
const https = require('https');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cron = require('node-cron');
const SerialPort = require('serialport');
const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 9600
});
let serialLog = "";
const bot = new builder.UniversalBot();
const lineOptions = {
  channelSecret: "60274678ddbd1d00e41e351987536b16",
  channelAccessToken: "gIvd9PBtbdlcLzGgPyGxLeaEHtgtVYMkm7aeRTvfJxZbRHMJiSE134xEp0vPtKRINCvdtxWAFP9736co4QNurG2Bj2ByTJD7XxdI/YeylrM6nrC5yf6SGS5RgG/H27yEKK5pXo4vdCrlAZTH4fv2NAdB04t89/1O/w1cDnyilFU=",
  debug: false // Switch to true for a bunch of console spam
};
const lineConnector = require("botbuilder-line")(lineOptions);
const clientLine = require('@line/bot-sdk').Client;
const clientPush = new clientLine(lineOptions);
bot.connector("directline", lineConnector);
var app = express();
const options = {
  key: fs.readFileSync('encryption/privkey.pem'),
  cert: fs.readFileSync('encryption/fullchain.pem')
};
const server = https.createServer(options, app);
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json({ type: "*/*" }));

app.post('/webhook', lineConnector.listen);



bot.dialog('/', function (session) {
  session.userData = getUserData(session.message.address.user.id);
  if (!session.userData) {
    session.endDialog('Fuck off');
  } else {
    analyzeInput(session.message.text).then((data) => {
      console.log(JSON.stringify(data, null, 2));
      switch (data.topScoringIntent.intent) {
        case 'greetings': {
          session.beginDialog('greetings');
          break;
        }
        case 'play shiritori': {
          session.beginDialog('play shiritori');
          break;
        }
        case 'check balance': {
          session.beginDialog('check balance');
          break;
        }
        case 'add expense': {
          let entities = {};
          if (data.entities.find((ent) => (ent.type === 'name' && ent.startIndex < 3))) {
            entities.payer = data.entities.find((ent) => (ent.type === 'name' && ent.startIndex < 3)).entity;
            if (/^i$/i.test(entities.payer)) {
              entities.payer = session.userData.name;
            }
          }
          if (data.entities.find((ent) => ent.type === 'builtin.currency')) {
            entities.amount = parseInt(data.entities.find((ent) => ent.type === 'builtin.currency').resolution.value, 10);
          }
          if (data.entities.find((ent) => ent.type === 'builtin.currency')) {
            entities.currency = data.entities.find((ent) => ent.type === 'builtin.currency').resolution.isoCurrency;
          }
          if (data.entities.find((ent) => ent.type === 'category')) {
            entities.category = capitalizeFirstLetter(data.entities.find((ent) => ent.type === 'category').entity);
          }
          if (data.entities.find((ent) => (ent.type === 'name' && ent.startIndex > 5))) {
            let receiver = data.entities.find((ent) => (ent.type === 'name' && ent.startIndex > 5)).entity;
            if (/^us$/i.test(receiver)) {
              entities.receiver = ['Ai', 'Maxime'];
            } else if (/^me$/i.test(receiver)) {
              entities.receiver = [session.userData.name];
            } else {
              entities.receiver = [capitalizeFirstLetter(receiver)];
            }
          }
          console.log(entities);
          session.beginDialog('add expense', entities);
          break;
        }
        default: {
          session.beginDialog('misunderstood');
          break;
        }
      }
    }).catch((err) => {
      session.beginDialog('misunderstood');
    });
  }
});

bot.dialog('greetings', [
  function (session) {
    session.send(`Hello ${session.userData.name}! What can I do to help you?`)
    session.beginDialog('menu');
  }]
);

bot.dialog('menu', [
  function (session) {
    delete session.conversationData.expense;
    builder.Prompts.choice(session, 'Select an action', ["Add expense", "Check balance", "Play shiritori", "Check appartment"], { listStyle: builder.ListStyle.button });
  },
  function (session, results) {
    switch (results.response.index) {
      case 0: {
        session.beginDialog('add expense');
        break;
      }
      case 1: {
        session.beginDialog('check balance');
        break;
      }
      case 2: {
        session.beginDialog('play shiritori');
        break;
      }
      case 3: {
        session.beginDialog('check appartment');
        break;
      }
    }
  }
]).triggerAction({
  matches: /^menu$/i,
  confirmPrompt: "Are you sure you want to stop what you are doing?"
});;

bot.dialog('todo', [
  function (session) {
    session.endDialog('This feature hasn\'t been developed yet');
  }
]);

bot.dialog('misunderstood', [
  function (session) {
    session.endDialog('I\'m sorry, I didn\'t understand what you just said');
  }
]);

bot.dialog('add expense', [
  function (session, args, next) {
    console.log(args);
    console.log("dialog 1");
    if (!session.conversationData.expense) {
      session.conversationData.expense = args || {};
    }
    if (session.conversationData.expense.amount) {
      next();
    } else {
      builder.Prompts.text(session, "How much did you paid?");
    }
  },
  function (session, results, next) {
    console.log("dialog 2");
    if (!session.conversationData.expense.amount && !/(€|¥)?\s*([\uff10-\uff190-9]+)\s*(yens?|euros?|円|€)?/.test(results.response)) {
      session.send("I'm sorry I didn't understand");
      session.replaceDialog("add expense", { reprompt: true });
    } else {
      if (results.response) {
        session.conversationData.expense.currency = 'JPY';
        if (/(euros?|€)/i.test(results.response)) {
          session.conversationData.expense.currency = 'EUR';
        }
        session.conversationData.expense.amount = parseInt(results.response, 10);
      }
      if (session.conversationData.expense.payer) {
        if (/^i$/i.test(session.conversationData.expense.payer)) {
          session.conversationData.expense.payer = session.userData.name;
        }
        next();
      } else {
        builder.Prompts.choice(session, `Who paid for it?`, ['Ai', 'Maxime'], { listStyle: builder.ListStyle.button });
      }
    }
  },
  function (session, results, next) {
    console.log("dialog 3");
    if (results.response && results.response.entity) {
      session.conversationData.expense.payer = results.response.entity;
    }
    if (session.conversationData.expense.category) {
      next();
    } else {
      builder.Prompts.text(session, `For what did you paid?`);
    }
  },
  function (session, results, next) {
    console.log("dialog 4");
    if (results.response) {
      session.conversationData.expense.category = capitalizeFirstLetter(results.response);
    }
    if (session.conversationData.expense.receiver) {
      next();
    } else {
      let receivers = {
        "For both of us": ['Ai', 'Maxime']
      }
      receivers[`For ${session.conversationData.expense.payer === 'Ai' ? 'Maxime' : 'Ai'}`] = session.conversationData.expense.payer === 'Ai' ? ['Maxime'] : ['Ai'];
      session.conversationData.receivers = receivers;
      builder.Prompts.choice(session, `Did ${session.conversationData.expense.payer === session.userData.name ? 'you' : session.conversationData.expense.payer} paid it for both of you or just for ${session.conversationData.expense.payer === 'Ai' ? 'Maxime' : 'Ai'}?`, receivers, { listStyle: builder.ListStyle.button });
    }
  },
  function (session, results, next) {
    console.log("dialog 5");
    if (results.response && results.response.entity) {
      session.conversationData.expense.receiver = session.conversationData.receivers[results.response.entity];
    }
    let expense = session.conversationData.expense;
    let msg = `Can you confirm:\n${expense.payer} paid ${expense.amount}${expense.currency === 'EUR' ? '€' : '¥'} for ${expense.category.toLowerCase()} for ${expense.receiver.length === 2 ? 'both of you' : expense.receiver[0]}`;
    builder.Prompts.confirm(session, msg);
  },
  function (session, results, next) {
    console.log("dialog 6");
    if (results.response) {
      let expense = session.conversationData.expense;
      expense.date = moment().tz("Asia/Tokyo");
      const usersData = JSON.parse(fs.readFileSync('data/usersData.json', 'utf8'));
      usersData.expenses.push(expense);
      fs.writeFileSync('data/usersData.json', JSON.stringify(usersData, null, 2));
      session.conversationData.expense = {};
      session.endDialog("Expense added!");
      // send a notification to the other user
      let otherMsg = `${session.userData.name} add the following expense:\n${expense.payer} paid ${expense.amount}${expense.currency === 'EUR' ? '€' : '¥'} for ${expense.category.toLowerCase()} for ${expense.receiver.length === 2 ? 'both of you' : expense.receiver[0]}`;
      clientPush.pushMessage(session.userData.otherUser, { type: 'text', text: otherMsg });
    } else {
      builder.Prompts.confirm(session, 'Do you want to start again?');
    }
  },
  function (session, results, next) {
    console.log("dialog 7");
    session.conversationData.expense = {};
    if (results.response) {
      session.send("Let's restart from zero.");
      session.replaceDialog("add expense");
    } else {
      session.endDialog("OK, operation cancelled.");
    }
  }
]).cancelAction('cancelAction', 'Ok, I cancel this operation.', {
  matches: /nevermind|cancel|stop/i,
  confirmPrompt: "Are you sure you want to cancel?"
});

bot.dialog('check balance', [
  function (session) {
    let msg = createBalanceMessage(getBalance(), session.userData.name);
    session.endDialog(msg);
  }
]);

bot.dialog('play shiritori', [
  function (session) {
    session.send("Let's play!\nI'm starting...");
    session.beginDialog('shiritoriTurn');
  },
  function (session, results) {
    session.send(`We made a chain of ${session.conversationData.shiritori.length} words.`);
    session.conversationData.shiritori = [];
    builder.Prompts.confirm(session, "Do you want to play again?");
  },
  function (session, results) {
    if (results.response) {
      session.replaceDialog("play shiritori");
    } else {
      session.endDialog("OK, next time then!");
    }
  }
]);

bot.dialog('shiritoriTurn', [
  // the bot find a word
  function (session, args) {
    if (!(args && args.reprompt)) {
      //if it's the first turn
      session.conversationData.shiritori = [];
    }
    shiritori.findNextWord(session.conversationData.shiritori, { lvl: session.userData.shiritori.lvl }, (resultFind) => {
      if (resultFind.status === 'lost') {
        session.endDialog(resultFind.msg);
      } else {
        session.conversationData.shiritori.push(resultFind.foundWord);
        let msg;
        if (resultFind.foundWord.word) {
          msg = `${resultFind.foundWord.word} (${resultFind.foundWord.reading})\n${resultFind.foundWord.meaning}`;
        } else {
          msg = `${resultFind.foundWord.reading}\n${resultFind.foundWord.meaning}`;
        }
        builder.Prompts.text(session, msg);
      }
    });
  },
  // analysis of the player answer
  function (session, results) {
    shiritori.checkPlayerAnswer(results.response, session.conversationData.shiritori, (resultCheck) => {
      if (resultCheck.status === 'lost') {
        session.endDialog(resultCheck.msg);
      } else if (resultCheck.status === 'confirmation') {
        let wordList = {};
        resultCheck.wordsFound.forEach((w) => {
          wordList[w.word ? `${w.word} (${w.reading})` : w.reading] = w;
        });
        session.conversationData.wordList = wordList;
        builder.Prompts.choice(session, `Please select which word you want to say.`, wordList, { listStyle: builder.ListStyle.button });
      } else {
        session.conversationData.shiritori.push(resultCheck.playerWord);
        session.replaceDialog("shiritoriTurn", { reprompt: true }); // Repeat turn        
      }
    });
  },
  // asking for precision if multiple meanings
  function (session, results) {
    let word = session.conversationData.wordList[results.response.entity];
    if (word) {
      session.conversationData.shiritori.push(word);
      session.replaceDialog("shiritoriTurn", { reprompt: true });
    } else {
      session.endDialog('It seems you don\'t want to play anymore...');
    }
  }
]).cancelAction('cancelAction', 'OK, next time then!', {
  matches: /cancel|stop/i,
  confirmPrompt: "Are you sure you want to cancel this game?"
});

bot.dialog('check appartment', [
  function (session) {
    sendPicture(session.message.address.user.id);
    session.endDialog("I'll send you the picture soon.");
  }
]);

function getUserData(id) {
  const usersData = JSON.parse(fs.readFileSync('data/usersData.json', 'utf8'));
  return usersData.users[id];
}

const analyzeInput = (input) => {
  return new Promise((resolve, reject) => {
    const endpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/';
    const luisAppId = '72f76c82-a210-4acf-af52-b671fcea85e1';
    const queryParams = {
      "subscription-key": "62d11289762045bd9ba80102822cdca0",
      "timezoneOffset": "0",
      "verbose": true,
      "q": input
    }
    const luisRequest = `${endpoint}${luisAppId}?${querystring.stringify(queryParams)}`;
    request(luisRequest, (err, response, body) => {
      if (err)
        reject(err);
      else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function getBalance() {
  const usersData = JSON.parse(fs.readFileSync('data/usersData.json', 'utf8'));
  let total = {
    EUR: {
      Maxime: 0,
      Ai: 0
    },
    JPY: {
      Maxime: 0,
      Ai: 0
    }
  };
  usersData.expenses.forEach((exp) => {
    total[exp.currency][exp.payer] -= exp.amount;
    exp.receiver.forEach((rec) => {
      total[exp.currency][rec] += exp.amount / exp.receiver.length;
    });
  });
  return total;
}

function createBalanceMessage(balance, user) {
  let msg;
  Object.keys(balance).forEach((currency) => {
    if (balance[currency].Ai > balance[currency].Maxime) {
      msg = `Ai owes ${balance[currency].Ai}${currency} to Maxime\n`;
    } else {
      msg = `Maxime owes ${balance[currency].Maxime}${currency} to Ai\n`;
    }
  });
  return msg;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function sendPicture(id) {
  const Webcam = NodeWebcam.create();
  let asyncFunctions = [];
  Webcam.list(function (list) {
    counter = 1;
    list.forEach((webcamName) => {
      asyncFunctions.push((callbackAsync) => {
        NodeWebcam.capture(`./public/picture_${counter}.jpg`, { device: webcamName }, function (err, data) {
              console.log(`Picture_${counter}`);
              counter++;
              callbackAsync();
        });
      });
    });
    async.series(asyncFunctions, () => {
      console.log('picture taken');
      let imageMsg = {
        "type": "image",
        "originalContentUrl": "https://aicollo.kahr-noss.com/picture_1.jpg",
        "previewImageUrl": "https://aicollo.kahr-noss.com/mini.png"
      }
      clientPush
      .pushMessage(id, imageMsg) 
      .catch((err) => {
        if (err) {
          console.error(err);
        }
      });;      
    });
  });
}

/*   ++++++++++++++ SERIAL PORT ++++++++++++++++*/
// Open errors will be emitted as an error event
port.on('error', function (err) {
  console.log('Error: ', err.message);
  serialLog = `${serialLog}
  ${err.message}`;
})

// Read the data
port.on('data', function (data) {
  const retMsg =  data.toString();
  console.log('Data:', retMsg);
  serialLog = `${serialLog}
  ${retMsg}`;
});


function switchRelay(msg) {
  port.write(msg, function (err) {
    if (err) {
      console.log(err);
      serialLog = `${serialLog}
      ${err}`;
    } else {
      console.log(`message sent : ${msg}`);
      serialLog = `${serialLog}
      message sent : ${msg}`;
    }
  });
}

// launch watering every day at eight
cron.schedule('0 0 * * *', function(){
  const usersData = JSON.parse(fs.readFileSync('data/usersData.json', 'utf8'));
  const valvesSeq = JSON.parse(fs.readFileSync('data/watering_times.json', 'utf8'));
  Object.keys(usersData.users).forEach((user) => {
    clientPush.pushMessage(user, { type: 'text', text: `Start watering\n${serialLog}` });
  });
  serialLog = "";
  setTimeout(() => {
    let time = 0;
    valvesSeq.forEach((valve) => {
      setTimeout(() => {switchRelay(`WS~`)}, time); // stop all relays
      time += 3000;
      setTimeout(() => {switchRelay(`W${valve[0]}~WA2~`)}, time); // open valve and restart pump
      time += valve[1] * 1000;
    });
    setTimeout(() => {switchRelay('WS')}, time);  // stop everything
    time += 3000;
    setTimeout(() => {switchRelay('W12~W2~W7~W6~W5~W4~WA5~WA3~WA4~')}, time);  // open  every valve
    time += 20000;
    setTimeout(() => {
      switchRelay('WS')
      Object.keys(usersData.users).forEach((user) => {
        clientPush.pushMessage(user, { type: 'text', text: `Watering completed\n${serialLog}` });
      });
    }, time);  // stop everything
  }, 2000);


});

server.listen(8443);
console.log('Server started');
