export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-600 mt-0.5">{message}</p>
}
