const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
//const csv = require('csv-parser');
require('dotenv').config();
const afamefuna = require('./model/afamefuna');
const User = require('./model/user');
const Suggestions = require('./model/suggest')
const bodyParser = require('body-parser');
mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ds251807.mlab.com:51807/db_afamefuna`, { useNewUrlParser: true });
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const twitterStrategy = require('passport-twitter').Strategy;
const session = require('express-session');
var bcrypt = require('bcrypt');
var https = require('https');
var saltRounds = 10;
var flash = require("connect-flash");


const app = express();


app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'randomwordgenerator',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }

}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next) {

  next()
})
//setup local strategy
passport.use(new localStrategy(
  function (username, password, done) {
    User.findOne({ 'accounts.uid': username }, '_id firstname lastname email accounts.password', function (err, user) {

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

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findOne({ _id: id }, '_id firstname lastname email', function (err, user) {
    done(err, user);
  });
});


passport.use(new twitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: 'https://theafamefunaproject.herokuapp.com/auth/twitter/callback'
},
  function (token, tokenSecret, profile, done) {
    User.findOrCreate(profile, function (err, user) {
      if (err) { return done(err); }
      done(null, user);
    })
  }
))



app.set('views', './views');
app.set('view engine', 'ejs');



app.get('/', function (req, res) {
   res.render('index', { user: req.user });
});

app.get('/search/:query', function (req, res) {
  // res.json({ content: "searching" }) fix the search regex to ignore case
  afamefuna.find({ name: { $regex: req.params.query, $options: 'i' } }).exec()
    .catch(function (err) {
    
    }).then(function (data) {
      res.send({ success: true, results: [...data] });
    });
});

app.get('/entries/:name', function (req, res) {
  afamefuna.findOne({ name: req.params.name }).exec().catch(function (err) {
    
  }).then(function (resp) {
   
    res.render('entries', { response: resp, user: req.user });
  });
});

app.get('/contribute', function (req, res) {
  console.log("flash", req.flash('info'))
  res.render('contribute', { name: req.query.q, user: req.user, message: false});
});

app.post('/contribute', function (req, res) {
  let suggestion = new Suggestions({
    name: req.body.name,
    definition: req.body.meaning,
    email: req.body.email
  })

  suggestion.save(function (err) {
    if (err) next(err);
    req.flash("info", "You would get an email once entry is accepted!")
    res.render('contribute', { name: req.query.q, user: req.user, message: true });
   })

});


/* app.get('/signup', function (req, res) {
  res.render('signup', { user: req.user });
})

app.post('/signup', function (req, res, next) {
  bcrypt.hash(req.body.password, saltRounds).then(function (hash) {
    User.findOne({ email: req.body.email },
      function (err, user) {
        if (err) next(err)
        if (user) res.redirect("/signin")
        let u = new User({
          firstname: req.body.fname,
          lastname: req.body.lname,
          email: req.body.email,
          accounts: [{ provider: 'internal', uid: req.body.email.split("@")[0], password: hash }]
        })
        u.save(function (err, user) {
          if (err) next(err)
          if (user) {
            req.login(user, function (err) {
              if (!err) res.redirect('/')
            })
          };
        })
      })
  });
})
 */
app.get('/signin', function (req, res) {
  res.render('login', { user: req.user });
})

app.post('/signin', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/signin',
}))

/* 
app.get('/migrate', function (req, res) {
  if(!req.user) {res.redirect("/signin"); return;}
  res.render('migrate');
  
})

app.post('/migrate', function (req, res) {
 
  fs.createReadStream('name.csv')
    .pipe(csv())
    .on('data', (row) => {

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
  */

app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: '/',
    failureRedirect: '/',
  }));

setInterval(function () {
  https.get('https://theafamefunaproject.herokuapp.com/')
}, 300000)

app.get("*", function (req, res) {
  res.redirect("/")
})

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000');
});


