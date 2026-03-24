import { createApp } from './app.js'
import { createDbPool } from './db.js'
import { getEnv } from './env.js'
import { ensureAdminUser } from './ensureAdminUser.js'

async function ensureColumn(db, tableName, columnName, addSql) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  )
  if (Array.isArray(rows) && rows.length) return
  await db.query(`ALTER TABLE ${tableName} ${addSql}`)
}

async function ensureSchema(db) {
  await db.query(
    `CREATE TABLE IF NOT EXISTS password_resets (
      id CHAR(36) NOT NULL,
      userId CHAR(36) NOT NULL,
      tokenHash CHAR(64) NOT NULL,
      expiresAt TIMESTAMP NOT NULL,
      usedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_password_resets_tokenHash (tokenHash),
      KEY ix_password_resets_userId (userId),
      KEY ix_password_resets_expiresAt (expiresAt),
      CONSTRAINT fk_password_resets_userId
        FOREIGN KEY (userId) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS invoice_drafts (
      id CHAR(36) NOT NULL,
      invoiceNumber VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      clientName VARCHAR(255) NULL,
      clientEmail VARCHAR(255) NULL,
      data JSON NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_invoice_drafts_invoiceNumber (invoiceNumber),
      KEY ix_invoice_drafts_updatedAt (updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS invoice_shares (
      id CHAR(36) NOT NULL,
      invoiceDraftId CHAR(36) NOT NULL,
      tokenHash CHAR(64) NOT NULL,
      expiresAt TIMESTAMP NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_invoice_shares_tokenHash (tokenHash),
      KEY ix_invoice_shares_invoiceDraftId (invoiceDraftId),
      KEY ix_invoice_shares_expiresAt (expiresAt),
      CONSTRAINT fk_invoice_shares_invoiceDraftId
        FOREIGN KEY (invoiceDraftId) REFERENCES invoice_drafts(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS invoice_counters (
      counterDate DATE NOT NULL,
      docType VARCHAR(20) NOT NULL,
      seq INT NOT NULL,
      PRIMARY KEY (counterDate, docType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS service_items (
      id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      unit VARCHAR(30) NOT NULL DEFAULT 'unit',
      unitPriceCents INT NOT NULL DEFAULT 0,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_service_items_name (name),
      KEY ix_service_items_isActive (isActive),
      KEY ix_service_items_updatedAt (updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS owner_profile (
      id TINYINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      legalForm VARCHAR(120) NULL,
      siret VARCHAR(30) NULL,
      vatNumber VARCHAR(80) NULL,
      address VARCHAR(255) NULL,
      postalCode VARCHAR(30) NULL,
      city VARCHAR(120) NULL,
      country VARCHAR(120) NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      website VARCHAR(255) NULL,
      legalMention VARCHAR(255) NULL,
      logo VARCHAR(2000) NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  )

  await ensureColumn(db, 'clients', 'contactName', 'ADD COLUMN contactName VARCHAR(255) NULL AFTER name')
  await ensureColumn(db, 'clients', 'siret', 'ADD COLUMN siret VARCHAR(30) NULL AFTER contactName')
}

export async function start() {
  const env = getEnv()
  const db = createDbPool(env)

  try {
    const conn = await db.getConnection()
    conn.release()
  } catch (e) {
    const details =
      e && typeof e === 'object'
        ? JSON.stringify(e, Object.getOwnPropertyNames(e))
        : String(e)
    throw new Error(`DB connection failed: ${details}`)
  }

  await ensureSchema(db)
  await ensureAdminUser({ db, env })

  const app = createApp({ db, env })
  const server = app.listen(env.PORT, () => {
    process.stdout.write(`API listening on http://localhost:${env.PORT}\n`)
  })

  const shutdown = async () => {
    server.close(() => {})
    await db.end()
  }

  process.on('SIGINT', () => {
    shutdown().finally(() => process.exit(0))
  })
  process.on('SIGTERM', () => {
    shutdown().finally(() => process.exit(0))
  })
}
