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
      console.error('Error in prediction creation:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  router.get('/', async (req, res) => {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: user not found on request' });
    }
  
    // helper to escape regex special characters
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
    try {
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
  
                // NEW: compute metrics when actualPrice is set
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
  
      res.status(200).json(predictions);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      res.status(500).json({ error: 'Failed to fetch predictions' });
    }
  });

async function updateActualPricesForDuePredictions() {
  const todayYMD = toYMDInTZ(new Date(), 'America/New_York');

  // Find candidates: have an endDate, no actualPrice yet.
  // (We filter by date boundary in JS using the NY YMD to avoid TZ edge cases.)
  const candidates = await Prediction.find({
    endDate: { $ne: null },
    $or: [{ actualPrice: { $exists: false } }, { actualPrice: null }],
  })
    .select('_id ticker endDate') // only what we need
    .lean()
    .exec();

  // Keep only those whose endDate (NY YMD) is <= today (NY YMD)
  const due = candidates.filter((p) => {
    const endYMD = toYMDInTZ(new Date(p.endDate), 'America/New_York');
    return endYMD <= todayYMD;
  });

  if (!due.length) {
    return { checked: candidates.length, due: 0, updated: 0, missingBars: 0, errors: 0 };
  }

  // Group by ticker to minimize API calls
  const byTicker = new Map();
  for (const p of due) {
    const t = p.ticker.toUpperCase();
    if (!byTicker.has(t)) byTicker.set(t, []);
    byTicker.get(t).push(p);
  }

  const apiKey = await getAlphaKey();
  const bulkOps = [];
  let updated = 0;
  let missingBars = 0;
  let errors = 0;

  for (const [ticker, preds] of byTicker.entries()) {
    try {
      const series = await fetchDailySeries(ticker, apiKey); // expects keys like 'YYYY-MM-DD'
      for (const p of preds) {
        const endYMD = toYMDInTZ(new Date(p.endDate), 'America/New_York');
        const bar = series[endYMD];
        if (bar && bar['1. open'] != null) {
          const price = Number.parseFloat(bar['1. open']); // or '4. close' if you prefer
          if (!Number.isNaN(price)) {
            bulkOps.push({
              updateOne: {
                filter: { _id: p._id, $or: [{ actualPrice: { $exists: false } }, { actualPrice: null }] },
                update: { $set: { actualPrice: price } }, // ONLY setting actualPrice here
              },
            });
            updated++;
          } else {
            missingBars++;
            // console.warn(`[${ticker}] Invalid numeric price for ${endYMD}`);
          }
        } else {
          missingBars++;
          // console.warn(`[${ticker}] No daily bar for ${endYMD}`);
        }
      }
    } catch (e) {
      errors++;
      console.error(`❌ Failed fetching daily series for ${ticker}:`, e.message);
    }
  }

  if (bulkOps.length) {
    await Prediction.bulkWrite(bulkOps, { ordered: false });
  }

  return {
    checked: candidates.length,
    due: due.length,
    updated,
    missingBars,
    errors,
  };
}

// Recompute priceDifference and predictionAccuracy for all predictions
async function recomputePredictionMetrics({ batchSize = 500, useAbsolutePct = false } = {}) {
  const cursor = Prediction.find({
    predictedPrice: { $ne: null },
    actualPrice: { $ne: null }
  })
    .select('_id predictedPrice actualPrice')
    .cursor();

  let totalChecked = 0;
  let updatedDocs = 0;
  let skippedZeroActual = 0;

  const ops = [];

  for await (const doc of cursor) {
    totalChecked++;

    const pred = Number(doc.predictedPrice);
    const act = Number(doc.actualPrice);
    if (!Number.isFinite(pred) || !Number.isFinite(act)) continue;

    if (act === 0) {
      skippedZeroActual++;
      continue; // avoid division by zero
    }

    const priceDifference = +(pred - act).toFixed(4);

    let pct = ((pred - act) / act) * 100;
    if (useAbsolutePct) pct = Math.abs(pct);
    const predictionAccuracy = +pct.toFixed(4);

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { priceDifference, predictionAccuracy } }
      }
    });

    if (ops.length >= batchSize) {
      const res = await Prediction.bulkWrite(ops, { ordered: false });
      updatedDocs += res.modifiedCount || 0;
      ops.length = 0;
    }
  }

  if (ops.length) {
    const res = await Prediction.bulkWrite(ops, { ordered: false });
    updatedDocs += res.modifiedCount || 0;
  }

  return {
    totalChecked,
    updatedDocs,
    skippedZeroActual
  };
}


module.exports = router;