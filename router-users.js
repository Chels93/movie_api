const express = require("express");
const cors = require("cors");
const passport = require("passport");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");

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
      check("username", "Username is required").isLength({ min: 5 }),
      check(
        "username",
        "Username contains non alpanumeric characters - not allowed."
      ).isAlphanumeric(),
      check("password", "Password is required").not().isEmpty(),
      check("email", "Email does not appear to be valid").isEmail(),
    ],
    async (req, res) => {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      if (!req.body.password || !req.body.username) {
        return res.status(400).json({ error: "username or password missing" });
      }

      let hashedPassword = Users.hashPassword(req.body.password);

      try {
        const existingUser = await Users.findOne({
          username: req.body.username,
        });
        if (existingUser) {
          return res.status(400).send(req.body.username + "already exists.");
        }

        const newUser = await Users.create({
          username: req.body.username,
          password: hashedPassword,
          email: req.body.email,
          birthdate: req.body.birthdate,
        });

        res.status(201).json(newUser);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error: " + error);
      }
    }
  );

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
