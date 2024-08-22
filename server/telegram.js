const axios = require('axios');

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '7308283785:AAGqqRxvPr3m1wqZtGFOnG_rcQGdqXkkuJI';
const telegramChatId = process.env.TELEGRAM_CHAT_ID || '-4529142676';

async function sendTelegramMessage(globalRouteData) {
    // Construct the message using globalRouteData
    const message = `
    Route generated:
    - Total Distance: ${globalRouteData.totalDistance}
    - Total Duration: ${globalRouteData.totalDuration}
    - Google Maps URL: ${globalRouteData.googleMapsUrl}
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error.message);
    }
}

module.exports = {
    sendTelegramMessage
};