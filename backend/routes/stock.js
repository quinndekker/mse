var express = require('express');
var router = express.Router();
const stockService = require("../services/stockService");

// Add searchable stocks to database
stockService.loadStocksFromCSVIfEmpty();

router.get('/:ticker', async (req, res) => {
    const { ticker } = req.params;
  
    if (!ticker) {
      return res.status(400).json({ message: 'Ticker is required' });
    }
  
    try {
      const [companyName, quote] = await Promise.all([
        stockService.getNameByTicker(ticker.toUpperCase()),
        stockService.getGlobalQuote(ticker.toUpperCase())
      ]);
  
      res.status(200).json({
        ticker: ticker.toUpperCase(),
        name: companyName || 'Unknown',
        quote
      });
    } catch (err) {
      console.error(`Error fetching quote for ${ticker}:`, err.message);
      res.status(500).json({ message: `Failed to fetch quote for ${ticker}` });
    }
});

  router.get('/:ticker/price-series', async (req, res) => {
    const { ticker } = req.params;
    const { timeframe, points } = req.query;
  
    if (!ticker || !timeframe) {
      return res.status(400).json({ message: 'ticker and timeframe are required' });
    }
  
    try {
      const result = await stockService.getPriceSeries(ticker, timeframe, points ? Number(points) : undefined);
      return res.status(200).json(result);
    } catch (err) {
      console.error('price-series error:', err.message);
      const status = /Frequency|Please consider/.test(err.message) ? 503 : 500;
      return res.status(status).json({ message: 'Failed to fetch price series', error: err.message });
    }
});
  
router.get("/", async (req, res) => {
    const { searchQuery, page = 1, limit = 10 } = req.query;
  
    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({ message: "no search query" });
    }
  
    try {
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
  
      const stockList = await stockService.searchStocks(searchQuery, pageInt, limitInt);
      res.status(200).json(stockList);
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).send();
    }
  });

module.exports = router;
