const passport = require("passport");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");

const Users = Models.User;

module.exports = (app) => {
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
      await Users.findOne({ username: req.body.username })
        .then((user) => {
          if (user) {
            return res.status(400).send(req.body.username + "already exists.");
          } else {
            Users.create({
              username: req.body.username,
              password: hashedPassword,
              email: req.body.email,
              birthdate: req.body.birthdate,
            })
              .then((user) => {
                res.status(201).json(user);
              })
              .catch((error) => {
                console.error(error);
                res.status(500).send("Error: " + error);
              });
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Error: " + error);
        });
    }
  );

  // Allows users to update their user info
  app.put(
    "/users/:username",
    [
      check("username", "Username is required").isLength({ min: 5 }),
      check(
        "username",
        "Username contains non alpanumeric characters - not allowed."
      ).isAlphanumeric(),
      check("password", "Password is required").not().isEmpty(),
      check("email", "Email does not appear to be valid").isEmail(),
      (req, res, next) => {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ errors: errors.array() });
        }
        next();
      },
      passport.authenticate("jwt", { session: false }),
    ],
    async (req, res) => {
      await Users.findOneAndUpdate(
        { username: req.params.username },
        {
          $set: {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            birthdate: req.body.birthdate,
          },
        },
        { new: true }
      )
        .then((updatedUser) => {
          res.json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  // get user info
  app.get(
    "/users/:username",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOne({ username: req.params.username })
        .then((user) => {
          if (!user) {
            console.log("incorrect username");
            return callback(null, false, {
              message: "User doesnt exist",
            });
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
  );

  // Allows users to add a movie to their list of favorites
  app.post(
    "/users/:username/movies/:_id",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOneAndUpdate(
        { username: req.params.username },
        { $addToSet: { favoriteMovies: req.params._id } },
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
    "/users/:username/movies/:ObjectId",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOneAndUpdate(
        { username: req.params.username },
        { username: req.params.username },
        { $pull: { favoriteMovies: req.params.ObjectId } }, 
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

  // Allows existing users to deregister
  app.delete(
    "/users/:username",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Users.findOneAndDelete({ username: req.params.username })
        .then((user) => {
          if (!user) {
            res.status(400).send(req.params.username + " was not found.");
          } else {
            res.status(200).send(req.params.username + " was deleted.");
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );
};
