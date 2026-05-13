const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Ensure ObjectId format
    req.user = { 
  id: new mongoose.Types.ObjectId(decoded.id).toString() 
};
    
    next();
  } catch (error) {
    console.log("Token error:", error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};