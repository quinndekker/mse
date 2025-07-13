require('dotenv').config();
var request = require('request');
const alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY;


async function searchStocks(searchQuery, page = 1, limit = 10) {
    const tickers = await getTickersFromQuery(searchQuery);
    const stockData = await getStockData(tickers);

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStocks = stockData.slice(startIndex, endIndex);
    return {
        stocks: paginatedStocks,
        total: stockData.length,
        page: page,
        limit: limit,
        totalPages: Math.ceil(stockData.length / limit)
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


module.exports = {
    searchStocks
};