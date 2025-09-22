const mongoose = require('mongoose');

const modelDetailsSchema = new mongoose.Schema(
    {
      sector: String,           // "xlk", "xly", or "general"
      timeframe: String,        // "1d" | "2w" | "2m"
      modelType: String,        //  "lstm" | "gru" | "rnn"
      mse: Number,
      trainingTimeSeconds: Number,
    },
    { timestamps: true, collection: "modeldetails" }
  );


modelDetailsSchema.set('toObject', { virtuals: true });
modelDetailsSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ModelDetails', modelDetailsSchema);