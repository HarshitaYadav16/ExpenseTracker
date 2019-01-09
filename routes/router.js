const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Expenditure = require("../models/expenditure");
const Income = require("../models/income");
const path = require("path");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const ensureToken = require("../middleware/ensuretoken");
const promise = require("promise");
var nodemailer = require("nodemailer");

//POST route for new user registration and login
/**
 * @api {post} /register Registration of new user and login
 * @apiName register
 * @apiGroup User
 * @apiSuccess {JSON} JWT of the registered user and redirection to home page after login
 * @apiError 400 Bad Request Error All fields are required to be filled by the user Auth failed.
 */
router.post("/register", (req, res, next) => {
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error("Passwords do not match.");
    err.status = 400;
    res.send("passwords dont match");
    return next(err);
  }
  if (
    req.body.name &&
    req.body.email &&
    req.body.username &&
    req.body.password
  ) {
    const userData = {
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password
    };

    User.create(userData, (error, user) => {
      if (error) {
        return next(error);
      } else {
        req.session.userId = user._id;
        res.send(
          "User registered successfully" +
            "<br><a href='/logout'>Login again</a>"
        );
      }
    });
  } else if (req.body.logusername && req.body.logpassword) {
    User.authenticate(
      req.body.logusername,
      req.body.logpassword,
      (error, user) => {
        if (error || !user) {
          var err = new Error("Wrong username or password.");
          err.status = 401;
          return next(err);
        } else {
          const userlogin = {
            name: user.name,
            email: user.email,
            username: user.username
          };
          const token = jwt.sign(
            {
              userlogin
            },
            process.env.SECRET_OR_KEY,
            {
              expiresIn: "24h" // expires in 24 hours
            }
          );

          req.session.token = token;
          req.session.userId = user._id;
          req.session.username = user.username;
          return res.sendFile(
            path.join(__dirname + "/../views/homedashboard.html")
          );
          // if (user.username == "admin") {
          //   return res.sendFile(
          //     path.join(__dirname + "/../views/incomeform.html")
          //   );
          // } else {
          //   return res.sendFile(
          //     path.join(__dirname + "/../views/expenditureform.html")
          //   );
          // }
        }
      }
    );
  } else {
    let err = new Error("All fields required.");
    err.status = 400;
    return next(err);
  }
});

//POST route to add new field in the form
/**
 * @api {post} /addfield Adding new field in the form
 * @apiName addfield
 * @apiGroup Field
 * @apiSuccess  Redirection to home page
 * @apiError Error
 */
router.post("/addincome", (req, res, next) => {
  const incomeData = {
    username: req.session.username,
    name: req.body.name,
    source: req.body.source,
    amount: req.body.amount
  };

  Income.create(incomeData, (error, input) => {
    if (error) {
      return next(error);
    } else {
      return res.send("Income added");
    }
  });
});

//POST route to add new field in the form
/**
 * @api {post} /addfield Adding new field in the form
 * @apiName addfield
 * @apiGroup Field
 * @apiSuccess  Redirection to home page
 * @apiError Error
 */
router.post("/addexpenditure", (req, res, next) => {
  console.log("post" + req.session.updateid);
  if (req.session.updateid !== null) {
    Expenditure.findOneAndUpdate(
      {
        _id: req.session.updateid
      },
      {
        $set: {
          username: req.session.username,
          name: req.body.name,
          type: req.body.type,
          modeofpayment: req.body.modeofpayment,
          bankname: req.body.bankname,
          amount: req.body.amount
        }
      },
      {
        upsert: true
      },
      (err, data) => {
        if (err) res.send(err);
        else {
          req.session.updateid = null;
          console.log(req.session.updateid);
          console.log(data);
          res.send("Details Updated");
        }
      }
    );
  } else {
    const expenditureData = {
      username: req.session.username,
      name: req.body.name,
      type: req.body.type,
      modeofpayment: req.body.modeofpayment,
      bankname: req.body.bankname,
      amount: req.body.amount
    };

    Expenditure.create(expenditureData, (error, input) => {
      if (error) {
        return next(error);
      } else {
        return res.send("expenditure added");
      }
    });
  }
});

//forgot password mail

router.post("/forgotpassword", (req, res) => {
  let email = req.body.email;
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "harshita.yadav@terralogic.com",
      pass: "Harshi@16"
    }
  });

  var mailOptions = {
    from: "harshita.yadav@terralogic.com",
    to: email, //"harshita16feb@gmail.com",
    subject: "Forgot Password mail",
    text: "Please re-enter password!"
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      res.send("Mail Sent");
    }
  });
});

//pagination
router.get("/users", (req, res) => {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(req.query.size);
  var query = {};
  if (pageNo < 0 || pageNo === 0) {
    response = {
      error: true,
      message: "invalid page number, should start with 1"
    };
    return res.json(response);
  }
  query.skip = size * (pageNo - 1);
  query.limit = size;
  // Find some documents
  Detail.find({}, {}, query, function(err, data) {
    // Mongo command to fetch all data from collection.
    if (err) {
      response = { error: true, message: "Error fetching data" };
    } else {
      response = { error: false, message: data };
    }
    res.json(response);
  });
});

//GET route to get JWT token
/**
 * @api {get} /gettoken to get JWT token
 * @apiName gettoken
 * @apiSuccess {JSON} sends JWT token
 */
router.get("/gettoken", (req, res, next) => {
  res.json({
    token: req.session.token
  });
});

//GET route to get all fields in for the form
/**
 * @api {GET} /newfield Get all fields in the form
 * @apiName newfield
 * @apiGroup Input
 * @apiSuccess {String} name of the field
 * @apiSuccess {String} type of the field
 * @apiSuccess {String} required or optional
 * @apiSuccess {String} default value
 * @apiError Sends the error
 */
