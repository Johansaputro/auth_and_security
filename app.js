//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const bcrypt = require("bcrypt");
const findOrCreate = require("mongoose-findorcreate");
// const sha512 = require('js-sha512');
// const crypto = require("crypto");
const ejs = require("ejs")

//security keys
require('dotenv').config()

// using passport library
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//google oauth2.0
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

//facebook oauth2.0
const FacebookStrategy = require('passport-facebook');


const app = express();

// salting and hashing
// const saltRounds = 10;

//hashing using crypto module
// const { createHmac } = await import('crypto');
//
// const hash = createHmac('sha256', process.env.SECRET)

app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// google oauth2.0
passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:2200/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

//facebook oauth
passport.use(new FacebookStrategy({
    clientID:     process.env.FB_ID,
    clientSecret: process.env.FB_SECRET,
    callbackURL: "http://localhost:2200/auth/facebook/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.set('views', './views');
app.set("view engine", "ejs");

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String
  }
);

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//encryption using env
// var encKey = process.env.SOME_32BYTE_BASE64_STRING;
// var sigKey = process.env.SOME_64BYTE_BASE64_STRING;

// userSchema.plugin(encrypt, {encryptionKey: encKey, signingKey: sigKey, excludeFromEncryption: ['username']});
// userSchema.plugin(encrypt, {secret:process.env.SECRET, excludeFromEncryption: ['username']});

const User = new mongoose.model("user", userSchema);

//passport local mongoose
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


//google oauth2.0
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/register'
}));


//facebook auth
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope:
      ['email' , 'public_profile' ] }
));

app.get( '/auth/facebook/secrets',
    passport.authenticate( 'facebook', {
        successRedirect: '/secrets',
        failureRedirect: '/register'
}));
//
// app.get('/oauth2/redirect/facebook',
//   passport.authenticate('facebook', { failureRedirect: '/login', failureMessage: true }),
//   function(req, res) {
//     res.redirect('/secrets');
//   });



//own route
app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

// without passport
// app.post("/login", function(req, res) {
//   var uname_login = req.body.username;
//   var pw_login = req.body.password;
//   User.findOne({username: uname_login}, function(err, rs){
//     if (err) throw err;
//     else {
//       if (rs) {
//         bcrypt.compare(pw_login, rs.password, function(err, crypRes){
//           if (crypRes === true) {
//             res.render("secrets");
//           }
//         }) }
//       else {
//           res.render("login");
//         }
//       }
// })
// });

// after passport (bugged)
// app.post("/login", function(req, res) {
//   const user = new User({
//     username: req.body.username,
//     password: req.body.password,
//   });
//
//   req.login(user, function(err){
//     if (err) {
//       console.log(err);
//     }
//     else {
//       passport.authenticate("local")(req, res, function() {
//         res.redirect("/secrets")
//       })
//     }
//   })
// })

// fix bug of still logging in
// app.post('/login',
//   passport.authenticate('local', { failureRedirect: '/login' }),
//   function(req, res) {
//     res.redirect('/secrets');
//   });

// another fix by community
app.post("/login",
    passport.authenticate("local"), function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if(err) {
            console.log(err);
        } else {
            res.redirect("/secrets");
        }
    });
});

app.get("/register", function(req, res) {
  res.render("register");
});


// without passport
// app.post("/register", function(req, res) {
//   var uname = req.body.username;
//   var pw = req.body.password;
//   // const newUser = new User({username: uname, password: sha512(pw)})
//   bcrypt.hash(pw, saltRounds, function(err, hash) {
//     const newUser = new User({username: uname, password: hash})
//     newUser.save(function(err, rs) {
//       if (err) throw err;
//       else{
//         res.render("login")
//       }
//     })
//   })
// });

// with passport
app.post("/register", function(req, res) {
  var uname = req.body.username;
  var pw = req.body.password;
  User.register({username:uname, active: false}, pw, function(err, user) {
  if (err) {
    console.log(err);
    res.redirect("/register");
  } else {
    passport.authenticate("local")(req, res, function() {
      res.redirect("/secrets")
    })
  }
    // Value 'result' is set to false. The user could not be authenticated since the user is not active
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
})

app.get("/secrets", function(req, res) {
  // prevent bug using the back button of browser
  res.set(
    'Cache-Control',
    'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
  );
  if (req.isAuthenticated()) {
    res.render("secrets");
  }
  else {
    res.redirect("/login");
  }
});


app.listen(process.env.PORT || 2200, function(){
  console.log("Server started on port 2200");
});
