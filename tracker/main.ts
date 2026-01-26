import { loadEnvFile } from 'node:process'
import { Config } from './config.ts'
import { generateChangelog } from './generate-changelog.ts'
import { commitAndPush } from './git.ts'
import { requestIcons } from './request-icons.ts'
import { requestRevisions } from './request-revisions.ts'
import { requestSourcemaps } from './request-sourcemaps.ts'
import { trackerStats } from './stats.ts'
import { sendNotifications } from './telegram.ts'

try {
  loadEnvFile()
} catch {
  // .env file is optional
}

const sources = Config.Sources.toSorted((a, b) => {
  if (a.isPrimary) return -1
  if (b.isPrimary) return 1
  return 0
})

for (const source of sources) {
  try {
    const revisions = await requestRevisions.loadRevisions(source)
    if (!revisions.isChanged) {
      console.log(`No changes found in revisions for ${source.name}.`)
      continue
    }

    const sourcemaps = await requestSourcemaps(revisions.linksGroup, source)
    trackerStats.parseSourcemapResponses(sourcemaps)

    await requestIcons(source)
  } catch (error) {
    console.error(`Failed to process ${source.name}:`, error)
  }
}

const stats = trackerStats.stats
if (!stats.isChanged) {
  console.log('No files changed in any source. Exiting without commit.')
  process.exit(0)
}

const changelog = await generateChangelog(stats)
const commitSha = await commitAndPush(changelog.commitMessage)
if (commitSha) {
  await sendNotifications(commitSha, changelog.telegramMessage)
} else {
  console.log('No git changes detected.')
}
