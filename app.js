const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = new express();

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.use(
  session({
    secret: "some random secret key",
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://admin:ytlmylove0224@cluster0-anjwy.mongodb.net/test?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  payment: [
    {
      cardNumber: String,
      cardHolderName: String,
      cardPin: Number
    }
  ],
  currentBattery: { type: String, default: null }
});

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });

const User = new mongoose.model("User", userSchema);

const Battery = mongoose.model("Battery", {
  available: Boolean,
  bnumber: String
});

const Transaction = mongoose.model("Transaction", {
  created_at: { type: Date, required: true, default: Date.now },
  user: String,
  battery: String,
  payment: String,
  cardNum: String
});

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/signin", function(req, res) {
  res.render("signin");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/login", function(req, res) {
  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("rental");
      });
    }
  });
});

/*
app.post("/login", passport.authenticate("local"), function(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  //check user credentials
  User.findOne({ email: email, password: password }, function(err, foundUser) {
    if (!foundUser) {
      console.log("incorrect email or pw");
    } else {
      //authenticate user
      res.redirect("rental");
    }
  });
});
*/
app.get("/aboutus", function(req, res){
  res.render("aboutus");
})

app.get("/rental", function(req, res) {
  if (req.isAuthenticated()) {
    Battery.find({}, function(err, foundBatteries) {
      if (!err) {
        res.render("rental", {
          batteries: foundBatteries,
          email: req.user.email,
          payment: req.user.payment
        });
      }
    });
  } else {
    res.redirect("signin");
  }
});

app.get("/payments", function(req, res) {
  if (req.isAuthenticated()) {
    User.find({ id: req.user.id }, function(err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        Transaction.find({ user: req.user.id }, function(err, doc) {
          res.render("payments", {
            payment: req.user.payment,
            email: req.user.email,
            record: doc
          });
        });
      }
    });
  } else {
    res.redirect("signin");
  }
});

/*
app.post("/register", function(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  //check if user already exists
  User.findOne({ email: email }, function(err, foundUser) {
    if (foundUser) {
      console.log("account already exists");
    } else {
      //add new user to db
      const newUser = new User({ email: email, password: password });
      newUser.save(function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("user added");
        }
      });
    }
  });
});
*/

app.get("/addPayment", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("addPayment", { email: req.user.email });
  } else {
    res.redirect("signin");
  }
});

app.post("/addPayment", function(req, res) {
  User.findOneAndUpdate(
    { email: req.user.email },
    {
      $push: {
        payment: {
          cardNumber: req.body.cardNumber,
          cardHolderName: req.body.cardHolderName,
          cardPin: req.body.cardPin
        }
      }
    },
    function() {
      res.redirect("rental");
    }
  );
});

app.post("/register", function(req, res) {
  User.register({ email: req.body.email }, req.body.password, function(
    err,
    user
  ) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("rental");
      });
    }
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/deletePayment", function(req, res) {
  User.findOneAndUpdate(
    {
      "payment._id": req.body.paymentId
    },
    {
      $pull: { payment: { _id: req.body.paymentId } }
    },
    function(err, data) {
      if (!err) {
        res.redirect("payments");
      } else {
        console.log(err);
      }
    }
  );
});

/*
app.post("/confirmation", function(req, res){
  //check if user has battery or no payment
  var canBorrow;

  User.findOne({_id: req.user.id}, function(err, doc){
    if(doc.currentBattery == null && doc.payment.length > 0){
      canBorrow = true;
      console.log('user can borrow');
    } else {
      canBorrow = false;
      console.log("user cannot borrow")
    }
  })
  
  if(canBorrow){
    console.log(canBorrow);
    Battery.findOneAndUpdate({_id: req.body.battery}, {available: false}, function(err, doc){
      if(!err){
        console.log("updated battery")
      }
    })
    User.findOneAndUpdate({_id: req.user.id}, {currentBattery: req.body.battery}, function(err,doc){
      if(!err){
        console.log("updated user");
      }
    })
    Transaction.create({user: req.user.id, battery: req.body.battery}, function(err, doc){
      if(!err){
        console.log("updated transaction");
      }
    })
  } 

  res.redirect("rental");
})
*/

app.post("/confirmation", function(req, res) {
  //check if user has battery or no payment.get

  User.findOne({ _id: req.user.id }, function(err, doc) {
    if (
      doc.currentBattery == null &&
      doc.payment.length > 0 && req.body.cardnum
    ) {
      Battery.findOneAndUpdate(
        { _id: req.body.battery },
        { available: false },
        function(err, doc) {
          if (!err) {
          }
        }
      );
      User.findOneAndUpdate(
        { _id: req.user.id },
        { currentBattery: req.body.battery },
        function(err, doc) {
          if (!err) {
          }
        }
      );
      Transaction.create(
        { user: req.user.id, battery: req.body.battery },
        function(err, doc) {
          if (!err) {
          }
          console.log(doc.created_at);
          res.redirect("rental");
        }
      );
    } else if (doc.payment.length < 1) {
      console.log("user cannot borrow");
      res.redirect("addPayment");
    } else {
      res.redirect("rental");
    }
  });
});

app.get("/battery", function(req, res) {
  Battery.find({ available: true }, function(err, foundBatteries) {
    if (!err) {
      res.render("battery", {
        batteries: foundBatteries,
        payment: req.user.payment
      });
    }
  });
});

app.get("/return", function(req, res) {
  Battery.findOneAndUpdate(
    { _id: req.user.currentBattery },
    { $set: { available: true } },
    function(err, doc) {
      if (!err) {
      }
    }
  );

  User.findOneAndUpdate(
    { _id: req.user.id },
    { $set: { currentBattery: null } },
    function(err, doc) {
      if (!err) {
        console.log("returned");
      }
    }
  );

  res.redirect("rental");
});

var listener = app.listen(8080, function() {
  console.log("Listening on port " + listener.address().port);
});
