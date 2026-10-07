CREATE DATABASE IF NOT EXISTS elegance_restaurant;
USE elegance_restaurant;
CREATE TABLE menu_items(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,category VARCHAR(80) NOT NULL,description TEXT,price DECIMAL(10,2) NOT NULL,image VARCHAR(500),featured TINYINT DEFAULT 0,available TINYINT DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE messages(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120),email VARCHAR(180),phone VARCHAR(40),subject VARCHAR(180),message TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE reservations(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120),phone VARCHAR(40),email VARCHAR(180),guests INT,reservation_date DATE,reservation_time TIME,notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE admins(id INT AUTO_INCREMENT PRIMARY KEY,username VARCHAR(80) UNIQUE,password VARCHAR(255));
INSERT INTO menu_items(name,category,description,price,image,featured) VALUES
('Signature Jollof Rice','Main Course','Smoked tomato jollof, grilled chicken and plantain.',12500,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=85',1),
('Truffle Cream Pasta','Pasta','Hand-cut pasta, mushrooms, parmesan and truffle.',15000,'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=85',1),
('Grilled Salmon','Seafood','Fire-grilled salmon with seasonal vegetables.',22000,'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=85',1),
('Premium Suya Platter','Starters','Tender beef suya with onions and signature spice.',14000,'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',1),
('Luxury Beef Burger','Main Course','Premium beef, aged cheddar and truffle fries.',18000,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',0),
('Chocolate Fondant','Dessert','Warm dark chocolate with vanilla cream.',8500,'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?auto=format&fit=crop&w=1200&q=85',1);