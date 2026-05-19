# Water Bottle Delivery Management System - MVP Specification

## 1. Project Overview

**Project Name:** AquaFlow - Water Bottle Delivery Management System

**Project Type:** SaaS Web Application (MVP)

**Core Functionality:** A multi-tenant web application for 19-liter water bottle delivery businesses in Pakistan to manage customers, deliveries, bottles, payments, expenses, and generate reports.

**Target Users:**
- Super Admin (System Owner) - manages all shops and subscriptions
- Shop Owners - manage their individual businesses

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **PDF Generation:** jsPDF
- **HTTP Client:** Axios
- **State Management:** React Context API

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **CORS:** cors

### Database
- **Type:** MySQL
- **Isolation:** Each shop has shop_id for data isolation

## 3. UI/UX Specification

### Color Palette
- **Primary:** #0EA5E9 (Sky Blue - water theme)
- **Primary Dark:** #0284C7
- **Primary Light:** #38BDF8
- **Secondary:** #10B981 (Emerald - success/money)
- **Accent:** #F59E0B (Amber - warnings)
- **Danger:** #EF4444 (Red)
- **Background:** #F8FAFC (Light gray)
- **Card Background:** #FFFFFF
- **Text Primary:** #1E293B
- **Text Secondary:** #64748B
- **Border:** #E2E8F0

### Typography
- **Font Family:** 'Inter', system-ui, sans-serif
- **Headings:** Bold, various sizes
- **Body:** Regular weight
- **Numbers:** Semi-bold for financial data

### Layout
- **Mobile First:** Responsive design
- **Dashboard:** Sidebar + main content area
- **Cards:** White background, subtle shadows
- **Buttons:** Large touch-friendly (min 44px height)
- **Spacing:** Consistent padding (16px, 24px)
- **Border Radius:** 8px (cards), 6px (buttons), 4px (inputs)

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 4. Database Schema

