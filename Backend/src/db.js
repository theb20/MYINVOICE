import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

export function createDbPool(env) {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    namedPlaceholders: true,
  })
}

