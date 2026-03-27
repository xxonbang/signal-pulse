interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = '로딩 중...' }: LoadingSpinnerProps) {
  return (
    <div className="text-center py-12 text-text-muted" role="status" aria-label={message}>
      <div className="w-9 h-9 border-3 border-border border-t-accent-primary rounded-full animate-spin mx-auto mb-3.5" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
