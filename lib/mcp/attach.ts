// Attaches a stored picture to the portfolio through the normal edit path (validated link, revision, compare-and-set).
import { applyForUser, type Applied } from './apply'
import type { ImageTarget } from './images'

export function attachImage(userId: string, target: ImageTarget, url: string): Promise<Applied> {
  const ops = target.kind === 'profile'
    ? [{ op: 'set_link', field: 'avatar_url', value: url }]
    : [{ op: 'update_project', index: target.index, patch: { image_url: url } }]
  return applyForUser(userId, ops)
}

export function detachImage(userId: string, target: ImageTarget): Promise<Applied> {
  const ops = target.kind === 'profile'
    ? [{ op: 'set_link', field: 'avatar_url', value: '' }]
    : [{ op: 'update_project', index: target.index, patch: { image_url: '' } }]
  return applyForUser(userId, ops)
}
