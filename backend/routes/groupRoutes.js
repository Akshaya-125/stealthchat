const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");

// CREATE GROUP
router.post("/", authMiddleware, async (req, res) => {
  try {
    const group = await Group.create({
      name: req.body.name,
      createdBy: req.user.id,
      members: [req.user.id],
      visibleMembers: []
    });
    res.status(201).json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔥 FIXED: GET MY GROUPS
router.get("/my", authMiddleware, async (req, res) => {
  try {
    // ✅ Convert string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const groups = await Group.find({ 
      members: userId 
    }).populate("members", "name email");
    
    res.json(groups);
  } catch(err) {
    console.error("Groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🔥 FIXED: GET SINGLE GROUP
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    
    if (!group || !group.members.some(m => m._id.toString() === req.user.id)) {
      return res.status(403).json({ message: "Not a member" });
    }
    res.json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD MEMBER
router.put("/add-member", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true, runValidators: true }
    ).populate("members", "name email");
    
    res.json(group);
  } catch(err) {
    console.error("Add member error:", err);
    res.status(500).json({ message: err.message });
  }
});

// SET VISIBILITY
router.put("/:id/visibility", authMiddleware, async (req, res) => {
  try {
    const { visibleMembers } = req.body;
    
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { visibleMembers: visibleMembers || [] },
      { new: true }
    ).populate("members", "name email");
    
    res.json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;