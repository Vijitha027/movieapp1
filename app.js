// app.js

const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB


async function start() {
 try {
 await mongoose.connect('mongodb://localhost:27017/movieapp');
 console.log('MongoDB connected');
 } catch (err) {
 console.error('MongoDB connection error:', err);
 }
}

start();


// Simple Movie schema
const movieSchema = new mongoose.Schema({
 title: String,
 year: Number,
 rating: Number,
});

const Movie = mongoose.model('Movie', movieSchema);

// Test route
app.get('/', (req, res) => {
 res.send('Movie App is running!');
});

// Example route to list movies
app.get('/movies', async (req, res) => {
 const movies = await Movie.find();
 res.json(movies);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
 console.log(`Server started on http://localhost:${PORT}`);
});
