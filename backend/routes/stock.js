var express = require('express');
var router = express.Router();
const stockService = require("../services/stockService");

// Search Stocks
router.get("/", async (req, res, next) => {  
    const { searchQuery, page, limit } = req.query;
    
    // validate and format page number
    if (page) {
        pageInt = parseInt(page);
    } else {
        pageInt = 1;
    }

    // validate and format limit number
    if (limit) {
        limitInt = parseInt(limit);
    }
    else {
        limitInt = 10;
    }

    // validate search query
    if (!searchQuery) {
        return res.status(400).json({ message: "no search query" });
    }

    try {
        // search for stocks
        // returns a list of stocks
        const stockList = await stockService.searchStocks(searchQuery, pageInt, limitInt);
        res.json(stockList).status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }

});

module.exports = router;
