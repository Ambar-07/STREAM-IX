const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createUser, getUserByEmail } = require("../data/store");

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET || "movie-mind-demo-secret",
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res) => {
  const { email, username, password } = req.body ?? {};
  const identifier = (username || email || "").trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: "Username/email and password are required." });
  }

  if (getUserByEmail(identifier)) {
    return res.status(409).json({ message: "User already exists." });
  }

  const user = createUser(identifier, password);
  const token = issueToken(user);

  return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

router.post("/login", async (req, res) => {
  const { email, username, password } = req.body ?? {};
  const identifier = (username || email || "").trim();
  const user = getUserByEmail(identifier);

  if (!user || !bcrypt.compareSync(password ?? "", user.password)) {
    return res.status(401).json({ message: "Invalid username/email or password." });
  }

  const token = issueToken(user);
  return res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

module.exports = router;
