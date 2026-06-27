const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const checkEnvVars = () => {
  const missing = requiredEnvVars.filter((env) => !process.env[env]);
  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "));
    process.exit(1);
  }
};

const checkPostgresConnection = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "postgres",
  });

  try {
    await client.connect();
    console.log("✅ PostgreSQL is running and accessible.");
    return client;
  } catch (error) {
    console.error("❌ Could not connect to PostgreSQL:", error.message);
    throw error;
  }
};

const createDatabaseIfNotExists = async (client) => {
  const dbName = process.env.DB_NAME;
  try {
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (res.rows.length === 0) {
      console.log(`📁 Database "${dbName}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`✅ Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error("❌ Error creating database:", error.message);
    throw error;
  }
};

const runMigrations = async () => {
  const dbName = process.env.DB_NAME;
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
  });

  try {
    console.log(`🔄 Running migrations on database "${dbName}"...`);
    await client.connect();

    const schemaPath = path.join(__dirname, "..", "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found at: ${schemaPath}`);
      throw new Error("Schema file not found");
    }

    const schema = fs.readFileSync(schemaPath, "utf8");
    await client.query(schema);
    console.log("✅ Migrations completed successfully.");
  } catch (error) {
    console.error("❌ Error running migrations:", error.message);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
};

const runSetup = async () => {
  let client;
  try {
    console.log("\n🚀 Starting HED System setup...\n");

    checkEnvVars();
    console.log("✅ Environment variables verified.\n");

    client = await checkPostgresConnection();
    await createDatabaseIfNotExists(client);
    await client.end().catch(() => {});

    await runMigrations();

    console.log("\n✨ Setup complete! Your system is ready to use.\n");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
};

runSetup();
