const passport = require("passport");
const cors = require("cors");
const Models = require("./models.js");

const Movies = Models.Movie;

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
   * Returns a JSON object of all movies
   *
   * @route GET /movies
   * @group Movies - Operations about movies
   * @security jwt
   * @returns {Array<Object>} 200 - Array of movies
   * @returns {Error} 500 - Internal server error
   */
  app.get("/movies", passport.authenticate("jwt", { session: false }), async (req, res) => {
    await Movies.find()
      .then((movies) => {
        const cleanedMovies = movies.map((movie) => {
          if (
            movie.director &&
            (movie.director.deathYear === null || movie.director.deathYear === undefined)
          ) {
            delete movie.director.deathYear; // Remove the field entirely if it's null or undefined
          }
          return movie;
        });
  
        res.status(201).json(cleanedMovies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  });
  

  /**
   * Returns data about a single movie by title
   *
   * @route GET /movies/:Title
   * @group Movies - Operations about movies
   * @security jwt
   * @param {string} Title.path.required - Title of the movie
   * @returns {Object} 200 - Movie object
   * @returns {Error} 500 - Internal server error
   */
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

  /**
   * Returns data about a genre by name/title
   *
   * @route GET /movies/genre/:genreName
   * @group Movies - Operations about movies
   * @security jwt
   * @param {string} genreName.path.required - Name of the genre
   * @returns {Object} 200 - Genre object
   * @returns {Error} 500 - Internal server error
   */
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

  /**
   * Returns data about a director by name
   *
   * @route GET /movies/director/:directorName
   * @group Movies - Operations about movies
   * @security jwt
   * @param {string} directorName.path.required - Name of the director
   * @returns {Object} 200 - Director object
   * @returns {Error} 500 - Internal server error
   */
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

  /**
   * Returns data about a single movie by its ID (_id)
   *
   * @route GET /movies/:id
   * @group Movies - Operations about movies
   * @security jwt
   * @param {string} id.path.required - ID of the movie (MongoDB _id)
   * @returns {Object} 200 - Movie object
   * @returns {Error} 500 - Internal server error
   */
  app.get(
    "/movies/:id", // Use movie ID as a parameter
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      await Movies.findById(req.params.id) // Find the movie by its MongoDB _id
        .then((movie) => {
          if (!movie) {
            return res.status(404).send("Movie not found.");
          }
          res.json(movie); // Return the movie data
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err); // Handle errors
        });
    }
  );
};
