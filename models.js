/**
 * @file Defines the Mongoose schemas and models for Movies and Users.
 */

/**
 * Import necessary modules for schema and model definition.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

/**
 * Schema representing a director.
 * @constant
 * @schema directorSchema
 */
let directorSchema = mongoose.Schema({
    Name: { type: String, required: true },
    Bio: String,
    Birthdate: Date,
    DeathYear: { type: Number, required: false }, 
    Movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
  });
  

/**
 * Schema representing a movie.
 * @constant
 * @schema movieSchema
 */
let movieSchema = mongoose.Schema({
  Title: { type: String, required: true },
  Synopsis: { type: String, required: true },
  Genre: {
    Name: String,
    Description: String,
  },
  Director: { type: directorSchema },
  Actors: [String],
  imagePath: String,
  Featured: Boolean,
});

/**
 * Schema representing a user.
 * @constant
 * @schema userSchema
 */
let userSchema = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  birthdate: Date,
  favoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
});

/**
 * Static method to hash a password using bcrypt.
 * @function
 * @method hashPassword
 * @param {string} password - The password to hash.
 * @returns {string} - The hashed password.
 */
userSchema.statics.hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

/**
 * Method to validate a password against the hashed password.
 * @function
 * @method validatePassword
 * @param {string} password - The password to validate.
 * @returns {boolean} - True if the password matches, false otherwise.
 */
userSchema.methods.validatePassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

/**
 * Create the Movie model.
 * @const
 * @type {mongoose.Model}
 */
let Movie = mongoose.model("Movie", movieSchema);

/**
 * Create the User model.
 * @const
 * @type {mongoose.Model}
 */
let User = mongoose.model("User", userSchema);

/**
 * Export the Movie model.
 * @exports Movie
 * @type {mongoose.Model}
 */
module.exports.Movie = Movie;

/**
 * Export the User model.
 * @exports User
 * @type {mongoose.Model}
 */
module.exports.User = User;
