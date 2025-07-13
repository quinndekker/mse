const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
        email: {
            type: String,
            required: true,
            unique: true,
            match: /.+\@.+\..+/
        },
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        picture: {
            type: String,
            default: 'https://www.gravatar.com/avatar/'
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        admin: {
            type: Boolean,
            default: false
        },
        mockUser: {
            type: Boolean,
            default: false
        },
        password: {
            type: String
        },
    },
    {timestamps: true}
);

userSchema.set('toObject', {virtuals: true} );
userSchema.set('toJSON', { virtuals : true });

module.exports = mongoose.model('User', userSchema);
