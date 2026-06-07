import { create } from 'zustand'
import type { ReactNode } from 'react'

interface UIState {
  topbarActions: ReactNode
  setTopbarActions: (node: ReactNode) => void
}

export const useUIStore = create<UIState>((set) => ({
  topbarActions: null,
  setTopbarActions: (node) => set({ topbarActions: node }),
}))
