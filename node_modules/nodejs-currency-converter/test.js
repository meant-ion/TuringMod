const convertCurrency = require('./index');

test('test module', () => {
  expect.assertions(1);

  return convertCurrency(1, 'USD', 'BRL').then(response => {
    expect(response).toBeDefined();
  })

  return convertCurrency(5.4, 'BRL', 'EUR', '2015-08-29').then(response => {
    expect(response).toBeDefined();
  })

  return convertCurrency('10', 'USD', 'EUR').then(response => {
    expect(response).toBeDefined();
  })
});

test('exception module', () => {

  const error1 = new Error('Invalid currency to convert.');
  const error2 = new Error('Invalid currency base.');
  const error3 = new Error('Value to convert is NaN.');

  expect(convertCurrency(2, 'USD', 'USD')).rejects.toEqual(error1);
  expect(convertCurrency(8.9, 'USD', 'BTC')).rejects.toEqual(error1);
  expect(convertCurrency(3.5, 'UDD', 'USD')).rejects.toEqual(error2);
  expect(convertCurrency(4.5, 'BTC', 'ZKC')).rejects.toEqual(error2);
  expect(convertCurrency(3, 'BRL', 'USD', '2002-06-28')).rejects.toEqual(error2);
  expect(convertCurrency('ten', 'USD', 'EUR')).rejects.toEqual(error3);

});
