'use client'

export function DeleteButton({
  label,
  confirmMessage,
}: {
  label: string
  confirmMessage: string
}) {
  return (
    <button
      type="submit"
      onClick={e => {
        if (!confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
      className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
    >
      {label}
    </button>
  )
}
