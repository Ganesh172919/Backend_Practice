/**
 * File Overview: MongoDB connection bootstrap for mongoose.
 * WHY: Separates persistence setup from route and service logic.
 * WHAT: Exports the function that initializes the database connection lifecycle.
 * HOW: Reads environment settings and executes mongoose connect with defensive error handling.
 */
const mongoose = require('mongoose');

/**
 * WHY: Keeps this module easier to reason about by isolating one responsibility per function.
 * WHAT: Implements connect d b for this module.
 * HOW: Uses validated inputs plus module state and returns normalized output or throws on unrecoverable errors.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✦ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
