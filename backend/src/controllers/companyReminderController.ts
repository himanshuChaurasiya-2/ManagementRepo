import { Request, Response } from "express";
import CompanyReminder from "../models/CompanyReminder.js";
import XLSX from "xlsx";

interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id?: string;
    _id?: string;
    role?: string;
  };
}

// =====================================================
// GET ALL COMPANY REMINDERS
// ADMIN + SALES USER
// =====================================================

export const getCompanyReminders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const reminders = await CompanyReminder.find()
      .populate("createdBy", "name email")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(reminders);
  } catch (error) {
    console.error("Get company reminders error:", error);

    res.status(500).json({
      message: "Failed to fetch company reminders",
    });
  }
};

// =====================================================
// CREATE COMPANY REMINDER
// ADMIN ONLY
// =====================================================

export const createCompanyReminder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      priority,
      remindBefore,
      repeat,
    } = req.body;

    if (!title || !date) {
      res.status(400).json({
        message: "Title and date are required",
      });

      return;
    }

    const createdBy =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!createdBy) {
      res.status(401).json({
        message: "User not authenticated",
      });

      return;
    }

    const reminder = await CompanyReminder.create({
      title,
      description,
      date,
      startTime,
      endTime,
      priority: priority || "medium",
      remindBefore: remindBefore ?? 10,
      repeat: repeat || "none",
      createdBy,
    });

    res.status(201).json({
      message: "Company reminder created successfully",
      reminder,
    });
  } catch (error) {
    console.error("Create company reminder error:", error);

    res.status(500).json({
      message: "Failed to create company reminder",
    });
  }
};

// =====================================================
// UPDATE COMPANY REMINDER
// ADMIN ONLY
// =====================================================

export const updateCompanyReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const reminder = await CompanyReminder.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!reminder) {
      res.status(404).json({
        message: "Company reminder not found",
      });

      return;
    }

    res.status(200).json({
      message: "Company reminder updated successfully",
      reminder,
    });
  } catch (error) {
    console.error("Update company reminder error:", error);

    res.status(500).json({
      message: "Failed to update company reminder",
    });
  }
};

// =====================================================
// DELETE COMPANY REMINDER
// ADMIN ONLY
// =====================================================

export const deleteCompanyReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const reminder = await CompanyReminder.findByIdAndDelete(id);

    if (!reminder) {
      res.status(404).json({
        message: "Company reminder not found",
      });

      return;
    }

    res.status(200).json({
      message: "Company reminder deleted successfully",
    });
  } catch (error) {
    console.error("Delete company reminder error:", error);

    res.status(500).json({
      message: "Failed to delete company reminder",
    });
  }
};

// =====================================================
// UPDATE STATUS
// ADMIN ONLY
// =====================================================

export const updateCompanyReminderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "completed"].includes(status)) {
      res.status(400).json({
        message: "Invalid status",
      });

      return;
    }

    const reminder = await CompanyReminder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!reminder) {
      res.status(404).json({
        message: "Company reminder not found",
      });

      return;
    }

    res.status(200).json({
      message: "Status updated successfully",
      reminder,
    });
  } catch (error) {
    console.error("Update status error:", error);

    res.status(500).json({
      message: "Failed to update status",
    });
  }
};

// =====================================================
// IMPORT COMPANY REMINDERS FROM EXCEL
// ADMIN ONLY
// =====================================================

export const importCompanyRemindersFromExcel = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const createdBy =
      req.userId ||
      req.user?.id ||
      req.user?._id;

    if (!createdBy) {
      res.status(401).json({
        message: "User not authenticated",
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

    // Convert Excel rows to JSON
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

      const companyName = String(
        row["Company Name"] || ""
      ).trim();

      const task = String(
        row["Task"] || ""
      ).trim();

      const description = String(
        row["Description"] || ""
      ).trim();

      const dateValue = row["Date"];

      // Required fields
      if (!companyName || !task || !dateValue) {
        failedRows.push({
          row: i + 2,
          reason:
            "Company Name, Date and Task are required",
        });
        continue;
      }

      let date: Date;

      // Excel serial date
      if (typeof dateValue === "number") {
        const excelDate =
          XLSX.SSF.parse_date_code(dateValue);

        if (!excelDate) {
          failedRows.push({
            row: i + 2,
            reason: "Invalid date",
          });
          continue;
        }

        date = new Date(
          excelDate.y,
          excelDate.m - 1,
          excelDate.d
        );
      }

      // DD/MM/YYYY
      else if (typeof dateValue === "string") {
        const dateString = dateValue.trim();
        const parts = dateString.split("/");

        if (parts.length !== 3) {
          failedRows.push({
            row: i + 2,
            reason:
              "Invalid date format. Use DD/MM/YYYY",
          });
          continue;
        }

        const day = Number(parts[0]);
        const month = Number(parts[1]);
        const year = Number(parts[2]);

        if (
          !Number.isInteger(day) ||
          !Number.isInteger(month) ||
          !Number.isInteger(year) ||
          day < 1 ||
          day > 31 ||
          month < 1 ||
          month > 12
        ) {
          failedRows.push({
            row: i + 2,
            reason: "Invalid date",
          });
          continue;
        }

        date = new Date(
          year,
          month - 1,
          day
        );

        // Prevent invalid dates like 31/02/2026
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          failedRows.push({
            row: i + 2,
            reason: "Invalid date",
          });
          continue;
        }
      }

      else {
        failedRows.push({
          row: i + 2,
          reason: "Invalid date",
        });
        continue;
      }

      remindersToCreate.push({
        companyName,
        title: task,
        description,
        date: date.toISOString().split("T")[0],
        priority: "medium",
        remindBefore: 10,
        repeat: "none",
        status: "pending",
        createdBy,
      });
    }

    // No valid rows
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

    // Insert into CompanyReminder collection
    const createdReminders =
      await CompanyReminder.insertMany(
        remindersToCreate
      );

    res.status(201).json({
      message:
        "Company calendar imported successfully",
      totalRows: rows.length,
      imported: createdReminders.length,
      failed: failedRows.length,
      failedRows,
    });
  } catch (error) {
    console.error(
      "Company calendar Excel import error:",
      error
    );

    res.status(500).json({
      message: "Failed to import company calendar",
    });
  }
};