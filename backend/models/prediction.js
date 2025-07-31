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
    }
}, 
{ timestamps: true });

predictionSchema.set('toObject', { virtuals: true });
predictionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Prediction', predictionSchema);