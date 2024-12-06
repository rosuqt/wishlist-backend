const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const port = 3000;

// Serve static files from the "wishlist" folder
app.use(express.static(path.join(__dirname, 'wishlist')));
app.use(express.json());  // Middleware to parse JSON bodies
app.use(cors());



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'wishlist', 'homepage.html')); // Landing page
});

app.get('/wish.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'wishlist', 'wish.html')); // Wishlist page
});




const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Paramore867',
  database: 'wishlistDB',
  waitForConnections: true,  
  connectionLimit: 10,      
  queueLimit: 0             
});

app.post('/addItem', (req, res) => {
  const { name, link, price, image, notes, priority, wishlistNumber, updateIndex } = req.body;

  // Validate required fields
  if (!name || !link || !price || !wishlistNumber) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  // Convert price to a number (if it's coming in as a string)
  const priceNum = parseFloat(price);
  if (isNaN(priceNum)) {
    return res.status(400).json({ success: false, message: "Invalid price." });
  }

  if (updateIndex !== null && updateIndex !== undefined) { // Update existing item
    // Check if the item exists in the database
    const checkExistenceQuery = `SELECT id FROM wishlist_items WHERE id = ? AND wishlistNumber = ?`;
    
    pool.query(checkExistenceQuery, [updateIndex, wishlistNumber], (err, result) => {
      if (err) {
        console.error('Error checking item existence:', err);
        return res.status(500).json({ success: false, message: 'Error checking item existence.' });
      }

      if (result.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found for update.' });
      }

      // Proceed with updating the item
      const updateQuery = `
        UPDATE wishlist_items 
        SET name = ?, link = ?, price = ?, image = ?, notes = ?, priority = ? 
        WHERE id = ? AND wishlistNumber = ?
      `;

      pool.query(updateQuery, [
        name,
        link,
        priceNum,  // Use the numeric value for price
        image,
        notes,
        priority,
        updateIndex,
        wishlistNumber
      ], (err, result) => {
        if (err) {
          console.error('Error updating item:', err);
          return res.status(500).json({ success: false, message: 'Error updating item.' });
        }

        console.log('Update result:', result);
        res.json({ success: true, message: 'Item updated successfully.' });
      });
    });
  } else { // Add new item
    const insertQuery = `
      INSERT INTO wishlist_items (name, link, price, image, notes, priority, wishlistNumber) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    pool.query(insertQuery, [
      name,
      link,
      priceNum,  // Use the numeric value for price
      image,
      notes,
      priority,
      wishlistNumber
    ], (err, result) => {
      if (err) {
        console.error('Error adding item:', err);
        return res.status(500).json({ success: false, message: 'Error adding item.' });
      }

      console.log('Insert result:', result);
      res.json({ success: true, message: 'Item added successfully.' });
    });
  }
});




app.get('/getWishlistItems/:wishlistNumber', (req, res) => {
  const wishlistNumber = req.params.wishlistNumber;

  const query = `SELECT * FROM wishlist_items WHERE wishlistNumber = ? AND bought = false`;

  pool.query(query, [wishlistNumber], (err, results) => {
    if (err) {
      console.error('Error fetching items:', err);
      return res.status(500).json({ success: false, message: 'Error fetching wishlist items' });
    }

    res.json({ success: true, items: results });
  });
});

app.post('/deleteItem', (req, res) => {
  console.log('Request received:', req.body); // Debug log
  const { wishlistNumber, id } = req.body;

  if (!wishlistNumber) {
      console.error("Wishlist number not provided!"); // Log missing number
      return res.status(400).send({ success: false, message: "Wishlist number not identified" });
  }

  if (!id) {
      console.error("Item ID not provided!"); // Log missing ID
      return res.status(400).send({ success: false, message: "Item ID not provided" });
  }

  const query = 'DELETE FROM wishlist_items WHERE id = ? AND wishlistNumber = ?';
  pool.query(query, [id, wishlistNumber], (err, results) => { // Use pool.query here
      if (err) {
          console.error('Database error:', err);
          return res.status(500).send({ success: false, message: 'Database error' });
      }
      res.send({ success: true, message: 'Item deleted successfully' });
  });
});


app.post('/markAsBought', (req, res) => {
  const { wishlistNumber, id } = req.body;

  if (!wishlistNumber) {
      return res.status(400).json({ success: false, message: 'Wishlist number not provided.' });
  }

  if (!id) {
      return res.status(400).json({ success: false, message: 'Item ID not provided.' });
  }

  const query = `UPDATE wishlist_items SET bought = true WHERE id = ? AND wishlistNumber = ?`;

  pool.query(query, [id, wishlistNumber], (err, result) => {
      if (err) {
          console.error('Error marking item as bought:', err);
          return res.status(500).json({ success: false, message: 'Error marking item as bought.' });
      }
      res.json({ success: true, message: 'Item marked as bought successfully.' });
  });
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.get('/getBoughtItems/:wishlistNumber', (req, res) => {
  const wishlistNumber = req.params.wishlistNumber;

  const query = `SELECT * FROM wishlist_items WHERE wishlistNumber = ? AND bought = true`;

  pool.query(query, [wishlistNumber], (err, results) => {
      if (err) {
          console.error('Error fetching bought items:', err);
          return res.status(500).json({ success: false, message: 'Error fetching bought items' });
      }

      res.json({ success: true, items: results });
  });
});
