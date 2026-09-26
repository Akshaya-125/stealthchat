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
      admins: [req.user.id],
      visibleMembers: []
    });
    res.status(201).json(group);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/add-member", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });

    // ✅ Check if requester is admin
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

// MAKE ADMIN — only existing admins can promote others
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

// REMOVE MEMBER — only admins can remove
router.put("/remove-member", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Can't remove another admin
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

// SET VISIBILITY — only admins
router.put("/:id/visibility", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
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