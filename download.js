import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// 🧠 Permitir CORS desde cualquier origen
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// ✅ Esta línea es la clave para evitar el error de PathError
app.options("/*", cors());

// ✅ Middleware adicional por si hay preflight manual
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

function limpiarYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    }
    return url;
  } catch {
    return url;
  }
}

app.get("/download/youtube", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: false, error: "Falta parámetro ?url=" });
  }

  try {
    const cleanUrl = limpiarYouTubeUrl(url);
    const apiUrl = `https://api.bk9.dev/download/youtube?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.status) {
      throw new Error("No se pudo obtener datos del video desde la API externa.");
    }

    const videoInfo = data.BK9 || data;
    const formatos = videoInfo.formats || [];
    const audiosPurosM4A = formatos.filter(
      f => f.type === "audio" && f.extension === "m4a" && f.has_audio && !f.has_video
    );
    const mejorVideo = formatos.find(f => f.has_audio && f.has_video) || null;

    const resultado = {
      status: true,
      marca: "BK9🔥 + Tu filtro",
      fuente: "api.bk9.dev",
      video: {
        titulo: videoInfo.title,
        autor: videoInfo.author || videoInfo.uploader || "Desconocido",
        duracion: videoInfo.duration,
        miniatura: videoInfo.thumbnail,
        url_original: cleanUrl,
        formato_video: mejorVideo
          ? {
              calidad: mejorVideo.quality || mejorVideo.quality_label || "360p",
              extension: mejorVideo.ext || "mp4",
              enlace: mejorVideo.url,
            }
          : null,
        audios_m4a: audiosPurosM4A.map(audio => ({
          calidad:
            audio.quality ||
            `${audio.bitrate || "desconocida"} - ${audio.audio_quality || ""}`.trim() ||
            "audio",
          bitrate: audio.bitrate || "N/A",
          extension: audio.extension || "m4a",
          enlace: audio.url,
          format_id: audio.format_id,
        })),
      },
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(resultado, null, 2));
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API lista en http://localhost:${PORT}/download/youtube?url=`);
});
