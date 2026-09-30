# 🖨️ Panel de Gestión de Impresoras

Panel del departamento de Informática para encontrar una impresora en segundos, saber si responde y dejar anotado qué se le ha hecho.

## 📁 Archivos del proyecto

```
web_impresora/
├── index.html                  ← El panel
├── impresoras_con_serial.js    ← Datos de las impresoras
├── server.js                   ← Servidor Node (hace los pings reales)
├── package.json                ← Dependencias del servidor (express y cors)
├── qrcode.min.js               ← Genera los QR sin internet
├── manifest.json               ← Para instalarlo como aplicación
├── service-worker.js           ← Para instalarlo como aplicación
├── icon.svg                    ← Icono
├── INICIAR_SERVIDOR.bat        ← Doble clic para arrancar (Windows)
├── INICIAR_SERVIDOR.command    ← Doble clic para arrancar (Mac)
└── README.md                   ← Este archivo
```

---

## 🚀 Cómo arrancar el panel

### Primera vez (solo una vez)

1. **Instalar Node.js** desde https://nodejs.org (versión LTS)
2. Todos los archivos tienen que estar en la **misma carpeta**

### Cada vez que quieras usar el panel

#### 🪟 En Windows
1. **Doble clic** en `INICIAR_SERVIDOR.bat`
2. Se abre una ventana negra → no la cierres
3. El panel se abre solo en el navegador en **http://localhost:3000**

#### 🍎 En Mac
1. La primera vez, abre Terminal y ejecuta:
   ```
   chmod +x INICIAR_SERVIDOR.command
   ```
2. **Doble clic** en `INICIAR_SERVIDOR.command`
3. El panel se abre solo en **http://localhost:3000**

#### 💻 Desde otro PC de la red
Si el servidor está arrancado en un PC (por ejemplo `10.35.1.50`), el resto del equipo puede abrir **http://10.35.1.50:3000** sin instalar nada. El panel usa automáticamente ese mismo servidor para los pings.

> También se puede abrir `index.html` con doble clic, pero entonces necesita un servidor en `http://localhost:3000` (o el que pongas en **Configuración**).

---

## ⚡ Trabajar rápido

- **Busca como hablas**: `polanco admision`, `hp 408`, `236.69`. No importan tildes ni mayúsculas. **Enter** abre la primera.
- **A tiro fijo**: `ip:10.35.236` · `id:330` · `serie:CNB3` · `marca:canon` · `modelo:ir1435` · `edificio:gerencia` · `ubi:direccion` · `nota:toner`
- **Ficha lateral**: al pulsar una impresora se abre con todo a mano: abrir su web (http o https), ping, copiar IP / n.º de serie / ID, **Copiar ficha** (todos los datos listos para pegar en el parte o en un correo al técnico de la marca), QR, historial, nota fija e incidencias.
- **Estados que se recuerdan**: el último ping de cada impresora se guarda con la hora ("hace 5 min"). Arriba se filtra por Online · Solo web · Offline · Sin comprobar · Sin IP, y a la izquierda cada edificio muestra cuántas tiene offline.
- **Comprobar**: el botón hace ping a lo que estés viendo (todas, un edificio, una búsqueda…), 10 a la vez, con barra de progreso y botón de cancelar. **Reintentar offline** repite solo las que fallaron.
- **Vigilancia**: comprueba sola cada 5 minutos (configurable) y avisa con un aviso y una notificación del sistema cuando alguna deja de responder. El número de offline sale en la pestaña del navegador.
- **Incidencias**: cada impresora guarda un historial de lo que ha pasado ("atasco bandeja 2, cambiado rodillo") con fecha y tus iniciales. Se puede buscar por ellas.
- **Revisar inventario** (menú ⋯): IPs repetidas, impresoras sin IP, las que están conectadas a un PC y las que no tienen número de serie.

### ⌨️ Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `/` · `Ctrl+K` · `Ctrl+F` | Ir al buscador |
| `↑` `↓` | Moverse por el listado (con la ficha abierta, pasa a la anterior/siguiente) |
| `Enter` | Abrir la ficha |
| `P` | Ping |
| `W` | Abrir su web |
| `C` | Copiar la IP |
| `T` | Copiar la ficha completa |
| `F` | Favorita |
| `X` | Seleccionar (para hacer ping, copiar IPs o exportar varias) |
| `N` | Anotar una incidencia |
| `E` | Editar |
| `Esc` | Cerrar lo que esté abierto / quitar filtros |
| `Ctrl+S` | Exportar el listado a CSV |
| `?` | Ayuda |

---

## ✏️ Cambios en el inventario

Lo que se edita, se añade o se da de baja desde el panel se guarda **en ese navegador** (sale con la etiqueta *editada* o *nueva*).

Para que lo vea todo el equipo:
1. Menú **⋯ › Descargar fichero de impresoras**
2. Sustituye `impresoras_con_serial.js` de la carpeta del panel (o súbelo al repositorio) con el fichero descargado

También se puede **importar** un CSV (con `;` o `,`), un JSON o un `impresoras_con_serial.js`; antes de aplicar nada enseña cuántas impresoras son nuevas y cuántas cambian.

La **copia de seguridad** (menú ⋯) guarda favoritas, notas, incidencias, cambios, estados, historial y configuración para pasarlos a otro navegador.

---

## 🔍 ¿No funciona el ping?

### Comprueba que el servidor está corriendo

Arriba a la derecha del panel pone **Servidor OK** o **Sin servidor**. También puedes abrir:
```
http://localhost:3000/estado
```

- Si responde `{"ok":true,...}` → ✅ Servidor OK
- Si dice "no se puede conectar" → ❌ El servidor NO está corriendo

### Si el servidor está en otra IP

Menú **⋯ › Configuración › Servidor de ping** y pon, por ejemplo, `http://10.35.1.50:3000`. Vacío = automático.

---

## 🆘 Solución de problemas

### "Node.js no se reconoce"
Instala Node.js desde https://nodejs.org y reinicia el ordenador.

### "Cannot find module 'express'"
En la carpeta del proyecto, abre terminal/CMD y ejecuta:
```
npm install
```

### Las impresoras salen siempre offline
- Verifica que la IP es correcta (botón **Editar** en la ficha)
- Algunas impresoras bloquean el ping pero responden por web → salen como 🔵 **Solo web**
- Si la red bloquea el ping, no hay solución desde la app

### Notas técnicas del servidor
- En Windows, una respuesta "Host de destino inaccesible" ya **no** cuenta como online (antes daba falsos positivos).
- En Mac se espera 1 segundo por ping (antes esperaba 1 ms y casi todo salía offline).
- Se pueden comprobar también nombres de equipo (impresoras compartidas desde un PC).
