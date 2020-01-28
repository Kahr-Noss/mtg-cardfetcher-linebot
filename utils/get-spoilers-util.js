const request = require('request-promise');
const querystring = require("querystring");
const fs = require('fs');

const { getCardMessage, compileCardMessages } = require('../line/create-card-message');

function getLastSpoilers() {
  const data = JSON.parse(fs.readFileSync('./data/spoilers.json'));
  if (!data.set){
    return Promise.reject('No set currently spoiled');
  }
  const search = {
    q: `set:${data.set}`,
    format: 'json',
    order: 'spoiled'
  }
  // get the cards from specified set in spoiled order
  return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search)}`)
    .then((setDataJSON) => {
      const setData = JSON.parse(setDataJSON);

      // get the index of the last announced spoiled card
      const lastIndex = setData.data.findIndex((card) => card.id === data.last_card_id);
      if (lastIndex === 0) {
        return Promise.reject('No new card published');
      }
      // save the new last card ID
      fs.writeFileSync('./data/spoilers.json', JSON.stringify({
        set: data.set,
        last_card_id: setData.data[0].id
      }, null, 2));
      
      if (lastIndex === -1) {
      return Promise.all(setData.data.map((card) => getCardMessage(card, true)));
      }
      // send the subarray of the new cards spoiled since last chack
      return Promise.all(setData.data.slice(0, lastIndex).map((card) => getCardMessage(card, true)));
    })
    .then((cardList) => {
      return compileCardMessages('New spoilers!', cardList);
    });
}

module.exports = getLastSpoilers;
