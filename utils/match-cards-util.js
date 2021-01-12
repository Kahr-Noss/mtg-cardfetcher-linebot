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
    })));
}

function getFrameVersionOfCard(card, options) {
  // if no frame specified return default
  if (!options.frame && !options.fullart) {
    return card;
  }
  // if a frame has been specified, try to query that frame specifically
  const search = {
    q: `!"${card.name}" unique:cards ${options.set ? `set:${options.set}` : ''} ${options.frame ? `frame:${options.frame}` : ''} ${options.fullart ? 'is:fullart' : ''}`,
    format: 'json',
  };

  return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search)}`)
    .then((resultJSON) => {
      const result = JSON.parse(resultJSON);
      if (result.total_cards !== 0) {
        return result.data[0];
      }
      throw new Error('No card found with this frame');
    });
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
    const [match, name, params] = /^([^@]*)@?(.*)?$/.exec(cardCleaned);

    // check if a frame is specified
    const options = {
      set: params,
    };

    if (params && params.match(/showcase/i)) {
      options.frame = 'showcase';
      options.set = options.set.replace('showcase', '').trim();
    }
    if (params && params.match(/(extended|extended\s*art)/i)) {
      options.frame = 'extendedart';
      options.set = options.set.replace(/(extended|extended\s*art)/i, '').trim();
    }
    if (params && params.match(/(fullart|full\s*art)/i)) {
      options.fullart = true;
      options.set = options.set.replace(/(fullart|full\s*art)/i, '').trim();
    }

    console.log(`${name}  (${options.set})   ver. ${options.frame || 'classic'}`);

    if (name) {
      const search = {
        fuzzy: name.trim(),
        format: 'json',
        set: options.set ? options.set.trim() : '',
      };
      return request.get(`https://api.scryfall.com/cards/named?${querystring.stringify(search)}`)
        .then((cardDataJSON) => {
          saveStats('matchs', 1);
          return getFrameVersionOfCard(JSON.parse(cardDataJSON), options);
        })
        .then((cardData) => parseCardObject(cardData))
        .catch((err) => {
          console.log(err);

          console.log(`${name} => No unique card found, trying other languages`);
          // if nothing matched in english, try other languages
          const search2 = {
            q: `"${name.trim()}" unique:cards ${options.set ? `set:${options.set}` : ''}`,
            include_multilingual: true,
            format: 'json',
          };
          return request.get(`https://api.scryfall.com/cards/search?${querystring.stringify(search2)}`)
            .then((resultJSON) => {
              const result = JSON.parse(resultJSON);
              if (result.total_cards === 1) {
                saveStats('matchs', 1);
                return getFrameVersionOfCard(JSON.parse(result.data[0]), options);
              }
              throw new Error(`${result.total_cards} cards found in another language`);
            })
            .then((cardData) => parseCardObject(cardData))
            .catch((err) => {
              console.log(err);
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
