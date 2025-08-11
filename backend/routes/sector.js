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

module.exports = router;
