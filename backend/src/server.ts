import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { sanitizeInputs, securityHeaders } from "./middleware/security.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import companyReminderRoutes from "./routes/companyReminderRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import metaAdsRoutes from "./routes/metaAdsRoutes.js";

dotenv.config();

const app = express();

// HTTP SERVER
const httpServer = createServer(app);

// CORS & SOCKET.IO CONFIGURATION
const clientOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  clientOrigin,
  clientOrigin.replace(/\/+$/, ""),
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes(origin.replace(/\/+$/, "")) ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      process.env.NODE_ENV !== "production"
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
};

export const io = new Server(httpServer, {
  cors: corsOptions,
});

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_user_room", (userId: string) => {
    if (!userId) {
      console.warn("No user ID provided");
      return;
    }

    socket.join(userId);

    console.log(`User ${userId} joined notification room`);
  });

  socket.on("join_admin_room", () => {
    socket.join("admin_room");
    console.log(`Admin socket ${socket.id} joined admin_room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// SECURITY & GLOBAL MIDDLEWARE
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInputs);

// DATABASE
connectDB();

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/company-reminders", companyReminderRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/meta", metaAdsRoutes);

// TEST ROUTE
app.get("/", (_req, res) => {
  res.json({ success: true, message: "Sales Dashboard API is running"});
});

// START SERVER
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO running on port ${PORT}`);
});