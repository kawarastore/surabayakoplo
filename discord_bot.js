require("dotenv").config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");

// ============================================================
// KONFIGURASI
// ============================================================
const CONFIG = {
  TOKEN: process.env.MTQ5MzYyNTI5MDMyNzMzMDkwNw.G-_QWX.K-GaeR0YiVlaMK3sZqlfDWIzeU5jgWKrJa2cB0,
  BOT_SECRET: process.env.BOT_SECRET || "SURABAYAJAYA112233",
  UNIVERSE_ID: process.env.9941540378,
  ROBLOX_COOKIE: process.env._|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhwKBGR1aWQSFDE0NDc2OTI4MTk1NzQ2ODg4NjY4KAQ.CnhGO03lWa206-7XgZMAzDj6bwXN2rVRB_5KmH6GDqCua_AY1z3wHgRsPUNusfqBSHyzLP-wQBfmU4EqSLdRWYIEuFgGxsv_dpiizbbo3q0-FcLTEViPv-LACxwlvpizU8xgr7Lhe3-Sx-NS-WlxoJ96aq-Jbi5RFnX50PWrc0vPNEIF-d8dcNslRJhicde4tDCk5uEjB6sy5ljTOHD_NhTswrT7MxogXfB0T0OEgnxmBm0O-6VPYVYd2BtQMAwD0xDxj0TyiQgWJ5mvs0caW1lYoFLTypa1YyAsKXL4cEd9iglb46xDKVGBFBrAWPI9XtryFEOJVA7b7PAdWb4fmxihGBwUkdd0rrXPnFCIh3W9P6QImlGocw3JDVqAvTVbNW-itb5TtluIdXsWKd4in9s2EFuSYEl3cYZVGs8pvnuS-B6V2b-Tg3rrShl1yFa39nW01EApGwAnVwopsoJe2z_eJ40LWZrV12jq2jr9CvvhZyvvg8_iRj0aQ-t2-vwDHqzHmYmmLGj8Rm7zNKF7AEZar5hvtkIKjurtWlsmdjnJjU9p1Jd3w57LfJuXMTZfc9MCtZHXm6-paUNrF2eQScbhJigaUgMMfiR5n46RwMI3uK2w_Nzuzv0k0bI1wojoczVLqNQrRKWSwvs8VSCvcVGCE0I5J_9DyAr7S95bfE3UCyIHA4MA4WxIZ6rXg5quPvpjXN6WzpSHaEzpMEgEI2hBkA1hgY17PQ5i-1MgnPb8f3mgp9VyBGcjIPBxUqPCqPDmLU74WYVzG-ginQaBLwDaaGDFyoaRRWEm8nqz3VKsGKF6l4E46U02MHbAYuJeGOguxnK7g4V8AmK-i0e9dLEcIFIQW_ATQulfy7eZjMI2ICMWOU5dy_KByVpxNxavSjSS23cSmbnLkFSaaT4sYFyBWBfbgAcNMwQOpwN1fbMjf13oO8FBXoV29fE6-kU_KtlVMw,
  ADMIN_ROLE_ID: process.env.1445784552504295505,
  
  // Channel IDs - isi sesuai server Discord kamu
  LOG_CHANNEL_ID: process.env.1493626688934903938 || "",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// ============================================================
// ROBLOX API HELPER
// ============================================================

// Dapatkan User ID dari username Roblox
async function getRobloxUserId(username) {
  try {
    const response = await axios.post(
      "https://users.roblox.com/v1/usernames/users",
      { usernames: [username], excludeBannedUsers: false },
      { headers: { "Content-Type": "application/json" } }
    );
    const data = response.data.data;
    if (data && data.length > 0) {
      return { id: data[0].id, name: data[0].name };
    }
    return null;
  } catch (err) {
    console.error("Error getRobloxUserId:", err.message);
    return null;
  }
}

// Dapatkan info server yang aktif
async function getActiveServers() {
  try {
    const response = await axios.get(
      `https://games.roblox.com/v1/games/${CONFIG.UNIVERSE_ID}/servers/Public?limit=10`,
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${CONFIG.ROBLOX_COOKIE}`,
        },
      }
    );
    return response.data.data || [];
  } catch (err) {
    console.error("Error getActiveServers:", err.message);
    return [];
  }
}

// Kirim message ke semua server via MessagingService (Open Cloud)
async function publishToAllServers(topic, data) {
  try {
    // Roblox Open Cloud Messaging API
    const response = await axios.post(
      `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.UNIVERSE_ID}/topics/${topic}`,
      {
        message: JSON.stringify({ ...data, secret: CONFIG.BOT_SECRET }),
      },
      {
        headers: {
          "x-api-key": process.env.ROBLOX_API_KEY, // Open Cloud API Key
          "Content-Type": "application/json",
        },
      }
    );
    return response.status === 200;
  } catch (err) {
    console.error(`Error publish to ${topic}:`, err.response?.data || err.message);
    return false;
  }
}

// ============================================================
// CEK APAKAH USER ADALAH ADMIN
// ============================================================
function isAdmin(interaction) {
  if (CONFIG.ADMIN_ROLE_ID) {
    return interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID);
  }
  // Fallback: cek permission Administrator
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}

// ============================================================
// SLASH COMMANDS DEFINITION
// ============================================================
const commands = [
  // /serverinfo - Lihat info server Roblox
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Lihat info server Roblox yang aktif"),

  // /players - Lihat list player di semua server
  new SlashCommandBuilder()
    .setName("players")
    .setDescription("Lihat daftar player di semua server aktif"),

  // /kick - Kick player
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick player dari server Roblox")
    .addStringOption((opt) =>
      opt.setName("username").setDescription("Username Roblox player").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Alasan kick").setRequired(false)
    ),

  // /ban - Ban player
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban player dari game Roblox")
    .addStringOption((opt) =>
      opt.setName("username").setDescription("Username Roblox player").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Alasan ban").setRequired(false)
    ),

  // /unban - Unban player
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban player dari game Roblox")
    .addStringOption((opt) =>
      opt.setName("userid").setDescription("User ID Roblox player").setRequired(true)
    ),

  // /announce - Kirim announcement ke semua server
  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Kirim pengumuman ke semua server Roblox")
    .addStringOption((opt) =>
      opt.setName("message").setDescription("Isi pengumuman").setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

// ============================================================
// REGISTER SLASH COMMANDS SAAT BOT READY
// ============================================================
client.once("ready", async () => {
  console.log(`✅ Bot ${client.user.tag} siap!`);

  const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN);
  try {
    console.log("Mendaftarkan slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("✅ Slash commands berhasil didaftarkan!");
  } catch (error) {
    console.error("Error mendaftarkan commands:", error);
  }
});

// ============================================================
// HANDLE SLASH COMMANDS
// ============================================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // ── /serverinfo ────────────────────────────────────────────
  if (commandName === "serverinfo") {
    await interaction.deferReply();

    const servers = await getActiveServers();

    if (servers.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📊 Server Info")
            .setDescription("Tidak ada server aktif saat ini.")
            .setColor(0xffa500),
        ],
      });
    }

    let totalPlayers = 0;
    let serverList = "";
    servers.forEach((server, i) => {
      totalPlayers += server.playing || 0;
      serverList += `**Server ${i + 1}** — ${server.playing || 0}/${server.maxPlayers || "?"} players\n`;
      serverList += `\`Job ID: ${server.id.substring(0, 8)}...\`\n\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("📊 Roblox Server Info")
      .setColor(0x00bfff)
      .addFields(
        { name: "🌐 Total Server Aktif", value: servers.length.toString(), inline: true },
        { name: "👥 Total Players", value: totalPlayers.toString(), inline: true },
        { name: "🖥️ Detail Server", value: serverList || "Tidak ada data" }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // ── /players ───────────────────────────────────────────────
  if (commandName === "players") {
    await interaction.deferReply();

    // Minta update dari semua server via MessagingService
    await publishToAllServers("AdminGetInfo", {
      adminName: interaction.user.username,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 Player List")
          .setDescription(
            "✅ Request dikirim ke semua server!\nUpdate player list akan muncul di channel log Discord.\n\n_Gunakan `/serverinfo` untuk data server dari Roblox API._"
          )
          .setColor(0x00ff88)
          .setTimestamp(),
      ],
    });
  }

  // ── /kick ──────────────────────────────────────────────────
  if (commandName === "kick") {
    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Kamu tidak memiliki izin untuk menggunakan command ini!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const reason = interaction.options.getString("reason") || "Kicked oleh Admin";

    const success = await publishToAllServers("AdminKick", {
      targetName: username,
      reason: reason,
      adminName: interaction.user.username,
    });

    const embed = new EmbedBuilder()
      .setTitle(success ? "👢 Kick Command Dikirim" : "❌ Gagal Mengirim Command")
      .setColor(success ? 0xff6600 : 0xff0000)
      .addFields(
        { name: "Target", value: username, inline: true },
        { name: "Admin", value: interaction.user.username, inline: true },
        { name: "Alasan", value: reason, inline: false },
        {
          name: "Status",
          value: success
            ? "✅ Command berhasil dikirim ke semua server"
            : "❌ Gagal — cek konfigurasi bot",
          inline: false,
        }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // ── /ban ───────────────────────────────────────────────────
  if (commandName === "ban") {
    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Kamu tidak memiliki izin untuk menggunakan command ini!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const reason = interaction.options.getString("reason") || "Banned oleh Admin";

    // Dapatkan User ID dari username
    const robloxUser = await getRobloxUserId(username);
    if (!robloxUser) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ User Tidak Ditemukan")
            .setDescription(`Username **${username}** tidak ditemukan di Roblox.`)
            .setColor(0xff0000),
        ],
      });
    }

    const success = await publishToAllServers("AdminBan", {
      targetName: robloxUser.name,
      targetUserId: robloxUser.id,
      reason: reason,
      adminName: interaction.user.username,
    });

    const embed = new EmbedBuilder()
      .setTitle(success ? "🔨 Ban Command Dikirim" : "❌ Gagal Mengirim Command")
      .setColor(success ? 0xff0000 : 0x888888)
      .addFields(
        { name: "Target", value: `${robloxUser.name} (ID: ${robloxUser.id})`, inline: false },
        { name: "Admin", value: interaction.user.username, inline: true },
        { name: "Alasan", value: reason, inline: false },
        {
          name: "Status",
          value: success
            ? "✅ Command dikirim — ban tersimpan di DataStore"
            : "❌ Gagal — cek konfigurasi bot",
          inline: false,
        }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // ── /unban ─────────────────────────────────────────────────
  if (commandName === "unban") {
    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Kamu tidak memiliki izin untuk menggunakan command ini!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const userId = parseInt(interaction.options.getString("userid"));
    if (isNaN(userId)) {
      return interaction.editReply("❌ User ID harus berupa angka!");
    }

    const success = await publishToAllServers("AdminUnban", {
      targetUserId: userId,
      adminName: interaction.user.username,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(success ? "✅ Unban Command Dikirim" : "❌ Gagal")
          .setColor(success ? 0x00ff00 : 0xff0000)
          .setDescription(
            success
              ? `Command unban untuk User ID **${userId}** telah dikirim ke semua server.`
              : "Gagal mengirim command. Cek konfigurasi bot."
          )
          .setTimestamp(),
      ],
    });
  }

  // ── /announce ──────────────────────────────────────────────
  if (commandName === "announce") {
    if (!isAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Kamu tidak memiliki izin untuk menggunakan command ini!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const message = interaction.options.getString("message");

    const success = await publishToAllServers("AdminAnnouncement", {
      message: message,
      adminName: interaction.user.username,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(success ? "📢 Announcement Terkirim!" : "❌ Gagal Mengirim")
          .setColor(success ? 0x9b59b6 : 0xff0000)
          .addFields(
            { name: "Pesan", value: message, inline: false },
            { name: "Dikirim Oleh", value: interaction.user.username, inline: true },
            {
              name: "Status",
              value: success
                ? "✅ Announcement tampil di semua server aktif"
                : "❌ Gagal — cek konfigurasi bot",
              inline: true,
            }
          )
          .setTimestamp(),
      ],
    });
  }
});

// ============================================================
// LOGIN BOT
// ============================================================
client.login(CONFIG.TOKEN).catch((err) => {
  console.error("❌ Gagal login bot:", err.message);
  console.error("Pastikan DISCORD_TOKEN di .env sudah benar!");
});
