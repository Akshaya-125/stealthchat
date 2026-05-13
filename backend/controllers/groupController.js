const Group = require("../models/Group");

// Create Group
exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name required" });
    }

    const group = await Group.create({
      name,
      createdBy: req.user.id,
      members: [...members, req.user.id] // include creator
    });

    res.status(201).json(group);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};