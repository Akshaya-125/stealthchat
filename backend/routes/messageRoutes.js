const express  = require("express");
const router   = express.Router();
const Message  = require("../models/Message");
const Group    = require("../models/Group");
const authMiddleware = require("../middleware/authMiddleware");

// ─── Scheduler ────────────────────────────────────────────
// Runs every 10 seconds, delivers any due scheduled messages
function startScheduler(io) {
  setInterval(async () => {
    try {
      const due = await Message.find({
        type: "timed",
        isDelivered: false,
        revealAt: { $lte: new Date() }
      }).populate("senderId", "name");

      for (const msg of due) {
        msg.isDelivered = true;
        await msg.save();
        io.to(msg.groupId.toString()).emit("newMessage", msg);
        console.log("Delivered scheduled message:", msg._id, "| Text:", msg.text);
      }
    } catch (err) {
      console.error("Scheduler error:", err.message);
    }
  }, 10000); // check every 10 seconds
}

// Call this from server.js after io is created — exported below
module.exports.startScheduler = startScheduler;

// ─── GET messages ─────────────────────────────────────────
router.get("/:groupId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: req.params.groupId,
      // Only return delivered messages or normal messages
      $or: [
        { type: "normal" },
        { type: "timed", isDelivered: true }
      ],
      $and: [{
        $or: [
          { visibleTo: { $in: [req.user.id] } },
          { visibleTo: { $size: 0 } }
        ]
      }]
    }).populate("senderId", "_id name");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST send / schedule message ─────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { groupId, text, revealAt } = req.body;
    const io = req.io;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const visibleTo = group.visibleMembers.length > 0 ? group.visibleMembers : [];
    const isScheduled = revealAt && new Date(revealAt) > new Date();

    const message = await Message.create({
  groupId,
  senderId: req.user.id,
  text,
  visibleTo,
  isEncrypted: req.body.isEncrypted || false,  // ✅ ADD THIS
  type:        isScheduled ? "timed" : "normal",
  revealAt:    isScheduled ? new Date(revealAt) : null,
  isDelivered: !isScheduled
});

    if (!isScheduled) {
      // Send right now
      const populated = await message.populate("senderId", "_id name");
      io.to(groupId).emit("newMessage", populated);
    }
    // If scheduled, the scheduler loop will deliver it later

    res.status(201).json({
      ...message.toObject(),
      scheduled: isScheduled,
      revealAt: message.revealAt
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET my scheduled (pending) messages ──────────────────
router.get("/scheduled/:groupId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      groupId:     req.params.groupId,
      senderId:    req.user.id,
      type:        "timed",
      isDelivered: false
    }).sort({ revealAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE cancel a scheduled message ────────────────────
router.delete("/scheduled/:messageId", authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findOne({
      _id:         req.params.messageId,
      senderId:    req.user.id,
      type:        "timed",
      isDelivered: false
    });

    if (!msg) return res.status(404).json({ message: "Not found or already delivered" });

    await msg.deleteOne();
    res.json({ message: "Scheduled message cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── REACT to message ─────────────────────────────────────
router.post("/:messageId/react", authMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user.id;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existingIndex = message.reactions.findIndex(
      r => r.emoji === emoji && r.userId.toString() === userId
    );

    if (existingIndex !== -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, userId });
    }

    await message.save();
    req.io.to(message.groupId.toString()).emit("reactionUpdate", {
      messageId: message._id,
      reactions: message.reactions
    });

    res.json(message.reactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.startScheduler = startScheduler;