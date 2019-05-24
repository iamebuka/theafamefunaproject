var mongoose = require("mongoose");
var bcrypt = require('bcrypt');
var saltRounds = 100;

var userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    roles: {type: [String], default: ["user"]},
    activated: { default: false, type: Boolean },
    created_at: { default: Date.now, type: Date },
    last_login: { default: Date.now, type: Date },
    accounts: [Object]
})


userSchema.methods.isValidPassword = function (password) {
    if (this.accounts) {
        console.log("isValidPassword:", this.accounts)
        hash = this.accounts[0].password;
        return bcrypt.compare(password, hash).then(function (res) {
            return res;
        });
    }

    return false;
}



userSchema.statics.findOrCreate = function (query, callback) {
    this.findOne({ email: query.email[0], 'accounts.uid': query.displayName, 'accounts.provider': query.provider }, function (err, user) {
        if (err) { callback(err) };
        if (user) { callback(null, user); }

        this.insertOne({
            firstname: query.name.givenName,
            lastname: query.name.familyName,
            email: query.email[0],
            accounts: [{
                'provider': query.provider,
                'uid': query.displayName
            }]
        }, function (err, user) {
            if (user) { callback(null, user) }
            if (err) { callback(err) };
        })
    })

}
const userModel = mongoose.model("user", userSchema);
module.exports = userModel;