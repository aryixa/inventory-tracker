# Inventory Management System


**Inventory Management System** is a specialized, real-time industrial inventory management and shop-floor tracking application built specifically for the **sheet and architectural glass manufacturing industry**.

The system tracks high-value raw material stock across physical dimensions (thickness, length, and width in millimeters), automatically computes surface areas in square meters ($\text{m}^2$), calculates real-time glass inventory valuations, and maintains an immutable ACID audit ledger differentiating between productive consumption (`usage`) and factory-floor waste (`breakage`).

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Available Scripts](#available-scripts)
- [Real-Time WebSocket Events](#real-time-websocket-events)

---

## Key Features

- **High-Precision Dimension & Area Tracking:** Tracks stock by sheet thickness (`thicknessMm`), length (`sheetLengthMm`), and width (`sheetWidthMm`). Uses MongoDB `Decimal128` types to eliminate floating-point rounding errors on decimal thicknesses.
- **Glass Industry Stock Valuation:** Dynamic calculation of stock value using the formula $\text{Total Area (sqm)} \times \text{Thickness (mm)} \times \text{Unit Rate}$, restricted to authorized managerial accounts.
- **Real-Time WebSocket Synchronization:** Instantaneous UI state updates powered by Socket.IO (`inventory:created`, `inventory:updated`, `inventory:deleted`), ensuring all factory workstations and admin terminals reflect live quantities without polling.
- **Multi-Document ACID Transactions:** Stock additions and reductions run inside MongoDB sessions (`mongoose.startSession()`). Inventory balance mutations and transaction audit log insertions are committed together atomically with automatic rollback on error.
- **Categorized Depletion Auditing:** Distinct operational tracking between productive factory `usage` and damaged/spoilage `breakage`.
- **Faceted Transaction Search Engine:** Audit ledger querying powered by MongoDB aggregation pipelines using `$facet`, `$lookup`, regex `$match`, and pagination in a single database round-trip.
- **Automated CSV Export Engine:** Background streaming of inventory levels, transaction histories, and category consumption directly to downloadable CSVs with automated server-side cleanup.
- **Zero-Config First-Run Bootstrap:** On initial platform deployment, the first registered user is provisioned as the master `Admin`. Subsequent public registrations are permanently locked down.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Component-based UI rendering |
| **Frontend Language** | TypeScript | `^5.5.3` | Type safety and domain interfaces |
| **Bundler & Dev Server**| Vite | `^5.4.2` | Fast HMR, manual code splitting (`vendor`, `ui`) |
| **Styling** | TailwindCSS | `^3.4.1` | Responsive utility-first design system |
| **Client Routing** | React Router DOM | `^7.7.1` | Declarative routing with protected layouts |
| **Icons** | Lucide React | `^0.542.0` | Industrial iconography |
| **Date Utilities** | date-fns & react-datepicker | `^4.1.0` / `^8.5.0` | Date filtering for analytics and transactions |
| **Notifications** | react-hot-toast | `^2.5.2` | Real-time toast feedback |
| **Backend Runtime** | Node.js (ES Modules) | `v18+ / v20+` | Native ECMAScript Modules (`import`/`export`) |
| **Web Server Framework**| Express | `^4.18.2` | RESTful API route handling |
| **Database & ODM** | MongoDB & Mongoose | `^8.0.3` | Schema validation, Decimal128, ACID sessions |
| **Real-Time Engine** | Socket.IO | `^4.8.1` | Bidirectional event bus across plant terminals |
| **Authentication** | jsonwebtoken & bcryptjs | `^9.0.2` / `^2.4.3` | Stateless JWT in HttpOnly cookies, 12 salt rounds |
| **Security & Hardening**| Helmet & rate-limit | `^7.1.0` / `^7.1.5` | Security headers and brute-force protection |
| **Export Engine** | csv-writer | `^1.6.0` | Disk streaming with automated purge timers |

---

## Project Directory Structure

```text
inventory-tracker/
├── package.json                 # Frontend client configuration and dependencies
├── vite.config.ts               # Vite configuration (manual chunks, proxy, visualizer)
├── tailwind.config.js           # Tailwind utility style configuration
├── tsconfig.json                # TypeScript project references
├── index.html                   # Web application entrypoint
├── stats.html                   # Rollup visualizer bundle inspection
├── .env.example                 # Example environment variables for client
│
├── server/                      # Node.js + Express backend
│   ├── package.json             # Backend dependencies and startup scripts
│   ├── server.js                # Server bootstrap, middleware stack, routes, sockets
│   ├── socket.js                # Socket.IO initialization and handshake JWT auth
│   ├── .env.example             # Example environment variables for server
│   ├── config/
│   │   └── database.js          # Mongoose MongoDB connection handler
│   ├── middleware/
│   │   ├── auth.js              # 'protect' (JWT verification) & 'authorize' (RBAC check)
│   │   ├── rateLimiters.js      # 'loginLimiter', 'authLimiter', 'accountLimiter'
│   │   └── validation.js        # Declarative express-validator chains
│   ├── models/
│   │   ├── User.js              # User schema (roles, bcrypt pre-save, deactivation)
│   │   ├── InventoryItem.js     # Sheet inventory schema (Decimal128, compound index)
│   │   ├── Transaction.js       # Immutable transaction ledger schema
│   │   └── Booking.js           # Experimental reservation schema
│   ├── controllers/
│   │   ├── authController.js    # Sign-in, sign-out, session check, admin bootstrap
│   │   ├── userController.js    # User CRUD and password administration
│   │   ├── inventoryController.js# Inventory mutations with ACID transactions
│   │   ├── transactionController.js# Faceted aggregation query engine
│   │   ├── exportController.js  # CSV streaming with unref cleanup
│   │   └── bookingController.js # Experimental reservation handling
│   └── routes/
│       ├── auth.js              # /api/auth routes
│       ├── users.js             # /api/users routes
│       ├── inventory.js         # /api/inventory routes
│       ├── transactions.js      # /api/transactions routes
│       ├── export.js            # /api/export routes
│       ├── dashboard.js         # /api/dashboard routes
│       └── bookings.js          # Unmounted experimental booking routes
│
└── src/                         # Frontend React application
    ├── main.tsx                 # Root DOM entrypoint
    ├── App.tsx                  # App routing tree, guards, and providers
    ├── index.css                # Global styles and scrollbar overrides
    ├── types/
    │   └── index.ts             # TypeScript domain models and API responses
    ├── services/
    │   └── api.ts               # Typed fetch service with 401 session interception
    ├── lib/
    │   └── socket.ts            # Socket.IO client singleton with reconnection logic
    ├── contexts/
    │   ├── AuthContext.tsx      # Authentication state and login/logout handlers
    │   ├── SocketContext.tsx    # Authenticated socket instance provider
    │   └── DataContext.tsx      # Global state refresh synchronization trigger
    └── components/
        ├── Layout.tsx           # Collapsible sidebar and responsive header
        ├── ProtectedRoute.tsx   # Role-guarded route wrapper
        ├── Login.tsx            # Dual-mode view: First-run setup OR sign-in
        ├── InventoryManagement.tsx # Primary inventory dashboard & live cards
        ├── AddNewItem.tsx       # New glass specification registration
        ├── CategoriesView.tsx   # Categorized material directory
        ├── UsageDashboard.tsx   # Surface area consumption & waste analytics
        ├── AllTransactions.tsx  # Searchable, paginated audit ledger
        ├── ExportData.tsx       # CSV report generation console
        ├── UserManagement.tsx   # User directory and password resets
        ├── BookingManagement.tsx# Experimental booking queue UI
        └── modals/
            ├── AddStockModal.tsx       # Stock inbound delivery modal
            ├── UseStockModal.tsx       # Stock depletion (usage/breakage) modal
            ├── EditInventoryModal.tsx   # Spec & rate adjustment modal
            ├── CreateUserModal.tsx     # Account creation modal
            ├── ChangePasswordModal.tsx # Password reset modal
            └── BookNowModal.tsx        # Reservation modal
```

---

## Available Scripts

### Root Directory (Frontend)

- `npm run dev`: Starts the Vite development server with hot module replacement at `http://localhost:5173`.
- `npm run build`: Type-checks and compiles the TypeScript React application into the `dist/` directory.
- `npm run lint`: Runs ESLint across client source files.
- `npm run preview`: Locally previews the production build output.

### Server Directory (Backend)

- `npm run dev`: Starts the server using `nodemon` for auto-reloading upon file modifications.
- `npm start`: Starts the server using native Node.js (for production).

---

## Real-Time WebSocket Events

The application communicates via Socket.IO room `inventory`:

| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `inventory:created` | Server $\to$ Client | `{ item: InventoryItem }` | Fired when a new glass item is created. |
| `inventory:updated` | Server $\to$ Client | `{ item: InventoryItem }` | Fired when stock quantities or specs change. |
| `inventory:deleted` | Server $\to$ Client | `{ id: string }` | Fired when an inventory item is removed. |

The frontend `SocketContext` automatically manages token transmission, connection lifecycle, and listener cleanup upon sign-out.
