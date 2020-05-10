const express = require("express");
const userModel = require('../model/user');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const twitterStrategy = require('passport-twitter').Strategy;
const router = express.Router();


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


// router.get('/signup', function (req, res) {
//     res.render('signup', { user: req.user });
// })

// router.post('/signup', function (req, res, next) {
//     bcrypt.hash(req.body.password, saltRounds).then(function (hash) {
//         userModel.findOne({ email: req.body.email },
//             function (err, user) {
//                 if (err) next(err)
//                 if (user) res.redirect("/signin")
//                 let u = new userModel({
//                     firstname: req.body.fname,
//                     lastname: req.body.lname,
//                     email: req.body.email,
//                     accounts: [{ provider: 'internal', uid: req.body.email.split("@")[0], password: hash }]
//                 })
//                 u.save(function (err, user) {
//                     if (err) next(err)
//                     if (user) {
//                         req.login(user, function (err) {
//                             if (!err) res.redirect('/')
//                         })
//                     };
//                 })
//             })
//     });
// })


router.get('/signin', function (req, res) {
    res.render('login', { user: req.user });
})

router.post('/signin', passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/signin',
}))

router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: '/',
    failureRedirect: '/',
  }));

  
router.get('/logout', function (req, res) {
    req.logout();
    res.redirect("/");
})


module.exports = router;