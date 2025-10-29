// ===============================
// 🧠 Importaciones necesarias
// ===============================
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

// ===============================
// ⚙️ Configuración del servidor
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// 🌍 CORS global y manejo de OPTIONS
// ===============================
app.use(cors());

app.use((req, res, next) => {
  // Permitir cualquier origen
  res.header("Access-Control-Allow-Origin", "*");

  // Métodos permitidos
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  // Headers permitidos
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Responder rápido a preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ===============================
// 🧩 Middlewares adicionales
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// 🔥 Ruta de prueba
// ===============================
app.get("/", (req, res) => {
  res.send("🔥 Servidor activo y funcionando correctamente con Express 5!");
});

// ===============================
// 🎬 Ejemplo: descarga de datos de YouTube
// ===============================
// (Puedes adaptarlo a tu función real)
app.get("/youtube", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Falta el parámetro ?url=" });
    }

    // Ejemplo: usa tu endpoint de descarga o API real
    const response = await fetch(`https://api.example.com/youtube?url=${url}`);
    const data = await response.json();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("❌ Error al procesar la solicitud:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===============================
// 🚀 Iniciar servidor
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
