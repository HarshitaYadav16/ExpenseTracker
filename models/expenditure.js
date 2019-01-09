const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ExpenditureSchema = new mongoose.Schema({
  username: {
    type: String
  },
  name: {
    type: String
  },
  type: {
    type: String
  },
  modeofpayment: {
    type: String,
    trim: true
  },
  bankname: {
    type: String,
    trim: true
  },
  amount: {
    type: Number
  }
});

const Expenditure = mongoose.model("Expenditure", ExpenditureSchema);
module.exports = Expenditure;
