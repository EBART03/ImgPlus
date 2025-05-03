// server/models/User.js



import mongoose from 'mongoose';
import crypto from 'crypto';

const token = crypto.randomBytes(16).toString('hex');
// Generate a random token for the user

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  token: { type: String, required: false, default: token },
}, { collection: 'user_database' });

const User = mongoose.model('User', userSchema);
export default User;