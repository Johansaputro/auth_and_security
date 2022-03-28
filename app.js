//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
var sha512 = require('js-sha512');
// const crypto = require("crypto");
const ejs = require("ejs")
const app = express();

//hashing using crypto module
// const { createHmac } = await import('crypto');
//
// const hash = createHmac('sha256', process.env.SECRET)

mongoose.connect('mongodb://localhost:27017/userDB');

app.use(express.static('public'))

app.set('views', './views');
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));


const userSchema = new mongoose.Schema(
  {username: String,
  password: String,}
);


//encryption using env
// var encKey = process.env.SOME_32BYTE_BASE64_STRING;
// var sigKey = process.env.SOME_64BYTE_BASE64_STRING;

// userSchema.plugin(encrypt, {encryptionKey: encKey, signingKey: sigKey, excludeFromEncryption: ['username']});
// userSchema.plugin(encrypt, {secret:process.env.SECRET, excludeFromEncryption: ['username']});

const User = mongoose.model("user", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  var uname_login = req.body.username;
  var pw_login = req.body.password;
  User.findOne({username: uname_login}, function(err, rs){
    if (err) throw err;
    else {
      if (rs) {
        if (sha512(pw_login) === rs.password) {
          res.render("secrets");
        }
        else {
          res.render("login");
        }
      }
      else{
        res.render("register");
    }
  }
})
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  var uname = req.body.username;
  var pw = req.body.password;
  const newUser = new User({username: uname, password: sha512(pw)})
  newUser.save(function(err, rs) {
    if (err) throw err;
    else{
      res.render("login")
    }
  })
})


app.listen(process.env.PORT || 2200, function(){
  console.log("Server started on port 2200");
});
