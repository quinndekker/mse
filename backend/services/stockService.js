require('dotenv').config();
var request = require('request');
const alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY;
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Stock = require('../models/stock');


// async function searchStocks(searchQuery, page = 1, limit = 10) {
//     const tickers = await getTickersFromQuery(searchQuery);
//     const stockData = await getStockData(tickers);

//     // Pagination logic
//     const startIndex = (page - 1) * limit;
//     const endIndex = startIndex + limit;
//     const paginatedStocks = stockData.slice(startIndex, endIndex);
//     return {
//         stocks: paginatedStocks,
//         total: stockData.length,
//         page: page,
//         limit: limit,
//         totalPages: Math.ceil(stockData.length / limit)
//     };
// }
async function searchStocks(query, page = 1, limit = 10) {
  const regex = new RegExp(query, 'i'); // case-insensitive

  const filter = {
    $or: [
      { ticker: { $regex: regex } },
      { name: { $regex: regex } }
    ]
  };

  const total = await Stock.countDocuments(filter);
  const stocks = await Stock.find(filter)
    .sort({ ticker: 1 }) // Optional: sort by ticker
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    stocks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// Uses Alpha Vantage API to search for stock tickers based on a search query
async function getTickersFromQuery(searchQuery) {
  const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${searchQuery}&apikey=${alphaVantageApiKey}`;

  // returns a list of ticker symbols based on the search query
  return new Promise((resolve, reject) => {
    // alphavantage search api endpoint
    request.get({
      url: searchUrl,
      json: true,
      headers: {'User-Agent': 'request'}
    }, (err, res, data) => {
      if (err) {
        console.log('Error:', err);
        return resolve([]);
      } else if (res.statusCode !== 200) {
        console.log('Status:', res.statusCode);
        return resolve([]);
      } else {
          // Check if data is valid and has bestMatches
          // return an array of ticker symbols
          if (data && data.bestMatches) {
          const tickers = data.bestMatches.map(match => match['1. symbol']);
          return resolve(tickers);
        } else {
          console.log('No matches found for the query:', searchQuery);
          return resolve([]);
        }
      }
    });
  });
}

// Alpha Vantage Bulk Quote API to get stock data for multiple tickers
async function getStockData(tickers) {
  if (!tickers || tickers.length === 0) {
    console.log('No tickers found for the query');
    return [];
  }

  const formattedTickers = tickers.join(',');
  const bulkQuoteUrl = `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${formattedTickers}&apikey=${alphaVantageApiKey}`;

  return new Promise((resolve, reject) => {
    request.get({
      url: bulkQuoteUrl,
      json: true,
      headers: { 'User-Agent': 'request' }
    }, (err, res, data) => {
      if (err) {
        console.log('Error:', err);
        return resolve([]);
      } else if (res.statusCode !== 200) {
        console.log('Status:', res.statusCode);
        return resolve([]);
      } else {
        if (data && Array.isArray(data.data)) {
          const filtered = data.data.map(stock => ({
            ticker: stock.symbol,
            open: stock.open,
            close: stock.previous_close,
            high: stock.high,
            low: stock.low,
            change_percent: stock.change_percent,
            volume: stock.volume,
            change: stock.change,
            percentChange: stock.percent_change,
            price: stock.quote ? stock.quote : stock.extended_hours_quote
          }));
          return resolve(filtered);
        } else {
          console.log('No valid data found for the tickers:', tickers);
          return resolve([]);
        }
      }
    });
  });
}

async function loadStocksFromCSVIfEmpty() {
  const stockCount = await Stock.countDocuments();
  if (stockCount > 0) return;

  console.log('Adding stocks to database from CSV files...');
  const files = ['nyse-listed.csv', 'nasdaq-listed.csv'];
  const stocksToInsert = [];

  for (const file of files) {
    const filePath = path.join(__dirname, '../assets', file);
    const data = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', row => {
          if (row.ticker && row.name) {
            rows.push({
              ticker: row.ticker.trim().toUpperCase(),
              name: row.name.trim()
            });
          }
        })
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
    stocksToInsert.push(...data);
  }

  try {
    await Stock.insertMany(stocksToInsert, { ordered: false });
    console.log(`✅ Inserted ${stocksToInsert.length} stocks into DB`);
  } catch (err) {
    console.error('⚠️ Insert error:', err.writeErrors?.length || err.message);
  }
}

async function getNameByTicker(ticker) {
  const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
  return stock ? stock.name : null;
}

function getGlobalQuote(ticker) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${alphaVantageApiKey}`;

  return new Promise((resolve, reject) => {
    request.get({ url, json: true, headers: { 'User-Agent': 'request' } }, (err, res, data) => {
      if (err) return reject(err);
      if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
      if (!data || !data["Global Quote"]) return reject(new Error('Invalid response from Alpha Vantage'));

      resolve(data["Global Quote"]);
    });
  });
}


module.exports = {
    searchStocks,
    getStockData,
    loadStocksFromCSVIfEmpty,
    getNameByTicker,
    getGlobalQuote
};