const request = require('request-promise');
const querystring = require('querystring');

const { saveStats } = require('./save-stats');

function parseCardObject(card) {
  // get the two faces of the card if it's a double faced card
  const cardFacesList = card.card_faces ? card.card_faces.filter((c) => c.image_uris) : [];
  const cardList = [...(cardFacesList.length > 0 ? cardFacesList : [card])];

  // if there are related cards, send them
  return Promise.all((card.all_parts || [])
  // remove present card, tokens and emblems from the list
    .filter((c) => c.id !== card.id && c.component !== 'token' && !c.type_line.match(/^Emblem/))
    .map((c) => request.get(c.uri).then((relatedCardJSON) => JSON.parse(relatedCardJSON))))
    .then((relatedCards) => [...cardList, ...relatedCards].map((c) => ({
      imageUrl: c.image_uris.normal,
      name: c.name,
      mana_cost: c.mana_cost,
      type_line: c.type_line,
      oracle_text: c.oracle_text,
      power: c.power,
      toughness: c.toughness,
      loyalty: c.loyalty,
      relatedCards: c.name === card.name ? null : card.name,
    })));
}


function matchCards(message) {
  // check if the card name pattern has been inputed  (( card name ))
  const nameList = message.match(/\(\([^)]+\)\)/g);
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
        set: set ? set.trim() : '',
      };
      return request.get(`https://api.scryfall.com/cards/named?${querystring.stringify(search)}`)
        .then((cardDataJSON) => {
          saveStats('matchs', 1);
          return parseCardObject(JSON.parse(cardDataJSON));
        })
        .catch(() => {
          console.log(`${name} => No unique card found, trying other languages`);
          // if nothing matched in english, try other languages
          const search2 = {
            q: `"${name.trim()}" ${set ? `set:${set}` : ''}`,
            include_multilingual: true,
            format: 'json',
          };
          return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search2)}`)
            .then((resultJSON) => {
              const result = JSON.parse(resultJSON);
              if (result.total_cards === 1) {
                saveStats('matchs', 1);
                return parseCardObject(JSON.parse(result.data[0]));
              }
              throw new Error(`${result.total_cards} cards found in another language`);
            })
            .catch(() => {
              console.log('No unique card found in another language');
              return [];
            });
        });
    }
    return [];
  }))
    .then((CardArrayList) => {
      const cardURLList = [];
      return CardArrayList.reduce((buffer, cardArray) => [...buffer, ...cardArray], [])
      // remove duplicates
        .filter((c) => {
          if (cardURLList.indexOf(c.imageUrl) === -1) {
            cardURLList.push(c.imageUrl);
            return true;
          }
          return false;
        });
    });
}

module.exports = matchCards;
