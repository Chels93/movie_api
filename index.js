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
 * External dependencies for S3 integration and file uploads.
 */
const fileUpload = require('express-fileupload');
const fs = require('fs');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Enable file upload middleware.
 * Adds a `files` property to the request object with uploaded files.
 */
app.use(fileUpload());

/**
 * S3 Client configuration for LocalStack.
 * 
 * region: The AWS region to connect to (LocalStack defaults to 'us-east-1').
 * endpoint: LocalStack URL to access the mock AWS services.
 * forcePathStyle: Required to correctly format S3 URLs for LocalStack.
 */
const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true,
});

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
  "http://54.221.41.75"
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
console.log("DEBUG: CONNECTION_URI is", process.env.CONNECTION_URI);
mongoose.connect(process.env.CONNECTION_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));


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
 * Name of the S3 bucket used for storing images.
 * Replace this with your actual bucket name used in LocalStack.
 * @const {string}
 */
const BUCKET_NAME = 'exercise-2.4-cf-specialization-bucket';


/**
 * Temporary path to store files before uploading them to S3.
 * Make sure this directory exists or create it dynamically.
 * @const {string}
 */
const UPLOAD_TEMP_PATH = './tmp';

/**
 * Ensure the temporary upload directory exists, create if it does not.
 */
if (!fs.existsSync(UPLOAD_TEMP_PATH)) {
  fs.mkdirSync(UPLOAD_TEMP_PATH);
}

/**
 * GET /images
 * Lists all objects currently stored in the specified S3 bucket.
 * This endpoint acts as a passthrough to the ListObjectsV2Command of AWS SDK.
 */
app.get('/images', async (req, res, next) => {
  try {
    const listObjectsParams = { Bucket: BUCKET_NAME };
    const command = new ListObjectsV2Command(listObjectsParams);
    const response = await s3Client.send(command);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /images
 * Handles uploading an image file to the S3 bucket.
 * Expects a multipart/form-data request with a file under the `image` key.
 * 
 * Process:
 * 1. Check if a file was uploaded.
 * 2. Save the file temporarily on disk.
 * 3. Create a read stream for the file.
 * 4. Upload the file to S3 using PutObjectCommand.
 * 5. Remove the temporary file.
 * 6. Return success or error response.
 */
app.post('/images', async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send('No file uploaded');
    }

    const file = req.files.image;
    const tempFilePath = `${UPLOAD_TEMP_PATH}/${file.name}`;

    // Move uploaded file to temporary location
    await file.mv(tempFilePath);

    // Create a read stream for the file to upload to S3
    const fileStream = fs.createReadStream(tempFilePath);

    // Configure parameters for S3 upload
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: file.name,
      Body: fileStream,
    };

    // Upload the file to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Clean up the temporary file after upload
    fs.unlinkSync(tempFilePath);

    // Send a success response to the client
    res.status(200).send(`File ${file.name} uploaded successfully!`);
  } catch (error) {
    next(error);
  }
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
