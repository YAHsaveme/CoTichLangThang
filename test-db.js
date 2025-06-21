require("dotenv").config();
const sql = require("mssql");

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: true,
    },
};

async function testConnection() {
    try {
        console.log("⏳ Đang kết nối đến Azure SQL...");
        await sql.connect(config);
        const result = await sql.query`SELECT GETDATE() AS currentTime`;
        console.log("✅ Kết nối thành công! Giờ hiện tại từ SQL Server là:", result.recordset[0].currentTime);
        sql.close();
    } catch (err) {
        console.error("❌ Kết nối thất bại:", err.message);
    }
}

testConnection();
