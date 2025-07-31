var express = require('express');
var router = express.Router();
const Prediction = require('../models/prediction');
const { runPredictionScript } = require('../services/predictionService');

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

module.exports = router;