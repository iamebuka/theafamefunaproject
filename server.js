const express = require('express');
const mongoose = require('mongoose');
// const fs = require('fs');
// const csv = require('csv-parser');
require('dotenv').config();
const afamefuna = require('./model/afamefuna');
const bodyParser = require('body-parser');
mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ds251807.mlab.com:51807/db_afamefuna`, {useNewUrlParser: true});

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.set('views', './views');
app.set('view engine', 'ejs');


/*
migration code
fs.createReadStream('NAMES.csv')
    .pipe(csv())
    .on('data', (row) => {

        const afam = new afamefuna({
            "name": row.name,
            "definition": row.definition,
            "lookup_count": "0"
        })


        afam.save()
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
    }); */

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/search/:query', function(req, res) {
  // res.json({ content: "searching" }) fix the search regex to ignore case
  afamefuna.find({name: {$regex: req.params.query}}).exec()
      .catch(function(err) {
        console.log(err);
      }).then(function(data) {
        res.send({success: true, results: [...data]});
      });
});

app.get('/entries/:name', function(req, res) {
  afamefuna.findOne({name: req.params.name}).exec().catch(function(err) {
    console.log(err);
  }).then(function(resp) {
    console.log(resp);
    res.render('entries', {response: resp});
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log('listening on port 3000');
});
