import { createContext, useContext, type ReactNode } from 'react'

const ProfilePeekCtx = createContext<(id: string) => void>(() => {})

export function ProfilePeekProvider({
  onView,
  children,
}: {
  onView: (id: string) => void
  children: ReactNode
}) {
  return <ProfilePeekCtx.Provider value={onView}>{children}</ProfilePeekCtx.Provider>
}

export function useViewProfile(): (id: string) => void {
  return useContext(ProfilePeekCtx)
}
