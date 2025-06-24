require("dotenv").config();
const express = require("express");
const multer = require("multer");
const sql = require("mssql");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Multer Cloudinary storage hỗ trợ image + video
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const resource_type = file.mimetype.startsWith("video") ? "video" : "image";
    return {
      folder: "cotichlangthang/",
      resource_type: resource_type,
      public_id: file.originalname.split(".")[0] + "-" + Date.now(),
    };
  },
});

const upload = multer({ storage });


const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// SQL Config
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    }
};

// GET tất cả truyện
app.get("/api/stories", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM Stories ORDER BY createdAt DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("Lỗi /api/stories:", err);
    res.status(500).json({ error: "Lỗi lấy truyện" });
  }
});

// POST đăng truyện mới
    app.post("/api/stories", upload.none(), async (req, res) => {
  try {
    console.log("body:", req.body); // debug

    const { title, content, iconPath } = req.body;
    const id = uuidv4();

    const pool = await sql.connect(config);
    await pool.request()
      .input("id", sql.UniqueIdentifier, id)
      .input("title", sql.NVarChar(100), title)
      .input("content", sql.NVarChar(sql.MAX), content)
      .input("iconPath", sql.NVarChar(255), iconPath || null)
      .query("INSERT INTO Stories (id, title, content, iconPath) VALUES (@id, @title, @content, @iconPath)");

    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lưu truyện" });
  }
});

// GET truyện theo ID
app.get("/api/story/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .query("SELECT * FROM Stories WHERE id = @id");
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send("Lỗi");
    }
});

// DELETE truyện theo ID
app.delete("/api/story/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query("DELETE FROM Stories WHERE id = @id");
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Xoá truyện thất bại" });
  }
});

// PUT cập nhật truyện
app.put("/api/stories/:id", upload.single("icon"), async (req, res) => {
  const { title, content } = req.body;
  const id = req.params.id;
  const iconPath = req.file ? req.file.path : null;

  try {
    const pool = await sql.connect(config);
    const query = iconPath
      ? "UPDATE Stories SET title = @title, content = @content, iconPath = @iconPath WHERE id = @id"
      : "UPDATE Stories SET title = @title, content = @content WHERE id = @id";

    const request = pool.request()
      .input("id", sql.UniqueIdentifier, id)
      .input("title", sql.NVarChar(100), title)
      .input("content", sql.NVarChar(sql.MAX), content);

    if (iconPath) {
      request.input("iconPath", sql.NVarChar(255), iconPath);
    }

    await request.query(query);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật truyện:", err);
    res.status(500).json({ error: "Lỗi khi cập nhật truyện" });
  }
});

// PUT tăng lượt xem
app.put("/api/views/:id", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input("id", sql.UniqueIdentifier, req.params.id)
            .query("UPDATE Stories SET views = views + 1 WHERE id = @id");
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send("Lỗi cập nhật views");
    }
});

// POST bình luận
app.post("/api/comments", upload.single("avatar"), async (req, res) => {
    const { name, content } = req.body;
    const avatarPath = req.file ? req.file.path : null; // Cloudinary path
    const id = uuidv4();

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .input("name", sql.NVarChar(50), name)
            .input("avatarPath", sql.NVarChar(255), avatarPath)
            .input("content", sql.NVarChar(sql.MAX), content)
            .query("INSERT INTO Comments (id, name, avatarPath, content) VALUES (@id, @name, @avatarPath, @content)");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi bình luận" });
    }
});

// GET bình luận
app.get("/api/comments", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT * FROM Comments ORDER BY createdAt DESC");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send("Lỗi lấy bình luận");
    }
});

app.get("/", (req, res) => {
  res.redirect("/home.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server chạy tại http://localhost:${port}`));
