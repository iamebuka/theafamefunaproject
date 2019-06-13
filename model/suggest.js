var mongoose = require("mongoose");


const suggestionSchema = new mongoose.Schema({
    "name": String,
    "definition": String,
    "email": String,
    "approval_status": { type: Boolean, default: false },
    "entry_date": { default: new Date(), type: Date },
    "accepted": {type: Boolean, default: false}
})


const suggestionModel = mongoose.model("suggestion", suggestionSchema)
module.exports = suggestionModel

