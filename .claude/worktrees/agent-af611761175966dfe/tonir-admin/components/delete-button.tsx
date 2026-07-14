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
      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
    >
      {label}
    </button>
  )
}
