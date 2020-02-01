const request = require('request-promise');

function createCardObject(card, showText) {
  if(!card.image_uris){

    console.log(card);
  }
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      size: 'full',
      aspectRatio: '1:1.4',
      url: card.image_uris.normal,
      backgroundColor: '#728bb2'
    },
    body: !showText ? undefined : {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: card.name || ' ',
          wrap: true,
          margin: 'none',
          size: 'sm'
        },
        {
          type: 'text',
          text: card.mana_cost || ' ',
          wrap: true,
          margin: 'none',
          size: 'sm',
          align: 'end'
        },
        {
          type: 'text',
          text: `\n${card.type_line}`,
          wrap: true,
          margin: 'none',
          size: 'sm',
        },
        {
          type: 'text',
          text: `\n${card.oracle_text}`,
          wrap: true,
          margin: 'none',
          size: 'sm',
        },
        {
          type: 'text',
          text: `\n${card.power && card.toughness ? `${card.power}/${card.toughness}` : ''}${card.loyalty ? `${card.loyalty}` : ''}`,
          wrap: true,
          margin: 'none',
          size: 'sm',
          align: 'end'
        }
      ]
    }
  };
}

function getCardMessage(card, showText) {
  let cardList = [];
  return Promise.resolve()
    .then(() => {
      // get the two faces of the card if it's a double faced card
      const cardFacesList = card.card_faces ? card.card_faces.filter((c) => c.image_uris) : [];
      if (cardFacesList.length > 0) {        
        return cardFacesList.map((c) => createCardObject(c, showText));
      } else {
        return [createCardObject(card, showText)];
      }
    })
    .then((cards) => {
      cardList = [...cards];
      // if there are related cards, send them
      if (!card.all_parts) {
        return [];
      }
      return Promise.all(card.all_parts
        // remove present card, tokens and emblems from the list
        .filter((c) => c.id !== card.id && c.component !== 'token' && !c.type_line.match(/^Emblem/))
        .map((c) => request.get(c.uri).then((relatedCardJSON) => createCardObject(JSON.parse(relatedCardJSON), showText))))
    })
    .then((relatedCards) => {
      return [...cardList, ...relatedCards];
    });
}

function compileCardMessages(text, cardList, showText) {
  const cardURLList = [];
  // spread all the related cards as single cards
  return cardList.reduce((buffer, cards) => [...buffer, ...(cards || [])], [])
    // remove duplicates
    .filter((c) => {
      if (cardURLList.indexOf(c.hero.url) === -1) {
        cardURLList.push(c.hero.url);
        return true;
      }
      return false;
    })
    // split the cards by chunk of 10 (max carousel size)
    .reduce((buffer, msg) => {
      if (buffer[buffer.length - 1].length === 10) {
        return [...buffer, [msg]];
      }
      return [...buffer.slice(0, -1), [...buffer[buffer.length - 1], msg]]
    }, [[]])
    .map((msgPack) => ({
      type: 'flex',
      altText: text,
      contents: {
        type: 'carousel',
        contents: msgPack
      }
    }));
}

module.exports = { getCardMessage, compileCardMessages };
