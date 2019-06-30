const fs = require('fs');

function saveStats(key, increment) {
  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  fs.writeFileSync('./data/stats.json', JSON.stringify({
    daily: {
      ...data.daily,
      [key]: data.daily[key] + increment
    },
    general: {
      ...data.general,
      [key]: data.general[key] + increment
    }
  }, null, 2));
}

function resetDaily() {
  const data = JSON.parse(fs.readFileSync('./data/stats.json'));
  fs.writeFileSync('./data/stats.json', JSON.stringify({
    ...data,
    daily: {
      friends: 0,
      groups: 0,
      calls: 0,
      matchs: 0
    }
  }, null, 2));
}

module.exports = {saveStats, resetDaily};
