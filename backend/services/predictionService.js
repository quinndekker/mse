const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function runPredictionScript(ticker, modelType, predictionTimeline) {
  return new Promise((resolve, reject) => {
    const modelName = `general_${predictionTimeline}_${modelType}`;
    const testDataDir = path.resolve('services/stock_prediction_service/test_data');
    let csvPath = path.resolve(testDataDir, `compiled_${ticker.toUpperCase()}.csv`);
    const scriptPath = path.resolve(`services/stock_prediction_service/prediction_generators/predict_${modelType.toLowerCase()}_v2.py`);

    // Check if target CSV exists
    if (!fs.existsSync(csvPath)) {
        console.warn(`⚠️ CSV for ticker "${ticker}" not found. Selecting a random fallback CSV.`);
  
        const allFiles = fs.readdirSync(testDataDir).filter(file => file.endsWith('.csv'));
        if (allFiles.length === 0) {
          return reject(new Error('No CSV files found in test_data directory.'));
        }
  
        // Pick a random CSV file
        const randomCsv = allFiles[Math.floor(Math.random() * allFiles.length)];
        csvPath = path.join(testDataDir, randomCsv);
        console.warn(` Using fallback CSV: ${randomCsv}`);
      }

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
