var express = require('express');
var router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('39536509300-g04og3umfjppgbq7mdd87e3teru10onp.apps.googleusercontent.com');

passport.use(new LocalStrategy(
   async (email, done) => {
        const user = await User.findOne({email});
        if (!user) {
            return done(null, false, { message: 'Invalid Credentials' });    
        } 
        return done(null, user);
    }
));

 
 passport.serializeUser((user, done) => {
   console.log(`serialize user (${user})`);
   done(null, user._id );
 });
 
 passport.deserializeUser(async (_id, done) => {
   console.log(`deserialize user (${_id})`);
   const user = await User.findOne({_id});
   if ( user ) {
     done(null, user);
   } else {
     done(new Error('User not found'));
   }
 });
  
 
 router.get('/logout', (req, res) => {
   req.logout((err) => {
     if (err) {
       return res.status(500).json({ message: 'Logout failed' });
     }
     res.json({ message: 'Logged out successfully' });
   });
 });

// sent by Google via POST
 router.post('/google', async (req, res) => {
    const token = req.body.credential; 
  
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: '39536509300-g04og3umfjppgbq7mdd87e3teru10onp.apps.googleusercontent.com'
        });
  
        const payload = ticket.getPayload();
        const { email, given_name, family_name, picture, sub } = payload;
  
        // Check if user already exists
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                email: email,
                firstName: given_name,
                lastName: family_name,
                picture: picture || 'https://static.thenounproject.com/png/5034901-200.png',
                googleId: sub
            });
        }

        // Use Passport to login
        req.login(user, (err) => {
            if (err) {
                console.error('Error logging in Google user:', err);
                return next(err);
            }

            // update user information from google
            user.firstName = given_name;
            user.lastName = family_name;
            user.picture = picture || 'https://static.thenounproject.com/png/5034901-200.png';
            user.googleId = sub;
            user.save()
                .then(() => console.log('User updated successfully'))
                .catch(err => console.error('Error updating user:', err));

            const maxAge = req.session.cookie.maxAge || 600000;
            const expiresAt = Date.now() + maxAge;
            const userObject = user.toObject();
            return res.status(200).json({
                user: userObject,
                expiresAt: expiresAt
            });
        });
  
    } catch (err) {
      console.error('Error verifying Google token:', err);
      res.status(401).json({ message: 'Invalid Google token' });
    }
  });
 
module.exports = router;