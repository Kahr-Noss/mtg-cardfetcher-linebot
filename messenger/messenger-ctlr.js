const express = require('express');
const path = require('path');
const axios = require('axios');
const matchCardsUtil = require('../utils/match-cards-util');

const router = express.Router();

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

const privacyPolicy = (req, res) => {
  console.log('Privacy policy');
  res.sendFile(path.join(`${__dirname}/privacyPolicy.html`));
};

const getMessage = (req, res) => {
  const event = req.body.entry[0].messaging[0];
  const senderId = event.sender.id;
  const message = event.message.text;

  if (!message) {
    return res.sendStatus(200);
  }

  return matchCardsUtil(message)
    .then((cardList) => cardList.reduce((promiseChain, card) => promiseChain.then(() => axios.post(
      `https://graph.facebook.com/v2.6/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
      {
        recipient: {
          id: senderId,
        },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: card.imageUrl,
              is_reusable: true,
            },
          },
        },
      },
    )), Promise.resolve()))
    .then(() => {
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      return res.sendStatus(200);
    });
};

router.get('/privacy-policy', privacyPolicy);
router.get('/webhook', verifyWebhook);
router.post('/webhook', getMessage);


module.exports = router;
