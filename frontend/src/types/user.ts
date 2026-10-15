export interface SalesUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "sales";
  status: "active" | "inactive";
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}