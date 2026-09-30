const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process"); // execFile en lugar de exec (evita inyección de shell)
const net = require("net");
const http = require("http");
const https = require("https");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const VERSION = "3.0";

// Tiempo máximo de espera de cada ping (ms)
const TIMEOUT_PING_MS = 1000;
// Máximo de pings simultáneos (evita lanzar cientos de procesos a la vez)
const MAX_PINGS_SIMULTANEOS = 24;

app.use(cors());

// No servir el código del servidor ni las dependencias
app.use((req, res, next) => {
  if (/^\/(node_modules|server\.js|package(-lock)?\.json)/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Sin caché: si se sustituye index.html o el fichero de impresoras, se ve al momento
app.use(express.static(__dirname, {
  setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
}));

// ─────────────────────────────────────────────
// LOGGING básico con timestamp
// ─────────────────────────────────────────────
function log(mensaje) {
  const fecha = new Date().toISOString();
  console.log(`[${fecha}] ${mensaje}`);
}

// ─────────────────────────────────────────────
// VALIDACIÓN: IP o nombre de equipo
// ─────────────────────────────────────────────
function esIPValida(ip) {
  return net.isIP(ip) !== 0;
}

// Nombres de equipo (p. ej. TE00PCS3845): tienen que empezar por letra o número,
// así nunca se pueden confundir con una opción del comando ping ("-algo")
function esNombreDeEquipo(host) {
  return host.length <= 253 &&
    /^[A-Za-z0-9][A-Za-z0-9-]{0,62}(\.[A-Za-z0-9][A-Za-z0-9-]{0,62})*$/.test(host);
}

// Bloquear IPs privadas y reservadas (solo si el servidor fuera público)
function esIPPrivadaOReservada(ip) {
  const privados = [
    /^127\./,                        // loopback
    /^10\./,                         // Clase A privada
    /^172\.(1[6-9]|2\d|3[01])\./,   // Clase B privada
    /^192\.168\./,                   // Clase C privada
    /^169\.254\./,                   // link-local
    /^::1$/,                         // loopback IPv6
    /^fc|^fd/,                       // ULA IPv6
  ];
  return privados.some(patron => patron.test(ip));
}

// ─────────────────────────────────────────────
// LÍMITE DE PINGS SIMULTÁNEOS
// ─────────────────────────────────────────────
let pingsEnCurso = 0;
const colaPings = [];

function conTurno(tarea) {
  return new Promise((resolve) => {
    const ejecutar = async () => {
      pingsEnCurso++;
      try {
        resolve(await tarea());
      } finally {
        pingsEnCurso--;
        const siguiente = colaPings.shift();
        if (siguiente) siguiente();
      }
    };
    if (pingsEnCurso < MAX_PINGS_SIMULTANEOS) ejecutar();
    else colaPings.push(ejecutar);
  });
}

// ─────────────────────────────────────────────
// PING: argumentos según el sistema operativo
// ─────────────────────────────────────────────
function argumentosPing(host) {
  if (process.platform === "win32") {
    // -w en milisegundos
    return ["-n", "1", "-w", String(TIMEOUT_PING_MS), host];
  }
  if (process.platform === "darwin") {
    // En macOS -W va en milisegundos (con "-W 1" esperaba solo 1 ms)
    return ["-c", "1", "-W", String(TIMEOUT_PING_MS), host];
  }
  // Linux: -W en segundos
  return ["-c", "1", "-W", String(Math.max(1, Math.ceil(TIMEOUT_PING_MS / 1000))), host];
}

function hacerPing(host) {
  return new Promise((resolve) => {
    execFile("ping", argumentosPing(host), { timeout: TIMEOUT_PING_MS + 3000, windowsHide: true }, (error, stdout, stderr) => {
      const salida = (stdout || "") + (stderr || "");
      // Solo cuenta como respuesta si hay TTL: en Windows, "Host de destino inaccesible"
      // devuelve código 0 aunque la impresora no haya contestado
      const respondio = !error && /ttl[=:]\s*\d+/i.test(salida);
      resolve({ respondio, salida });
    });
  });
}

// ─────────────────────────────────────────────
// PARSEO DE PING: solo extraer tiempo y TTL
// ─────────────────────────────────────────────
function parsearSalidaPing(salida) {
  // "time=12 ms", "time<1ms" (inglés) o "tiempo=12ms", "tiempo<1m" (Windows en español)
  const tiempo = salida.match(/(?:time|tiempo)\s*([=<])\s*(\d+(?:[.,]\d+)?)\s*m/i);
  const ttl = salida.match(/ttl[=:]\s*(\d+)/i);

  const ms = tiempo ? parseFloat(tiempo[2].replace(",", ".")) : null;
  const menorQue = tiempo && tiempo[1] === "<";

  const partes = [];
  if (ms !== null) partes.push(`Tiempo: ${menorQue ? "<" : ""}${ms} ms`);
  if (ttl) partes.push(`TTL: ${ttl[1]}`);

  return {
    ms,
    ttl: ttl ? Number(ttl[1]) : null,
    detalle: partes.length > 0 ? partes.join(" · ") : "Responde a ping",
  };
}

// ─────────────────────────────────────────────
// COMPROBACIÓN WEB: HTTP y HTTPS
// ─────────────────────────────────────────────
function comprobarPuerto(host, puerto, usarHTTPS) {
  return new Promise((resolve) => {
    const modulo = usarHTTPS ? https : http;
    const req = modulo.get(
      {
        host,
        port: puerto,
        path: "/",
        timeout: 2000,
        // Ignorar errores de certificado en entornos locales de impresoras
        rejectUnauthorized: false,
      },
      (res) => {
        resolve(res.statusCode > 0);
        req.destroy();
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.on("error", () => {
      resolve(false);
    });
  });
}

async function comprobarWeb(host) {
  const [respondeHTTP, respondeHTTPS] = await Promise.all([
    comprobarPuerto(host, 80, false),
    comprobarPuerto(host, 443, true),
  ]);
  return respondeHTTP || respondeHTTPS;
}

// ─────────────────────────────────────────────
// RUTA ESTADO: para saber desde el panel si el servidor está vivo
// ─────────────────────────────────────────────
app.get("/estado", (req, res) => {
  res.json({ ok: true, version: VERSION, plataforma: process.platform, hora: Date.now() });
});

// ─────────────────────────────────────────────
// RUTA PING
// ─────────────────────────────────────────────
app.get("/ping", async (req, res) => {
  const host = String(req.query.ip || "").trim();

  log(`Consulta ping → "${host}" desde ${req.ip}`);

  if (!esIPValida(host) && !esNombreDeEquipo(host)) {
    log(`Rechazado (formato inválido): "${host}"`);
    return res.status(400).json({
      estado: "offline",
      error: "IP o nombre de equipo no válido",
      t: Date.now(),
    });
  }

  // ⚠️ Bloque desactivado: red local del hospital (rango 10.x.x.x)
  // Activa esto solo si el servidor fuera público
  // if (esIPValida(host) && esIPPrivadaOReservada(host)) {
  //   return res.status(400).json({ estado: "offline", error: "IP en rango privado o reservado" });
  // }

  const resultado = await conTurno(async () => {
    const { respondio, salida } = await hacerPing(host);

    if (respondio) {
      const { ms, ttl, detalle } = parsearSalidaPing(salida);
      log(`Ping OK → ${host}${ms !== null ? ` (${ms} ms)` : ""}`);
      return { estado: "online", detalle, ms, ttl };
    }

    // Sin respuesta ICMP → intentar HTTP/HTTPS
    if (await comprobarWeb(host)) {
      log(`Sin ICMP pero responde HTTP/HTTPS → ${host}`);
      return { estado: "web", detalle: "No responde a ping pero sí por HTTP o HTTPS" };
    }

    log(`Offline → ${host}`);
    return { estado: "offline", detalle: "No responde" };
  });

  res.json({ ...resultado, t: Date.now() });
});

// ─────────────────────────────────────────────
// RUTA RAÍZ
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  log(`Servidor iniciado en http://localhost:${PORT} (versión ${VERSION})`);
  log(`Desde otro PC de la red: http://<IP-de-este-PC>:${PORT}`);
});
