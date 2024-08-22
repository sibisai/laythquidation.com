const axios = require('axios');

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '7308283785:AAGqqRxvPr3m1wqZtGFOnG_rcQGdqXkkuJI';
const telegramChatId = process.env.TELEGRAM_CHAT_ID || '-4529142676';

async function sendTelegramMessage(globalRouteData) {
    // Construct the message using globalRouteData
    let message = `
*Route generated:*
- *Total Distance:* ${globalRouteData.totalDistance}
- *Total Duration:* ${globalRouteData.totalDuration}
- *Google Maps Links:*`;

    // Append each URL as a separate line with hyperlinked text, disabling previews by adding a query parameter
    globalRouteData.googleMapsUrls.forEach((url, index) => {
        const modifiedUrl = `${url}&preview=false`;  // Adding a dummy query parameter
        message += `\n[Route link: part ${index + 1}](${modifiedUrl})`;
    });

    try {
        await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            chat_id: telegramChatId,
            text: message.trim(),  // .trim() to remove unnecessary leading/trailing spaces
            parse_mode: 'Markdown' // You can also use 'HTML' here if you prefer
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error.message);
    }
}

module.exports = {
    sendTelegramMessage
};