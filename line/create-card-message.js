function createCardObject(card, showText) {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      size: 'full',
      aspectRatio: '1:1.4',
      url: card.imageUrl,
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



module.exports = createCardObject;
