const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('서버와 봇의 응답 시간을 확인합니다.'),
  
  // 디스코드에서 명령어 실행
  async execute(interaction, args, client) {
    // slash command
    if (interaction.isChatInputCommand()) {
      const sent = await interaction.reply({ content: '핑 측정 중...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      
      await interaction.editReply(`🏓 퐁! 응답 시간: ${latency}ms | API 지연: ${apiLatency}ms`);
    } 
    // message command
    else if (interaction.content) {
      const message = interaction;
      const sent = await message.reply('핑 측정 중...');
      const latency = sent.createdTimestamp - message.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      
      await sent.edit(`🏓 퐁! 응답 시간: ${latency}ms | API 지연: ${apiLatency}ms`);
    }
  },
  
  // 웹에서 명령어 실행
  async executeFromWeb(params, client) {
    const now = Date.now();
    const apiLatency = Math.round(client.ws.ping);
    
    // 로그 채널이 설정되어 있다면 웹에서 실행된 명령어 로깅
    const logChannel = client.channels.cache.get(params.logChannelId);
    if (logChannel) {
      await logChannel.send(`🌐 웹에서 실행된 명령어: ping\n응답 시간: ${Date.now() - now}ms | API 지연: ${apiLatency}ms`);
    }
    
    return {
      latency: Date.now() - now,
      apiLatency
    };
  }
};
