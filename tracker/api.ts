import { Config } from './config.ts'

class ApiRequest {
  async request(path: string) {
    const url = new URL(path, Config.Host)

    const request = await fetch(url, {
      headers: Config.RequestHeaders,
    })

    return request
  }
}

export const api = new ApiRequest()
