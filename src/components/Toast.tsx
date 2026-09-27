import { useEffect, useState } from 'react'
import type { PollError } from '../hooks/useChatStore'

const TOAST_DURATION_MS = 6000

/**
 * Transient error toast. Remounted per failure (keyed by PollError.seq in the
 * parent), so every new error restarts the auto-dismiss timer.
 */
export function Toast({ error }: { error: PollError }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <div className='toast' role='alert'>
      {error.message}
    </div>
  )
}
