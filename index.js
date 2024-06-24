const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const auth = require("./auth");
const routerUser = require("./router-users.js");
const routerMovies = require("./router-movies");

const app = express();
app.use(cors());

// mongoose.connect("mongodb://localhost:27017/moviesdb", {
// useNewUrlParser: true,
// useUnifiedTopology: true,
// });

mongoose.connect(
   process.env.CONNECTION_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Log requests to server (Morgan Middleware)
let myLogger = (req, res, next) => {
  console.log(req.url);
  next();
};

let requestTime = (req, res, next) => {
  req.requestTime = Date.now();
  next();
};

app.use(myLogger);
app.use(requestTime);

// Express routers
auth(app);
routerUser(app);
routerMovies(app);

// Default text response
app.get("/", (req, res) => {
  res.send("Welcome to MoviesDB!");
});

// Default text response
app.get("/docs", (req, res) => {
  res.redirect("/documentation.html");
});

app.use(express.static("public"));

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke! " + err.message);
});

// Listen on port
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
