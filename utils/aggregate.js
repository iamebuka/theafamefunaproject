// get the index of all names
const afamefuna = require("../model/afamefuna");

function aggregate() {
    return new Promise((resolve, reject) => {
        afamefuna
            .aggregate([
                { $project: { name: 1, index: { $substr: ['$name', 0, 1] } } },
                { $group: { _id: "$index", index: { $last: "$index" } } },
                { $sort: { index: 1 } }])
                .then(data => resolve(data))
                .catch(err => reject(err));
    })
}




module.exports = aggregate;