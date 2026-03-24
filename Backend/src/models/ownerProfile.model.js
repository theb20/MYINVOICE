export async function getOwnerProfile(db) {
  const [rows] = await db.query('SELECT * FROM owner_profile WHERE id = 1 LIMIT 1')
  return rows[0] ?? null
}

export async function upsertOwnerProfile(db, profile) {
  await db.query(
    `INSERT INTO owner_profile (
      id, name, legalForm, siret, vatNumber, address, postalCode, city, country, email, phone, website, legalMention, logo
    ) VALUES (
      1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      legalForm = VALUES(legalForm),
      siret = VALUES(siret),
      vatNumber = VALUES(vatNumber),
      address = VALUES(address),
      postalCode = VALUES(postalCode),
      city = VALUES(city),
      country = VALUES(country),
      email = VALUES(email),
      phone = VALUES(phone),
      website = VALUES(website),
      legalMention = VALUES(legalMention),
      logo = VALUES(logo)`,
    [
      profile.name,
      profile.legalForm ?? null,
      profile.siret ?? null,
      profile.vatNumber ?? null,
      profile.address ?? null,
      profile.postalCode ?? null,
      profile.city ?? null,
      profile.country ?? null,
      profile.email ?? null,
      profile.phone ?? null,
      profile.website ?? null,
      profile.legalMention ?? null,
      profile.logo ?? null,
    ],
  )
}

