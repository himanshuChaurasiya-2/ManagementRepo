import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  console.log("connectSocket() called with:", userId);

  if (socket?.connected) {
    console.log("Socket already connected:", socket.id);
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    withCredentials: true,
  });

  console.log("Socket object created");

  socket.on("connect", () => {
    console.log("SOCKET CONNECTED:", socket?.id);

    socket?.emit("join_user_room", userId);

    console.log("👤 join_user_room emitted:", userId);
  });

  socket.on("disconnect", (reason) => {
    console.log("SOCKET DISCONNECTED:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("SOCKET CONNECTION ERROR:", error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  console.log("disconnectSocket() called");

  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;