### Shops Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_name (VARCHAR 255)
- owner_name (VARCHAR 255)
- phone (VARCHAR 20)
- address (TEXT)
- email (VARCHAR 255, UNIQUE)
- password (VARCHAR 255)
- subscription_type (ENUM: 'free_trial', 'monthly', '3_months', '6_months')
- subscription_start (DATE)
- subscription_expiry (DATE)
- is_active (BOOLEAN DEFAULT TRUE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Plans Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- plan_name (VARCHAR 100)
- duration_days (INT)
- price (DECIMAL 10,2)
- is_active (BOOLEAN DEFAULT TRUE)

### Customers Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_id (INT, FOREIGN KEY)
- name (VARCHAR 255)
- phone (VARCHAR 20)
- address (TEXT)
- bottle_type (VARCHAR 50, DEFAULT '19 Liter')
- rate_per_bottle (DECIMAL 10,2)
- payment_type (ENUM: 'cash', 'credit')
- deposit_bottles (INT DEFAULT 0)
- is_active (BOOLEAN DEFAULT TRUE)
- created_at (TIMESTAMP)

### Deliveries Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_id (INT, FOREIGN KEY)
- customer_id (INT, FOREIGN KEY)
- delivery_date (DATE)
- bottles_delivered (INT)
- bottles_returned (INT)
- delivery_type (ENUM: 'home_delivery', 'walk_in')
- notes (TEXT)
- created_at (TIMESTAMP)

### Payments Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_id (INT, FOREIGN KEY)
- customer_id (INT, FOREIGN KEY)
- amount (DECIMAL 10,2)
- payment_date (DATE)
- payment_type (ENUM: 'full', 'partial')
- notes (TEXT)
- created_at (TIMESTAMP)

### Bottles Table (Inventory)
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_id (INT, FOREIGN KEY)
- total_bottles (INT)
- bottles_with_customers (INT)
- bottles_in_shop (INT)
- lost_damaged (INT DEFAULT 0)
- last_updated (TIMESTAMP)

### Expenses Table
- id (INT, PRIMARY, AUTO_INCREMENT)
- shop_id (INT, FOREIGN KEY)
- expense_type (ENUM: 'fuel', 'salary', 'maintenance', 'other')
- amount (DECIMAL 10,2)
- description (TEXT)
- expense_date (DATE)
- created_at (TIMESTAMP)

## 5. Feature Specifications

### 5.1 Authentication System

**Login Page:**
- Email/phone input
- Password input
- Remember me checkbox
- Login button
- Role-based redirect (Super Admin → Admin panel, Shop Owner → Dashboard)

**Registration:**
- Shop creation form (Super Admin only)
- Shop owner registration via invitation

### 5.2 Super Admin Panel

**Features:**
- Dashboard: Overview of all shops, active subscriptions
- Shop Management: Create, edit, activate/deactivate shops
- Plan Management: Create pricing plans
- Reports: System-wide usage statistics

**Shop Creation Form:**
- Shop Name
- Owner Name
- Phone
- Address
- Email
- Password
- Subscription Plan Selection
- Start Date

### 5.3 Shop Owner Dashboard

**Layout:**
- Sidebar navigation (collapsible on mobile)
- Top bar with shop name and user menu
- Main content area

**Dashboard Cards:**
- Today's Deliveries (count)
- Active Customers (count)
- Pending Payments (amount)
- Bottles Outstanding (count)
- Monthly Sales (amount)

### 5.4 Customer Management

**Customer List:**
- Searchable table
- Columns: Name, Phone, Payment Type, Balance, Status
- Actions: Edit, View, Delete

**Customer Form:**
- Name (required)
- Phone (required)
- Address
- Bottle Type (dropdown)
- Rate per Bottle (number)
- Payment Type (cash/credit)
- Deposit Bottles (number)
- Active Status (toggle)

### 5.5 Delivery Management

**Delivery Entry Form:**
- Date picker (default today)
- Customer dropdown
- Bottles Delivered (number)
- Bottles Returned (number)
- Delivery Type (home/walk-in)
- Notes

**Delivery List:**
- Filterable by date range
- Grouped by customer
- Running bottle balance

### 5.6 Bottle Inventory

**Inventory Dashboard:**
- Total Bottles (large display)
- With Customers (count)
- In Shop (count)
- Lost/Damaged (count)
- Visual indicator of circulation

**Bottle Adjustment:**
- Add new bottles
- Mark as lost/damaged
- Transfer between categories

### 5.7 Payments & Billing

**Payment Entry:**
- Customer selection
- Amount
- Date
- Type (full/partial)

**Customer Ledger:**
- Transaction history
- Running balance
- Date, type, amount columns

**Outstanding Balance:**
- List of credit customers with pending amounts
- Filter by amount range

### 5.8 Invoice Generation

**Invoice Fields:**
- Shop name and details
- Invoice number (auto-generated)
- Customer details
- Date range
- Delivery summary (bottles, rate, amount)
- Payments received
- Remaining balance
- Generated date

**Actions:**
- Download as PDF
- Print friendly format

### 5.9 Expense Tracking

**Expense Entry:**
- Type (dropdown: fuel, salary, maintenance, other)
- Amount
- Description
- Date

**Expense Summary:**
- Monthly breakdown
- By category
- Total expenses

### 5.10 Reports

**Daily Delivery Report:**
- Date selection
- List of all deliveries
- Total bottles, customers served

**Monthly Sales Report:**
- Month selection
- Total sales
- Cash vs Credit breakdown

**Outstanding Payments:**
- Credit customers with pending
- Overdue indicators

**Bottle Circulation:**
- Bottles in/out summary
- Lost/damaged tracking

**Profit Estimation:**
- Income - Expenses = Profit
- Monthly comparison

## 6. API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/register (Super Admin)

### Super Admin
- GET /api/admin/shops
- POST /api/admin/shops
- PUT /api/admin/shops/:id
- DELETE /api/admin/shops/:id
- GET /api/admin/plans
- POST /api/admin/plans
- GET /api/admin/dashboard

### Customers
- GET /api/customers
- POST /api/customers
- PUT /api/customers/:id
- DELETE /api/customers/:id

### Deliveries
- GET /api/deliveries
- POST /api/deliveries
- GET /api/deliveries/report

### Payments
- GET /api/payments
- POST /api/payments
- GET /api/payments/customer/:id

### Inventory
- GET /api/inventory
- PUT /api/inventory

### Expenses
- GET /api/expenses
- POST /api/expenses
- GET /api/expenses/summary

### Reports
- GET /api/reports/daily
- GET /api/reports/monthly
- GET /api/reports/outstanding
- GET /api/reports/bottles
- GET /api/reports/profit

## 7. Security Requirements

- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens with 24h expiry
- Role-based middleware
- Input validation on all endpoints
- CORS configured for frontend origin
- SQL injection prevention (parameterized queries)

## 8. Acceptance Criteria

### Must Work:
- [x] Super Admin can create and manage shops
- [x] Shop owners can login and see dashboard
- [x] CRUD operations for customers
- [x] Delivery entry with bottle tracking
- [x] Payment recording
- [x] PDF invoice generation
- [x] Expense tracking
- [x] Basic reports
- [x] Mobile responsive design

### Visual Checkpoints:
- Clean, professional UI
- Water-themed color scheme
- Large, touch-friendly buttons
- Clear data presentation
- Responsive on mobile devices

## 9. Folder Structure

```
water-bottle-mgmt/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── models/
│   │   └── config/
│   └── package.json
└── database/
    └── schema.sql
```