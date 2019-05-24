var mongoose = require("mongoose");
var user = require('./user')

const afamefunaSchema = new mongoose.Schema({
    "name": String,
    "definition": String,
    "lookup_count": Number,
    "approval_status": { type: Boolean, default: true },
    "entry_by": user.schema,
    "entry_date": { default: new Date(), type: Date },
    "modified_history": [user.schema],

})


const afemefunaModel = mongoose.model("afam", afamefunaSchema)
module.exports = afemefunaModel


