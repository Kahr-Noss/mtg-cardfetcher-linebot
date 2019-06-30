const request = require('request-promise');
const querystring = require("querystring");

const { getCardMessage, compileCardMessages } = require('./create-card-message');
const { saveStats } = require('./save-stats');


function getCard(message) {
  // check if the card name pattern has been inputed  (( card name ))
  const nameList = message.match(/\(\([^\)]*\)\)/g);
  if (!nameList) {
    return Promise.reject('No pattern detected');
  }
  saveStats('calls', nameList.length);

  return Promise.all(nameList.map((card) => {
    const cardCleaned = card.replace(/(\(|\))/g, '').trim();

    // check if an extension is specified
    const [match, name, set] = /^([^@]*)@?(.*)?$/.exec(cardCleaned);
    console.log(`${name}  (${set})`);

    if (name) {
      const search = {
        fuzzy: name.trim(),
        format: 'json',
        set: set ? set.trim() : ''
      };
      return request.get(`https://api.scryfall.com/cards/named?${querystring.stringify(search)}`)
        .then((cardDataJSON) => {
          saveStats('matchs', 1);
          return getCardMessage(JSON.parse(cardDataJSON), false);
        })
        .catch((err) => {
          console.log(`${name} => No unique card found, trying other languages`);
          // if nothing matched in english, try other languages
          const search = {
            q: `"${name.trim()}" ${set ? `set:${set}` : ''}`,
            include_multilingual: true,
            format: 'json'
          };
          return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search)}`)
            .then((resultJSON) => {
              const result = JSON.parse(resultJSON);
              if (result.total_cards === 1) {
                saveStats('matchs', 1);
                return getCardMessage(JSON.parse(result.data[0]), true);
              }
              throw new Error(`${result.total_cards} cards found in another language`);
            })
            .catch((err) => {
              console.log('No unique card found in another language');
              return null;
            });
        });
    }
    return null;
  }))
    .then((cardList) => compileCardMessages('Cards displayed', cardList));
}

module.exports = getCard;
