type StatusStateProps = {
  state: 'loading' | 'empty' | 'error';
  message: string;
  description?: string;
};

export function StatusState({ description, message, state }: StatusStateProps) {
  return (
    <section
      className="status-state"
      role={state === 'error' ? 'alert' : 'status'}
      aria-live={state === 'error' ? 'assertive' : 'polite'}
    >
      {state === 'loading' && <span className="status-spinner" aria-hidden="true" />}
      <strong>{message}</strong>
      {description && <span>{description}</span>}
    </section>
  );
}
