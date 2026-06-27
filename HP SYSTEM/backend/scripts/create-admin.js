const { Client } = require("pg");
const readline = require("readline");
const bcrypt = require("bcrypt");
require("dotenv").config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const promptQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must contain at least one number.");
  }
};

const createAdmin = async (email, password) => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();

    const checkRes = await client.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (checkRes.rows.length > 0) {
      throw new Error("A user with this email already exists.");
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, account_status)
      VALUES ($1, $2, $3, $4, 'admin', 'active')
      RETURNING user_id, email, role, created_at
    `;
    const res = await client.query(insertQuery, [
      email,
      passwordHash,
      "Admin",
      "User",
    ]);

    return res.rows[0];
  } finally {
    await client.end().catch(() => {});
  }
};

const run = async () => {
  try {
    console.log("\n🚀 HED System - Create Admin User\n");

    const email = await promptQuestion("Enter admin email: ");
    if (!validateEmail(email)) {
      throw new Error("Invalid email format.");
    }

    const password = await promptQuestion("Enter admin password: ");
    validatePassword(password);

    const confirmPassword = await promptQuestion("Confirm password: ");
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    console.log("\n🔐 Creating admin user...");
    const admin = await createAdmin(email, password);

    console.log("\n✅ Admin user created successfully!");
    console.log(`   User ID:    ${admin.user_id}`);
    console.log(`   Email:      ${admin.email}`);
    console.log(`   Role:       ${admin.role}`);
    console.log(`   Created At: ${admin.created_at}`);
  } catch (error) {
    console.error("\n❌ Error creating admin:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

run();
