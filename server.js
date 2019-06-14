const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
// const csv = require('csv-parser');
require('dotenv').config();
const afamefuna = require('./model/afamefuna');
const User = require('./model/user');
const Suggestions = require('./model/suggest')
const bodyParser = require('body-parser');
mongoose.connect(process.env.DB_CONN_STRING, { useNewUrlParser: true, dbName: "db-afamefuna" });
var db = mongoose.connection;
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const twitterStrategy = require('passport-twitter').Strategy;
const session = require('express-session');
const nodemailer = require("nodemailer");
const message = require("./template.json")
var bcrypt = require('bcrypt');
var https = require('https');
var saltRounds = 10;
var flash = require("connect-flash");
var authMiddleWare = require('./authentication/middleware')

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

async function approve(id, user) { //use mongo transaction here
  const session = await User.startSession();
  session.startTransaction();

  try {
    const opts = { session };
    let A = await Suggestions.findByIdAndUpdate(id, { accepted: true, approval_status: true }, opts)
    let B = await afamefuna.findOne({ name: A.name }, {}, opts)

    if (B) { // entry already exist
      let C = await afamefuna.update({ name: B.name }, { definition: B.definition }, opts)
    } else {
      let D = await afamefuna.insertMany([{
        "name": A.name,
        "definition": A.definition,
        'entry_by': user
      }], opts)
    }
    await session.commitTransaction();
    session.endSession();
    return A


  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }

}

function decline(id) {
  return new Promise(function (resolve, reject) {
    Suggestions.findByIdAndUpdate(id, { approval_status: true, accepted: false })
      .catch(reject(err))
      .then(function (suggestion) {
        resolve(suggestion)
      })
  })
}

async function mailer(receiverObj, subject, type) {
  let transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: process.env.MAILER_PORT,
    tls: {
      rejectUnauthorized: false
    },
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASS
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `"The Afamefuna Project" <${process.env.MAILER_PRIMARY_MAIL}>`, // sender address
    to: receiverObj.email, // list of receivers
    subject: subject, // Subject line
    text: message[type].text.replace("[link]", `http://myigboname.com/entries/${receiverObj.name}`),
    html: message[type].html.replace("[link]", `http://myigboname.com/entries/${receiverObj.name}`)
  });



}


app.get('/', function (req, res) {
  res.render('index', { user: req.user });
});

app.get('/search/:query', function (req, res) {
  // res.json({ content: "searching" }) fix the search regex to ignore case
  afamefuna.find({ name: { $regex: req.params.query, $options: 'i' }}).exec()
    .catch(function (err) {
      console.log("query error", err)
    }).then(function (data) {
      console.log("query response", data)
      res.send({ success: true, results: [...data] });
    });
});

app.get('/entries/:name', function (req, res) {
  afamefuna.findOneAndUpdate({ name: req.params.name }, { $inc: { lookup_count: 1 } }).exec().catch(function (err) {

  }).then(function (resp) {

    res.render('entries', { response: resp, user: req.user });
  });
});

app.get('/contribute', function (req, res) {
  res.render('contribute', { name: req.query.q, user: req.user, message: false });
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

app.get('/admin/approvals', authMiddleWare(), function (req, res) {
  Suggestions.find({ approval_status: false }).exec()
    .catch(function (err) {

    }).then(function (data) {
      res.render('approvals', { success: true, suggestions: [...data], user: req.user });
    });
});

app.get('/admin/approvals/:id', authMiddleWare(), function (req, res) {
  let id = req.params.id
  Suggestions.findById(id).exec()
    .catch(function (err) {

    }).then(function (suggestion) {
      res.render('approval', { suggestion, user: req.user });
    });
});

app.post('/admin/approvals/:action/:id', authMiddleWare(), function (req, res) {
  if (req.params.action == "approve") {
    approve(req.params.id, req.user).then(function (suggestion) {

      mailer(suggestion, "RE: Contribution", "approval")

    }).catch(function (e) { console.log("catch error", e) })

  } else {
    decline(req.params.id).then(function (suggestion) {
      mailer(suggestion, "RE: Contribution", "denial")
    })
  }

  res.redirect("/admin/approvals")
});


app.get('/admin/', authMiddleWare(), function (req, res) {
  afamefuna.find().exec().then(function (data) {
    res.render('list', { entries: data, user: req.user });
  })

});

app.get('/admin/new', authMiddleWare(), function (req, res) {
  res.render('new', { user: req.user });
});


app.get('/admin/edit/:entry', authMiddleWare(), function (req, res) {
  if (!req.params.entry) res.redirect("/admin")
  afamefuna.findOne({ name: req.params.entry }).exec().then(function (entry) {
    res.render('edit', { entry, user: req.user });
  })
});


app.post('/admin/edit', authMiddleWare(), function (req, res) {
  afamefuna.findByIdAndUpdate(req.body.id, { definition: req.body.edit }).exec().then(function (entry) {
    res.send({ success: true });
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
  successRedirect: '/admin',
  failureRedirect: '/signin',
}))

app.get('/logout', function (req, res) {
 req.logout();
 res.redirect("/");
})

/* app.get('/migrate', function (req, res) {
  if(!req.user) {res.redirect("/signin"); return;}
  res.render('migrate');
  
})

app.post('/migrate', function (req, res) {
 
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


