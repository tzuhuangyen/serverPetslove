# PetsLove Update Server

This is the backend server for the **PetsLove** project. It provides APIs for managing users, products, carts, and more. This server is not public and is intended for internal use.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Setup](#setup)
- [Scripts](#scripts)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [License](#license)

## Features

- User authentication and authorization
- Product management
- Cart and order handling
- File uploads (e.g., images)
- Error handling and validation
- API documentation with Swagger

## Technologies

This project is built with the following technologies:

- **Node.js**: Backend runtime
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: MongoDB object modeling
- **JWT**: Authentication
- **Multer**: File uploads
- **Swagger**: API documentation

## Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following environment variables:

   ```env
   PORT=3000
   MONGO_URI=<your-mongodb-uri>
   JWT_SECRET=<your-jwt-secret>
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. For production:
   ```bash
   npm start
   ```

## Scripts

The following scripts are available in the `package.json`:

- `npm start`: Start the server in production mode.
- `npm run dev`: Start the server in development mode with live reload using `nodemon`.
- `npm run swagger`: Generate the Swagger API documentation.

## API Documentation

API documentation is available using Swagger. After starting the server, you can access the documentation at:This is an update server for the PetsLove project, and it's not public

## Project Structure

├── controller/ # Controllers for handling business logic
├── middlewares/ # Middleware for request handling
├── models/ # Mongoose models for MongoDB collections
├── routes/ # API route definitions
├── service/ # Utility services (e.g., error handling, authentication)
├── public/ # Publicly accessible files (e.g., images)
├── swagger.js # Swagger configuration
├── swagger-output.json # Generated Swagger documentation
├── connectMongo.js # MongoDB connection setup
├── server.js # Main entry point of the application
└── package.json # Project metadata and dependencies

## License

This project is licensed under the ISC license.
