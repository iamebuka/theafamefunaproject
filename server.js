const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const afamefunaModel = require("./model/afamefuna");
const bodyParser = require("body-parser");
mongoose.connect(process.env.DB_CONN_STRING, {
  useNewUrlParser: true,
  dbName: "db-afamefuna",
});
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const cron = require("cron").CronJob;
const sample = require("./utils").sample;
const secure = require("express-force-https");
var https = require("https");
const flash = require("connect-flash");

const ghostContentAPI = require("@tryghost/content-api");
const { adminRoute, authRoute, indexRoute } = require("./router");

const api = new ghostContentAPI({
  url: process.env.GHOST_URL, // remember to move to .env file
  key: process.env.GHOST_KEY,
  version: "v3",
});

const app = express();

// app.use(secure)
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRETS,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    store: new MongoStore({ url: process.env.DB_CONN_STRING }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(async function (req, res, next) {
  try {
    let posts = await api.posts.browse({ limit: 10, include: "tags,authors" });
    res.locals.posts = posts;
    res.locals.success_messages = req.flash("success_messages");
  } catch (error) {
    console.log(error);
  } finally {
    next();
  }
});

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/search/:query", function (req, res) {
  afamefunaModel
    .aggregate([
      { $match: { name: { $regex: req.params.query, $options: "i" } } },
      {
        $project: {
          name: 1,
          name_length: { $strLenCP: "$name" },
        },
      },
      { $sort: { name_length: 1 } },
      { $project: { name_length: 0 } },
    ])
    .exec()
    .catch(function (err) {
      console.log("query error", err);
    })
    .then(function (data) {
      res.send({ success: true, results: [...data] });
    });
});

app.use("/", indexRoute);
app.use("/admin", adminRoute);
app.use("/auth", authRoute);

app.get("*", function (req, res, next) {
  // catch all route handler
  res.redirect("/");
});

app.use(function (err, req, res, next) {
  // error handler
  const err_code = err.type ? err.type : 404
  res.status(err_code);
  res.render("error", { error: err.message });
});

// cron job to create a sample of name from the afam collection.
// future update would be to save the data in a redis cache.

var job = new cron(
  "* 59 23 * * *",
  function () {
    sample();
  },
  null,
  false
);

job.start();

app.listen(process.env.PORT || 3000, function () {
  console.log("listening on port 3000");
});
