require('dotenv').config(); //Loads .env variables

/**
 * @file Overview of the server setup for a Movie API.
 */

/**
 * Import necessary modules for server setup.
 */

const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const auth = require("./auth");
const routerUser = require("./router-users.js");
const routerMovies = require("./router-movies");

/**
 * Create an instance of Express application.
 * @const
 */
const app = express();

/**
 * Define the allowed origins for CORS.
 * @const {string[]}
 */
const allowedOrigins = [
  "https://cinevault93.netlify.app",
  "https://chels93.github.io/CineVault-Angular-client",
  "https://chels93.github.io",
  "http://localhost:3000",
  "http://localhost:4200",
];

/**
 * Middleware for handling CORS.
 * @function
 * @param {string|null} origin - The origin of the request.
 * @param {function} callback - The callback function for handling the result.
 */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let message =
          "The CORS policy for this application doesn’t allow access from origin " +
          origin;
        return callback(new Error(message), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

/**
 * Middleware for parsing JSON requests.
 */
app.use(bodyParser.json());

/**
 * Custom middleware for logging requests.
 * @function
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {function} next - The next middleware function.
 */
let myLogger = (req, res, next) => {
  console.log(req.url);
  next();
};

/**
 * Middleware for setting request time.
 * @function
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {function} next - The next middleware function.
 */
let requestTime = (req, res, next) => {
  req.requestTime = Date.now();
  next();
};

app.use(myLogger);
app.use(requestTime);

/**
 * Connect to MongoDB database.
 * @function
 * @async
 * @param {string} process.env.CONNECTION_URI - The MongoDB connection URI.
 */
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Setup authentication routes.
 */
auth(app);

/**
 * Setup user-related routes.
 */
routerUser(app);

/**
 * Setup movie-related routes.
 */
routerMovies(app);

/**
 * Documentation redirection route.
 * @function
 * @route GET /docs
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
app.get("/docs", (req, res) => {
    res.redirect("/documentation.html");
  });
  

app.use(express.static(path.join(__dirname, "public")));


/**
 * Default route responding with a welcome message.
 * @function
 * @route GET /
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */
app.get("/", (req, res) => {
  res.send("Welcome to MoviesDB!");
});

/**
 * Error handling middleware.
 * @function
 * @param {Error} err - The error object.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {function} next - The next middleware function.
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke! " + err.message);
});

/**
 * Start the server on a specified port.
 * @function
 * @listens {number} port - The port to listen on.
 */
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on Port ${port}`);
});
