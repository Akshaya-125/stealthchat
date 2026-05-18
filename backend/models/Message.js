const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  text: {
    type: String,
    required: true
  },

  visibleTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  // 🔥 NEW: Thread support
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // 🔥 NEW: message type
  type: {
    type: String,
    enum: ["normal", "thread", "timed"],
    default: "normal"
  },

  // 🔥 NEW: reveal time
  revealAt: {
    type: Date,
    default: null
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  reactions: [{
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  }],
  isEncrypted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);