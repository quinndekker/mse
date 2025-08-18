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

const TIMEFRAME_PLAN = {
  '1d':  { kind: 'intraday', interval: '5min',  outputsize: 'full',  tradingDays: 1 },
  '5d':  { kind: 'intraday', interval: '30min', outputsize: 'full',  tradingDays: 5 },
  '1m':  { kind: 'daily',    outputsize: 'compact', tradingDays: 22 },
  '3m':  { kind: 'daily',    outputsize: 'compact', tradingDays: 66 },
  '6m':  { kind: 'daily',    outputsize: 'compact', tradingDays: 132 },
  '1y':  { kind: 'daily',    outputsize: 'full',    tradingDays: 264 },
  '5y':  { kind: 'daily',    outputsize: 'full',    tradingDays: 1320 },
  'max': { kind: 'daily',    outputsize: 'full',    tradingDays: Infinity },
};

// tiny promise wrapper around `request.get`
function getJson(url) {
  return new Promise((resolve, reject) => {
    request.get({ url, headers: { 'User-Agent': 'overstock/1.0' } }, (err, res, body) => {
      if (err) return reject(err);
      if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
      try {
        const json = typeof body === 'string' ? JSON.parse(body) : body;
        resolve(json);
      } catch (e) {
        reject(new Error(`Bad JSON from Alpha Vantage`));
      }
    });
  });
}

function resampleSeriesAsc(seriesAsc, N = 120) {
  const M = seriesAsc.length;
  if (M <= N) return seriesAsc.slice();
  const out = [];
  for (let i = 0; i < N; i++) {
    const idx = Math.floor((i * (M - 1)) / (N - 1));
    out.push(seriesAsc[idx]);
  }
  return out;
}

function clipMostRecentTradingBars(rows, tradingDays) {
  if (!isFinite(tradingDays)) return rows;
  const desc = rows.sort((a, b) => b.t.getTime() - a.t.getTime());
  return desc.slice(0, tradingDays);
}

// Core fetcher => { series:[{t:Date,close:number}], meta:{} }
async function fetchSeriesForTimeframe(ticker, timeframe) {
  const plan = TIMEFRAME_PLAN[String(timeframe).toLowerCase()];
  if (!plan) throw new Error(`Unsupported timeframe: ${timeframe}`);
  const sym = String(ticker).toUpperCase();

  if (plan.kind === 'intraday') {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY`
      + `&symbol=${encodeURIComponent(sym)}`
      + `&interval=${encodeURIComponent(plan.interval)}`
      + `&outputsize=${encodeURIComponent(plan.outputsize)}`
      + `&adjusted=true&extended_hours=true`
      + `&apikey=${alphaVantageApiKey}`;

    const json = await getJson(url);
    const key = Object.keys(json || {}).find(k => k.toLowerCase().includes('time series'));
    if (!key || !json[key]) throw new Error(`No intraday data for ${sym}`);

    const rows = Object.entries(json[key]).map(([ts, v]) => ({
      t: new Date(ts),
      close: Number(v['4. close'] ?? v['4. Close'] ?? v['close'])
    })).filter(p => Number.isFinite(p.close));

    const clipped = clipMostRecentTradingBars(rows, plan.tradingDays);
    return {
      series: clipped,
      meta: { source: 'intraday', interval: plan.interval, count_raw: rows.length }
    };
  }

  // DAILY (raw as-traded). Swap to TIME_SERIES_DAILY_ADJUSTED if you want adjusted close.
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY`
    + `&symbol=${encodeURIComponent(sym)}`
    + `&outputsize=${encodeURIComponent(plan.outputsize)}`
    + `&apikey=${alphaVantageApiKey}`;

  const json = await getJson(url);
  const key = Object.keys(json || {}).find(k => k.toLowerCase().includes('time series'));
  if (!key || !json[key]) throw new Error(`No daily data for ${sym}`);

  const rows = Object.entries(json[key]).map(([date, v]) => ({
    // normalize to ~market close time
    t: new Date(`${date}T16:00:00Z`),
    close: Number(v['4. close'] ?? v['4. Close'] ?? v['close'])
  })).filter(p => Number.isFinite(p.close));

  const clipped = clipMostRecentTradingBars(rows, plan.tradingDays);
  return {
    series: clipped,
    meta: { source: 'daily', outputsize: plan.outputsize, count_raw: rows.length }
  };
}

// Public API: get fixed-length chart series
async function getPriceSeries(ticker, timeframe, points = 120) {
  const { series, meta } = await fetchSeriesForTimeframe(ticker, timeframe);
  const asc = series.sort((a, b) => a.t.getTime() - b.t.getTime());
  const sampled = resampleSeriesAsc(asc, Math.max(10, Math.min(2000, Number(points) || 120)));
  return {
    ticker: String(ticker).toUpperCase(),
    timeframe,
    points: sampled.length,
    meta,
    data: sampled.map(p => ({ t: p.t.toISOString(), close: p.close }))
  };
}


module.exports = {
    searchStocks,
    getStockData,
    loadStocksFromCSVIfEmpty,
    getNameByTicker,
    getGlobalQuote,
    getPriceSeries
};