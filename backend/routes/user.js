var express = require('express');
var router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const saltRounds = 10;

async function generateMockUsers() {
  // Check if there are already mock users
  const existing = await User.find();
  if(existing.length > 1000) {
    return;
  }

  console.log("Generating mock users");

  for (let i = 0; i < 5000; i++) {
    const user = {
      firstName: 'mock',
      lastName: `user ${i}`,
      email: `mockuser${i}@email.com`,
      password: await bcrypt.hash("password", saltRounds)
    };
    User.create(user);
  }

  console.log("Mock users generated");
}

// get all users
// Only accessible by admin users
router.get('/', async (req, res) => {
  // Check if the query parameter excludeSelf is provided
  let { excludeSelf } = req.query;
  if (!excludeSelf) {
    excludeSelf = false;
  }

  if (req.user && req.user.admin) {
    try {
      const users = await User.find({}); 
      
      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve users' });
    }
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

// set a user as admin
router.put('/:id/admin', async (req, res) => {
  if (req.user && req.user.admin) {
    const userId = req.params.id;

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { admin: true },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});


// remove admin rights from a user
router.put('/:id/remove-admin', async (req, res) => {
  if (req.user && req.user.admin) {
    const userId = req.params.id;

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { admin: false },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

generateMockUsers();

module.exports = router;
