function compileCardMessages(text, cardList, showText) {
  // split the cards by chunk of 10 (max carousel size)
  return cardList.reduce((buffer, msg) => {
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

module.exports = compileCardMessages;