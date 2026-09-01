const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = require('../config/db');
// We can just use the native driver or mongoose to fetch without a model if we don't know the exact model name,
// but let's try just getting the collection directly.

async function exportGrants() {
  try {
    await connectDB();
    console.log('Connected to DB');
    
    // Fetch all documents from the grantlistings collection
    const db = mongoose.connection.db;
    const grants = await db.collection('grantlistings').find({}).toArray();
    
    console.log(`Found ${grants.length} grants.`);
    
    // Determine output path: Project root -> .gitignore folder
    // This script is in Backend/scripts, so Project root is ../../
    const outPath = path.join(__dirname, '..', '..', '.gitignore', 'grantlistings.json');
    
    fs.writeFileSync(outPath, JSON.stringify(grants, null, 2));
    console.log(`Successfully saved grants to ${outPath}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error exporting grants:', err);
    process.exit(1);
  }
}

exportGrants();
