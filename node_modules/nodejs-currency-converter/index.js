const moment = require('moment');
const request = require('bluebird').promisifyAll(require('request'), { multiArgs: true });

const fixerUrl = 'https://api.fixer.io';

const convertCurrency = (value = 1, currencyFrom, currencyTo, day) => {
  const formatedDay = (!day) ? '/latest' : moment(day).format('YYYY-MM-DD');

  return new Promise((resolve, reject) => request.getAsync(`${fixerUrl}/${formatedDay}?base=${currencyFrom}`).then((response) => {
    const parsedResponse = JSON.parse(response[1]);

    if (typeof value !== 'number') reject(new Error('Value to convert is NaN.'));
    if (parsedResponse.error === 'Invalid base') {
      reject(new Error('Invalid currency base.'));
    } else if (!Object.keys(parsedResponse.rates).includes(currencyTo)) {
      reject(new Error('Invalid currency to convert.'));
    }

    const rateFrom = parsedResponse.rates[currencyTo];
    const convertedValue = value * rateFrom;
    resolve({
      currencyFrom,
      currencyTo,
      value,
      convertedValue,
    });
  }));
};

module.exports = convertCurrency;
