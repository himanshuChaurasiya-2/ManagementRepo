export interface ParsedNoteEntry {
  id: string;
  timestamp: string;
  author: string;
  text: string;
  isTimestamped: boolean;
}

export const parseLeadNotes = (
  notesStr?: string,
  fallbackDate?: string
): ParsedNoteEntry[] => {
  if (!notesStr || !notesStr.trim()) return [];

  // Match timestamps formatted like:
  // [29 Oct 2026, 01:25 PM • John Doe]: note
  // or [Oct 29, 2026 1:25 PM]: note
  // or [29 Oct 2026 13:25]: note
  const pattern = /(?:^|\n\n|\r?\n)(?=\[(?:[A-Za-z]{3}\s+\d{1,2},|\d{1,2}\s+[A-Za-z]{3})[^\]]*\]:?)/;
  const rawParts = notesStr.split(pattern).map((p) => p.trim()).filter(Boolean);

  return rawParts.map((part, index) => {
    // Regex for: [Timestamp • Author]: text OR [Timestamp]: text
    const matchWithAuthor = part.match(
      /^\[([^•\]]+?)(?:\s*•\s*([^\]]+))?\]:?\s*([\s\S]*)$/
    );

    if (matchWithAuthor) {
      const rawTime = matchWithAuthor[1].trim();
      const rawAuthor = matchWithAuthor[2]?.trim() || "Team Member";
      const rawText = matchWithAuthor[3]?.trim() || "";

      return {
        id: `entry-${index}-${rawTime.slice(0, 10).replace(/\s+/g, "")}`,
        timestamp: rawTime,
        author: rawAuthor,
        text: rawText || part,
        isTimestamped: true,
      };
    }

    return {
      id: `entry-${index}-initial`,
      timestamp: fallbackDate || "Initial Entry",
      author: "Lead Note",
      text: part,
      isTimestamped: false,
    };
  });
};

export const formatCurrentTimestamp = () => {
  const now = new Date();
  return now.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getCurrentUserName = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      return u.name || u.email || "User";
    }
  } catch {
    // fallback
  }
  return "Team Member";
};

