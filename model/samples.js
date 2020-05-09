var mongoose = require("mongoose");

const sampleSchema = new mongoose.Schema({
    "name": String,
})


const sampleModel = mongoose.model("sample", sampleSchema)
module.exports = sampleModel;
