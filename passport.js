/**
 * @file Defines Passport strategies for user authentication (Local and JWT).
 */

/**
 * Import necessary modules for Passport configuration.
 */
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const Models = require("./models.js");
const passportJWT = require("passport-jwt");

/**
 * @const
 * @type {Models.User}
 */
let Users = Models.User;

/**
 * ExtractJWT strategy for Passport JWT authentication.
 * @const
 * @type {passportJWT.Strategy}
 */
let JWTStrategy = passportJWT.Strategy;

/**
 * ExtractJWT utility for Passport JWT authentication.
 * @const
 * @type {passportJWT.ExtractJwt}
 */
let ExtractJWT = passportJWT.ExtractJwt;

/**
 * Local strategy for Passport authentication.
 * @constant
 * @type {LocalStrategy}
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, callback) => {
      console.log(`${username} ${password}`);
      await Users.findOne({ username: username })
        .then((user) => {
          if (!user) {
            console.log("incorrect username");
            return callback(null, false, {
              message: "Incorrect username or password.",
            });
          }
          if (!user.validatePassword(password)) {
            console.log("incorrect password");
            return callback(null, false, { message: "Incorrect password." });
          }
          console.log("finished");
          return callback(null, user);
        })
        .catch((error) => {
          if (error) {
            console.log(error);
            return callback(error);
          }
        });
    }
  )
);

/**
 * JWT strategy for Passport authentication.
 * @constant
 * @type {JWTStrategy}
 */
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "your_jwt_secret",
    },
    async (jwtPayload, callback) => {
      return await Users.findById(jwtPayload._id)
        .then((user) => {
          return callback(null, user);
        })
        .catch((error) => {
          return callback(error);
        });
    }
  )
);
