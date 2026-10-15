import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    const userId = socket.handshake.auth.userId;

    if (userId) {
      socket.join(`user-${userId}`);

      console.log(
        `👤 User ${userId} joined room user-${userId}`
      );
    }

    socket.on("disconnect", () => {
      console.log(
        "🔌 User disconnected:",
        socket.id
      );
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};