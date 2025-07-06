import React from 'react'
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from './page'

test('renders Hello Poker heading', () => {
  render(<Home />)
  expect(screen.getByText('Hello Poker')).toBeDefined()
  expect(screen.getByText('Play-money Texas Hold\'em poker server + browser client')).toBeDefined()
})