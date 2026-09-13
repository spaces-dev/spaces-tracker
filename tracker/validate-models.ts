import { loadEnvFile } from 'node:process'
import { Config } from './config.ts'
import fallbackFreeIds from './openrouter-free-catalog.json' with { type: 'json' }
import { openRouterHeaders } from './openrouter.ts'

loadEnvFile()

interface ModelPricing {
  prompt: string
  completion: string
}

interface Model {
  id: string
  pricing: ModelPricing
}

interface ModelsResponse {
  data: Model[]
}

type ValidationStatus = 'ok' | 'not_found' | 'no_free_tier' | 'error'

interface ValidationResult {
  model: string
  status: ValidationStatus
  message?: string
}

function isFreePrice(val: string | null | undefined): boolean {
  return val == null || val === '' || Number.parseFloat(val) === 0
}

function isFreeModel(model: Model): boolean {
  return model.id.endsWith(':free')
    || (isFreePrice(model.pricing.prompt) && isFreePrice(model.pricing.completion))
}

async function readErrorBody(res: Response): Promise<string> {
  const body = await res.text()
  try {
    const json = JSON.parse(body) as { error?: { message?: string }, message?: string }
    return json.error?.message || json.message || body.slice(0, 300)
  } catch {
    return body.replace(/\s+/g, ' ').slice(0, 300)
  }
}

async function fetchModels(url: URL, apiKey?: string): Promise<Model[]> {
  const res = await fetch(url, {
    headers: openRouterHeaders(apiKey),
  })

  if (!res.ok) {
    const details = await readErrorBody(res)
    throw new Error(`Failed to fetch models: ${res.status} ${res.statusText} — ${details}`)
  }

  const json: ModelsResponse = await res.json()
  return json.data
}

async function fetchAllModels(): Promise<Model[]> {
  const url = new URL('https://openrouter.ai/api/v1/models')
  url.searchParams.set('max_price', '0')

  try {
    return await fetchModels(url)
  } catch (error) {
    if (!String(error).includes('403')) {
      throw error
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (apiKey) {
      console.log('Публичный каталог закрыт (403). Повторяю с OPENROUTER_API_KEY...\n')
      try {
        return await fetchModels(url, apiKey)
      } catch (authError) {
        if (!String(authError).includes('403')) {
          throw authError
        }
        return loadFallbackCatalog(authError)
      }
    }

    return loadFallbackCatalog(error)
  }
}

function loadFallbackCatalog(error: unknown): Model[] {
  console.log(`Каталог OpenRouter недоступен (${String(error)}).`)
  console.log('Проверяю Config.Models по последнему снимку tracker/openrouter-free-catalog.json\n')
  return fallbackFreeIds.map((id) => ({
    id,
    pricing: { prompt: '0', completion: '0' },
  }))
}

function validateModel(modelId: string, modelMap: Map<string, Model>): ValidationResult {
  const model = modelMap.get(modelId)

  if (!model) {
    return {
      model: modelId,
      status: 'not_found',
      message: 'Модель не найдена',
    }
  }

  if (!isFreeModel(model)) {
    const { prompt, completion } = model.pricing
    return {
      model: modelId,
      status: 'no_free_tier',
      message: `Платная: prompt=${prompt}, completion=${completion}`,
    }
  }

  return {
    model: modelId,
    status: 'ok',
    message: '✅ Бесплатная',
  }
}

async function main() {
  console.log(`🔍 Валидация ${Config.Models.length} моделей...\n`)

  let allModels: Model[]

  try {
    allModels = await fetchAllModels()
  } catch (err) {
    console.error(`💥 Не удалось загрузить список моделей: ${String(err)}`)
    process.exit(1)
  }

  const modelMap = new Map(allModels.map((m) => [m.id, m]))
  const results = Config.Models.map((modelId) => validateModel(modelId, modelMap))

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

  const catalogFree = allModels
    .filter((model) => isFreeModel(model))
    .map((model) => model.id)
    .toSorted((a, b) => a.localeCompare(b))

  console.log(`\nАктуальные :free в каталоге (${catalogFree.length}):`)
  for (const id of catalogFree) {
    console.log(`  - ${id}`)
  }
}

main()
