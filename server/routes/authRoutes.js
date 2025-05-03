// server/routes/authRoutes.js

import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';


const router = express.Router();
// const JWT_SECRET = '[key]'; // replace with a secret key later on 

// Register route
router.post('/create-account', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }


    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, 
      password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});


// login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt with username:", username); // debug

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("Invalid."); // debug
      return res.status(404).json({ message: 'Invalid credentials.' });
    }

    console.log("User found:", user); // debug

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(404).json({ message: 'Invalid credentials.' });
    }
  
    // create token
    const token = jwt.sign({ userId: user._id.toString(), username}, JWT_SECRET, {expiresIn: '14d'});
    console.log("Login token created.");
    
    res.status(200).json({ message: 'Login successful', token, userId: user._id.toString() });
    
  } catch (error) {
    console.error("Login error:", error); // debug
    return res.status(500).json({ message: 'Server error' });
    }
});

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/verify-token', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Token is valid', user: req.user });
});

export default router;

