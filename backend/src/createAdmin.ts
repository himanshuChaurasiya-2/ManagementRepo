import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config();

const createAdmin = async (): Promise<void> => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log("An admin already exists.");
      process.exit(0);
    }

    const password = "Admin@12345";

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: "System Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
      mustChangePassword: false,
    });

    console.log("Admin created successfully");
    console.log("Email:", "admin@example.com");
    console.log("Temporary password:", password);

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:", error);
    process.exit(1);
  }
};

createAdmin();