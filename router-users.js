const express = require("express");
const cors = require("cors");
const passport = require("passport");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");
const jwt = require('jsonwebtoken');

const Users = Models.User;

module.exports = (app) => {
  // Enable CORS for all routes or specifies origins
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );

  // Returns a JSON object of all users
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

  // Allows new users to register
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
        return res.status(422).json({ errors: errors.array() }); // Return validation errors
      }
  
      const { username, password, email, birthdate } = req.body;
  
      if (!username || !password || !email || !birthdate) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      try {
        // Check if the username already exists
        const existingUser = await Users.findOne({ username });
        if (existingUser) {
          return res.status(400).send(`${username} already exists.`);
        }
  
        // Hash the password and create the new user
        const hashedPassword = Users.hashPassword(password);
        const newUser = await Users.create({
          username,
          password: hashedPassword,
          email,
          birthdate,
        });
  
        // Generate JWT token
        const token = jwt.sign(
          { username: newUser.username, id: newUser._id },
          'your_secret_key', // Replace with a secure secret key or use environment variables
          { expiresIn: '1h' }
        );
  
        // Return the new user and token
        return res.status(201).json({
          user: newUser,
          token: token // Return token alongside the user data
        });
      } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).send({ error: "Internal server error" });
      }
    }
  );
  

  // Allows users to login
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    try {
      // Find the user by username
      const user = await Users.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      // Check if the password is correct
      const isMatch = await user.comparePassword(password); // Assuming a method like comparePassword exists
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      // Generate a JWT token
      const token = jwt.sign(
        { username: user.username, id: user._id },
        "your_secret_key",
        { expiresIn: "1h" }
      );
      // Send the token to the client
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Allows users to update their user info
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

  // Get user info
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

  // Get favorite movies for a specific user
  app.get(
    "/users/:username/favoriteMovies",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const user = await Users.findOne({ username: req.params.username })
          .populate("favoriteMovies") // Populate to include movie details
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

  // Allows users to add a movie to their list of favorites
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

  // Allows users to remove a movie from their list of favorites
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

  // Allows existing users to deregister
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
