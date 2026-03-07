import { loadEnvFile } from 'node:process'
import { Config } from './config.ts'

loadEnvFile()

const API_KEY = process.env.OPENROUTER_API_KEY

interface EndpointPricing {
  prompt: string
  completion: string
}

interface Endpoint {
  name: string
  pricing: EndpointPricing
  context_length: number
  is_free?: boolean
}

interface EndpointsResponse {
  data: {
    endpoints: Endpoint[]
  }
}

type ValidationStatus = | 'ok' | 'not_found' | 'no_free_tier' | 'error'

interface ValidationResult {
  model: string
  status: ValidationStatus
  freeEndpoints?: string[]
  message?: string
}

function parseModelId(modelId: string) {
  const isFreeVariant = modelId.endsWith(':free')
  const cleanId = modelId.replace(/:free$/, '')
  const [author, ...slugParts] = cleanId.split('/')

  return {
    author,
    slug: slugParts.join('/'),
    isFreeVariant,
  }
}

async function validateModel(modelId: string): Promise<ValidationResult> {
  const { author, slug, isFreeVariant } = parseModelId(modelId)

  try {
    const url = `https://openrouter.ai/api/v1/models/${author}/${slug}/endpoints`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 404) {
      return {
        model: modelId,
        status: 'not_found',
        message: 'Модель не найдена (404)',
      }
    }

    if (!res.ok) {
      return {
        model: modelId,
        status: 'error',
        message: `HTTP ${res.status}: ${res.statusText}`,
      }
    }

    const json: EndpointsResponse = await res.json()
    const endpoints = json?.data?.endpoints ?? []

    const freeEndpoints = endpoints.filter((endpoint) => {
      return Number.parseFloat(endpoint.pricing.prompt) === 0
        && Number.parseFloat(endpoint.pricing.completion) === 0
    })

    if (isFreeVariant && freeEndpoints.length === 0) {
      return {
        model: modelId,
        status: 'no_free_tier',
        message: 'Модель помечена как :free, но бесплатных эндпоинтов нет',
      }
    }

    return {
      model: modelId,
      status: 'ok',
      freeEndpoints: freeEndpoints.map((e) => e.name),
      message: freeEndpoints.length > 0
        ? `✅ ${freeEndpoints.length} бесплатных эндпоинтов`
        : '⚠️ Только платные эндпоинты',
    }
  } catch (err) {
    return {
      model: modelId,
      status: 'error',
      message: `Ошибка запроса: ${String(err)}`,
    }
  }
}

async function main() {
  console.log(`🔍 Валидация ${Config.Models.length} моделей...\n`)

  const results = await Promise.all(Config.Models.map(validateModel))

  const statusIcon: Record<ValidationStatus, string> = {
    ok: '✅',
    not_found: '❌',
    no_free_tier: '⚠️',
    error: '💥',
  }

  for (const result of results) {
    const icon = statusIcon[result.status]
    console.log(`${icon} ${result.model}`)
    console.log(`   → ${result.message}`)
    if (result.freeEndpoints?.length) {
      console.log(`   → Providers: ${result.freeEndpoints.join(', ')}`)
    }
    console.log()
  }

  const counts = results.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<ValidationStatus, number>,
  )

  console.log(`✅ Доступны:       ${counts.ok ?? 0}`)
  console.log(`❌ Не найдены:     ${counts.not_found ?? 0}`)
  console.log(`⚠️  Нет free-тира:  ${counts.no_free_tier ?? 0}`)
  console.log(`💥 Ошибки:         ${counts.error ?? 0}`)
}

main()
