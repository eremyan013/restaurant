'use client'

import { useTransition, useState, useEffect } from 'react'
import { useToast } from '@/components/toast-provider'

type AltSlot = { date_iso: string; time: string; note: string }

type Status = 'pending' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'visited' | 'alternative_offered'

export function ReservationStatusButtons({
  status,
  onConfirm,
  onCancel,
  onVisited,
  onReopen,
  onReject,
  onAssign,
  onOfferAlternatives,
  agentId,
}: {
  status:                Status
  onConfirm:             () => Promise<void>
  onCancel:              () => Promise<void>
  onVisited:             () => Promise<void>
  onReopen:              () => Promise<void>
  onReject?:             (reason: string) => Promise<void>
  onAssign?:             () => Promise<void>
  onOfferAlternatives?:  (alts: { date_iso: string; time: string; note?: string }[]) => Promise<void>
  agentId?:              string | null
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Offer alternatives state
  const [offeringAlts, setOfferingAlts] = useState(false)
  const [altSlots, setAltSlots] = useState<AltSlot[]>([{ date_iso: '', time: '', note: '' }])

  useEffect(() => {
    setConfirming(false)
    setRejecting(false)
    setRejectReason('')
    setOfferingAlts(false)
    setAltSlots([{ date_iso: '', time: '', note: '' }])
  }, [status])

  function handle(action: () => Promise<void>, msg: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(msg)
      } catch {
        toast.error('Failed to update reservation')
      }
    })
  }

  function updateSlot(index: number, field: keyof AltSlot, value: string) {
    setAltSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addSlot() {
    setAltSlots(prev => [...prev, { date_iso: '', time: '', note: '' }])
  }

  function removeSlot(index: number) {
    setAltSlots(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSendAlternatives() {
    if (!onOfferAlternatives) return
    const valid = altSlots.filter(s => s.date_iso && s.time)
    startTransition(async () => {
      try {
        await onOfferAlternatives(valid)
        toast.success('Alternatives sent to user')
        setOfferingAlts(false)
        setAltSlots([{ date_iso: '', time: '', note: '' }])
      } catch {
        toast.error('Failed to send alternatives')
      }
    })
  }

  const allSlotsValid = altSlots.every(s => s.date_iso && s.time)

  return (
    <div className="flex gap-1.5 flex-wrap">
      {status === 'pending_confirmation' && (
        <>
          {agentId === null && onAssign && (
            <button
              onClick={() => handle(onAssign, 'Assigned to you')}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Assign to me
            </button>
          )}
          <button
            onClick={() => handle(onConfirm, 'Reservation confirmed')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          {rejecting ? (
            <>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                className="w-full border border-zinc-200 rounded-lg text-xs px-2 py-1.5 resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  handle(() => onReject!(rejectReason), 'Reservation rejected')
                  setRejecting(false)
                  setRejectReason('')
                }}
                disabled={pending || !rejectReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Send rejection
              </button>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                Back
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRejecting(true)}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              {onOfferAlternatives && !offeringAlts && (
                <button
                  onClick={() => setOfferingAlts(true)}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Offer Alternatives
                </button>
              )}
            </>
          )}
          {offeringAlts && (
            <AltSlotsPanel
              altSlots={altSlots}
              pending={pending}
              allSlotsValid={allSlotsValid}
              onUpdateSlot={updateSlot}
              onAddSlot={addSlot}
              onRemoveSlot={removeSlot}
              onSend={handleSendAlternatives}
              onBack={() => { setOfferingAlts(false); setAltSlots([{ date_iso: '', time: '', note: '' }]) }}
            />
          )}
        </>
      )}
      {status === 'pending' && (
        <>
          <button
            onClick={() => handle(onConfirm, 'Reservation confirmed')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          {onOfferAlternatives && !offeringAlts && !confirming && (
            <button
              onClick={() => setOfferingAlts(true)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Offer Alternatives
            </button>
          )}
          {offeringAlts ? (
            <AltSlotsPanel
              altSlots={altSlots}
              pending={pending}
              allSlotsValid={allSlotsValid}
              onUpdateSlot={updateSlot}
              onAddSlot={addSlot}
              onRemoveSlot={removeSlot}
              onSend={handleSendAlternatives}
              onBack={() => { setOfferingAlts(false); setAltSlots([{ date_iso: '', time: '', note: '' }]) }}
            />
          ) : confirming ? (
            <>
              <button
                type="button"
                onClick={() => { setConfirming(false); handle(onCancel, 'Reservation cancelled') }}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                Back
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </>
      )}
      {status === 'confirmed' && (
        <>
          <button
            onClick={() => handle(onVisited, 'Marked as visited')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Visited
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => { setConfirming(false); handle(onCancel, 'Reservation cancelled') }}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
              >
                Back
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </>
      )}
      {status === 'alternative_offered' && (
        <>
          <span className="px-3 py-1.5 text-xs text-zinc-500 italic">
            Awaiting user response
          </span>
          <button
            onClick={() => handle(onCancel, 'Reservation cancelled')}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      )}
      {(status === 'cancelled' || status === 'visited') && (
        <button
          onClick={() => handle(onReopen, 'Reservation reopened')}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          Reopen
        </button>
      )}
    </div>
  )
}

function AltSlotsPanel({
  altSlots,
  pending,
  allSlotsValid,
  onUpdateSlot,
  onAddSlot,
  onRemoveSlot,
  onSend,
  onBack,
}: {
  altSlots: AltSlot[]
  pending: boolean
  allSlotsValid: boolean
  onUpdateSlot: (index: number, field: keyof AltSlot, value: string) => void
  onAddSlot: () => void
  onRemoveSlot: (index: number) => void
  onSend: () => void
  onBack: () => void
}) {
  return (
    <div className="w-full mt-1 flex flex-col gap-2">
      {altSlots.map((slot, i) => (
        <div key={i} className="flex flex-wrap gap-1.5 items-center">
          <input
            type="date"
            value={slot.date_iso}
            onChange={e => onUpdateSlot(i, 'date_iso', e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-sm"
            aria-label={`Alternative ${i + 1} date`}
          />
          <input
            type="time"
            value={slot.time}
            onChange={e => onUpdateSlot(i, 'time', e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1 text-sm"
            aria-label={`Alternative ${i + 1} time`}
          />
          <input
            type="text"
            value={slot.note}
            onChange={e => onUpdateSlot(i, 'note', e.target.value)}
            placeholder="Note (optional)"
            className="border border-zinc-200 rounded px-2 py-1 text-sm flex-1 min-w-[120px]"
            aria-label={`Alternative ${i + 1} note`}
          />
          {altSlots.length > 1 && (
            <button
              type="button"
              onClick={() => onRemoveSlot(i)}
              className="text-zinc-400 hover:text-zinc-600 text-sm px-1"
              aria-label={`Remove alternative ${i + 1}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          type="button"
          onClick={onAddSlot}
          disabled={altSlots.length >= 3}
          className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add another time
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={pending || !allSlotsValid}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send Alternatives'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  )
}
