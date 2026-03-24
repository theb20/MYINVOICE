CREATE DATABASE IF NOT EXISTS myinvoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myinvoice;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contactName VARCHAR(255) NULL,
  siret VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  postalCode VARCHAR(30) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  vatNumber VARCHAR(80) NULL,
  lastCompletedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_clients_name (name),
  KEY ix_clients_updatedAt (updatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_invites (
  id CHAR(36) NOT NULL,
  tokenHash CHAR(64) NOT NULL,
  clientId CHAR(36) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  usedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_client_invites_tokenHash (tokenHash),
  KEY ix_client_invites_clientId (clientId),
  KEY ix_client_invites_expiresAt (expiresAt),
  CONSTRAINT fk_client_invites_clientId
    FOREIGN KEY (clientId) REFERENCES clients(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_drafts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_shares (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_counters (
  counterDate DATE NOT NULL,
  docType VARCHAR(20) NOT NULL,
  seq INT NOT NULL,
  PRIMARY KEY (counterDate, docType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_items (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS owner_profile (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
