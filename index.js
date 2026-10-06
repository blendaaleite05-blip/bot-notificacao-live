const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');

const express = require('express');

// ==============================
// MINI SITE PARA O RENDER
// ==============================

const app = express();

app.get('/', (req, res) => {
    res.send('Online');
});

app.listen(3000, () => {
    console.log('Servidor web online na porta 3000');
});

// ==============================
// CONFIGURAÇÃO DO BOT
// ==============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==============================
// CONFIGURAÇÕES
// ==============================

const TOKEN = process.env.DISCORD_TOKEN;
const YOUTUBE_API = process.env.YOUTUBE_API;

const CANAL_NOTIFICACAO_ID = '1101866650392875109';

const YOUTUBE_CHANNEL_ID = 'UCS99u5HTSzbyhXczC19EOpg';

// ==============================
// CONTROLE DAS TRANSMISSÕES
// ==============================

let liveConhecida = null;
let liveAnunciadaAoVivo = false;

// ==============================
// BUSCAR LIVE PROGRAMADA
// ==============================

async function verificarYouTube() {

    if (!YOUTUBE_API) {
        console.log('❌ YOUTUBE_API não configurada.');
        return;
    }

    try {

        const url =
            `https://www.googleapis.com/youtube/v3/search` +
            `?part=snippet` +
            `&channelId=${YOUTUBE_CHANNEL_ID}` +
            `&eventType=upcoming` +
            `&type=video` +
            `&maxResults=5` +
            `&key=${YOUTUBE_API}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('❌ Erro da YouTube API:');
            console.error(data.error);
            return;
        }

        const videos = data.items || [];

        if (videos.length === 0) {
            return;
        }

        const video = videos[0];

        const videoId = video.id.videoId;
        const titulo = video.snippet.title;

        const thumbnail =
            video.snippet.thumbnails.maxres?.url ||
            video.snippet.thumbnails.high?.url ||
            video.snippet.thumbnails.medium?.url;

        const link = `https://www.youtube.com/watch?v=${videoId}`;

        // ==============================
        // NOVA LIVE PROGRAMADA
        // ==============================

        if (liveConhecida !== videoId) {

            liveConhecida = videoId;
            liveAnunciadaAoVivo = false;

            console.log(`📅 Nova live encontrada: ${titulo}`);

            await enviarLiveProgramada({
                titulo,
                thumbnail,
                link
            });
        }

        // ==============================
        // VERIFICAR SE COMEÇOU
        // ==============================

        await verificarSeEstaAoVivo(videoId);

    } catch (error) {

        console.error('❌ Erro ao consultar o YouTube:');
        console.error(error);

    }
}

// ==============================
// VERIFICAR SE A LIVE COMEÇOU
// ==============================

async function verificarSeEstaAoVivo(videoId) {

    try {

        const url =
            `https://www.googleapis.com/youtube/v3/videos` +
            `?part=snippet,liveStreamingDetails` +
            `&id=${videoId}` +
            `&key=${YOUTUBE_API}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('❌ Erro ao consultar transmissão:');
            console.error(data.error);
            return;
        }

        if (!data.items || data.items.length === 0) {
            return;
        }

        const video = data.items[0];
        const detalhes = video.liveStreamingDetails;

        if (!detalhes) {
            return;
        }

        // ==============================
        // LIVE COMEÇOU
        // ==============================

        if (
            detalhes.actualStartTime &&
            !liveAnunciadaAoVivo
        ) {

            liveAnunciadaAoVivo = true;

            const titulo = video.snippet.title;

            const thumbnail =
                video.snippet.thumbnails.maxres?.url ||
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url;

            const link = `https://www.youtube.com/watch?v=${videoId}`;

            console.log(`🔴 LIVE COMEÇOU: ${titulo}`);

            await enviarLiveAoVivo({
                titulo,
                thumbnail,
                link
            });
        }

    } catch (error) {

        console.error('❌ Erro ao verificar status da live:');
        console.error(error);

    }
}

// ==============================
// AVISO DE LIVE PROGRAMADA
// ==============================

async function enviarLiveProgramada({
    titulo,
    thumbnail,
    link
}) {

    try {

        const canal = await client.channels.fetch(
            CANAL_NOTIFICACAO_ID
        );

        if (!canal) {
            console.log('❌ Canal de notificação não encontrado.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 PRÓXIMA TRANSMISSÃO')
            .setDescription(
                '**Italo Silva programou uma nova transmissão.**\n\n' +
                'Confira os detalhes e programe-se para acompanhar o início.'
            )
            .addFields({
                name: '🎬 Transmissão',
                value: titulo
            })
            .setImage(thumbnail)
            .setColor(0x5865F2)
            .setFooter({
                text: 'LIVE ON • Italo Silva'
            })
            .setTimestamp();

        const botao = new ButtonBuilder()
            .setLabel('VER PROGRAMAÇÃO')
            .setStyle(ButtonStyle.Link)
            .setURL(link)
            .setEmoji('▶️');

        const row = new ActionRowBuilder()
            .addComponents(botao);

        await canal.send({
            content: '@everyone',
            embeds: [embed],
            components: [row]
        });

        console.log('📢 Aviso de programação enviado.');

    } catch (error) {

        console.error('❌ Erro ao enviar aviso de programação:');
        console.error(error);

    }
}

// ==============================
// AVISO DE LIVE AO VIVO
// ==============================

async function enviarLiveAoVivo({
    titulo,
    thumbnail,
    link
}) {

    try {

        const canal = await client.channels.fetch(
            CANAL_NOTIFICACAO_ID
        );

        if (!canal) {
            console.log('❌ Canal de notificação não encontrado.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔴 LIVE ON FAMÍLIA')
            .setDescription(
                '**Italo Silva está ao vivo!** 🎥\n\n' +
                'A transmissão começou. Acesse agora e acompanhe a live em tempo real.'
            )
            .addFields({
                name: '🎬 Transmissão',
                value: titulo
            })
            .setImage(thumbnail)
            .setColor(0xFF0000)
            .setFooter({
                text: 'LIVE ON • Italo Silva'
            })
            .setTimestamp();

        const botao = new ButtonBuilder()
            .setLabel('ASSISTIR AGORA')
            .setStyle(ButtonStyle.Link)
            .setURL(link)
            .setEmoji('▶️');

        const row = new ActionRowBuilder()
            .addComponents(botao);

        await canal.send({
            content: '@everyone',
            embeds: [embed],
            components: [row]
        });

        console.log('🔴 Aviso de LIVE ON enviado.');

    } catch (error) {

        console.error('❌ Erro ao enviar aviso de LIVE ON:');
        console.error(error);

    }
}

// ==============================
// BOT ONLINE
// ==============================

client.once('clientReady', () => {

    console.log(
        `🤖 Bot conectado como ${client.user.tag}`
    );

    console.log(
        '📺 Sistema de notificações do YouTube iniciado.'
    );

    verificarYouTube();

    // Verifica a cada 60 segundos
    setInterval(verificarYouTube, 60 * 1000);
});

// ==============================
// LOGIN
// ==============================

client.login(TOKEN);
