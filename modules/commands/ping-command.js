const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('서버와 봇의 응답 시간을 확인합니다.'),
  
  // 디스코드에서 명령어 실행
  async execute(interaction, args, client) {
    try {
      // slash command
      if (interaction.isChatInputCommand()) {
        const sent = await interaction.reply({ content: '핑 측정 중...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        // 핑 상태에 따라 색상 결정
        let statusColor;
        if (latency < 100) statusColor = 0x00ff00; // 녹색 (좋음)
        else if (latency < 250) statusColor = 0xffff00; // 노랑 (보통)
        else statusColor = 0xff0000; // 빨강 (나쁨)
        
        // 임베드 생성
        const pingEmbed = new EmbedBuilder()
          .setTitle('🏓 퐁!')
          .addFields(
            { name: '메시지 지연 시간', value: `${latency}ms`, inline: true },
            { name: 'API 지연 시간', value: `${apiLatency}ms`, inline: true }
          )
          .setColor(statusColor)
          .setFooter({ text: '응답 시간이 낮을수록 좋습니다' })
          .setTimestamp();
        
        await interaction.editReply({ content: null, embeds: [pingEmbed] });
      } 
      // message command
      else if (interaction.content) {
        const message = interaction;
        const sent = await message.reply('핑 측정 중...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        // 핑 상태에 따라 색상 결정
        let statusColor;
        if (latency < 100) statusColor = 0x00ff00; // 녹색 (좋음)
        else if (latency < 250) statusColor = 0xffff00; // 노랑 (보통)
        else statusColor = 0xff0000; // 빨강 (나쁨)
        
        // 임베드 생성
        const pingEmbed = new EmbedBuilder()
          .setTitle('🏓 퐁!')
          .addFields(
            { name: '메시지 지연 시간', value: `${latency}ms`, inline: true },
            { name: 'API 지연 시간', value: `${apiLatency}ms`, inline: true }
          )
          .setColor(statusColor)
          .setFooter({ text: '응답 시간이 낮을수록 좋습니다' })
          .setTimestamp();
        
        await sent.edit({ content: null, embeds: [pingEmbed] });
      }
    } catch (error) {
      console.error('ping 명령어 실행 중 오류:', error);
      
      if (interaction.isChatInputCommand() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
      } else if (interaction.content) {
        await interaction.reply('명령어 실행 중 오류가 발생했습니다.');
      }
    }
  },
  
  // 웹에서 명령어 실행
  async executeFromWeb(params, client) {
    try {
      const now = Date.now();
      const apiLatency = Math.round(client.ws.ping);
      const executionTime = Date.now() - now;
      
      // 로그 채널이 설정되어 있다면 웹에서 실행된 명령어 로깅
      if (params && params.logChannelId) {
        const logChannel = client.channels.cache.get(params.logChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('🌐 웹 대시보드에서 실행된 명령어')
            .setDescription('`ping` 명령어가 실행되었습니다.')
            .addFields(
              { name: '실행 시간', value: `${executionTime}ms`, inline: true },
              { name: 'API 지연 시간', value: `${apiLatency}ms`, inline: true }
            )
            .setColor(0x5865F2)
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
      return {
        command: 'ping',
        latency: executionTime,
        apiLatency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('웹에서 ping 명령어 실행 중 오류:', error);
      throw new Error('ping 명령어 실행 중 오류가 발생했습니다.');
    }
  }
};