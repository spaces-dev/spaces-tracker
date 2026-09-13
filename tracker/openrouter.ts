const REFERER = `https://github.com/${process.env.REPOSITORY ?? 'crashmax/spaces-tracker'}`

export function openRouterHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 spaces-tracker/0.0.0',
    'Accept-Language': 'en-US,en;q=0.9',
    'HTTP-Referer': REFERER,
    'X-Title': 'spaces-tracker',
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  return headers
}
