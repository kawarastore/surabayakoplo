require("dotenv").config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");

// ============================================================
// KONFIGURASI
// ============================================================
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  BOT_SECRET: process.env.BOT_SECRET || "KAWARACLUB123*",
  UNIVERSE_ID: process.env.UNIVERSE_ID,
  ROBLOX_COOKIE: process.env.ROBLOX_COOKIE,
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,

  JOIN_LEAVE_CHANNEL_ID:   "1493823914860609676",
  PLAYER_COUNT_CHANNEL_ID: "1493626688934903938",
  COMMAND_LOG_CHANNEL_ID:  "1493824074017935371",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// ============================================================
// HELPER KIRIM EMBED KE CHANNEL
// ============================================================
async function sendEmbed(channelId, embedData) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return console.warn("[Bot] Channel tidak ditemukan:", channelId);
    await channel.send({ embeds: [new EmbedBuilder(embedData)] });
  } catch (err) {
    console.error("[Bot] sendEmbed error:", err.message);
  }
}

// ============================================================
// ROBLOX API HELPER
// ============================================================
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

async function publishToAllServers(topic, data) {
  try {
    const response = await axios.post(
      `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.UNIVERSE_ID}/topics/${topic}`,
      {
        message: JSON.stringify({ ...data, secret: CONFIG.BOT_SECRET }),
      },
      {
        headers: {
          "x-api-key": process.env.ROBLOX_API_KEY,
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
// CEK ADMIN
// ============================================================
function isAdmin(interaction) {
  if (CONFIG.ADMIN_ROLE_ID) {
    return interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID);
  }
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}

// ============================================================
// SLASH COMMANDS
// ============================================================
const commands = [
  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Lihat info server Roblox yang aktif"),

  new SlashCommandBuilder()
    .setName("players")
    .setDescription("Lihat daftar player di semua server aktif"),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick player dari server Roblox")
    .addStringOption((opt) =>
      opt.setName("username").setDescription("Username Roblox player").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Alasan kick").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban player dari game Roblox")
    .addStringOption((opt) =>
      opt.setName("username").setDescription("Username Roblox player").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Alasan ban").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban player dari game Roblox")
    .addStringOption((opt) =>
      opt.setName("userid").setDescription("User ID Roblox player").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Kirim pengumuman ke semua server Roblox")
    .addStringOption((opt) =>
      opt.setName("message").setDescription("Isi pengumuman").setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

// ============================================================
// REGISTER COMMANDS SAAT BOT READY
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

    // Kirim juga ke channel player count
    await sendEmbed(CONFIG.PLAYER_COUNT_CHANNEL_ID, {
      title: "📊 Roblox Server Info",
      color: 0x00bfff,
      fields: [
        { name: "🌐 Total Server Aktif", value: servers.length.toString(), inline: true },
        { name: "👥 Total Players", value: totalPlayers.toString(), inline: true },
        { name: "🖥️ Detail Server", value: serverList || "Tidak ada data" },
      ],
      timestamp: new Date().toISOString(),
    });

    return interaction.editReply({ embeds: [embed] });
  }

  // ── /players ───────────────────────────────────────────────
  if (commandName === "players") {
    await interaction.deferReply();

    await publishToAllServers("AdminGetInfo", {
      adminName: interaction.user.username,
    });

    await sendEmbed(CONFIG.PLAYER_COUNT_CHANNEL_ID, {
      title: "📋 Player List Request",
      color: 0x00ff88,
      description: `Request dikirim oleh **${interaction.user.username}**\nUpdate player list akan muncul di channel ini.`,
      timestamp: new Date().toISOString(),
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 Player List")
          .setDescription(
            "✅ Request dikirim ke semua server!\nUpdate akan muncul di channel **player di map**."
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

    const embedData = {
      title: success ? "👢 Kick Command Dikirim" : "❌ Gagal Mengirim Command",
      color: success ? 0xff6600 : 0xff0000,
      fields: [
        { name: "Target", value: username, inline: true },
        { name: "Admin", value: interaction.user.username, inline: true },
        { name: "Alasan", value: reason, inline: false },
        {
          name: "Status",
          value: success ? "✅ Command berhasil dikirim ke semua server" : "❌ Gagal — cek konfigurasi bot",
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Log ke channel command admin
    await sendEmbed(CONFIG.COMMAND_LOG_CHANNEL_ID, embedData);

    return interaction.editReply({ embeds: [new EmbedBuilder(embedData)] });
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

    const embedData = {
      title: success ? "🔨 Ban Command Dikirim" : "❌ Gagal Mengirim Command",
      color: success ? 0xff0000 : 0x888888,
      fields: [
        { name: "Target", value: `${robloxUser.name} (ID: ${robloxUser.id})`, inline: false },
        { name: "Admin", value: interaction.user.username, inline: true },
        { name: "Alasan", value: reason, inline: false },
        {
          name: "Status",
          value: success ? "✅ Command dikirim — ban tersimpan di DataStore" : "❌ Gagal — cek konfigurasi bot",
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await sendEmbed(CONFIG.COMMAND_LOG_CHANNEL_ID, embedData);

    return interaction.editReply({ embeds: [new EmbedBuilder(embedData)] });
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

    const embedData = {
      title: success ? "✅ Unban Command Dikirim" : "❌ Gagal",
      color: success ? 0x00ff00 : 0xff0000,
      description: success
        ? `Command unban untuk User ID **${userId}** telah dikirim ke semua server.\nDikirim oleh: **${interaction.user.username}**`
        : "Gagal mengirim command. Cek konfigurasi bot.",
      timestamp: new Date().toISOString(),
    };

    await sendEmbed(CONFIG.COMMAND_LOG_CHANNEL_ID, embedData);

    return interaction.editReply({ embeds: [new EmbedBuilder(embedData)] });
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

    const embedData = {
      title: success ? "📢 Announcement Terkirim!" : "❌ Gagal Mengirim",
      color: success ? 0x9b59b6 : 0xff0000,
      fields: [
        { name: "Pesan", value: message, inline: false },
        { name: "Dikirim Oleh", value: interaction.user.username, inline: true },
        {
          name: "Status",
          value: success ? "✅ Tampil di semua server aktif" : "❌ Gagal — cek konfigurasi bot",
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await sendEmbed(CONFIG.COMMAND_LOG_CHANNEL_ID, embedData);

    return interaction.editReply({ embeds: [new EmbedBuilder(embedData)] });
  }
});

// ============================================================
// LOGIN BOT
// ============================================================
client.login(CONFIG.TOKEN).catch((err) => {
  console.error("❌ Gagal login bot:", err.message);
  console.error("Pastikan DISCORD_TOKEN di .env sudah benar!");
});
