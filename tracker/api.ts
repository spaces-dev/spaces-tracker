import { Config } from './config.ts'

export async function apiRequest(path: string) {
  const url = new URL(path, Config.Host)
  return fetch(url, {
    headers: Config.RequestHeaders,
  })
}
