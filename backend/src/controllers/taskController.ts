import { Request, Response } from "express";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { io } from "../server.js";

// ===============================
// CREATE TASK
// ADMIN ONLY
// ===============================

export const createTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      company,
      description,
      assignedTo,
      priority = "medium",
      dueDate,
    } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!title || !assignedTo || !company) {
      res.status(400).json({
        success: false,
        message:
          "Title, company and assigned user are required",
      });
      return;
    }

    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // ==========================================
    // CHECK COMPANY
    // ==========================================

    const companyExists = await Company.findById(company);

    if (!companyExists) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });
      return;
    }

    // ==========================================
    // CHECK ASSIGNED USER
    // ==========================================

    const user = await User.findById(assignedTo);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Assigned user not found",
      });
      return;
    }

    // ==========================================
    // CHECK SALES USER
    // ==========================================

    if (
      user.role !== "sales" ||
      user.status !== "active"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Task can only be assigned to an active sales user",
      });
      return;
    }

    // ==========================================
    // CREATE TASK
    // ==========================================

    const task = await Task.create({
      title: title.trim(),
      company: companyExists._id,
      description: description?.trim(),
      assignedTo: user._id,
      assignedBy: req.userId,
      priority,
      dueDate,
      status: "pending",
    });

    // ==========================================
    // POPULATE TASK
    // ==========================================

    const populatedTask = await Task.findById(task._id)
      .populate("company", "companyName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");




    // ==========================================
console.log("🚨 ABOUT TO SEND TASK NOTIFICATION");
console.log("Assigned user ID:", user._id.toString());
console.log("Socket rooms:", io.sockets.adapter.rooms);
// REAL-TIME NOTIFICATION
// ==========================================

io.to(user._id.toString()).emit("task_assigned", {
  message: "A new task has been assigned to you",
  task: populatedTask,
});

console.log(
  `🔔 Task assignment notification sent to user: ${user._id}`
);

// ==========================================


    // RESPONSE
    // ==========================================

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating task",
    });
  }
};

// ===============================
// GET ALL TASKS
// ADMIN + SALES
// ===============================

export const getAllTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tasks = await Task.find()
      .populate("company", "companyName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get all tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching tasks",
    });
  }
};

// ===============================
// GET MY TASKS
// ADMIN + SALES
// ===============================

export const getMyTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const tasks = await Task.find({
      assignedTo: req.userId,
    })
      .populate("company", "companyName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get my tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching your tasks",
    });
  }
};

// ===============================
// UPDATE TASK STATUS
// ADMIN + SALES
// ===============================

export const updateTaskStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const allowedStatuses = [
      "pending",
      "in-progress",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message:
          "Status must be pending, in-progress, or completed",
      });
      return;
    }

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const currentUser = await User.findById(req.userId);

    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    /*
    -----------------------------------------
    SALES PERMISSION
    -----------------------------------------

    Sales users can ONLY update tasks
    assigned to themselves.
    */

    if (
      currentUser.role === "sales" &&
      task.assignedTo.toString() !== req.userId
    ) {
      res.status(403).json({
        success: false,
        message:
          "You can only update tasks assigned to you",
      });
      return;
    }

    task.status = status;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("company", "companyName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    // ==========================================
    // NOTIFY ADMIN ON TASK COMPLETION
    // ==========================================
    if (status === "completed") {
      const assignedUser = updatedTask?.assignedTo as any;
      const company = updatedTask?.company as any;

      const completionPayload = {
        _id: `complete-${Date.now()}-${task._id}`,
        type: "task_completed",
        message: `Task "${updatedTask?.title}" was marked as completed by ${assignedUser?.name || "Sales User"}${company?.companyName ? ` (${company.companyName})` : ""}`,
        task: updatedTask,
        completedAt: new Date().toISOString(),
      };

      // Emit once to admin_room (all connected admins)
      io.to("admin_room").emit("task_completed", completionPayload);

      console.log(`🔔 Task completion notification sent to admin_room for task: ${updatedTask?.title}`);
    }

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error(
      "Update task status error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while updating task status",
    });
  }
};

// ===============================
// UPDATE TASK
// ADMIN ONLY
// ===============================

export const updateTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const {
      title,
      company,
      description,
      assignedTo,
      priority,
      dueDate,
      status,
    } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    // -------------------------------
    // Validate company
    // -------------------------------

    if (company) {
      const companyExists =
        await Company.findById(company);

      if (!companyExists) {
        res.status(404).json({
          success: false,
          message: "Company not found",
        });
        return;
      }

      task.company = companyExists._id;
    }

    // -------------------------------
    // Validate assigned user
    // -------------------------------

    if (assignedTo) {
      const user = await User.findById(assignedTo);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "Assigned user not found",
        });
        return;
      }

      if (
        user.role !== "sales" ||
        user.status !== "active"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Task can only be assigned to an active sales user",
        });
        return;
      }

      task.assignedTo = user._id;
    }

    // -------------------------------
    // Update title
    // -------------------------------

    if (title !== undefined) {
      if (!title.trim()) {
        res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
        return;
      }

      task.title = title.trim();
    }

    // -------------------------------
    // Update description
    // -------------------------------

    if (description !== undefined) {
      task.description = description?.trim();
    }

    // -------------------------------
    // Update priority
    // -------------------------------

    if (priority !== undefined) {
      if (
        !["low", "medium", "high"].includes(
          priority
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
        return;
      }

      task.priority = priority;
    }

    // -------------------------------
    // Update status
    // -------------------------------

    if (status !== undefined) {
      if (
        ![
          "pending",
          "in-progress",
          "completed",
        ].includes(status)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid status",
        });
        return;
      }

      task.status = status;
    }

    // -------------------------------
    // Update due date
    // -------------------------------

    if (dueDate !== undefined) {
      task.dueDate = dueDate
        ? new Date(dueDate)
        : undefined;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("company", "companyName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (status === "completed") {
      const assignedUser = updatedTask?.assignedTo as any;
      const company = updatedTask?.company as any;

      const completionPayload = {
        _id: `complete-${Date.now()}-${task._id}`,
        type: "task_completed",
        message: `Task "${updatedTask?.title}" was marked as completed by ${assignedUser?.name || "Sales User"}${company?.companyName ? ` (${company.companyName})` : ""}`,
        task: updatedTask,
        completedAt: new Date().toISOString(),
      };

      // Emit once to admin_room
      io.to("admin_room").emit("task_completed", completionPayload);
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating task",
    });
  }
};

// ===============================
// DELETE TASK
// ADMIN ONLY
// ===============================

export const deleteTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    await Task.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting task",
    });
  }
};