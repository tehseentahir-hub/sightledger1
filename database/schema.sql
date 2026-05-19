-- AquaFlow Database Schema
-- Water Bottle Delivery Management System

CREATE DATABASE IF NOT EXISTS aquaflow;
USE aquaflow;

-- Shops Table (Multi-tenant)
CREATE TABLE IF NOT EXISTS shops (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    subscription_type ENUM('free_trial', 'monthly', '3_months', '6_months') DEFAULT 'free_trial',
    subscription_start DATE,
    subscription_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_name VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    bottle_type VARCHAR(50) DEFAULT '19 Liter',
    rate_per_bottle DECIMAL(10,2) NOT NULL,
    payment_type ENUM('cash', 'credit') DEFAULT 'cash',
    deposit_bottles INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_id INT NOT NULL,
    customer_id INT NOT NULL,
    delivery_date DATE NOT NULL,
    bottles_delivered INT NOT NULL,
    bottles_returned INT DEFAULT 0,
    delivery_type ENUM('home_delivery', 'walk_in') DEFAULT 'home_delivery',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type ENUM('full', 'partial') DEFAULT 'partial',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Bottles Inventory Table
CREATE TABLE IF NOT EXISTS bottles_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_id INT UNIQUE NOT NULL,
    total_bottles INT DEFAULT 0,
    bottles_with_customers INT DEFAULT 0,
    bottles_in_shop INT DEFAULT 0,
    lost_damaged INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shop_id INT NOT NULL,
    expense_type ENUM('fuel', 'salary', 'maintenance', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Insert default plans
INSERT INTO plans (plan_name, duration_days, price, is_active) VALUES
('Free Trial', 7, 0.00, TRUE),
('Monthly', 30, 1500.00, TRUE),
('3 Months', 90, 4000.00, TRUE),
('6 Months', 180, 7500.00, TRUE);

-- Insert Super Admin (password: admin123)
INSERT INTO shops (shop_name, owner_name, phone, address, email, password, subscription_type, subscription_start, subscription_expiry, is_active)
VALUES ('AquaFlow System', 'Super Admin', '0000000000', 'System Admin', 'admin@aquaflow.com', '$2a$10$YourHashedPasswordHere', 'monthly', '2024-01-01', '2030-12-31', TRUE);

-- Password: admin123 (bcrypt hash)
-- Note: Use bcrypt to hash 'admin123' for the password field
UPDATE shops SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMye.p5F4G6VHaXBu8I6Y1jF8K6p5Z1Z0K0G' WHERE email = 'admin@aquaflow.com';