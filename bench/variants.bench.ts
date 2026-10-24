import { it } from 'vitest'
import { main } from './run-variants'

it('pipeline variants on the synthetic gold set', main, 3_600_000)
