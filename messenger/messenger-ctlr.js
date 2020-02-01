const express = require("express");
const path = require("path");
const axios = require('axios');
// const {  FacebookMessagingAPIClient,  FacebookMessageParser,  ValidateWebhook} = require("fb-messenger-bot-api");

const router = express.Router();
// const messagingClient = new FacebookMessagingAPIClient(
//   process.env.PAGE_ACCESS_TOKEN
// );

const privacyPolicy = (req, res) => {
  console.log("Privacy policy");
  res.sendFile(path.join(__dirname + "/privacyPolicy.html"));
};

// const getMessage = (req, res) => {
//   console.log("PLOP MESG");

//   const incomingMessages = FacebookMessageParser.parsePayload(req.body);
//   console.log(incomingMessages);
//   // the incommingmessages are an array
//   const senderId = incomingMessages[0].sender.id;

//   //promise based reaction on message send confirmation
//   messagingClient.sendImageMessage(senderId,"https://img.scryfall.com/cards/large/front/a/4/a4227afa-780b-4755-9b61-46255717c6be.jpg?1579203420")
//     .then(result => {
//       console.log(`Result sent with: ${result}`);
//       return res.sendStatus(200);
//     })
//     .catch(err => {
//       console.log(err);
//       return res.sendStatus(200);
//     });
// };

const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = 'mtgcrdftchrtkn';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
      res.sendStatus(200);
    }
};

const getMessage = (req, res) => {
console.log('new message');
console.log(JSON.stringify(req.body,null,2));

const senderId = req.body.entry[0].messaging[0].sender.id;
console.log(senderId)


axios.post(`https://graph.facebook.com/v2.6/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}` ,{
  "recipient":{
    "id":senderId
  },
  "message":{
    "attachment":{
      "type":"image", 
      "payload":{
        "url":"https://img.scryfall.com/cards/large/front/a/4/a4227afa-780b-4755-9b61-46255717c6be.jpg?1579203420", 
        "is_reusable":true
      }
    }
  }

})
.then(() => {
  res.sendStatus(200);
})
    .catch((err) => {
      console.log(err);
      return res.sendStatus(200);
    });

};

router.get("/webhook", verifyWebhook);
// router.get("/webhook", (req, res) =>  ValidateWebhook.validateServer(req, res, "mtgcrdftchrtkn"));
router.get("/privacy-policy", privacyPolicy);
router.post(  "/webhook",  (req, res, next) => {    console.log("plop test");   next();  },  getMessage);
module.exports = router;
