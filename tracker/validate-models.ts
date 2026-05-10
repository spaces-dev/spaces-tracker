import { loadEnvFile } from 'node:process'
import { Config } from './config.ts'

loadEnvFile()

const API_KEY = process.env.OPENROUTER_API_KEY

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

async function fetchAllModels(): Promise<Model[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`)
  }

  const json: ModelsResponse = await res.json()
  return json.data
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

  const { prompt, completion } = model.pricing
  const free = isFreePrice(prompt) && isFreePrice(completion)
  if (!free) {
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
}

main()
