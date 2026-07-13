const inputCls = 'h-10 px-3 rounded-lg border border-zinc-300 text-sm w-full focus:outline-none focus:ring-2 focus:ring-zinc-300'
const labelCls = 'text-sm font-medium text-zinc-700 block mb-1'

type Props = {
  action?: (formData: FormData) => void | Promise<void>
  defaults?: {
    name_hy?: string
    name_ru?: string
    name_en?: string
    sort_order?: number
    is_active?: boolean
  }
}

export function LocationForm({ action, defaults = {} }: Props) {
  return (
    <form action={action} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Armenian name *</label>
          <input
            type="text"
            name="name_hy"
            required
            defaultValue={defaults.name_hy ?? ''}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Russian name *</label>
          <input
            type="text"
            name="name_ru"
            required
            defaultValue={defaults.name_ru ?? ''}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>English name *</label>
          <input
            type="text"
            name="name_en"
            required
            defaultValue={defaults.name_en ?? ''}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Sort order</label>
          <input
            type="number"
            name="sort_order"
            defaultValue={defaults.sort_order ?? 0}
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            defaultChecked={defaults.is_active ?? true}
            value="true"
            className="accent-zinc-900"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-zinc-700 cursor-pointer">
            Active
          </label>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100">
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Save location
        </button>
      </div>
    </form>
  )
}
