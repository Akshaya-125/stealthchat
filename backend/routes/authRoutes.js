const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const user = await User.create(req.body);
    res.status(201).json(user); // ✅ Add status 201

  } catch (err) {
    console.log("SIGNUP ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
// LOGIN - Ensure ID matches middleware
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user || user.password !== req.body.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Use 'id' (matches middleware)
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);
    
    console.log("🔑 Token created for:", user._id); // 👈 DEBUG

    res.json({ 
      token, 
      user: { _id: user._id.toString(),
        name: user.name,      // ✅ ADD THIS
        email: user.email 
       } // ✅ String
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;