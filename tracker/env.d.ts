declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENROUTER_API_KEY: string
      TELEGRAM_BOT_TOKEN: string
      TELEGRAM_CHAT_ID: string
      REPOSITORY: string
    }
  }
}

export {}
