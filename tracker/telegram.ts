interface InputRichMessage {
  html: string
  is_rtl?: boolean
  skip_entity_detection?: boolean
}

async function invokeTelegramApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`Telegram API error: ${JSON.stringify(data)}`)
}

export async function sendTelegramRichMessage(
  token: string,
  chatId: string,
  text: string,
  replyMarkup: Record<string, unknown>,
): Promise<void> {
  const richMessage: InputRichMessage = {
    html: text,
  }

  await invokeTelegramApi(token, 'sendRichMessage', {
    chat_id: chatId,
    rich_message: richMessage,
    reply_markup: replyMarkup,
  })
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
        { text: 'Commit', url: commitUrl },
      ],
    ],
  }

  for (const chunk of messageChunks) {
    await sendTelegramRichMessage(botToken, chatId, chunk, keyboard)
  }
}
