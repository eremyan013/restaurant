'use client'

import type { AdminPermissions } from '@/lib/permissions'

type PermissionPickerProps = {
  defaultPermissions?: Partial<AdminPermissions>
}

type SectionConfig = {
  key: keyof AdminPermissions
  label: string
  options: { value: string; label: string }[]
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'reservations',
    label: 'Reservations',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'manage', label: 'Manage' },
    ],
  },
  {
    key: 'reviews',
    label: 'Reviews',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'moderate', label: 'Moderate' },
    ],
  },
  {
    key: 'yel',
    label: 'YEL Points',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'adjust', label: 'Adjust' },
      { value: 'bulk', label: 'Bulk adjust' },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'edit', label: 'Edit' },
    ],
  },
  {
    key: 'venues',
    label: 'Venues',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'edit', label: 'Edit' },
    ],
  },
  {
    key: 'prizes',
    label: 'Prizes',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'manage', label: 'Manage' },
    ],
  },
  {
    key: 'concierge',
    label: 'Concierge',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'reply', label: 'Reply' },
    ],
  },
  {
    key: 'redemption',
    label: 'Redemption',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'redeem', label: 'Redeem' },
    ],
  },
  {
    key: 'activity_log',
    label: 'Activity Log',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
    ],
  },
  {
    key: 'guides',
    label: 'Guides',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'manage', label: 'Manage' },
    ],
  },
  {
    key: 'menus',
    label: 'Menus',
    options: [
      { value: '', label: 'None' },
      { value: 'view', label: 'View only' },
      { value: 'manage', label: 'Manage' },
    ],
  },
]

export function PermissionPicker({ defaultPermissions }: PermissionPickerProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="text-sm font-medium text-zinc-900">Section Permissions</h3>
      </div>

      {SECTIONS.map(({ key, label, options }) => (
        <div
          key={key}
          className="px-5 py-3 flex items-center border-b border-zinc-100 last:border-0"
        >
          <span className="text-sm text-zinc-700 w-32 shrink-0">{label}</span>

          <div className="flex gap-4 flex-wrap" role="radiogroup" aria-label={`${label} permission`}>
            {options.map(({ value, label: optLabel }) => {
              const currentValue = defaultPermissions?.[key] ?? null
              const isDefault =
                currentValue === (value === '' ? null : value) ||
                (currentValue === null && value === '')

              return (
                <label
                  key={value}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`perm_${key}`}
                    value={value}
                    defaultChecked={isDefault}
                    className="accent-zinc-900"
                    aria-label={optLabel}
                  />
                  <span className="text-sm text-zinc-600">{optLabel}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
