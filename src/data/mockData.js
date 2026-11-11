// Clean empty master exports - No mock data
export const INITIAL_BRANCHES = [
  { id: "BR001", code: "DWT", name: "Downtown Branch", address: "102 Main Street, City Center", isHeadquarters: true },
  { id: "BR002", code: "WST", name: "Westside Clinic Branch", address: "405 Medical Park Drive" },
  { id: "BR003", code: "EST", name: "Eastside Retail Branch", address: "789 Commercial Plaza" }
];

export const INITIAL_USERS = [
  { id: "USR001", name: "System Admin", username: "admin", role: "Admin", branchId: "BR001" },
  { id: "USR002", name: "Cashier User", username: "cashier", role: "Cashier", branchId: "BR001" },
  { id: "USR003", name: "Pharmacist User", username: "pharmacist", role: "`Pharmacist", branchId: "BR001" },
  { id: "USR004", name: "Manager User", username: "manager", role: "Manager", branchId: "BR001" }
];

export const INITIAL_MEDICINES = [];
export const INITIAL_SUPPLIERS = [];
export const INITIAL_CUSTOMERS = [];
export const INITIAL_PRESCRIPTIONS = [];
export const INITIAL_SALES = [];
export const INITIAL_PURCHASES = [];
export const INITIAL_EMPLOYEES = [];
export const INITIAL_EXPENSES = [];
export const INITIAL_AUDIT_LOGS = [];
