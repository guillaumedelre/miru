import type { ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/store'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  userId?: string
  route?: string
}

function Providers({ children, userId, route }: { children: ReactNode; userId: string; route: string }) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider userId={userId}>
        {children}
      </StoreProvider>
    </MemoryRouter>
  )
}

export function renderWithProviders(ui: ReactNode, options: Options = {}) {
  const { userId = 'test-user', route = '/', ...rest } = options
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers userId={userId} route={route}>{children}</Providers>
    ),
    ...rest,
  })
}
