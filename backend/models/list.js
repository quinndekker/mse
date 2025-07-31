const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
    myStocks: {
        type: Boolean,
        default: false,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tickers: {
        type: [String],
        default: []
    }
}, 
{ timestamps: true });

listSchema.set('toObject', { virtuals: true });
listSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('List', listSchema);
