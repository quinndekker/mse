var express = require('express');
var router = express.Router();
const List = require('../models/list');

router.post('/', async (req, res) => {
    const userId = req.user ? req.user._id : null;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    const { listName } = req.body;
    if (!listName) {
        return res.status(400).json({ message: 'List name is required' });
    }

    try {
        // Check if the user already has a list with the same name
        const existingList = await List.findOne({ user: userId, name: listName });
        if (existingList) {
            return res.status(400).json({ message: 'List with this name already exists' });
        }

        // Create a new list
        const newList = new List({
            name: listName,
            user: userId,
            tickers: []
        });

        const savedList = await newList.save();
        res.status(201).json(savedList);
    } catch (error) {
        console.error('Error creating list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }


});

router.get('/:id', async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const listId = req.params.id;
    const userIsAdmin = req.user && req.user.admin;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        // Find the list by ID and ensure it belongs to the user
        const list = await List.findOne({ _id: listId, user: userId });
        if (!list && !userIsAdmin) {
            return res.status(404).json({ message: 'List not found' });
        }
        res.json(list);
    } catch (error) {
        console.error('Error fetching list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', async (req, res) => {
    console.log('get hit');
    const userId = req.user ? req.user._id : null;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        // Find all lists for the user
        const lists = await List.find({ user: userId });
        res.json(lists);
    } catch (error) {
        console.error('Error fetching lists:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/add-ticker', async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const { listId, ticker } = req.body;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!listId || !ticker) {
        return res.status(400).json({ message: 'List ID and ticker are required' });
    }

    try {
        // Find the list by ID and ensure it belongs to the user
        const list = await List.findOne({ _id: listId, user: userId });
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Add the ticker to the list if it doesn't already exist
        if (!list.tickers.includes(ticker)) {
            list.tickers.push(ticker);
            await list.save();
        }

        res.json(list);
    } catch (error) {
        console.error('Error adding ticker:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;