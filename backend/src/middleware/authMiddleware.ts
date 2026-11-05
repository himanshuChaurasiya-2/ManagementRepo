import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

interface JwtPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id?: string;
    _id?: string;
    role?: string;
    name?: string;
    email?: string;
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    
    // CHECK AUTHORIZATION HEADER
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    // GET TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });

      return;
    }

    // JWT SECRET
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });

      return;
    }

    // VERIFY TOKEN
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        secret
      ) as JwtPayload;
    } catch (err: any) {
      if (err instanceof jwt.TokenExpiredError) {
        // Normal lifecycle expiration - return TOKEN_EXPIRED code for silent refresh
        res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Session token has expired. Please refresh your session.",
        });
        return;
      }

      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
      return;
    }

    if (!decoded.userId) {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN_PAYLOAD",
        message: "Invalid token payload",
      });

      return;
    }

    // SET USER ID
    req.userId = decoded.userId;

    // GET USER FROM DATABASE
    const user = await User.findById(decoded.userId).select(
      "_id name email role status"
    );

    if (!user || user.status === "inactive") {
      res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found or account inactive",
      });

      return;
    }

    // ATTACH USER TO REQUEST
    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Unexpected authentication error:", error);

    res.status(500).json({
      success: false,
      message: "Internal authentication error",
    });
  }
};