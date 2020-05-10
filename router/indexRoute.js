const express = require("express");
const suggestionModel = require('../model/suggest');
const afamefunaModel = require('../model/afamefuna');
const nodemailer = require("nodemailer");
const router = express.Router();
const { aggregate, notd } = require("../utils");

async function sendContactMail(contact) {
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
        from: `"Reply: Contact Page" <${process.env.MAILER_PRIMARY_MAIL}>`, // sender address
        to: `"The Afamefuna Project" <${process.env.MAILER_PRIMARY_MAIL}>`,
        subject: contact.subject, // Subject line
        text: `from: ${contact.fname} ${contact.lname} /n ReplyTo: ${contact.email} /n Message: ${contact.message}`,
        html: `from: ${contact.fname} ${contact.lname} <br> ReplyTo: ${contact.email}  <br> Message: ${contact.message}`
    });
}


router.get('/', async function (req, res) {
    let contriParam  = req.query.q || "";
    let startWith = await aggregate();
    let notdList = await notd()
    res.render('index', { user: req.user, startWith: startWith, notd: notdList, contribute: contriParam });

});

router.post('/contact', function (req, res) {
    let mail = Object.assign({}, req.body)
    if (mail.email && mail.subject && mail.subject) {
        sendContactMail(mail)
        req.flash("success_messages", "Your message has been sent thank you")
        res.redirect("/")
    } else {
        res.render('/');
    }
});

router.post('/contribute', function (req, res) {
    let suggestion = new suggestionModel({
        name: req.body.name,
        definition: req.body.meaning,
        email: req.body.email
    })

    suggestion.save(function (err) {
        if (err) next(err);
        req.flash("success_messages", `The entry "${req.body.name}" has been received.<br/>
                                     You would get an email once entry is accepted!`)
        res.redirect('/');
    })

});

router.get("/start-with/:index", function (req, res, next) {
    let para = req.params.index;
    afamefunaModel.aggregate([
        {
            $project: {
                name: 1,
                index: { $substr: ["$name", 0, 1] }
            }
        },
        { $match: { index: { $regex: para, $options: 'i' } } },
        {
            $project: {
                index: 0
            }
        }]).then(data => {
            if (data.length) {
                res.render("start", { index: para, data: data })
            } else {
                next(new Error("doesnt exist"))
            }
        })

})

router.get('/entries/:name', function (req, res, next) {
    let nameParam = req.params.name;
       
    afamefunaModel
        .findOneAndUpdate({ name: { $regex: "^" + nameParam + "$", $options: 'ix' } }, { $inc: { lookup_count: 1 } })
        .exec()
        .catch(function (err) {
            console.log(err)
        })
        .then(function (resp) {
            if (resp) {
                res.render('entries', { response: resp, user: req.user });
            } else {
                next(new Error("page not found"))
            }

        });
});


module.exports = router