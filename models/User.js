const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  username:   { type: String, required: true, unique: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['admin', 'employee'], default: 'employee' },
  department: { type: String, default: 'General' },
  avatar:     { type: String, default: '' },
  isOnline:   { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  lastSeen:   { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
