import bcrypt from "bcrypt";
import { query, pool } from "../config/db.js";

async function seed() {
  await query(`
    INSERT INTO roles (nom, description)
    VALUES
      ('admin', 'Administrateur global'),
      ('boss', 'Entrepreneur proprietaire'),
      ('jeton', 'Operateur de salle')
    ON CONFLICT (nom) DO NOTHING
  `);

  // Get role IDs
  const { rows: adminRoleRows } = await query(
    "SELECT id FROM roles WHERE nom='admin' LIMIT 1",
  );
  const adminRoleId = adminRoleRows[0].id;

  const { rows: bossRoleRows } = await query(
    "SELECT id FROM roles WHERE nom='boss' LIMIT 1",
  );
  const bossRoleId = bossRoleRows[0].id;

  const { rows: jetonRoleRows } = await query(
    "SELECT id FROM roles WHERE nom='jeton' LIMIT 1",
  );
  const jetonRoleId = jetonRoleRows[0].id;

  // Hash passwords
  const adminHash = await bcrypt.hash("admin123", 10);
  const bossHash = await bcrypt.hash("boss123", 10);
  const jetonHash = await bcrypt.hash("jeton123", 10);

  // Insert test users
  await query(
    `
    INSERT INTO utilisateurs (nom, username, mot_de_passe, role_id, actif)
    VALUES ($1,$2,$3,$4,TRUE)
    ON CONFLICT (username) DO NOTHING
    `,
    ["Administrateur", "admin", adminHash, adminRoleId],
  );

  await query(
    `
    INSERT INTO utilisateurs (nom, username, mot_de_passe, role_id, actif)
    VALUES ($1,$2,$3,$4,TRUE)
    ON CONFLICT (username) DO NOTHING
    `,
    ["Rakoto Boss", "boss1", bossHash, bossRoleId],
  );

  await query(
    `
    INSERT INTO utilisateurs (nom, username, mot_de_passe, role_id, actif)
    VALUES ($1,$2,$3,$4,TRUE)
    ON CONFLICT (username) DO NOTHING
    `,
    ["Jean Jeton", "jeton1", jetonHash, jetonRoleId],
  );

  await query(
    `
    INSERT INTO consoles (nom, marque, description)
    VALUES
      ('PS3', 'Sony', 'Console PlayStation 3'),
      ('PS4', 'Sony', 'Console PlayStation 4')
    ON CONFLICT DO NOTHING
    `,
  );

  // eslint-disable-next-line no-console
  console.log("Seed termine. Comptes de test créés:");
  // eslint-disable-next-line no-console
  console.log("  - admin / admin123");
  // eslint-disable-next-line no-console
  console.log("  - boss1 / boss123");
  // eslint-disable-next-line no-console
  console.log("  - jeton1 / jeton123");
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
