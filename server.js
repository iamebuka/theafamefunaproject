const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const afamefunaModel = require('./model/afamefuna');
const userModel = require('./model/user');
const bodyParser = require('body-parser');
mongoose.connect(process.env.DB_CONN_STRING, { useNewUrlParser: true, dbName: "db-afamefuna" });
var db = mongoose.connection;
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const twitterStrategy = require('passport-twitter').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cron = require('cron').CronJob;
const sample = require("./utils").sample
const secure = require('express-force-https');
var https = require('https');
const flash = require("connect-flash");

const ghostContentAPI = require('@tryghost/content-api');
const { adminRoute, authRoute, indexRoute } = require('./router')


const api = new ghostContentAPI({
  url: process.env.GHOST_URL, // remember to move to .env file
  key: process.env.GHOST_KEY,
  version: "v3"
});

const app = express();

app.use(secure)
app.use(express.static('public'));
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRETS,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  store: new MongoStore({ url: process.env.DB_CONN_STRING })

}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(async function (req, res, next) {
  let posts = await api.posts.browse({ limit: 10, include: 'tags,authors' });
  res.locals.posts = posts;
  res.locals.success_messages = req.flash('success_messages');
  next();
});

//setup local strategy
passport.use(new localStrategy(
  function (username, password, done) {
    userModel.findOne({ 'accounts.uid': username }, '_id firstname lastname email accounts.password', function (err, user) {

      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.isValidPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);

    })
  }
))

passport.use(new twitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: `${process.env.HOST_URL}/auth/twitter/callback`
},
  function (token, tokenSecret, profile, done) {
    userModel.findOrCreate(profile, function (err, user) {
      if (err) { return done(err); }
      done(null, user);
    })
  }
))

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  userModel.findOne({ _id: id }, '_id firstname lastname email', function (err, user) {
    done(err, user);
  });
});

app.set('views', './views');
app.set('view engine', 'ejs');



app.get('/search/:query', function (req, res) {
  afamefunaModel
    .aggregate([
      { $match: { name: { $regex: req.params.query, $options: 'i' } } },
      {
        $project: {
          name: 1,
          name_length: { $strLenCP: "$name" }
        }
      },
      { $sort: { name_length: 1 } },
      { $project: { name_length: 0 } }
    ]).exec()
    .catch(function (err) {
      console.log("query error", err)
    }).then(function (data) {
      res.send({ success: true, results: [...data] });
    });
});


app.use("/", indexRoute)
app.use("/admin", adminRoute);
app.use("/auth", authRoute);

app.get("*", function (req, res, next) { // catch all route handler
  res.redirect("/")
})

app.use(function (err, req, res, next) { // error handler
  res.status(500)
  res.render('error', { error: err.message })
})

// cron job to create a sample of name from the afam collection.
// future update would be to save the data in a redis cache.

var job = new cron("* 59 23 * * *", function() {
   sample();
}, null, false)

job.start();

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000');
});


