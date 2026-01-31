export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
) {
  const params = new URLSearchParams({
    chat_id: chatId,
    text,
    parse_mode: 'html',
    disable_web_page_preview: 'true',
  })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    body: params,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`)
  }

  return data
}

export async function sendNotifications(
  commitSha: string,
  messageChunks: string[],
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.log('\nTelegram credentials not found. Skipping notification.')
    return
  }

  const repo = process.env.REPOSITORY
  const repoUrl = `https://github.com/${repo}`
  const commitUrl = `${repoUrl}/commit/${commitSha}`
  const messageHeader = `<a href="${repoUrl}">${repo}</a> • <a href="${commitUrl}">${commitSha}</a>`

  for (let i = 0; i < messageChunks.length; i++) {
    let message = messageChunks[i]
    if (i === 0) {
      message = `${messageHeader}\n\n${message}`
    }
    await sendTelegramMessage(botToken, chatId, message)
  }
}
