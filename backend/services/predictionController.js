const fs = require('fs').promises;

const FLASK_URL = 'http://localhost:5001';

function pickCloseOnOrBefore(series, targetDate) {
  const targetYMD = toYMDInTZ(targetDate, 'America/New_York'); // 'YYYY-MM-DD'
  const days = Object.keys(series).sort().reverse(); // newest -> oldest
  const day = days.find(d => d <= targetYMD);
  if (!day) return null;
  const close = Number(series[day]['4. close']);
  if (!Number.isFinite(close)) return null;
  return { date: day, close };
}

async function runPredictionScript(ticker, modelType, predictionTimeline, sectorTicker = 'general') {
  const res = await fetch(`${FLASK_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, modelType, predictionTimeline, sectorTicker }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Flask /predict returned ${res.status}`);
  if (!Number.isFinite(json.predictedPrice)) throw new Error('Flask returned invalid predictedPrice');
  return json.predictedPrice;
}

async function getPredictionEndDateFromPython(timeframe, startDate = new Date(), format = 'iso') {
  const start = new Date(startDate).toISOString().slice(0, 10); // YYYY-MM-DD
  const res = await fetch(`${FLASK_URL}/end-date`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeline: timeframe, start }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Flask /end-date returned ${res.status}`);
  if (!json.endDate) throw new Error('Flask /end-date returned no endDate');
  return json.endDate;
}

function toYMDInTZ(date, tz = 'America/New_York') {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: tz }); // 'YYYY-MM-DD'
}

async function getAlphaKey() {
  if (process.env.ALPHA_VANTAGE_KEY) return process.env.ALPHA_VANTAGE_KEY.trim();
  try {
    const txt = await fs.readFile('key.txt', 'utf8');
    return txt.trim();
  } catch {
    throw new Error('Alpha Vantage API key missing. Set ALPHA_VANTAGE_KEY or provide key.txt');
  }
}

async function fetchDailySeries(ticker, apiKey) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
    ticker
  )}&apikey=${encodeURIComponent(apiKey)}&outputsize=full`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Alpha Vantage HTTP ${resp.status}`);
  const json = await resp.json();

  if (json['Error Message']) throw new Error(`Alpha Vantage error for ${ticker}`);
  if (json['Note']) throw new Error(`Alpha Vantage rate limited: ${json['Note']}`);
  const series = json['Time Series (Daily)'];
  if (!series) throw new Error(`Alpha Vantage missing daily series for ${ticker}`);

  return series; 
}

function setPredictionMetrics(doc) {
  if (doc.predictedPrice != null && doc.actualPrice != null) {
    const diff = Number(doc.predictedPrice) - Number(doc.actualPrice);
    doc.priceDifference = diff; // optional to keep
    const se = diff * diff;
    doc.squaredError = se;
    doc.mse = se;
    doc.predictionAccuracy = undefined;
  } else {
    doc.priceDifference = null;
    doc.squaredError = null;
    doc.mse = null;
    doc.predictionAccuracy = undefined;
  }
}

async function populateActualPriceAndMSE(prediction) {
  if (!prediction?.ticker || !prediction?.endDate) {
    throw new Error('populateActualPriceAndMSE: ticker and endDate required');
  }
  const apiKey = await getAlphaKey();
  const series = await fetchDailySeries(prediction.ticker, apiKey);

  // Ensure startPrice
  if (prediction.startPrice == null && prediction.startDate) {
    const startPick = pickCloseOnOrBefore(series, prediction.startDate);
    if (!startPick) throw new Error(`No trading data on/before startDate for ${prediction.ticker}`);
    prediction.startPrice = startPick.close;
  }

  // Actual endDate
  const actualPick = pickCloseOnOrBefore(series, prediction.endDate);
  if (!actualPick) throw new Error(`No trading data on/before endDate for ${prediction.ticker}`);
  prediction.actualPrice = actualPick.close;

  // Let the pre-save hook compute return-based squaredError/mse
  await prediction.save();
  return prediction;
}

module.exports = {
  runPredictionScript,
  getPredictionEndDateFromPython,
  toYMDInTZ,
  getAlphaKey,
  fetchDailySeries,
  setPredictionMetrics,
  populateActualPriceAndMSE,
};
