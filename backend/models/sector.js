const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
    ticker: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    tickers: {
        type: [String],
        default: []
    }
}, 
{ timestamps: true });

sectorSchema.set('toObject', { virtuals: true });
sectorSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Sector', sectorSchema);
