# 🤖 Xylozoid - Bot de Discord de Nueva Generación

> **Un proyecto de código abierto basado en la arquitectura de Pogy**, diseñado para competir con los mejores bots del mercado como ProBot, Dyno y MEE6.

[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

## ✨ Características Principales

### 🛡️ Auto-Moderación Avanzada
Sistema inteligente de protección para tu comunidad:
- Anti-spam, anti-links y anti-invites
- Filtro de palabras prohibidas configurable
- Anti-mass mention y anti-ghost ping
- Sistema de punishments (warn, mute, kick, ban)
- Roles y canales ignorados
- Logging automático de acciones

### 🏆 Sistema de Niveles y XP
Mantén a tu comunidad activa con recompensas:
- Ganancia de XP por mensajes y voz
- Notificaciones de level up personalizadas
- Comandos `/rank` y `/leaderboard`
- Multiplicadores para roles premium
- Configuración de roles por nivel

### 💰 Economía Completa
Un sistema financiero robusto:
- Balance personal y banco
- Recompensas diarias (/daily)
- Inventario y tienda (en desarrollo)
- Estadísticas de ganancias y gastos
- Apuestas y minijuegos (próximamente)

### ⚡ Slash Commands Modernos
Interfaz nativa de Discord:
- Todos los comandos disponibles como slash commands
- Respuestas interactivas y ephemeral
- Autocompletado y validaciones
- Permisos granulares por comando

### 🌐 Dashboard Web Profesional
Panel de control completo desde el navegador:
- Estadísticas en tiempo real con gráficos
- Configuración de módulos sin código
- Asistente de configuración rápida (Quick Setup)
- Gestión de AutoMod visual
- Leaderboards interactivos
- Diseño responsive y dark mode
- Actualización automática cada 30s

## 🚀 ¿Por qué Xylozoid?

| Característica | Xylozoid | ProBot | Dyno |
|---------------|----------|--------|------|
| Código Abierto | ✅ Sí | ❌ No | ❌ No |
| Personalizable | ✅ 100% | ⚠️ Limitado | ⚠️ Limitado |
| Sin Límites | ✅ Gratis | ⚠️ Premium | ⚠️ Premium |
| Dashboard Moderno | ✅ Sí | ✅ Sí | ✅ Sí |
| AutoMod Avanzado | ✅ Sí | ✅ Sí | ✅ Sí |
| Sistema de Niveles | ✅ Sí | ✅ Sí | ❌ No |
| Economía | ✅ Sí | ✅ Sí | ⚠️ Básico |
| Soporte 24/7 | ✅ Comunidad | ✅ Pago | ✅ Pago |

## 📦 Instalación

### Requisitos Previos
- Node.js v16 o superior
- MongoDB (local o Atlas)
- Una aplicación de Discord Developer Portal

### Pasos de Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/xylozoid.git
cd xylozoid
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura las variables de entorno**
Crea un archivo `.env` en la raíz del proyecto:
```env
# Discord Bot
CLIENT_ID=tu_client_id
TOKEN=tu_token_bot
CLIENT_SECRET=tu_client_secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/xylozoid

# Dashboard
BASE_URL=http://localhost:3000
PORT=3000

# Opcional: Top.gg para votaciones
TOP_GG_TOKEN=tu_token
```

4. **Inicia el bot**
```bash
node index.js
```

5. **Invita al bot a tu servidor**
```
https://discord.com/api/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## 📁 Estructura del Proyecto

```
xylozoid/
├── src/
│   ├── commands/           # Comandos tradicionales (prefix)
│   ├── slash/              # Slash commands modernos
│   │   ├── moderation/     # Comandos de moderación
│   │   ├── utility/        # Comandos utilitarios
│   │   ├── economy/        # Comandos de economía
│   │   └── structures/     # Clases base para slash commands
│   ├── handlers/           # Manejadores de eventos
│   │   ├── CommandHandler.js
│   │   ├── SlashCommandHandler.js
│   │   ├── AutoModHandler.js
│   │   └── XPHandler.js
│   ├── database/
│   │   ├── schemas/        # Modelos de MongoDB
│   │   │   ├── Rank.js
│   │   │   ├── Economy.js
│   │   │   ├── AutoMod.js
│   │   │   └── ...
│   │   └── index.js
│   ├── dashboard/
│   │   ├── routes/         # Rutas de la API
│   │   ├── static/         # CSS, JS, imágenes
│   │   └── views/          # Plantillas EJS
│   ├── events/             # Eventos de Discord
│   └── utils/              # Utilidades y helpers
├── .env
├── .env.example
├── index.js
├── package.json
└── README.md
```

## 🎯 Comandos Disponibles

### Moderación
- `/ban` - Banear usuarios con razón
- `/kick` - Expulsar usuarios
- `/mute` - Silenciar temporalmente
- `/warn` - Advertir usuarios
- `/clear` - Limpiar mensajes

### Utilidad
- `/rank` - Ver nivel propio o de otros
- `/leaderboard` - Top 10 del servidor
- `/serverinfo` - Información del servidor
- `/userinfo` - Información de usuario

### Economía
- `/balance` - Ver balance y banco
- `/daily` - Recompensa diaria
- `/shop` - Tienda de items (próximamente)
- `/work` - Trabajar por monedas (próximamente)

### Configuración
- `/setup` - Asistente de configuración
- `/automod` - Configurar auto-moderación
- `/levels` - Configurar sistema de niveles

## 🌟 Roadmap

### Fase 1 (Completado ✅)
- [x] Sistema de slash commands
- [x] Auto-moderación avanzada
- [x] Sistema de niveles y XP
- [x] Economía básica
- [x] Dashboard con estadísticas

### Fase 2 (En Desarrollo 🚧)
- [ ] Comandos de economía completos (work, shop, gamble)
- [ ] Sistema de warns con schema dedicado
- [ ] Dashboard para configuración de AutoMod
- [ ] Sistema de tickets de soporte
- [ ] Logs interactivos con filtros

### Fase 3 (Planeado 📅)
- [ ] Sistema de música optimizado
- [ ] Minijuegos multijugador
- [ ] Integración con Twitch/YouTube
- [ ] API pública para desarrolladores
- [ ] Widgets embebibles para webs

### Fase 4 (Futuro 🔮)
- [ ] IA para moderación de contenido
- [ ] Traducción automática de mensajes
- [ ] Sistema de clans/gremios
- [ ] Eventos programados automáticos

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

Por favor, lee nuestras [Guías de Contribución](CONTRIBUTING.md) antes de empezar.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- **Pogy** - Proyecto base que inspiró esta arquitectura
- **Discord.js** - Librería principal del bot
- **Chart.js** - Gráficos del dashboard
- **La comunidad de código abierto** - Por su apoyo constante

## 📞 Soporte

¿Necesitas ayuda? Únete a nuestro servidor de Discord:

[![Unirse al Servidor](https://img.shields.io/badge/Discord-Unirse-5865F2?style=for-the-badge&logo=discord&logoColor=white)](TU_LINK_DE_DISCORD)

## 🌐 Enlaces Útiles

- [Documentación Completa](https://xylozoid.dev/docs)
- [Dashboard Demo](https://xylozoid.dev/demo)
- [Reportar Bugs](https://github.com/tu-usuario/xylozoid/issues)
- [Solicitar Features](https://github.com/tu-usuario/xylozoid/discussions)

---

<div align="center">

**Hecho con ❤️ por la comunidad para la comunidad**

⭐ ¡Dale estrella si te gusta el proyecto!

</div>
