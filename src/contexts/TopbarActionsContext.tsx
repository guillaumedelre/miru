import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Ctx {
  actions: ReactNode
  setActions: (node: ReactNode) => void
}

const TopbarActionsContext = createContext<Ctx>({ actions: null, setActions: () => {} })

export function TopbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null)
  const setActions = useCallback((node: ReactNode) => setActionsState(node), [])
  return (
    <TopbarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </TopbarActionsContext.Provider>
  )
}

export function useTopbarActions() {
  return useContext(TopbarActionsContext)
}
