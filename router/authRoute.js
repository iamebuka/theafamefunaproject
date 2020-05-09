const express = require("express");
const userModel = require('../model/user');
const passport = require('passport');
const router = express.Router();


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