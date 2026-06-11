import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { query } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import comptesRoutes from "./routes/comptes.js";
import sallesRoutes from "./routes/salles.js";
import postesRoutes from "./routes/postes.js";
import jeuxRoutes from "./routes/jeux.js";
import sessionsRoutes from "./routes/sessions.js";
import materielsRoutes from "./routes/materiels.js";
import tournoisRoutes from "./routes/tournois.js";
import abonnementsRoutes from "./routes/abonnements.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

app.use("/api", requireAuth);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/comptes", comptesRoutes);
app.use("/api/salles", sallesRoutes);
app.use("/api/postes", postesRoutes);
app.use("/api/jeux", jeuxRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/materiels", materielsRoutes);
app.use("/api/tournois", tournoisRoutes);
app.use("/api/abonnements", abonnementsRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ message: error.message || "Erreur serveur" });
});

async function start() {
  try {
    await query("SELECT 1");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Echec demarrage serveur", error);
    if (error && error.code === "28P01") {
      // eslint-disable-next-line no-console
      console.error("Authentification échouée pour la base de données.");
      // eslint-disable-next-line no-console
      console.error(
        "Vérifiez `DB_USER` et `DB_PASSWORD` dans backend/.env et que l'utilisateur existe.",
      );
      // eslint-disable-next-line no-console
      console.error(
        "Exemples de commandes pour créer un utilisateur et une base (Linux, Postgres local):",
      );
      // eslint-disable-next-line no-console
      console.error(
        "  sudo -u postgres psql -c \"CREATE USER postgres WITH PASSWORD 'postgres';\"",
      );
      // eslint-disable-next-line no-console
      console.error(
        '  sudo -u postgres psql -c "CREATE DATABASE gamecenter_db OWNER postgres;"',
      );
    }
    process.exit(1);
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend pret sur http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Echec demarrage serveur", error);
  process.exit(1);
});
