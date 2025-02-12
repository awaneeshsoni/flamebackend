const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

connectDB(); 

// ✅ Apply CORS Middleware **before** defining routes
const corsOptions = {
    origin: ['https://flame-lemon.vercel.app', 'http://localhost:5173'],  
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // ✅ Allow cookies, Authorization headers
};

app.use(cors(corsOptions));

// ✅ Handle preflight requests manually (important for CORS issues)
app.options('*', cors(corsOptions));

// ✅ Enable JSON parsing middleware
app.use(express.json());

// Test Route
app.get('/', (req, res) => res.send('API Running'));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api/video', require('./routes/video'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
