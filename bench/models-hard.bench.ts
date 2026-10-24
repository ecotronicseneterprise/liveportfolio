import { it } from 'vitest'
import { main } from './run-models'

it('model comparison on the hard set', main, 3_600_000)
