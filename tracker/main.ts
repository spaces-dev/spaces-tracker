import { generateChangelog } from './generate-changelog.ts'
import { requestIcons } from './request-icons.ts'
import { requestRevisions } from './request-revisions.ts'
import { requestSourcemaps } from './request-sourcemap.ts'
import { trackerStats } from './stats.ts'

async function main() {
  const revisions = await requestRevisions.loadRevisions()
  if (!revisions.isChanged) {
    console.log('No changes found in revisions. Nothing to do.')
    process.exit(0)
  }

  const sourcemaps = await requestSourcemaps(revisions.linksGroup)
  const stats = trackerStats.parseSourcemapResponses(sourcemaps)
  if (!stats.isChanged) {
    console.log('No files changed. Exiting without commit.')
    process.exit(0)
  }

  await requestIcons()
  await generateChangelog(stats)
}

main().catch(console.log)
