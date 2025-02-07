require("dotenv").config();
const { exec } = require("child_process");
const { 
    Client, 
    GatewayIntentBits 
} = require("discord.js");
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus 
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static"); // Asegura que FFmpeg esté disponible

// 🛠️ Verificar si FFmpeg está instalado antes de iniciar el bot
exec("ffmpeg -version", (error, stdout, stderr) => {
    if (error) {
        console.error("❌ FFmpeg no está instalado o no es accesible:", error);
        return;
    }
    console.log("✅ FFmpeg está instalado:\n", stdout);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!play") || message.author.bot) return;

    const args = message.content.split(" ");
    if (args.length < 2) {
        return message.reply("❌ Debes proporcionar un enlace de YouTube.");
    }

    const url = args[1];

    if (!ytdl.validateURL(url)) {
        return message.reply("❌ Enlace inválido.");
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.reply("❌ Debes estar en un canal de voz.");
    }

    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const stream = ytdl(url, {
            filter: "audioonly",
            quality: "highestaudio",
            highWaterMark: 1 << 25 // Optimización para evitar cortes de audio
        });

        const resource = createAudioResource(stream);
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        message.reply(`🎶 Reproduciendo: ${url}`);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            console.log("🔇 Reproducción terminada, desconectando.");
        });

        player.on("error", (error) => {
            console.error("❌ Error en la reproducción:", error);
            message.reply("❌ Ocurrió un error al intentar reproducir el audio.");
            connection.destroy();
        });

    } catch (error) {
        console.error("❌ Error al conectar al canal de voz:", error);
        message.reply("❌ Ocurrió un error al intentar conectarse al canal de voz.");
    }
});

client.login(process.env.TOKEN);
