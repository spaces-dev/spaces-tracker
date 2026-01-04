import { generateChangelog } from './generate-changelog.ts'
import { requestRevisions } from './request-revisions.ts'
import { requestSourcemaps } from './request-sourcemap.ts'
import { trackerStats } from './stats.ts'

async function main() {
  const revisions = await requestRevisions.loadRevisions()
  if (!revisions.isChanged) {
    console.log(`No changes found in "revisions.json". Nothing to do.`)
    return
  }

  trackerStats.setComparedLinks(revisions.comparedLinks)

  const sourcemaps = await requestSourcemaps(revisions.linksGroup)
  const stats = trackerStats.parseSourcemapResponses(sourcemaps)
  if (stats.added.length === 0 && stats.changed.length === 0 && stats.failed.length === 0) {
    console.log('\nNo files changed. Exiting without commit.')
    process.exit(0)
  }

  generateChangelog(stats)
}

main().catch(console.log)
