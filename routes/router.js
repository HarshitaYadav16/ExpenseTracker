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
router.post("/addfield", (req, res, next) => {
  const fieldData = {
    fieldname: req.body.fieldname,
    fieldtype: req.body.fieldtype,
    required: req.body.required,
    defaultvalue: req.body.defaultvalue
  };

  Input.create(fieldData, (error, input) => {
    if (error) {
      return next(error);
    } else {
      return res.redirect("/homepage");
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
router.post("/addincome", (req, res, next) => {
  const incomeData = {
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

//POST route to add new field in the form
/**
 * @api {post} /addnewfield Posts form data in db
 * @apiName addnewfield
 * @apiGroup Field
 * @apiSuccess  Redirection to a table which shows form data
 * @apiError Sends the error
 */
router.post("/addnewfield", (req, res, next) => {
  let result = req.body;
  for (var i in result) {
    if (isNaN(result[i])) {
    } else {
      result[i] = parseInt(result[i]);
    }
  }
  Field.create(result, (error, input) => {
    if (error) {
      return next(error);
    } else {
      return res.redirect("/tablepage");
    }
  });
});

router.post("/updaterow/:id", (req, res, next) => {
  Field.findOneAndUpdate(
    {
      _id: req.params.id
    },
    {
      $set: req.body
    },
    {
      upsert: true
    },
    (err, data) => {
      if (err) res.send(err);
      else {
        console.log(data);
        res.redirect("/tablepage");
      }
    }
  );
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
  Expenditure.find((err, data) => {
    if (err) res.send(err);
    else return res.send(data);
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
router.get("/newfield", ensureToken, (req, res, next) => {
  Input.find((err, data) => {
    if (err) res.send(err);
    else return res.send(data);
  });
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

//GET route to delete user according to ID
/**
 * @api {get} /formfield Gets type of fields to create form
 * @apiName formfield
 * @apiGroup Field
 * @apiSuccess {String} get dynamic form data
 * @apiError Sends the error
 */
router.get("/formfield", ensureToken, (req, res, next) => {
  Field.find((err, data) => {
    if (err) res.send(err);
    else return res.send(data);
  });
});

router.get("/report", ensureToken, (req, res, next) => {
  Field.aggregate(
    [
      {
        $group: {
          _id: "$Location",
          people: { $push: "$Name" },
          count: { $sum: 1 }
        }
      }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

router.get("/monthlyincome", (req, res, next) => {
  Income.aggregate(
    [
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
        $match: { modeofpayment: "Credit Card" }
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
        $match: { modeofpayment: "Debit Card" }
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
        $match: { modeofpayment: "Online Payment" }
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
        $match: { modeofpayment: "Cash" }
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

router.get("/check", ensureToken, (req, res, next) => {
  Field.aggregate(
    [
      { $project: { o: { $objectToArray: "$$ROOT" } } },
      { $unwind: "$o" },
      { $group: { _id: null, keys: { $addToSet: "$o.k" } } }
    ],
    (err, data) => {
      if (err) res.send(err);
      else return res.send(data);
    }
  );
});

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

//GET route to redirect to home page
/**
 * @api {get} /homepage redirects to homepage of application
 * @apiName homepage
 */
router.get("/homepage", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/homepage.html"));
});

//GET route to redirect to add field page
/**
 * @api {get} /addfieldpage redirects to page where you can add a new field in the dynamic form
 * @apiName addfieldpage
 */
router.get("/addfieldpage", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/addfield.html"));
});

//GET route to redirect to form table page
/**
 * @api {get} /tablepage redirects to page displaying dynamic form data in table format
 * @apiName tablepage
 */
router.get("/tablepage", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/table.html"));
});

//GET route to redirect to user form page
/**
 * @api {get} /userform redirects to page where form is displayed for user to fillup
 * @apiName userform
 */
router.get("/userform", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/userform.html"));
});

router.get("/expendituretable", (req, res, next) => {
  return res.sendFile(path.join(__dirname + "/../views/expendituretable.html"));
});

router.get("/fieldadded", (req, res, next) => {
  res.send("form submitted" + "<br><a href='/logout'>Logout</a>");
});

//GET route to delete all documents of the dynamic form
/**
 * @api {get} /fieldadded Deletes movie information
 * @apiName fieldadded
 * @apiGroup Field
 * @apiSuccess {String} delete all documents in form
 * @apiError Sends the error
 */
router.get("/deleteallfields", (req, res, next) => {
  Field.deleteMany({}, (err, data) => {
    if (err) res.send(err);
    else {
      res.send("");
    }
  });
});

//GET route to delete all fields of the form
/**
 * @api {get} /clearinputfields Deletes all fields of the form
 * @apiName clearinputfields
 * @apiGroup Input
 * @apiSuccess {String} deletes all fields of the form
 * @apiError Sends the error
 */
router.get("/clearinputfields", (req, res, next) => {
  Input.deleteMany({}, (err, data) => {
    if (err) res.send(err);
    else {
      res.redirect("/homepage");
    }
  });
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
router.get("/deleteField/:id", (req, res) => {
  Input.findOneAndRemove(
    {
      _id: req.params.id
    },
    (err, data) => {
      if (err) res.send(err);
      else {
        return res.redirect("/homepage");
      }
    }
  );
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
router.get("/deleterow/:id", (req, res) => {
  Field.findOneAndRemove(
    {
      _id: req.params.id
    },
    (err, data) => {
      if (err) res.send(err);
      else {
        return res.redirect("/tablepage");
      }
    }
  );
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
