var express = require('express');
var router = express.Router();
const Prediction = require('../models/prediction');
const {
  runPredictionScript,
  getPredictionEndDateFromPython,
  toYMDInTZ,
  getAlphaKey,
  fetchDailySeries,
} = require('../services/predictionService');

router.post('/', async (req, res) => {
    const { ticker, modelType, predictionTimeline } = req.body;
  
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: user not found on request' });
    }
  
    if (!ticker || !modelType || !predictionTimeline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      const prediction = new Prediction({
        user: req.user._id,
        ticker: ticker.toUpperCase(),
        modelType,
        predictionTimeline,
        startDate: new Date(),
        status: 'Pending'
      });

      const endISO = await getPredictionEndDateFromPython(predictionTimeline, prediction.startDate, 'iso');
      prediction.endDate = new Date(endISO);
  
      await prediction.save();
  
      const predictedPrice = await runPredictionScript(ticker, modelType, predictionTimeline);
      prediction.predictedPrice = predictedPrice;
      prediction.status = 'Completed';
      await prediction.save();
  
      res.status(201).json(prediction);
    } catch (err) {
      console.error('❌ Error in prediction creation:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  router.get('/', async (req, res) => {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: user not found on request' });
    }
  
    // helper to escape regex special chars
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
    try {
      // ----- optional ticker filter -----
      const filter = { user: req.user._id };
      const qTicker = (req.query.ticker || '').trim();
      if (qTicker) {
        // case-insensitive exact match: ^TICKER$
        filter.ticker = new RegExp(`^${escapeRegex(qTicker)}$`, 'i');
      }
  
      const predictions = await Prediction.find(filter)
        .sort({ createdAt: -1 })
        .exec();
  
      // ----- fill actualPrice when endDate has passed -----
      const todayNY = toYMDInTZ(new Date(), 'America/New_York');
  
      const needUpdate = predictions.filter(p => {
        if (!p.endDate) return false;
        if (p.actualPrice != null) return false;
        const endYMD = toYMDInTZ(p.endDate, 'America/New_York');
        return endYMD <= todayNY;
      });
  
      if (needUpdate.length) {
        const apiKey = await getAlphaKey();
  
        // group by ticker to minimize API calls
        const byTicker = new Map();
        for (const p of needUpdate) {
          const t = p.ticker.toUpperCase();
          if (!byTicker.has(t)) byTicker.set(t, []);
          byTicker.get(t).push(p);
        }
  
        for (const [ticker, preds] of byTicker.entries()) {
          try {
            const series = await fetchDailySeries(ticker, apiKey);
            for (const p of preds) {
              const endYMD = toYMDInTZ(p.endDate, 'America/New_York');
              const day = series[endYMD];
              if (day && day['1. open'] != null) {
                p.actualPrice = parseFloat(day['1. open']);
                // optionally compute difference/accuracy here if you store them
                await p.save();
              } else {
                console.warn(`No daily bar for ${ticker} on ${endYMD}`);
              }
            }
          } catch (e) {
            console.error(`Alpha Vantage fetch failed for ${ticker}:`, e.message);
          }
        }
      }
  
      res.status(200).json(predictions);
    } catch (err) {
      console.error('❌ Error fetching predictions:', err);
      res.status(500).json({ error: 'Failed to fetch predictions' });
    }
  });
  


module.exports = router;