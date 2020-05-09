// select a sample of 25 names from the afam db
const afamefuna = require("../model/afamefuna")
var sampleDb = require("../model/samples");

function sample() {
    afamefuna.aggregate([{ $project: { name: 1 } }, { $sample: { size: 25 } }])
        .exec().then(function (data) {
            data = data.reduce((prev, currVal) => {
                prev.names.push({ name: currVal.name })
                return prev;
            }, { names: [] });
            sampleDb.deleteMany({}).then(() => {
                sampleDb.insertMany([...data.names]).catch((e) => console.log("An error occured", e))
            }) // empty the collection before inserting new values

        })
}

module.exports = sample;