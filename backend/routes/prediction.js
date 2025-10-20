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
  setPredictionMetrics,   
} = require('../services/predictionService');

function pickCloseOnOrBefore(series, targetDate) {
  const targetYMD = toYMDInTZ(targetDate, 'America/New_York'); // 'YYYY-MM-DD'
  const days = Object.keys(series).sort().reverse(); // newest -> oldest
  const day = days.find(d => d <= targetYMD);
  if (!day) return null;
  const close = Number(series[day]['4. close']);
  if (!Number.isFinite(close)) return null;
  return { date: day, close };
}

function pLimit(concurrency) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
}

const autoFinalizePastDue = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Unauthorized: user not found on request' });

    const filter = { user: req.user._id };
    const nowNY = toYMDInTZ(new Date(), 'America/New_York');

    // Narrow initial fetch (only those that could possibly need work)
    const candidates = await Prediction.find({
      user: req.user._id,
      actualPrice: null,
      endDate: { $ne: null },
      predictedPrice: { $ne: null },
    }).sort({ createdAt: -1 }).exec();

    const due = candidates.filter(p => needsEvaluation(p, nowNY));
    if (due.length === 0) return next();

    // Limit concurrency to avoid API rate limits (Alpha Vantage is touchy)
    const limit = pLimit(3);
    await Promise.all(due.map(p => limit(() => populateActualPriceAndMSE(p).catch(e => {
      console.warn(`Auto-finalize ${p._id} failed: ${e.message}`);
    }))));

    return next();
  } catch (e) {
    console.error('autoFinalizePastDue error:', e);
    // Don’t fail the request if background finalize fails
    return next();
  }
};

const needsEvaluation = (p, nowNY) => {
  if (!p.endDate) return false;
  if (p.actualPrice != null) return false;
  if (p.predictedPrice == null) return false; // don’t evaluate until we have a prediction
  const endYMD = toYMDInTZ(p.endDate, 'America/New_York');
  return endYMD <= nowNY;
};

router.post('/', async (req, res) => {
  const { ticker, modelType, predictionTimeline, sectorTicker } = req.body;

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
      status: 'Queued',
      sector: sectorTicker ? sectorTicker.toUpperCase() : 'general',
    });

    const endISO = await getPredictionEndDateFromPython(predictionTimeline, prediction.startDate, 'iso');
    prediction.endDate = new Date(endISO);
    await prediction.save(); // now _id exists

    const tickerU = String(ticker).toUpperCase().trim();
    const apiKey = await getAlphaKey();
    const series = await fetchDailySeries(tickerU, apiKey);
    const startPick = pickCloseOnOrBefore(series, prediction.startDate);
    if (startPick) prediction.startPrice = startPick.close;

    // cap queue length
    if (predictionQueue.size() > 25) {
      return res.status(429).json({ error: 'Too many pending predictions, try again shortly.' });
    }

    // Enqueue the single-file task
    await predictionQueue.enqueue(async () => {
      // mark running
      await Prediction.updateOne({ _id: prediction._id }, { $set: { status: 'Running', startedAt: new Date() } });

      try {
        const price = await runPredictionScript(prediction.ticker, modelType, predictionTimeline, sectorTicker);

        const doc = await Prediction.findById(prediction._id);
        if (!doc) return; 

        doc.predictedPrice = price;
        doc.status = 'Completed';
        doc.completedAt = new Date();

        setPredictionMetrics(doc);
        await doc.save();
      } catch (e) {
        await Prediction.updateOne(
          { _id: prediction._id },
          { $set: { status: 'Failed', errorMessage: String(e?.message || e), failedAt: new Date() } }
        );
      }
    }, { predictionId: prediction._id.toString(), ticker: prediction.ticker, modelType, predictionTimeline });

    //  Respond immediately
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

router.get('/', autoFinalizePastDue, async (req, res) => {
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


router.get('/filter', autoFinalizePastDue, async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Unauthorized: user not found on request' });
  }

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const { ticker, modelType, predictionTimeline, sectorTicker } = req.query;

  try {
    const filter = { user: req.user._id };

    if (ticker) filter.ticker = new RegExp(`^${escapeRegex(ticker)}$`, 'i');
    if (modelType) filter.modelType = new RegExp(`^${escapeRegex(modelType)}$`, 'i');
    if (predictionTimeline) filter.predictionTimeline = new RegExp(`^${escapeRegex(predictionTimeline)}$`, 'i');
    if (sectorTicker) filter.sector = new RegExp(`^${escapeRegex(sectorTicker)}$`, 'i');

    const predictions = await Prediction.find(filter).sort({ createdAt: -1 }).exec();
    return res.status(200).json(predictions);
  } catch (err) {
    console.error('Error fetching filtered predictions:', err);
    return res.status(500).json({ error: 'Failed to fetch filtered predictions' });
  }
});

module.exports = router;
