import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static"; // <-- usamos ffmpeg-static

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ===============================
// 🌍 CORS universal y seguridad básica
// ===============================
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ===============================
// 🧠 Función para limpiar URLs de YouTube
// ===============================
function limpiarYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com"))
      return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    return url;
  } catch {
    return url;
  }
}

// ===============================
// 🧩 Conversión a MP3 con fluent-ffmpeg
// ===============================
function convertirAMp3(m4aUrl, salida) {
  return new Promise((resolve, reject) => {
    ffmpeg(m4aUrl)
      .noVideo()
      .audioFrequency(44100)
      .audioChannels(2)
      .audioBitrate("192k")
      .save(salida)
      .on("end", () => resolve(salida))
      .on("error", (err) => reject(err));
  });
}

// ===============================
// 🎬 Endpoint principal
// ===============================
app.get("/download/youtube", async (req, res) => {
  const { url, type } = req.query;

  if (!url) {
    return res.status(400).json({ status: false, error: "Falta parámetro ?url=" });
  }

  try {
    const cleanUrl = limpiarYouTubeUrl(url);
    const apiUrl = `https://api.bk9.dev/download/youtube?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.status) throw new Error("No se pudo obtener datos del video desde la API externa.");

    const videoInfo = data.BK9 || data;
    const formatos = videoInfo.formats || [];

    const audiosM4A = formatos.filter(f => f.type === "audio" && f.extension === "m4a" && f.has_audio && !f.has_video);
    const mejorVideo = formatos.find(f => f.has_audio && f.has_video) || null;

    // 🔊 Si pide tipo=audio → convertir a MP3
    if (type === "audio" && audiosM4A.length > 0) {
      const audio = audiosM4A[0]; // elegimos el primero o el de mejor calidad
      const nombreArchivo = `audio_${Date.now()}.mp3`;
      const rutaSalida = path.join("temp", nombreArchivo);

      if (!fs.existsSync("temp")) fs.mkdirSync("temp");

      await convertirAMp3(audio.url, rutaSalida);

      res.download(rutaSalida, nombreArchivo, (err) => {
        fs.unlinkSync(rutaSalida); // eliminar archivo temporal al terminar
        if (err) console.error("Error al enviar MP3:", err);
      });
      return;
    }

    // 🎥 Si pide tipo=video → devolver link directo
    if (type === "video" && mejorVideo) {
      return res.json({
        status: true,
        tipo: "video",
        enlace: mejorVideo.url,
        extension: mejorVideo.ext || "mp4",
        calidad: mejorVideo.quality_label || "360p",
      });
    }

    // 📦 Si no especifica tipo → JSON completo
    const resultado = {
      status: true,
      fuente: "skrifna.uk",
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
        audios_m4a: audiosM4A.map((a) => ({
          calidad: a.quality || `${a.bitrate || "desconocida"} kbps`,
          bitrate: a.bitrate || "N/A",
          extension: a.extension || "m4a",
          enlace: a.url,
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

// 🚀 Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API lista en: http://localhost:${PORT}/download/youtube?url=`);
});
