import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';

const port = Number(process.env.PORT || 3001);
const sessions = new Map();
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const parseCookies = request => Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(value => {
  const [key, ...rest] = value.trim().split('=');
  return [key, decodeURIComponent(rest.join('='))];
}));

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
};

const body = request => new Promise((resolve, reject) => {
  let data = '';
  request.on('data', chunk => { data += chunk; if (data.length > 10_000) request.destroy(); });
  request.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } });
  request.on('error', reject);
});

const sessionUser = request => sessions.get(parseCookies(request).studyspace_session);
const setSession = (response, user) => {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, user);
  response.setHeader('Set-Cookie', `studyspace_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
};

async function bootstrapAdmin() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) return console.warn('Admin bootstrap skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in .env.');
  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await db.execute('SELECT id, role FROM users WHERE email = ?', [normalizedEmail]);
  if (!rows.length) {
    await db.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [normalizedEmail, password, 'admin']);
    console.log(`Admin account created for ${normalizedEmail}`);
  } else if (rows[0].role !== 'admin') {
    throw new Error('ADMIN_EMAIL already belongs to a non-admin user. Choose another email.');
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/api/session') {
      const user = sessionUser(request);
      return send(response, 200, { user: user ? { email: user.email, role: user.role } : null });
    }

    if (request.method === 'POST' && request.url === '/api/access') {
      const { email = '', password = '' } = await body(request);
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password).length < 8) return send(response, 400, { error: 'Внеси валидна е-пошта и лозинка од најмалку 8 знаци.' });
      const [rows] = await db.execute('SELECT id, email, password, role FROM users WHERE email = ?', [normalizedEmail]);
      let user = rows[0];
      if (user) {
        if (String(password) !== user.password) return send(response, 401, { error: 'Е-поштата или лозинката не се точни.' });
      } else {
        const [result] = await db.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [normalizedEmail, String(password), 'member']);
        user = { id: result.insertId, email: normalizedEmail, role: 'member' };
      }
      setSession(response, { id: user.id, email: user.email, role: user.role });
      return send(response, 200, { user: { email: user.email, role: user.role } });
    }

    if (request.method === 'GET' && request.url === '/api/users') {
      const user = sessionUser(request);
      if (!user || user.role !== 'admin') return send(response, 403, { error: 'Немаш пристап.' });
      const [users] = await db.execute("SELECT email, created_at AS joined, CHAR_LENGTH(password) AS passwordLength FROM users WHERE role = 'member' ORDER BY created_at DESC");
      return send(response, 200, { users });
    }

    if (request.method === 'POST' && request.url === '/api/logout') {
      const token = parseCookies(request).studyspace_session;
      if (token) sessions.delete(token);
      return send(response, 200, { ok: true }, { 'Set-Cookie': 'studyspace_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    return send(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: 'Се појави проблем на серверот.' });
  }
});

bootstrapAdmin().then(() => server.listen(port, () => console.log(`API server on http://localhost:${port}`))).catch(error => { console.error(error); process.exit(1); });
