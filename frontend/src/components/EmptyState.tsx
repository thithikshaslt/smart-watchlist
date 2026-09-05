import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  children?: ReactNode
}

function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  )
}

export default EmptyState
