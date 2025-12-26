/* backend/config/db.js */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // <-- Change this to your MySQL username
    password: 'Rohitsukale@123', // <-- Change this to your MySQL password
    database: 'InternMatchAI',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Database connection pool created.');

module.exports = pool;
