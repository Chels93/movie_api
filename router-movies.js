const passport = require("passport");
const cors = require("cors");
const Models = require("./models.js");

const Movies = Models.Movie;

module.exports = (app) => {
    // Enables CORS for all routes or specifies origins as needed
    app.use(cors({
        origin: "*",
        credentials: true,
    }));    
  // Returns a JSON object of all movies to the user
  app.get(
    "/movies",
    async (req, res) => {
      await Movies.find()
        .then((movies) => {
          res.status(201).json(movies);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  // Returns data (description, genre, director, image URL) about a single movie by title
  app.get(
    "/movies/:Title",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Movies.findOne({ Title: req.params.Title })
        .then((movie) => {
          res.json(movie);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  // Returns data about a genre by name/title
  app.get(
    "/movies/genre/:genreName",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Movies.findOne({ "Genre.Name": req.params.genreName })
        .then((genre) => {
          if (!genre) {
            return res.status(404).send("Genre not found.");
          }
          res.status(200).json(genre);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );

  // Returns data about a director (bio, birth year, death year) by name
  app.get(
    "/movies/director/:directorName",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Movies.findOne({ "Director.Name": req.params.directorName })
        .then((director) => {
          if (!director) {
            return res.status(404).send("Director not found.");
          }
          res.status(200).json(director);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    }
  );
};