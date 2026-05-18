// Force IPv4 DNS resolution
require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const groupRoutes = require("./routes/groupRoutes");
const messageRoutes = require("./routes/messageRoutes");



const app = express();


// ✅ CORS FIX (IMPORTANT)
app.use(cors());
app.use(express.json());

// 🔹 Create HTTP server
const server = http.createServer(app);

// 🔹 Socket.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🔹 Pass IO
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🔹 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 30000,
})
.then(() => console.log("DB connected ✅"))
.catch(err => console.log("DB Error:", err));

// 🔹 Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);
const { startScheduler } = require("./routes/messageRoutes");
startScheduler(io);   // ← starts the 10-second delivery loop
// 🔥 SOCKET
const path = require("path");

// Add this AFTER your routes
app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});
// Track online users globally
const onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinUser", (userId) => {
    socket.userId = userId; // store on socket for disconnect
    socket.join(userId);
    onlineUsers.add(userId);
    // Broadcast to everyone that this user is online
    io.emit("userOnline", { userId });
    console.log("Online:", userId, "| Total online:", onlineUsers.size);
  });

  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
  });

  socket.on("typing", (data) => {
    console.log("TYPING from:", data.name, "in group:", data.groupId);
    socket.to(data.groupId).emit("userTyping", {
      userId: data.userId,
      name: data.name
    });
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.groupId).emit("userStopTyping", {
      userId: data.userId
    });
  });

  // Send current online list when someone asks
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsersList", { userIds: Array.from(onlineUsers) });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("userOffline", { userId: socket.userId });
      console.log("Offline:", socket.userId, "| Total online:", onlineUsers.size);
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT} 🚀`);
});