router.get("/getexpenditure", ensureToken, (req, res, next) => {
  // Expenditure.find((err, data) => {
  //   if (err) res.send(err);
  //   else return res.send(data);
  // });
  Expenditure.find(
    {
      username: req.session.username
    },
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

//GET route to delete user according to ID
/**
 * @api {get} /user Gets users information
 * @apiName user
 * @apiGroup User
 * @apiSuccess {String} get user name
 * @apiSuccess {String} get user email id
 * @apiSuccess {String} get user username
 * @apiSuccess {String} get user hashed password
 * @apiError Sends the error
 */
router.get("/user", ensureToken, (req, res, next) => {
  User.find((err, data) => {
    if (err) res.send(err);
    else return res.send(data);
  });
});

router.get("/monthlyincome", (req, res, next) => {
  Income.aggregate(
    [
      { $match: { username: req.session.username } },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/totalexpenditure", (req, res, next) => {
  Expenditure.aggregate(
    [
      { $match: { username: req.session.username } },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/creditcard", (req, res, next) => {
  Expenditure.aggregate(
    [
      {
        $match: { modeofpayment: "Credit Card", username: req.session.username }
      },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/debitcard", (req, res, next) => {
  Expenditure.aggregate(
    [
      {
        $match: { modeofpayment: "Debit Card", username: req.session.username }
      },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/onlinepayment", (req, res, next) => {
  Expenditure.aggregate(
    [
      {
        $match: {
          modeofpayment: "Online Payment",
          username: req.session.username
        }
      },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/cash", (req, res, next) => {
  Expenditure.aggregate(
    [
      {
        $match: { modeofpayment: "Cash", username: req.session.username }
      },
      {
        $group: {
          _id: null,
          sum: { $sum: "$amount" }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

// router.get("/availablebalance", (req, res, next) => {
//   Expenditure.aggregate(
//     [
//       {
//         from: "holIncomeidays",
//            pipeline: [
//               //{ $match: { year: 2018 } },
//               { $project: { _id: 0, date: { name: "$name", date: "$date" } } },
//               { $replaceRoot: { newRoot: "$date" } }
//            ],
//            as: "holidays"
//       }
//     ],
//     (err, data) => {
//       if (err) res.send(err);
//       else return res.send(data);
//     }
//   );
// });

//GET route to redirect to home page
/**
 * @api {get} /homepage redirects to homepage of application
 * @apiName homepage
 */
router.get("/updatexp/:id", (req, res, next) => {
  req.session.updateid = req.params.id;
  console.log(req.session.updateid);
  return res.redirect("/updatepage");
});

router.get("/defaultvalue", ensureToken, (req, res) => {
  console.log(req.session.updateid);
  Expenditure.findOne(
    {
      _id: req.session.updateid
    },
    (err, data) => {
      if (err) res.send(err);
      else res.json(data);
    }
  );
});

router.post("/updatexpenditure", (req, res) => {
  Expenditure.findOneAndUpdate(
    {
      _id: req.session.updateid
    },
    {
      $set: {
        username: req.session.username,
        name: req.body.name,
        type: req.body.type,
        modeofpayment: req.body.modeofpayment,
        bankname: req.body.bankname,
        amount: req.body.amount
      }
    },
    {
      upsert: true
    },
    (err, data) => {
      if (err) res.send(err);
      else {
        console.log(data);
        res.send("Details Updated");
      }
    }
  );
});

//GET route to redirect to home page
/**
 * @api {get} /homepage redirects to homepage of application
 * @apiName homepage
 */
router.get("/updatepage", (req, res, next) => {
  return res.sendFile(
    path.join(__dirname + "/../views/expenditureupdate.html")
  );
});

router.get("/forgotpasswordpage", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/forgotpassword.html"));
});

router.get("/expendituretable", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/expendituretable.html"));
});

router.get("/expenditureform", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/expenditureform.html"));
});

router.get("/incomeform", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/incomeform.html"));
});

router.get("/fieldadded", (req, res, next) => {
  res.send("form submitted" + "<br><a href='/logout'>Logout</a>");
});

//GET route to delete single field document according to ID
/**
 * @api {delete} /deleteField/:id Deletes single field document
 * @apiName deleteField
 * @apiGroup Input
 * @apiSuccess {String} delete field name
 * @apiSuccess {String} delete field type
 * @apiSuccess {String} delete required or optional
 * @apiSuccess {String} delete default value of field
 * @apiError Sends the error
 */
router.get("/deleteExpenditure/:id", (req, res) => {
  Expenditure.findOneAndRemove(
    {
      _id: req.params.id
    },
    (err, data) => {
      if (err) res.send(err);
      else {
        return res.redirect("/expendituretable");
      }
    }
  );
});

// GET for approval mails to be sent
router.get("/approve", function(req, res, next) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "harshita.yadav@terralogic.com",
      pass: "Harshi@16"
    }
  });

  var mailOptions = {
    from: "harshita.yadav@terralogic.com",
    to: "harshita16feb@gmail.com",
    subject: "Approval mail",
    text: "Please approve!"
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
});

//GET route for user to logout
/**
 * @api {get} /logout Destroys session and returns to login page
 * @apiName logout
 * @apiSuccess {String} redirects to login page
 * @apiError Sends the error
 */
router.get("/logout", (req, res, next) => {
  if (req.session) {
    // delete session object
    req.session.destroy(err => {
      if (err) {
        return next(err);
      } else {
        return res.redirect("/");
      }
    });
  }
});

module.exports = router;
