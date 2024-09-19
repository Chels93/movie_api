const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const auth = require("./auth");
const routerUser = require("./router-users.js");
const routerMovies = require("./router-movies");

const app = express();

// Define the allowed origins for CORS
const allowedOrigins = [
  'https://cinevault93.netlify.app',
  'http://localhost:3000', // This allows your local development environment to make requests
  'http://localhost:4200'
];

// Middleware for CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin like mobile apps or curl requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body Parser Middleware
app.use(bodyParser.json());

// Logging Middleware
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

// Database Connection
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Express routers
auth(app);
routerUser(app);
routerMovies(app);

// Default text response
app.get("/", (req, res) => {
  res.send("Welcome to MoviesDB!");
});

// Documentation redirect
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
  console.log(`Listening on Port ${port}`);
});