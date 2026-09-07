const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
});

app.get("/", (req, res) => {
  res.send("Streamix WebRTC Signaling Server is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "streamix-signaling-server", timestamp: Date.now() });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // 3. Room join handling: join room & notify existing users
  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // 5. Targeted signaling: Host sends offer to specific user
  socket.on("webrtc-offer", ({ to, offer }) => {
    console.log(`[Signaling] Offer sent from ${socket.id} to ${to}`);
    if (to) {
      socket.to(to).emit("webrtc-offer", {
        from: socket.id,
        offer,
      });
    }
  });

  // 5. Targeted signaling: Viewer sends answer to specific host
  socket.on("webrtc-answer", ({ to, answer }) => {
    console.log(`[Signaling] Answer sent from ${socket.id} to ${to}`);
    if (to) {
      socket.to(to).emit("webrtc-answer", {
        from: socket.id,
        answer,
      });
    }
  });

  // 5. Targeted signaling: ICE candidate exchanged between specific peers
  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    if (to) {
      socket.to(to).emit("webrtc-ice-candidate", {
        from: socket.id,
        candidate,
      });
    }
  });

  socket.on("webrtc-stop-sharing", ({ roomId }) => {
    console.log(`[Signaling] Stop sharing in room ${roomId}`);
    if (roomId) {
      socket.to(roomId).emit("webrtc-stop-sharing");
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
