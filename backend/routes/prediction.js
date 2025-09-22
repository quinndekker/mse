// routes/prediction.js
var express = require('express');
var router = express.Router();

const Prediction = require('../models/prediction');
const predictionQueue = require('../services/predictionQueue');

const {
  runPredictionScript,
  getPredictionEndDateFromPython,
  toYMDInTZ,
  getAlphaKey,
  fetchDailySeries,
  setPredictionMetrics,   // <- you call this in GET; make sure it's imported
} = require('../services/predictionService');

// --- CREATE (queued) ---
router.post('/', async (req, res) => {
  const { ticker, modelType, predictionTimeline } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Unauthorized: user not found on request' });
  }
  if (!ticker || !modelType || !predictionTimeline) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1) Create doc first, mark as Queued
    const prediction = new Prediction({
      user: req.user._id,
      ticker: ticker.toUpperCase(),
      modelType,
      predictionTimeline,
      startDate: new Date(),
      status: 'Queued',
    });

    const endISO = await getPredictionEndDateFromPython(predictionTimeline, prediction.startDate, 'iso');
    prediction.endDate = new Date(endISO);
    await prediction.save(); // now _id exists

    // (Optional) simple backpressure: cap queue length
    if (predictionQueue.size() > 25) {
      return res.status(429).json({ error: 'Too many pending predictions, try again shortly.' });
    }

    // 2) Enqueue the single-file task (only 1 runs at a time)
    await predictionQueue.enqueue(async () => {
      // mark running
      await Prediction.updateOne({ _id: prediction._id }, { $set: { status: 'Running', startedAt: new Date() } });

      try {
        const price = await runPredictionScript(prediction.ticker, modelType, predictionTimeline);

        const doc = await Prediction.findById(prediction._id);
        if (!doc) return; // doc deleted mid-run?

        doc.predictedPrice = price;
        doc.status = 'Completed';
        doc.completedAt = new Date();

        // If you want to compute metrics immediately when actualPrice already exists:
        setPredictionMetrics(doc);
        await doc.save();
      } catch (e) {
        await Prediction.updateOne(
          { _id: prediction._id },
          { $set: { status: 'Failed', errorMessage: String(e?.message || e), failedAt: new Date() } }
        );
      }
    }, { predictionId: prediction._id.toString(), ticker: prediction.ticker, modelType, predictionTimeline });

    // 3) Respond immediately
    return res.status(202).json({
      message: 'Prediction queued',
      id: prediction._id,
      status: 'Queued',
      endDate: prediction.endDate,
      queueSize: predictionQueue.size(),
    });
  } catch (err) {
    console.error('Error in prediction creation:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// --- LIST (unchanged logic; just ensure setPredictionMetrics is imported) ---
router.get('/', async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Unauthorized: user not found on request' });
  }

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  try {
    const filter = { user: req.user._id };
    const qTicker = (req.query.ticker || '').trim();
    if (qTicker) {
      filter.ticker = new RegExp(`^${escapeRegex(qTicker)}$`, 'i');
    }

    const predictions = await Prediction.find(filter).sort({ createdAt: -1 }).exec();

    // fill actualPrice when endDate has passed
    const todayNY = toYMDInTZ(new Date(), 'America/New_York');

    const needUpdate = predictions.filter(p => {
      if (!p.endDate) return false;
      if (p.actualPrice != null) return false;
      const endYMD = toYMDInTZ(p.endDate, 'America/New_York');
      return endYMD <= todayNY;
    });

    if (needUpdate.length) {
      const apiKey = await getAlphaKey();

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
              setPredictionMetrics(p);
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

    return res.status(200).json(predictions);
  } catch (err) {
    console.error('Error fetching predictions:', err);
    return res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

module.exports = router;
