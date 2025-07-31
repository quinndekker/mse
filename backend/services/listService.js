const List = require('../models/list');

async function createMyStocks(userId) {
    if (!userId) {
      throw new Error('userId is required to create My Stocks list');
    }
  
    // Check if the user already has a My Stocks list
    const existing = await List.findOne({ user: userId, myStocks: true });
    if (existing) {
      return existing;
    }
  
    // Otherwise create a new one
    const myStocksList = new List({
      myStocks: true,
      name: 'My Stocks',
      user: userId,
      tickers: []
    });
  
    return await myStocksList.save();
  }

module.exports = {
    createMyStocks
};