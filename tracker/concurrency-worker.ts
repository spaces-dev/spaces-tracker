import { Config } from './config.ts'

export async function concurrentWorker<Item, Result>(
  items: Item[],
  worker: (item: Item, index: number) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = Array.from({ length: items.length })
  let currentIndex = 0

  const runWorker = async () => {
    while (true) {
      const index = currentIndex++
      if (index >= items.length) break
      results[index] = await worker(items[index], index)
    }
  }

  const workers = Array.from(
    { length: Math.min(Config.Concurrency, items.length) },
    () => runWorker(),
  )

  await Promise.all(workers)
  return results
}
