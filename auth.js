const jwtSecret = "your_jwt_secret";

const jwt = require("jsonwebtoken"),
  passport = require("passport");

require("./passport");

let generateJWTToken = (user) => {
  /**
   * Generates a JWT token for the given user
   *
   * @function
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  return jwt.sign(user, jwtSecret, {
    subject: user.username,
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

module.exports = (router) => {
  /**
   * Login route that authenticates the user and generates a JWT token
   *
   * @route POST /login
   * @group Authentication - Operations about authentication
   * @param {Object} req.body - User credentials (username and password)
   * @param {string} req.body.username - User's username
   * @param {string} req.body.password - User's password
   * @returns {Object} 200 - An object containing the user and JWT token
   * @returns {Error} 400 - Invalid username or password
   */
  router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: "Something is not right.",
          user: user,
          info,
          error,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
};
