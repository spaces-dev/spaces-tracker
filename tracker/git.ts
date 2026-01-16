import { execCmd } from './utils.ts'

export async function commitAndPush(message: string) {
  await execCmd('git', ['add', '.'])
  const { stdout: status } = await execCmd('git', ['status', '--porcelain'])
  if (!status.trim()) return

  console.log('Changes detected. Committing...')

  await execCmd('git', ['config', 'user.name', 'Vitalij Ryndin'])
  await execCmd('git', ['config', 'user.email', 'crashmax.dev@gmail.com'])
  await execCmd('git', ['commit', '-m', message])
  await execCmd('git', ['push'])

  const { stdout: sha } = await execCmd('git', ['rev-parse', '--short', 'HEAD'])
  return sha.trim()
}
