const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");

// GET MY GROUPS
router.get("/my", authMiddleware, async (req, res) => {
  try {
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

// CREATE GROUP
router.post("/", authMiddleware, async (req, res) => {
  try {
    const group = await Group.create({
      name: req.body.name,
      createdBy: req.user.id,
      members: [req.user.id],
      admins: [req.user.id],
      visibleMembers: []
    });
    res.status(201).json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD MEMBER — only admins
router.put("/add-member", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    );
    res.json({ message: "Member added successfully" });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// MAKE ADMIN — only admins can promote
router.put("/make-admin", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can promote members" });
    }

    await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { admins: userId } },
      { new: true }
    );
    res.json({ message: "Member promoted to admin" });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// REMOVE MEMBER — only admins
router.put("/remove-member", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    const targetIsAdmin = group.admins.some(id => id.toString() === userId);
    if (targetIsAdmin) {
      return res.status(403).json({ message: "Cannot remove an admin" });
    }

    await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    );
    res.json({ message: "Member removed" });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// LEAVE GROUP
router.put("/leave", authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if user is the only admin
    const isOnlyAdmin = group.admins.length === 1 &&
      group.admins[0].toString() === req.user.id;
    if (isOnlyAdmin && group.members.length > 1) {
      return res.status(400).json({ 
        message: "Transfer admin to someone else before leaving" 
      });
    }

    await Group.findByIdAndUpdate(groupId, {
      $pull: { members: req.user.id, admins: req.user.id }
    });
    res.json({ message: "Left group" });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// GET SINGLE GROUP — must be AFTER all /put routes to avoid conflicts
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("admins", "name email")
      .populate("visibleMembers", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some(m => m._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    res.json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// SET VISIBILITY — only admins
router.put("/:id/visibility", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can change privacy" });
    }

    const updated = await Group.findByIdAndUpdate(
      req.params.id,
      { visibleMembers: req.body.visibleMembers || [] },
      { new: true }
    );
    res.json(updated);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;