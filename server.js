import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

const app = express();

// ===============================
// 🌍 CORS universal y seguridad básica
// ===============================
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ===============================
// 🧠 Función para limpiar URLs de YouTube
// ===============================
function limpiarYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    return url;
  } catch {
    return url;
  }
}

// ===============================
// 🎬 Endpoint principal
// ===============================
app.get("/download/youtube", async (req, res) => {
  const { url, type } = req.query;

  if (!url) return res.status(400).json({ status: false, error: "Falta parámetro ?url=" });

  try {
    const cleanUrl = limpiarYouTubeUrl(url);
    const apiUrl = `https://api.bk9.dev/download/youtube?url=${encodeURIComponent(cleanUrl)}`;

    // fetch nativo de Node 22+
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.status) throw new Error("No se pudo obtener datos del video desde la API externa.");

    const videoInfo = data.BK9 || data;
    const formatos = videoInfo.formats || [];

    // 🔹 Mejor video con audio
    const mejorVideo = formatos.find((f) => f.has_audio && f.has_video) || null;

    // 🔹 Audios puros
    const audiosPurosM4A = formatos.filter(f => f.type === "audio" && f.has_audio && !f.has_video);

    if (type === "audio") {
      if (!audiosPurosM4A.length) return res.status(404).json({ status: false, error: "No se encontraron audios disponibles." });

      const audioUrl = audiosPurosM4A[0].url;
      const tempMp3 = path.join(tmpdir(), `audio_${Date.now()}.mp3`);

      ffmpeg(audioUrl)
        .toFormat("mp3")
        .on("end", () => {
          res.setHeader("Content-Type", "audio/mpeg");
          res.sendFile(tempMp3, (err) => {
            fs.unlink(tempMp3, () => {});
          });
        })
        .on("error", (err) => {
          console.error(err);
          res.status(500).json({ status: false, error: "Error convirtiendo a MP3" });
        })
        .save(tempMp3);

    } else {
      // type=video o por defecto
      if (!mejorVideo) return res.status(404).json({ status: false, error: "No se encontró un video disponible." });

      res.json({
        status: true,
        video: {
          titulo: videoInfo.title,
          autor: videoInfo.author || videoInfo.uploader || "Desconocido",
          duracion: videoInfo.duration,
          miniatura: videoInfo.thumbnail,
          url_original: cleanUrl,
          formato_video: {
            calidad: mejorVideo.quality || mejorVideo.quality_label || "360p",
            extension: mejorVideo.ext || "mp4",
            enlace: mejorVideo.url
          }
        }
      });
    }
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// ===============================
// 🚀 Inicio del servidor
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API lista en: http://localhost:${PORT}/download/youtube?url=`);
});
