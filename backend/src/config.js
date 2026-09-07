const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not configured. Running in demo mode without MongoDB.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2500 });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.warn("MongoDB unavailable, using in-memory demo data.", error.message);
  }
}

module.exports = {
  uploadDir,
  connectDatabase,
};
