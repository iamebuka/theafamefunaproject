var mongoose = require("mongoose");


const afamefunaSchema = new mongoose.Schema({
"name": String,
"definition": String,
"lookup_count": Number
})


const afemefunaModel = mongoose.model("afam", afamefunaSchema)

module.exports = afemefunaModel


