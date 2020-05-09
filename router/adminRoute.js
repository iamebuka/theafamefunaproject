const express = require("express");
const authMiddleWare = require('../authentication/middleware')
const nodemailer = require("nodemailer");
const template = require("../template.json")
const suggestionModel = require('../model/suggest')
const afamefunaModel = require('../model/afamefuna');
const router = express.Router();


function decline(id) {
    return new Promise(function (resolve, reject) {
        suggestionModel.findByIdAndUpdate(id, { approval_status: true, accepted: false })
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
        text: template[type].text.replace("[link]", `http://myigboname.com/entries/${receiverObj.name}`),
        html: template[type].html.replace("[link]", `http://myigboname.com/entries/${receiverObj.name}`)
    });



}

async function approve(id, user) { //use mongo transaction here
    const session = await User.startSession();
    session.startTransaction();

    try {
        const opts = { session };
        let A = await Suggestions.findByIdAndUpdate(id, { accepted: true, approval_status: true }, opts)
        let B = await afamefunaModel.findOne({ name: A.name }, {}, opts)

        if (B) { // entry already exist
            let C = await afamefunaModel.update({ name: B.name }, { definition: B.definition }, opts)
        } else {
            let D = await afamefunaModel.insertMany([{
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

async function updateAndApprove(id, user) { //use mongo transaction here
    const session = await User.startSession();
    session.startTransaction();

    try {
        const opts = { session };
        let A = await Suggestions.findByIdAndUpdate(id, { accepted: true, approval_status: true }, opts)
        let B = await afamefunaModel.findOne({ name: A.name }, {}, opts)

        if (B) { // entry already exist
            let C = await afamefunaModel.update({ name: B.name }, { definition: B.definition }, opts)
        } else {
            let D = await afamefunaModel.insertMany([{
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

router.get('/approvals', authMiddleWare(), function (req, res) {
    suggestionModel.find({ approval_status: false }).exec()
        .catch(function (err) {

        }).then(function (data) {
            res.render('approvals', { success: true, suggestions: [...data], user: req.user });
        });
});

router.get('/approvals/:id', authMiddleWare(), function (req, res) {
    let id = req.params.id
    suggestionModel.findById(id).exec()
        .catch(function (err) {

        }).then(function (suggestion) {
            res.render('approval', { suggestion, user: req.user });
        });
});

router.post('/approvals/:action/:id', authMiddleWare(), function (req, res) {
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


router.get('/', authMiddleWare(), function (req, res) {
    afamefunaModel.find().sort({ name: 1 }).exec().then(function (data) {
        res.render('list', { entries: data, user: req.user });
    })

});

router.get('/new', authMiddleWare(), function (req, res) {
    res.render('new', { user: req.user });
});


router.get('/edit/:entry', authMiddleWare(), function (req, res) {
    if (!req.params.entry) res.redirect("/admin")
    afamefunaModel.findOne({ name: req.params.entry }).exec().then(function (entry) {
        res.render('edit', { entry, user: req.user });
    })
});


router.post('/edit', authMiddleWare(), function (req, res) {
    afamefunaModel.findByIdAndUpdate(req.body.id, { definition: req.body.edit }).exec().then(function (entry) {
        res.send({ success: true });
    })
});


module.exports = router
