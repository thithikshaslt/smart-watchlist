interface ErrorStateProps {
  message: string
}

function ErrorState({ message }: ErrorStateProps) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

export default ErrorState
