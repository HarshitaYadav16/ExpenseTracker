const mongoose = require("mongoose");

const DetailSchema = new mongoose.Schema({
  name: {
    type: String
  },
  age: {
    type: Number
  }
});

const Detail = mongoose.model("Detail", DetailSchema);
module.exports = Detail;
