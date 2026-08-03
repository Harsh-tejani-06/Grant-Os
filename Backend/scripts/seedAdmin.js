/**
 * Seed script to create a system_admin user.
 * Run: node scripts/seedAdmin.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@grantos.com';

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      process.exit(0);
    }

    const admin = await User.create({
      fullName: 'System Admin',
      email: adminEmail,
      password: 'Admin@123',
      role: 'system_admin',
    });

    console.log('✅ System Admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password: Admin@123');
    console.log('   Role:', admin.role);
    console.log('\n   ⚠️  Change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
