// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import path from "path";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ===============================
// 🌍 CORS universal
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
// 🔊 Descargar audio y convertir a MP3
// ===============================
async function descargarYConvertir(url, salida) {
  const tmpFile = `temp/temp_${Date.now()}.m4a`;

  if (!fs.existsSync("temp")) fs.mkdirSync("temp");

  // Descargar audio M4A
  await new Promise((resolve, reject) => {
    ytdl(url, { filter: "audioonly", quality: "highestaudio" })
      .pipe(fs.createWriteStream(tmpFile))
      .on("finish", resolve)
      .on("error", reject);
  });

  // Convertir a MP3
  await new Promise((resolve, reject) => {
    ffmpeg(tmpFile)
      .noVideo()
      .audioBitrate("192k")
      .save(salida)
      .on("end", resolve)
      .on("error", reject);
  });

  fs.unlinkSync(tmpFile);
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

    // Obtener info del video
    const info = await ytdl.getInfo(cleanUrl);
    const formats = info.formats || [];
    const audios = formats.filter(f => f.hasAudio && !f.hasVideo);
    const videos = formats.filter(f => f.hasVideo && f.hasAudio);

    // ===============================
    // Audio MP3
    // ===============================
    if (type === "audio" && audios.length > 0) {
      const salida = `temp/audio_${Date.now()}.mp3`;
      await descargarYConvertir(cleanUrl, salida);

      res.download(salida, path.basename(salida), err => {
        fs.unlinkSync(salida);
        if (err) console.error("Error al enviar MP3:", err);
      });
      return;
    }

    // ===============================
    // Video
    // ===============================
    if (type === "video" && videos.length > 0) {
      const mejor = videos[0];
      return res.json({
        status: true,
        tipo: "video",
        enlace: mejor.url,
        extension: mejor.container || "mp4",
        calidad: mejor.qualityLabel || "360p",
      });
    }

    // ===============================
    // JSON completo
    // ===============================
    res.json({
      status: true,
      video: {
        titulo: info.videoDetails.title,
        autor: info.videoDetails.author.name,
        duracion: info.videoDetails.lengthSeconds,
        miniatura: info.videoDetails.thumbnails[0]?.url || null,
        url_original: cleanUrl,
        audios: audios.map(a => ({
          bitrate: a.bitrate || "N/A",
          extension: a.container,
          calidad: a.audioQuality || "N/A",
          url: a.url,
        })),
        videos: videos.map(v => ({
          calidad: v.qualityLabel,
          extension: v.container,
          url: v.url,
        })),
      },
    });
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
