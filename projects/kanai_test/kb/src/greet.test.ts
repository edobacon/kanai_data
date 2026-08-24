import { greet } from './greet'

describe('greet', () => {
  it('saluda', () => { expect(greet('kanai')).toBe('hola kanai') })
})
