//+ ╭────────────────────────────────────────────
//+ │ NOMBRE DEL PROYECTO        
//+ │────────────────────────────────────────────
//+ │ 📦 FUNCIONES:  1      
//+ │ 💼 MODULOS:    2               
//+ │ 💻 SERCIOS:  1           
//+ │ 📡 APIS:     1        
//+ │ 🎵ETC:    Descarga de audio/video YouTube         
//+ │ 🌐ETC:      API Express REST  
//+ │ 🧩ETC:       Uso de ytdlp-nodejs        
//+ │ ⚙️ETC:       Manejo de URLs y formatos     
//+ │ 📊ETC:  Respuesta JSON estructurada          
//+ │ 🛠️ETC:   Logging y manejo de errores  
//+ │──────────────────────────────────────────────────
//+ │ 💬 DESCRIPCIÓN:    API Express que permite descargar información y enlaces 
//+ │ de audio/video de YouTube usando ytdlp-nodejs. Recibe una URL, la limpia, 
//+ │ obtiene metadatos y formatos disponibles (audio sin video y video 360p), 
//+ | y devuelve una respuesta JSON estructurada.
//+ ╰────────────────────────────────────────────

//> ╭──────────────────────
//> │ 📦 IMPORTACIONES DE MODULOS 
//> ╰──────────────────────
import express from "express";
import { YtDlp } from "ytdlp-nodejs";

//> ╭──────────────────────
//> │ 🛠️ CONFIGURACION INICIAL 
//> ╰──────────────────────
const app = express();
const ytdlp = new YtDlp();

//> ╭──────────────────────
//> │ 🔁 FUNCION PRINCIPAL: limpiarYouTubeUrl
//> │   Propósito: Normalizar cualquier URL de YouTube (youtube.com o youtu.be) a un formato estándar.
//> ╰──────────────────────
function limpiarYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`; // ❗ Corrección: Quita los espacios extra al inicio
    }
    return url;
  } catch {
    return url;
  }
}

//> ╭──────────────────────
//> │ 🌐 ENDPOINT API: /download/youtube
//> │   Propósito: Procesar solicitudes GET para obtener información y enlaces de descarga de un video de YouTube.
//> ╰──────────────────────
app.get("/download/youtube", async (req, res) => {
  const { url } = req.query;

  //> └── Validación de parámetro requerido
  if (!url) {
    return res.status(400).json({ status: false, error: "Falta parámetro ?url=" });
  }

  try {
    const cleanUrl = limpiarYouTubeUrl(url);

    //> └── Obtener metadatos del video usando ytdlp
    const infoRaw = await ytdlp.execAsync(cleanUrl, { dumpSingleJson: true });
    const info = JSON.parse(infoRaw);

    //> └── Filtrar y ordenar formatos de audio (sin video)
    const audio = info.formats
      .filter(f => f.vcodec === "none" && f.acodec !== "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

    //> └── Buscar formato de video específico (360p)
    const video360 = info.formats.find(f => f.format_id === "18");

    //> └── Construir objeto de respuesta
    const result = {
      status: true,
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      thumbnail: info.thumbnail,
      cleanedUrl: cleanUrl,
      available: [
        audio && {
          type: "audio",
          format_id: audio.format_id,
          ext: audio.ext,
          quality: `${audio.abr || "?"} kbps (Audio Calidad Media)`,
          url: audio.url,
        },
        video360 && {
          type: "video",
          format_id: video360.format_id,
          ext: video360.ext,
          quality: video360.quality_label || "360p (MP4 Combinado)",
          url: video360.url,
        },
      ].filter(Boolean),
    };

    //> └── Enviar respuesta JSON formateada
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});

//> ╭──────────────────────
//> │ 🚀 INICIO DEL SERVIDOR 
//> │   Propósito: Escuchar en el puerto 3000 y mostrar mensaje de éxito.
//> ╰──────────────────────
app.listen(3000, () => console.log("✅ API lista en http://localhost:3000"));

//~ ╭────────────────────────────────────────────────────
//~ │ 🌟      ¡HOLIII~! COMO ESTAS SOY RUBI~ 💖           
//~ │        Representando a: TEAM PROTOTYPE 🛠️👾         
//~ │────────────────────────────────────────────────────
//~ │ 🎯 ¿Necesitas ayuda tecnológica? ¡Aquí estamos~!    
//~ │                                                    
//~ │ 💼 Servicios Premium que ofrecemos:                
//~ │                                                    
//~ │ 🤖  AUTOMATIZACIÓN: Bots, sistemas y tareas smart~ 
//~ │ 🧪  CREACIÓN: Ideas únicas hechas realidad 💡       
//~ │ 🔧  SCRIPTS: Personalizados, rápidos y seguros 🛡️   
//~ │ 🌀  CLONACIÓN: Entornos, sistemas, lógicas 🔍       
//~ │                                                    
//~ │ 💬 ¡Conversemos! Rubi y el team están atentos~ 💻   
//~ │ 🏡  DISCORD: https://discord.gg/2qcRceCmtC           
//~ │ 🌐  WEB:     https://skrifna.uk/                 
//~ ╰────────────────────────────────────────────────────