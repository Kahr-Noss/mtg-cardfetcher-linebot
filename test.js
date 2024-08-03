const matchCardsUtil = require('./utils/match-cards-util');

matchCardsUtil('((Grothama))')
  .then((result) => {
    console.log('result');
    console.log(result);
  })
  .catch((err) => {
    console.log('error');
    console.log(err);
  });
