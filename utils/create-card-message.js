function createCardObject(card, showText) {
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
  if (card.card_faces) {
    return card.card_faces.map((c) => createCardObject(c, showText));
  }
  return [createCardObject(card, showText)];
}

function compileCardMessages(messageList) {
  return messageList.reduce((buffer, messages) => [...buffer, ...(messages || [])], [])
  .reduce((buffer, msg) => {
    if (buffer[buffer.length - 1].length === 10) {
      return [...buffer, [msg]];
    }
    return [...buffer.slice(0, -1), [...buffer[buffer.length - 1], msg]]
  }, [[]]).map((msgPack) => ({
    type: 'flex',
    altText: 'Cards displayed',
    contents: {
      type: 'carousel',
      contents: msgPack
    }
  }))
}

module.exports = {getCardMessage, compileCardMessages};
