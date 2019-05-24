var mongoose = require("mongoose");


const suggestionSchema = new mongoose.Schema({
    "name": String,
    "definition": String,
    "email": String,
    "approval_status": { type: Boolean, default: true },
    "entry_date": { default: new Date(), type: Date },
})


const suggestionModel = mongoose.model("suggestion", suggestionSchema)
module.exports = suggestionModel

