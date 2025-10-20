const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticker: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    predictionTimeline: {
        type: String,
        required: true
    },
    modelType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
    predictedPrice: {
        type: Number
    },
    actualPrice: {
        type: Number
    },
    sector: {
        type: String,
        default: "general"
    },
    priceDifference: {
        type: Number
    },
    predictionAccuracy: {
        type: Number
    },
    squaredError: Number,       // (pred - actual)^2
    mse: Number,
    startPrice: { type: Number }, 
}, { timestamps: true });

predictionSchema.pre('save', function(next) {
    const p = this;
  
    // Clear legacy
    p.predictionAccuracy = undefined;
  
    // Always keep priceDifference for UI convenience
    if (p.predictedPrice != null && p.actualPrice != null) {
      p.priceDifference = Number(p.predictedPrice) - Number(p.actualPrice);
    } else {
      p.priceDifference = null;
    }
  
    // Return-based error requires startPrice
    if (p.startPrice != null && p.predictedPrice != null && p.actualPrice != null) {
      const sp = Number(p.startPrice);
      if (sp !== 0) {
        const predRet = (Number(p.predictedPrice) - sp) / sp;
        const actRet  = (Number(p.actualPrice)    - sp) / sp;
        const se = Math.pow(predRet - actRet, 2);
  
        p.squaredError = se; // squared return error
        p.mse = se;          // for a single sample, mse == se
      } else {
        p.squaredError = null;
        p.mse = null;
      }
    } else {
      p.squaredError = null;
      p.mse = null;
    }
  
    next();
  });
  


predictionSchema.set('toObject', { virtuals: true });
predictionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Prediction', predictionSchema);