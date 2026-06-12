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
    SELECT v.nom, v.marque, v.description
    FROM (VALUES
      ('PS3', 'Sony', 'Console PlayStation 3'),
      ('PS4', 'Sony', 'Console PlayStation 4'),
      ('PS5', 'Sony', 'Console PlayStation 5')
    ) AS v(nom, marque, description)
    WHERE NOT EXISTS (SELECT 1 FROM consoles c WHERE c.nom = v.nom)
    `,
  );

  await query(
    `
    INSERT INTO modeles_paiement_jeton (nom_modele, type_modele, valeur, seuil, description)
    SELECT v.nom, v.type, v.val, v.seuil, v.desc
    FROM (VALUES
      ('Tiers recette', 'fraction', 0.33, NULL::numeric, 'Le jeton reçoit 1/3 de la recette'),
      ('20% recette', 'pourcentage', 20, NULL::numeric, 'Le jeton reçoit 20% de la recette'),
      ('Fixe 3000/jour', 'fixe_journalier', 3000, NULL::numeric, 'Salaire fixe 3000 Ar par jour'),
      ('10% après 50k', 'pourcentage_seuil', 10, 50000, '10% après 50 000 Ar de recette')
    ) AS v(nom, type, val, seuil, desc)
    WHERE NOT EXISTS (SELECT 1 FROM modeles_paiement_jeton m WHERE m.nom_modele = v.nom)
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
