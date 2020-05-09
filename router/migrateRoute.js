const express = require("express");
const fs = require('fs');
const csv = require('csv-parser');
const router = express.Router();

router.get('/migrate', function (req, res) {
    if (!req.user) { res.redirect("/signin"); return; }
    res.render('migrate');

})

router.post('/migrate', function (req, res) {

    fs.createReadStream('name.csv')
        .pipe(csv())
        .on('data', (row) => {
            console.log(row);
            const afam = new afamefuna({
                "name": row.name,
                "definition": row.definition,
                "lookup_count": "0",
                'entry_by': req.user,

            })
            afam.save()
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
            res.redirect('/');
        });
})



module.exports = router