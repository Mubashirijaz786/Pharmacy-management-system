# 🏥 Pharmacy Management ERP & POS - .NET 8 Backend

Enterprise-grade ASP.NET Core 8 Web API backend with Clean Architecture, Entity Framework Core, Offline-First Synchronization Engine, and SignalR real-time hubs.

---

## 🏛️ Project Architecture

```
server/Pharmacy.Backend/
├── Pharmacy.Backend.sln          # Master Solution File
│
├── Pharmacy.Core/                # Domain Entities, DTOs & Business Interfaces
│   ├── Entities/
│   │   ├── BaseEntity.cs         # Audit timestamps & Sync status fields
│   │   ├── UserAndBranch.cs      # User, Role, and Multi-Branch models
│   │   ├── MedicineAndBatch.cs   # Medicine master, batch-wise expiry & stock
│   │   ├── Transactions.cs       # POS Sales, Returns, Purchases & Line Items
│   │   ├── CustomerAndSupplier.cs# Customer/Supplier ledgers & credit accounts
│   │   └── OperationalEntities.cs# Prescriptions, Expenses, Audit logs, SyncQueue
│   └── DTOs/                     # Strongly-typed API request/response contracts
│
├── Pharmacy.Infrastructure/      # EF Core DbContext, Seeds & Data Access
│   ├── Data/
│   │   ├── PharmacyDbContext.cs  # Multi-database relational schema & mappings
│   │   └── DbInitializer.cs      # Automatic database seeding on first startup
│   └── Services/                 # Background workers & Report services
│
└── Pharmacy.API/                 # ASP.NET Core Web API Host & Endpoints
    ├── Controllers/              # RESTful API controllers (Auth, POS, Sync, etc.)
    ├── Hubs/PharmacyHub.cs       # SignalR real-time websocket broadcast hub
    ├── Program.cs                # Dependency injection, JWT auth & Swagger
    └── appsettings.json          # Database connection strings & JWT keys
```

---

## 🚀 How to Run the Backend

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

### 1. Build and Run API
Open a terminal in the solution directory and run:

```bash
# Navigate to API project
cd server/Pharmacy.Backend/Pharmacy.API

# Run the API
dotnet run
```

The API will automatically:
1. Initialize the database schema (`pharmacy_cloud.db` by default).
2. Seed initial branches, demo users, medicines, batches, and supplier records.
3. Start the Swagger UI at `http://localhost:5000/swagger` (or `https://localhost:5001/swagger`).

---

## 🔐 Default Demo Accounts

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `123` | Full ERP access, user roles, system config |
| **Cashier** | `cashier` | `123` | POS billing, returns, customer checkout |
| **Pharmacist** | `pharmacist` | `123` | Prescription verification & drug catalog |
| **Manager** | `manager` | `123` | Inventory, reports, supplier orders |

---

## 🗄️ Database Configuration

By default, the API uses **SQLite** (`pharmacy_cloud.db`) for instant zero-configuration startup.

To switch to **PostgreSQL** or **Microsoft SQL Server**, simply update `server/Pharmacy.Backend/Pharmacy.API/appsettings.json`:

```json
{
  "DatabaseProvider": "PostgreSql", // Options: "Sqlite", "PostgreSql", "SqlServer"
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=pharmacy_cloud.db",
    "PostgreSQLConnection": "Host=localhost;Database=pharmacy_db;Username=postgres;Password=your_password",
    "SqlServerConnection": "Server=localhost;Database=PharmacyDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

---

## 🔄 Offline-First Sync Endpoints

- **`POST /api/sync/push`**: Accepts batches of offline transactions from desktop clients.
- **`GET /api/sync/pull?branchId=BR001&since=...`**: Returns incremental master data updates.
- **`GET /api/reports/dashboard-stats`**: Live dashboard metrics across branches.
