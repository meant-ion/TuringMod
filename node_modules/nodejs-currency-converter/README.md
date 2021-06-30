# NodeJS Currency Converter

[![Build Status](https://travis-ci.org/arthurmbandeira/nodejs-currency-converter.svg?branch=master)](https://travis-ci.org/arthurmbandeira/nodejs-currency-converter)
[![Dependencies Status](https://david-dm.org/arthurmbandeira/node-currency-converter/status.svg)](https://david-dm.org/arthurmbandeira/node-currency-converter/)
[![DevDependencies Status](https://david-dm.org/arthurmbandeira/node-currency-converter/dev-status.svg)](https://david-dm.org/arthurmbandeira/node-currency-converter/)


A simple currency converter based on [fixer.io](http://fixer.io).

## Getting started

### Installation
This package can be installed using npm

```
npm install nodejs-currency-converter
```

### Usage
Import `nodejs-currency-converter` and use it as a Promise.

```
const convertCurrency = require('nodejs-currency-converter');

convertCurrency(1, 'USD', 'BRL').then(response => response);
```

Without the last parameter, the function will return the currency based on the current day conversion. To pass the date to convert, pass the last parameter in the format `YYYY-MM-DD`.

```
const convertCurrency = require('nodejs-currency-converter');

convertCurrency(1, 'EUR', 'BRL', '2015-08-29').then(response => response);
```

## Issues
If any issues are found, they can be reported [here](https://github.com/arthurmbandeira/nodejs-currency-converter/issues).

## License

This project is licensed under the [MIT](LICENSE) license.
