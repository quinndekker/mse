var express = require('express');
var router = express.Router();
const ModelDetails = require('../models/modelDetails');

const spdrToName = {
    xlb: "materials",
    xle: "energy",
    xlf: "financials",
    xli: "industrials",
    xlk: "technology",
    xlp: "consumer staples",
    xlu: "utilities",
    xlv: "health care",
    xly: "consumer discretionary",
    xlre: "real estate",
    xlc: "communication services",
    general: "general",
  };
  
  // Build reverse map (name → spdr)
  const nameToSpdr = Object.fromEntries(
    Object.entries(spdrToName).map(([k, v]) => [v, k])
  );
  
  function normalizeSector(input) {
    const s = input.trim().toLowerCase();
    if (spdrToName[s]) return { spdr: s, name: spdrToName[s] };
    if (nameToSpdr[s]) return { spdr: nameToSpdr[s], name: s };
    throw new Error(`Unknown sector "${input}". Use SPDR code (e.g. xlk) or sector name (e.g. technology).`);
  }

  const VALID_MODEL_TYPES = new Set(['lstm', 'gru', 'rnn']);
  const VALID_TIMEFRAMES = new Set(['1d', '2w', '2m']);
  
  router.get('/:modelType/:timeframe/:sector', async (req, res) => {
    try {
      const modelType = String(req.params.modelType || '').toLowerCase();
      const timeframe = String(req.params.timeframe || '').toLowerCase();
      const sectorParam = String(req.params.sector || '');
  
      if (!VALID_MODEL_TYPES.has(modelType)) {
        return res.status(400).json({ error: `Invalid modelType: ${modelType}` });
      }
      if (!VALID_TIMEFRAMES.has(timeframe)) {
        return res.status(400).json({ error: `Invalid timeframe: ${timeframe}` });
      }
  
      const { spdr, name } = normalizeSector(sectorParam);
  
      // We assume documents store sector as SPDR code (lowercase) or "general"
      const doc = await ModelDetails.findOne({
        modelType,
        timeframe,
        sector: spdr
      }).lean();
  
      if (!doc) {
        return res.status(404).json({
          error: 'Not found',
          query: { modelType, timeframe, sectorSpdr: spdr, sectorName: name }
        });
      }
  
      return res.json({
        ...doc,
        sectorSpdr: spdr,
        sectorName: name
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Bad request' });
    }
  });

module.exports = router;