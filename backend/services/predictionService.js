const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;

async function waitForFileStable(filePath, { timeoutMs = 30000, checkEveryMs = 500, stableChecks = 2 } = {}) {
  const start = Date.now();
  let lastSize = -1;
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    try {
      const stat = await fs.stat(filePath);
      const size = stat.size;

      if (size === lastSize) {
        stableCount += 1;
        if (stableCount >= stableChecks) return;
      } else {
        stableCount = 0;
        lastSize = size;
      }
    } catch {
      // file not there yet — ignore
    }
    await new Promise(r => setTimeout(r, checkEveryMs));
  }
  throw new Error(`Timed out waiting for file: ${filePath}`);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) return resolve({ stdout, stderr });
      const err = new Error(`${cmd} exited with code ${code}`);
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });
  });
}

async function runPredictionScript(ticker, modelType, predictionTimeline) {
  const modelName = `general_${predictionTimeline}_${modelType}`.toLowerCase();

  // Adjust these to match your actual generator output
  const expectedCsvPaths = [
    // Where your generator actually writes (based on your earlier script):
    path.resolve('stock_api/daily_data', `compiled_${ticker.toUpperCase()}.csv`),

    // (Optional) legacy/test location if you keep using it:
    path.resolve('services/stock_prediction_service/stock_data', `compiled_${ticker.toUpperCase()}.csv`),
  ];

  const csvGenScript = path.resolve('services/stock_prediction_service/get_daily_data/get_daily_data_v2.py');
  const predictScript = path.resolve(`services/stock_prediction_service/prediction_generators/predict_${modelType.toLowerCase()}_v2.py`);

  // 1) Generate CSV
  console.log(`Generating CSV for ${ticker}...`);
  await run('python3', [csvGenScript, '-t', ticker], { cwd: path.resolve('.') });

  // 2) Find the CSV and wait until it’s fully written
  let csvPath = `services/stock_prediction_service/stock_data/compiled_${ticker.toLowerCase()}.csv`;

  if (!csvPath) {
    throw new Error(`CSV for ${ticker} not found in any expected location.`);
  }
  console.log(`CSV ready: ${csvPath}`);

  // 3) Run prediction
  console.log(`Running prediction with model: ${modelName}`);
  const { stdout } = await run('python3', [predictScript, csvPath, modelName], { cwd: path.resolve('.') });

  const m = stdout.match(/Predicted Next Day Price:\s*\$?\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!m) {
    const err = new Error('Failed to parse predicted price from script output');
    err.stdout = stdout;
    throw err;
  }
  const predictedPrice = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(predictedPrice)) {
    throw new Error('Parsed price was not a finite number');
  }
  return predictedPrice;
}

const endDateScript = path.resolve(
  'utils/compute_end_date_pmc.py'
);

// Returns either 'YYYY-MM-DD' or an ISO timestamp (UTC) depending on `format`
async function getPredictionEndDateFromPython(timeframe, startDate = new Date(), format = 'iso') {
  const startYMD = new Date(startDate).toISOString().slice(0, 10); // YYYY-MM-DD
  const { stdout } = await run(
    'python3',
    ['-u', endDateScript, timeframe, '--start', startYMD, '--format', format],
    { cwd: path.resolve('.') }
  );
  // Take the last non-empty line in case the script prints extra logs
  const out = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  if (!out) throw new Error('End-date script returned no output');
  return out;
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
  // Node 18+: global fetch; otherwise: const fetch = (await import('node-fetch')).default;
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

  return series; // { 'YYYY-MM-DD': { '1. open': '...', ... }, ... }
}

module.exports = {
  runPredictionScript,
  getPredictionEndDateFromPython,
  toYMDInTZ,
  getAlphaKey,
  fetchDailySeries,
};
