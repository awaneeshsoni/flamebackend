// backend/server.js
const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Database Connection (Embedded)
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        // Exit process with failure
        process.exit(1);
    }
};

connectDB(); // Call the connection function

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors()); // Enable CORS for all routes

app.get('/', (req, res) => res.send('API Running'));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api/video', require('./routes/video')); //Video Upload route

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));