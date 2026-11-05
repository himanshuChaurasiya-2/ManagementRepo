import { Request, Response } from "express";
import Reminder from "../models/Reminder.js";
import XLSX from "xlsx";
import { isValidObjectId, sanitizeString } from "../middleware/security.js";

// CREATE REMINDER
export const createReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid reminder ID format" });
      return;
    }

    const {
  companyName,
  title,
  description,
  date,
  startTime,
  endTime,
  priority,
  reminderMinutes,
  repeat,
} = req.body;

    if (!title || !date) {
      res.status(400).json({
        message: "Title and date are required",
      });
      return;
    }

    const reminder = await Reminder.create({
      userId,
      title: sanitizeString(title, 200),
      companyName: sanitizeString(companyName, 150),
      description: sanitizeString(description, 2000),
      date,
      startTime,
      endTime,
      priority: priority || "medium",
      reminderMinutes: typeof reminderMinutes === "number" ? Math.max(0, reminderMinutes) : 10,
      repeat: repeat || "none",
    });

    res.status(201).json({
      message: "Reminder created successfully",
      reminder,
    });
  } catch (error) {
    console.error("Create reminder error:", error);

    res.status(500).json({
      message: "Failed to create reminder",
    });
  }
};


// GET MY REMINDERS
export const getMyReminders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid reminder ID format" });
      return;
    }

    const reminders = await Reminder.find({
      userId,
    }).sort({
      date: 1,
      startTime: 1,
    });

    res.status(200).json(reminders);
  } catch (error) {
    console.error("Get reminders error:", error);

    res.status(500).json({
      message: "Failed to fetch reminders",
    });
  }
};


// UPDATE REMINDER
export const updateReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid reminder ID format" });
      return;
    }

    const reminder = await Reminder.findOneAndUpdate(
      {
        _id: req.params.id,
        userId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!reminder) {
      res.status(404).json({
        message: "Reminder not found",
      });
      return;
    }

    res.status(200).json({
      message: "Reminder updated successfully",
      reminder,
    });
  } catch (error) {
    console.error("Update reminder error:", error);

    res.status(500).json({
      message: "Failed to update reminder",
    });
  }
};


// DELETE REMINDER
export const deleteReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid reminder ID format" });
      return;
    }

    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!reminder) {
      res.status(404).json({
        message: "Reminder not found",
      });
      return;
    }

    res.status(200).json({
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("Delete reminder error:", error);

    res.status(500).json({
      message: "Failed to delete reminder",
    });
  }
};


// COMPLETE REMINDER
export const completeReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid reminder ID format" });
      return;
    }

    const reminder = await Reminder.findOneAndUpdate(
      {
        _id: req.params.id,
        userId,
      },
      {
        status: "completed",
      },
      {
        new: true,
      }
    );

    if (!reminder) {
      res.status(404).json({
        message: "Reminder not found",
      });
      return;
    }

    res.status(200).json({
      message: "Reminder completed",
      reminder,
    });
  } catch (error) {
    console.error("Complete reminder error:", error);

    res.status(500).json({
      message: "Failed to complete reminder",
    });
  }
};


// IMPORT REMINDERS FROM EXCEL
export const importExcelReminders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        message: "Excel file is required",
      });
      return;
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    // Get first worksheet
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];

    // Convert worksheet to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (!rows.length) {
      res.status(400).json({
        message: "Excel file is empty",
      });
      return;
    }

    const remindersToCreate = [];
    const failedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;

      const companyName = String(row["Company Name"] || "").trim();
      const dateValue = row["Date"];
      const task = String(row["Task"] || "").trim();
      const description = String(row["Description"] || "").trim();

      // Validate required fields
      if (!companyName || !dateValue || !task) {
        failedRows.push({
          row: i + 2,
          reason: "Company Name, Date and Task are required",
        });
        continue;
      }

      // Convert Excel date
     let date: Date;

if (typeof dateValue === "number") {
  // Excel serial date
  const excelDate = XLSX.SSF.parse_date_code(dateValue);

  date = new Date(
    excelDate.y,
    excelDate.m - 1,
    excelDate.d
  );
} else if (typeof dateValue === "string") {
  // Handle DD/MM/YYYY format
  const dateString = dateValue.trim();

  const parts = dateString.split("/");

  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateString);
  }
} else {
  date = new Date(dateValue);
}

  

      if (isNaN(date.getTime())) {
        failedRows.push({
          row: i + 2,
          reason: "Invalid date",
        });
        continue;
      }

      remindersToCreate.push({
        userId,
        companyName,
        title: task,
        description: description || undefined,
        date,
        priority: "medium",
        reminderMinutes: 10,
        status: "pending",
        repeat: "none",
      });
    }

    // If no valid rows
    if (!remindersToCreate.length) {
      res.status(400).json({
        message: "No valid rows found in Excel",
        totalRows: rows.length,
        imported: 0,
        failed: failedRows.length,
        failedRows,
      });
      return;
    }

    // Insert all valid reminders
    const createdReminders = await Reminder.insertMany(
      remindersToCreate
    );

    res.status(201).json({
      message: "Excel imported successfully",
      totalRows: rows.length,
      imported: createdReminders.length,
      failed: failedRows.length,
      failedRows,
    });
  } catch (error) {
    console.error("Excel import error:", error);

    res.status(500).json({
      message: "Failed to import Excel file",
    });
  }
};