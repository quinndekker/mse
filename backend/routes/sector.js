var express = require('express');
var router = express.Router();
const Sector = require('../models/sector');
const stockService = require('../services/stockService');

// escape regex helper
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/:sector', async (req, res) => {
  const sectorParam = (req.params.sector || '').trim();
  if (!sectorParam) {
    return res.status(400).json({ message: 'Sector is required' });
  }

  try {
    // case-insensitive exact match on sector name (handles spaces like "Health Care")
    const sectorData = await Sector.findOne({
      name: new RegExp(`^${escapeRegex(sectorParam)}$`, 'i')
    });

    if (!sectorData) {
      return res.status(404).json({ message: `Sector ${sectorParam} not found` });
    }

    const tickers = (Array.isArray(sectorData.tickers) ? sectorData.tickers : [])
      .map(t => String(t).toUpperCase());

    // Build [{ ticker, name }, ...]; skip any unknown tickers quietly
    const stocks = (await Promise.all(
      tickers.map(async (ticker) => {
        const name = await stockService.getNameByTicker(ticker); // works if sync or async
        return name ? { ticker, name } : null;
      })
    )).filter(Boolean);

    return res.status(200).json(stocks); // e.g., [{ticker:"AAPL", name:"Apple"}]
  } catch (err) {
    console.error(`Error fetching sector ${sectorParam}:`, err);
    return res.status(500).json({ message: `Failed to fetch sector ${sectorParam}` });
  }
});

router.get('/ticker-by-name/:name', async (req, res) => {
  const raw = (req.params.name || '').trim();
  if (!raw) return res.status(400).json({ message: 'Sector name is required' });

  try {
    const sector = await Sector.findOne({
      name: new RegExp(`^${escapeRegex(raw)}$`, 'i')
    }).lean();

    if (!sector) {
      return res.status(404).json({ message: `Sector '${raw}' not found` });
    }

    return res.status(200).json({
      name: sector.name,
      ticker: sector.ticker
    });
  } catch (err) {
    console.error('ticker-by-name error:', err);
    return res.status(500).json({ message: 'Failed to look up sector ticker' });
  }
});

router.get('/by-ticker/:ticker', async (req, res) => {
  const raw = req.params.ticker;
  if (!raw) return res.status(400).json({ error: 'Ticker is required.' });

  const ticker = String(raw).trim().toUpperCase();

  try {
    const sectors = await Sector.find({ tickers: ticker }).lean();
    return res.json(sectors);
  } catch (err) {
    console.error('Error fetching sectors by ticker:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;
