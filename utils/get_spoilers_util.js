const request = require('request-promise');
const querystring = require("querystring");
const fs = require('fs');

const { getCardMessage, compileCardMessages } = require('./create-card-message');

function getLastSpoilers(set) {
  if (!set) {
    return Promise.reject();
  }

  const search = {
    q: `set:${set}`,
    format: 'json',
    order: 'spoiled'
  }
  const spoilerData = JSON.parse(fs.readFileSync('./data/spoilers.json'));
  console.log(spoilerData);
  // get the cards from specified set in spoiled order
  return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search)}`)
    .then((setDataJSON) => {
      const setData = JSON.parse(setDataJSON);

      // get the index of the last announced spoiled card
      const lastIndex = setData.data.findIndex((card) => card.id === spoilerData.last_card_id);
      if (lastIndex === -1) {
        return Promise.reject('last card not found');
      }
      if (lastIndex === 0) {
        return Promise.reject('No new card published');
      }
      // save the new last card ID
      fs.writeFileSync('./data/spoilers.json', JSON.stringify({ ...spoilerData, last_card_id: setData.data[0].id }, null, 2));

      // send the subarray of the new cards spoiled since last chack
      return Promise.all(setData.data.slice(0, lastIndex).map((card) => getCardMessage(card, true)));
    })
    .then((cardList) => {
      return compileCardMessages('New spoilers!', cardList);
    });
}

module.exports = getLastSpoilers;
