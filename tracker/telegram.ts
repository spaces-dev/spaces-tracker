export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  replyMarkup: object,
) {
  const params: Record<string, string> = {
    chat_id: chatId,
    text,
    parse_mode: 'html',
    disable_web_page_preview: 'true',
    reply_markup: JSON.stringify(replyMarkup),
  }

  const body = new URLSearchParams(params)

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    body,
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

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'GitHub', url: repoUrl },
        { text: `Commit`, url: commitUrl },
      ],
    ],
  }

  for (let i = 0; i < messageChunks.length; i++) {
    const message = messageChunks[i]
    await sendTelegramMessage(
      botToken,
      chatId,
      message,
      keyboard,
    )
  }
}
