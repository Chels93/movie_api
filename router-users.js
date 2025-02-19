const express = require("express");
const cors = require("cors");
const passport = require("passport");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const Users = Models.User;

module.exports = (app) => {
  /**
   * Enable CORS for all routes or specifies origins
   */
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );

  /**
   * Returns a list of all users
   * @returns {Array<object>} Array of user objects
   * Requires Jwt authentication
   */
  app.get(
    "/users",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.find()
        .then(function (users) {
          res.status(200).json(users);
        })
        .catch(function (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  /**
   * Registers a new user and returns the user data along with a JWT token
   *
   * @param {object} req - The request object.
   * @param {object} req.body - The request body.
   * @param {string} req.body.username - The username of the new user.
   * @param {string} req.body.password - The password of the new user.
   * @param {string} req.body.email - The email address of the new user.
   * @param {string} req.body.birthdate - The birthdate of the new user in YYYY-MM-DD format.
   * @param {object} res - The response object.
   * @returns {object} - A JSON object containing the created user data and a JWT token.
   */
  app.post(
    "/users",
    [
      check(
        "username",
        "Username is required and must be at least 5 characters long."
      )
        .isLength({ min: 5 })
        .isAlphanumeric()
        .withMessage("Username contains non-alphanumeric characters."),
      check("password", "Password is required").notEmpty(),
      check("email", "A valid email is required").isEmail(),
      check("birthdate", "Birthdate must be a valid date in YYYY-MM-DD format.")
        .isISO8601()
        .toDate(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const { username, password, email, birthdate } = req.body;

      if (!username || !password || !email || !birthdate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const existingUser = await Users.findOne({ username });
        if (existingUser) {
          return res.status(400).send(`${username} already exists.`);
        }

        const hashedPassword = Users.hashPassword(password);
        const newUser = await Users.create({
          username,
          password: hashedPassword,
          email,
          birthdate,
        });

        const token = jwt.sign(
          { username: newUser.username, id: newUser._id },
          "your_secret_key",
          { expiresIn: "1h" }
        );

        return res.status(201).json({
          user: newUser,
          token: token,
        });
      } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * Allows users to login
   * @param {object} req.body - The request body
   * @param {string} req.body.username - Username of the user
   * @param {string} req.body.password - Password of the user
   * @returns {object} JWT token
   */
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }
    try {
      const user = await Users.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const token = jwt.sign(
        { username: user.username, id: user._id },
        "your_secret_key",
        { expiresIn: "1h" }
      );
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Allows users to update their user info
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user to update
   * @param {object} req.body - Data to update
   * @returns {object} Updated user object
   */
  app.put(
    "/users/:username",
    passport.authenticate("jwt", { session: false }),
    [
      check("username", "Username is required").isLength({ min: 5 }),
      check(
        "username",
        "Username contains non-alpanumeric characters - not allowed."
      ).isAlphanumeric(),
      check("password", "Password must be between 8 and 20 characters")
        .optional()
        .isLength({ min: 8, max: 20 }),
      check("email", "Email does not appear to be valid").isEmail(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      try {
        const updateData = {};
        if (req.body.username) updateData.username = req.body.username;
        if (req.body.password)
          updateData.password = Users.hashPassword(req.body.password);
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.birthdate) updateData.birthdate = req.body.birthdate;

        const updatedUser = await Users.findOneAndUpdate(
          { username: req.params.username },
          updateData,
          { new: true }
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json(updatedUser);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error: " + error);
      }
    }
  );

  /**
   * Get user info by username
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user to retrieve
   * @returns {object} User object if found
   */
  app.get(
    "/users/:username",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const user = await Users.findOne({ username: req.params.username });
        if (!user) {
          return res.status(404).send("User not found.");
        }
        res.status(200).json(user);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error: " + error);
      }
    }
  );

  /**
   * Get favorite movies for a specific user
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user
   * @returns {Array<object>} Array of favorite movie objects
   */
  app.get(
    "/users/:username/favoriteMovies",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const user = await Users.findOne({ username: req.params.username })
          .populate("favoriteMovies")
          .exec();

        if (!user) {
          return res.status(404).send("User not found.");
        }

        res.status(200).json(user.favoriteMovies);
      } catch (error) {
        console.error("Error fetching favorite movies:", error);
        res.status(500).send("Error: " + error.message);
      }
    }
  );

  /**
   * Allows users to add a movie to their list of favorites
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user
   * @param {string} req.params.movieId - The ID of the movie
   * @returns {object} Updated user object
   */
  app.post(
    "/users/:username/movies/:movieId",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOneAndUpdate(
        { username: req.params.username },
        { $addToSet: { favoriteMovies: req.params.movieId } },
        { new: true }
      )
        .then((updatedUser) => {
          res.status(200).json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  /**
   * Allows users to remove a movie from their list of favorites
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user
   * @param {string} req.params.movieId - The ID of the movie
   * @returns {object} Updated user object
   */
  app.delete(
    "/users/:username/movies/:movieId",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOneAndUpdate(
        { username: req.params.username },
        { $pull: { favoriteMovies: req.params.movieId } },
        { new: true }
      )
        .then((updatedUser) => {
          if (!updatedUser) {
            return res.status(404).send("User not found.");
          }
          res.status(200).json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  /**
   * Allows existing users to deregister
   * Requires JWT authentication
   * @param {string} req.params.username - The username of the user
   * @returns {string} Confirmation message
   */
  app.delete(
    "/users/:username",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const user = await Users.findOneAndDelete({
          username: req.params.username,
        });
        if (!user) {
          return res.status(400).send(req.params.username + " was not found.");
        }
        res.status(200).send(req.params.username + " was deleted.");
      } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).send("Error: " + err.message);
      }
    }
  );
};
