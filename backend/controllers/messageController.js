const Message = require("../models/Message");

// SEND
exports.sendMessage = async (req, res) => {
  try {
    const { groupId, text, visibleTo, type, revealAt } = req.body;

    const message = await Message.create({
      groupId,
      senderId: req.user.id,
      text,
      visibleTo,
      type: type || "normal",
      revealAt: revealAt || null
    });

    // 🔥 If normal → send immediately
    if (message.type !== "timed") {
      req.io.to(groupId).emit("newMessage", message);
    }

    // 🔥 If timed → delay send
    if (message.type === "timed" && message.revealAt) {
      const delay = new Date(message.revealAt) - new Date();

      if (delay > 0) {
        setTimeout(() => {
          req.io.to(groupId).emit("newMessage", message);
          console.log("Auto revealed:", message.text);
        }, delay);
      }
    }

    res.json(message);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET
exports.getMessages = async (req, res) => {
  const messages = await Message.find({
    groupId: req.params.groupId,
    visibleTo: req.user.id
  }).sort({ createdAt: 1 });

  res.json(messages);
};