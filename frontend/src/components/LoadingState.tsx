interface LoadingStateProps {
  message?: string
}

function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return <p className="text-sm text-muted-foreground">{message}</p>
}

export default LoadingState
