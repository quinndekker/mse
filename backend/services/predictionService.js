const path = require('path');
const { exec } = require('child_process');

/**
 * Runs the Python prediction script and returns the predicted price.
 * @param {string} ticker - The stock ticker (e.g., "AAPL")
 * @param {string} modelType - The model type ("lstm", "gru", "rnn")
 * @param {string} predictionTimeline - The prediction timeframe ("1d", "2w", "2m")
 * @returns {Promise<number>} The predicted stock price
 */
function runPredictionScript(ticker, modelType, predictionTimeline) {
  return new Promise((resolve, reject) => {
    const modelName = `general_${predictionTimeline}_${modelType}`;
    const csvPath = path.resolve(`services/stock_prediction_service/test_data/compiled_${ticker.toUpperCase()}.csv`);
    const scriptPath = path.resolve(`services/stock_prediction_service/prediction_generators/predict_${modelType.toLowerCase()}_v2.py`);

    const cmd = `python3 ${scriptPath} ${csvPath} ${modelName}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Prediction script exited with error:\n${error.message}`);
        console.error(`🔴 stderr:\n${stderr}`);
        console.error(`🔵 stdout:\n${stdout}`);
        return reject(new Error('Prediction script failed'));
      }

      // Example expected output: "Predicted Next Day Price: $127.53"
      const match = stdout.match(/Predicted Next Day Price:\s*\$(\d+\.\d+)/);
      if (!match) {
        console.error('❌ Could not parse predicted price from script output.');
        console.error(`🔵 Raw output:\n${stdout}`);
        return reject(new Error('Failed to parse predicted price'));
      }

      const predictedPrice = parseFloat(match[1]);
      resolve(predictedPrice);
    });
  });
}


module.exports = {
  runPredictionScript
};
