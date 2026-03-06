interface StatusBoxProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
}

export function StatusBox({ loading, error, empty, emptyText = "No data." }: StatusBoxProps) {
  if (loading) return <p>Loading...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (empty) return <p>{emptyText}</p>;
  return null;
}
