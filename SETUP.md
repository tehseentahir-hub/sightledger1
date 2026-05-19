# AquaFlow - Water Bottle Management System

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL (v8.0+)

### Step 1: Database Setup

1. Open MySQL (phpMyAdmin or command line)
2. Create a new database named `aquaflow`
3. Import the schema file:
   ```
   database/schema.sql
   ```

4. Update the admin password in database:
   ```sql
   UPDATE shops SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMye.p5F4G6VHaXBu8I6Y1jF8K6p5Z1Z0K0G' 
   WHERE email = 'admin@aquaflow.com';
   ```
   Note: This is bcrypt hash for "admin123"

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend folder:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=aquaflow
PORT=5000
JWT_SECRET=aquaflow_secret_key_2024
```

Start the backend:
```bash
npm start
```
Backend will run on http://localhost:5000

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend:
```bash
npm run dev
```
Frontend will run on http://localhost:3000

## Recommended Start (Avoid Notepad "Npm" Popups)

If Windows keeps opening a Notepad tab/file (often titled "Npm") while dev servers start, use:

```powershell
cd C:\Users\PC\Desktop\water-bottle-mgmt
.\start-dev.ps1
```

This starts:
- Frontend: http://localhost:3001
- Backend: http://127.0.0.1:5000

### Step 4: Login

**Super Admin:**
- Email: admin@aquaflow.com
- Password: admin123

**Demo Shop Owner (create via Super Admin panel):**
- Any shop created will have its own dashboard

## Features Included

### Super Admin Panel
- Dashboard with system overview
- Shop management (create, edit, delete, activate/deactivate)
- Subscription plan management

### Shop Owner Dashboard
- Today's deliveries count
- Active customers
- Pending payments
- Bottles outstanding
- Monthly sales summary

### Customer Management
- Add/Edit/Delete customers
- Payment type (Cash/Credit)
- Bottle deposit tracking
- Active/Inactive status

### Delivery Management
- Record deliveries
- Track bottles delivered and returned
- Home delivery and Walk-in refill types
- Date filtering

### Bottle Inventory
- Total bottles tracking
- Bottles with customers
- Bottles in shop
- Lost/Damaged tracking

### Payments
- Record payments
- Customer ledger with running balance
- Outstanding payments view
- Generate PDF invoices

### Expenses
- Track fuel, salary, maintenance, other
- Monthly summary by category

### Reports
- Daily delivery report
- Monthly sales report
- Outstanding payments report
- Bottle circulation report
- Profit estimation

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Auth:** JWT, bcrypt

## Project Structure

```
water-bottle-mgmt/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/      # Pages
│       ├── context/   # Auth context
│       └── ...
├── backend/           # Express API
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── config/
└── database/
    └── schema.sql
```
