const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

//connect to MongoDB
mongoose.connect(
  "mongodb://user:expensetracker1@ds245523.mlab.com:45523/expensetracker",
  {
    useMongoClient: true
  }
);
const db = mongoose.connection;

//handle mongo error
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("connected to db");
});

//use sessions for tracking logins
app.use(
  session({
    secret: "work hard",
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
  })
);

// parse incoming requests
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// serve static files from template
app.use(express.static(__dirname + "/views"));

// include routes
const routes = require("./routes/router");
app.use("/", routes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("File Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

//process.env["PORT"] = "8000";
// listen on port 3000
app.listen(process.env.PORT, () => {
  console.log("Express app listening on port " + process.env.PORT);
});
