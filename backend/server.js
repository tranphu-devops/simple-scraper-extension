require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // tăng nếu dữ liệu html lớn

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test kết nối
pool
  .connect()
  .then((client) => {
    console.log('✅ Connected to PostgreSQL');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  });

// Middleware kiểm tra API key
function authMiddleware(req, res, next) {
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) {
    console.warn('⚠️ API_KEY not set in .env, skipping auth check');
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token || token !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Route: health check
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'up' });
});

// Route: lưu dữ liệu từ Chrome extension
app.post('/api/save', authMiddleware, async (req, res) => {
  try {
    const { url, html, text, createdAt, title } = req.body; // 👈 thêm title

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const created_at = createdAt ? new Date(createdAt) : new Date();

    const query = `
      INSERT INTO scraped_data (url, title, html, text_content, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        html = EXCLUDED.html,
        text_content = EXCLUDED.text_content,
        created_at = EXCLUDED.created_at,
        updated_at = NOW()
      RETURNING id, created_at;
    `;

    const values = [url, title || null, html || null, text || null, created_at];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      // nghĩa là trùng URL, đã không insert
      return res.json({
        ok: true,
        duplicated: true
      });
    }

    res.json({
      ok: true,
      id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });

  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// (Tuỳ chọn) Route xem nhanh dữ liệu đã lưu
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;

    const result = await pool.query(
      `
      SELECT id, url, title, left(text_content, 500) AS text_preview, created_at
      FROM scraped_data
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({ ok: true, data: result.rows });
  } catch (err) {
    // ...
  }
});

const PAGE_SIZE_DEFAULT = 10;

// API: list bài viết có search + pagination
app.get('/api/list', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || PAGE_SIZE_DEFAULT, 100);
    const qRaw = (req.query.q || '').trim();
    const starredOnly = req.query.starred === 'true' || req.query.starred === '1';

    const whereParts = ['is_deleted = FALSE'];
    const params = [];
    let idx = 1;

    if (qRaw) {
      whereParts.push(`(title ILIKE $${idx} OR text_content ILIKE $${idx})`);
      params.push(`%${qRaw}%`);
      idx++;
    }

    if (starredOnly) {
      whereParts.push(`is_starred = TRUE`);
    }

    const whereClause = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) FROM scraped_data ${whereClause}`;
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;

    const listSql = `
      SELECT id, title, created_at, is_starred, (note IS NOT NULL) AS has_note
      FROM scraped_data
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(pageSize, offset);

    const listResult = await pool.query(listSql, params);

    res.json({
      ok: true,
      data: listResult.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// API: detail bài viết
app.get('/api/detail/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(`
      SELECT id, url, title, html, text_content, created_at, is_starred, note
      FROM scraped_data
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Not found" });
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// API: xóa logic bài viết
app.post('/api/delete/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query(
      `UPDATE scraped_data SET is_deleted = TRUE WHERE id = $1`,
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.post('/api/star/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { starred } = req.body; // true / false

    await pool.query(
      'UPDATE scraped_data SET is_starred = $1 WHERE id = $2',
      [!!starred, id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error star article:', err);
    res.status(500).json({ ok: false });
  }
});

app.post('/api/note/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { note } = req.body; // chuỗi note, có thể rỗng

    await pool.query(
      'UPDATE scraped_data SET note = $1 WHERE id = $2',
      [note || null, id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ ok: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
