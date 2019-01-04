const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const IncomeSchema = new mongoose.Schema({
  name: {
    type: String
  },
  source: {
    type: String
  },
  amount: {
    type: Number
  }
});

const Income = mongoose.model("Income", IncomeSchema);
module.exports = Income;
