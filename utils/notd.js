// return notd- names for the day
var sampleDb = require("../model/samples");

function notd() {
    return new Promise((resolve, reject) => {
        sampleDb
        .aggregate([{ $project: { name: 1 } }])
        .then(data => resolve(data))
        .catch(err => reject(err));

    })
}

module.exports = notd