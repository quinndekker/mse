#!/usr/bin/env node
/**
 * Evaluate all past-due predictions and store MSE based on percentage price change.
 *
 * Defaults (can be overridden by env):
 *   MONGO_URI="mongodb://127.0.0.1:27017/mse"
 *   ALPHA_VANTAGE_KEY="VZ5NW76KL6HKHQQC"
 *   EVAL_VERSION=2
 *
 * Run:
 *   node evaluate_all_past_predictions.js
 */

const DEFAULT_MONGO = "mongodb://127.0.0.1:27017/mse";
const DEFAULT_AV_KEY = "VZ5NW76KL6HKHQQC";

const {
  MONGO_URI = DEFAULT_MONGO,
  ALPHA_VANTAGE_KEY = DEFAULT_AV_KEY,
  EVAL_VERSION = 2,
} = process.env;

const mongoose = require('mongoose');
const fetch = require('node-fetch'); // install: npm i mongoose node-fetch@2

if (!MONGO_URI || !ALPHA_VANTAGE_KEY) {
  console.error("❌ Missing MONGO_URI or ALPHA_VANTAGE_KEY.");
  process.exit(1);
}

// ---------- Model (fallback-safe) ----------
let Prediction;
try {
  Prediction = require('../models/prediction');
} catch {
  const schema = new mongoose.Schema(
    {
      ticker: String,
      startDate: Date,
      endDate: Date,
      predictionTimeline: String,
      modelType: String,
      predictedPrice: Number,

      // evaluation fields
      startPriceClose: Number,
      actualPriceClose: Number,
      absError: Number,
      pctError: Number,
      priceDifference: Number,
      directionCorrect: Boolean,
      within1pct: Boolean,
      within2pct: Boolean,
      within5pct: Boolean,
      squaredError: Number, // % return error squared
      mse: Number,          // % return error squared (single horizon)

      evaluationVersion: Number,
      evaluatedAt: Date,
    },
    { timestamps: true, strict: false }
  );
  Prediction = mongoose.model('Prediction', schema, 'predictions');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Alpha Vantage helpers ----------
async function fetchDailyCloseMap(ticker, retries = 3) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(
    ticker
  )}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`;

  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const series = data['Time Series (Daily)'];
      if (!series) throw new Error(`No daily series for ${ticker}: ${JSON.stringify(data).slice(0,180)}...`);
      const map = {};
      for (const [date, ohlc] of Object.entries(series)) {
        map[date] = parseFloat(ohlc['4. close']);
      }
      return map;
    } catch (e) {
      lastErr = e;
      console.warn(`⚠️ Fetch ${ticker} attempt ${i + 1}: ${e.message}`);
      await sleep(1500 * (i + 1)); // backoff
    }
  }
  throw lastErr;
}

function getCloseOnOrAfter(isoDate, closeMap, maxLookahead = 10) {
  const base = new Date(isoDate + 'T00:00:00Z');
  for (let i = 0; i <= maxLookahead; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    if (closeMap[key] != null) return { date: key, close: closeMap[key] };
  }
  return null;
}

// ---------- Evaluation logic (MSE on percentage change) ----------
function computeMetrics({ startPrice, predictedPrice, actualPrice }) {
  // Legacy (keep for UI/compat)
  const absError = Math.abs(predictedPrice - actualPrice);
  const pctError = absError / (actualPrice || 1);
  const priceDifference = actualPrice - predictedPrice;

  let predictedReturn = null;
  let actualReturn = null;

  if (Number.isFinite(startPrice) && startPrice !== 0) {
    // proper horizon returns versus START price
    predictedReturn = (predictedPrice - startPrice) / startPrice;
    actualReturn = (actualPrice - startPrice) / startPrice;
  } else if (Number.isFinite(actualPrice) && actualPrice !== 0) {
    // fallback so we can still produce a metric if start is missing
    predictedReturn = (predictedPrice - actualPrice) / actualPrice;
    actualReturn = 0;
  }

  const pctChangeDiff =
    predictedReturn != null && actualReturn != null
      ? predictedReturn - actualReturn
      : null;

  const squaredError =
    pctChangeDiff != null ? Math.pow(pctChangeDiff, 2) : null;

  // Direction correctness still relative to the start if available; else null
  const directionCorrect =
    Number.isFinite(startPrice)
      ? Math.sign(predictedPrice - startPrice) === Math.sign(actualPrice - startPrice)
      : null;

  return {
    absError,
    pctError,
    priceDifference,
    directionCorrect,
    within1pct: pctError <= 0.01,
    within2pct: pctError <= 0.02,
    within5pct: pctError <= 0.05,
    squaredError,
    mse: squaredError, // single end-horizon → mse == squaredError
  };
}

// ---------- Main ----------
(async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Mongo connected");

  const now = new Date();

  // Evaluate ALL predictions whose endDate is in the past and have a predictedPrice
  const cursor = Prediction.find({
    predictedPrice: { $ne: null },
    endDate: { $lte: now },
  })
    .sort({ endDate: 1 })
    .cursor();

  const cache = new Map();
  let processed = 0,
    updated = 0,
    skipped = 0,
    errors = 0;

  for await (const p of cursor) {
    processed++;
    const ticker = (p.ticker || '').toUpperCase();
    if (!ticker) {
      skipped++;
      continue;
    }

    try {
      if (!cache.has(ticker)) {
        console.log(`📡 Loading prices for ${ticker}...`);
        await sleep(1500); // gentle on rate limits
        cache.set(ticker, await fetchDailyCloseMap(ticker));
      }
      const map = cache.get(ticker);

      const startISO = p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : null;
      const endISO = new Date(p.endDate).toISOString().slice(0, 10);

      const startHit = startISO ? getCloseOnOrAfter(startISO, map) : null;
      const endHit = getCloseOnOrAfter(endISO, map);
      if (!endHit) {
        console.warn(`⚠️ ${ticker} ${p._id}: No close on/after ${endISO} (skipping)`);
        skipped++;
        continue;
      }

      const startPrice = startHit ? startHit.close : null;
      const actualPrice = endHit.close;
      const predictedPrice = p.predictedPrice;

      const metrics = computeMetrics({ startPrice, predictedPrice, actualPrice });

      const update = {
        startPriceClose: startPrice ?? null,
        actualPriceClose: actualPrice,
        absError: metrics.absError,
        pctError: metrics.pctError,
        priceDifference: metrics.priceDifference,
        directionCorrect: metrics.directionCorrect,
        within1pct: metrics.within1pct,
        within2pct: metrics.within2pct,
        within5pct: metrics.within5pct,
        squaredError: metrics.squaredError,
        mse: metrics.mse,
        evaluationVersion: Number(EVAL_VERSION),
        evaluatedAt: new Date(),
      };

      await Prediction.updateOne({ _id: p._id }, { $set: update });
      updated++;

      const pct = metrics.mse != null ? (Math.sqrt(metrics.mse) * 100).toFixed(2) : 'n/a';
      console.log(
        `✅ ${ticker} ${p.modelType || ''} ${p.predictionTimeline || ''} | ` +
        `Pred ${predictedPrice?.toFixed?.(2)} | Act ${actualPrice?.toFixed?.(2)} | ` +
        `| Return RMSE ~ ${pct}%`
      );
    } catch (e) {
      console.error(`❌ ${ticker} ${p._id}: ${e.message}`);
      errors++;
    }
  }

  console.log("\n📋 SUMMARY");
  console.log(`Processed: ${processed}`);
  console.log(`Updated:   ${updated}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Errors:    ${errors}`);

  await mongoose.disconnect();
  console.log("🏁 Done.");
})().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
