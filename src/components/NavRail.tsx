import { useState, type ReactNode } from 'react'

/**
 * A modal that explains that a control is decorative: the messenger rail
 * imitates web.max.ru, and its buttons exist only for visual consistency.
 */
export function DecorativeModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className='modal-backdrop' onClick={onClose} role='presentation'>
      <div
        className='modal-card'
        role='dialog'
        aria-modal='true'
        aria-label={title}
        onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>
          Раздел имитирует веб-версию MAX и добавлен для консистентности дизайна. Функциональности не несёт — в рамках
          тестового задания реализованы только чаты и текстовые сообщения.
        </p>
        <button type='button' className='modal-close' onClick={onClose} autoFocus>
          Понятно
        </button>
      </div>
    </div>
  )
}

type RailButton = {
  id: string
  label: string
  icon: ReactNode
}

/** Rail entries imitating the left toolbar of web.max.ru. */
const RAIL_BUTTONS: RailButton[] = [
  { id: 'contacts', label: 'Контакты', icon: '👤' },
  { id: 'channels', label: 'Каналы', icon: '📢' },
  { id: 'calls', label: 'Звонки', icon: '📞' },
  { id: 'settings', label: 'Настройки', icon: '⚙️' },
]

/**
 * The narrow left rail mirroring web.max.ru. Buttons open a modal stating
 * the controls are decorative — not real features of this prototype.
 */
export function NavRail() {
  const [modal, setModal] = useState<string | null>(null)
  const active = RAIL_BUTTONS.find((b) => b.id === modal)

  return (
    <>
      <nav className='nav-rail' aria-label='Разделы'>
        {RAIL_BUTTONS.map((button) => (
          <button
            key={button.id}
            type='button'
            className='rail-button'
            title={button.label}
            aria-label={button.label}
            onClick={() => setModal(button.id)}>
            <span className='rail-icon' aria-hidden='true'>
              {button.icon}
            </span>
          </button>
        ))}
      </nav>
      {active && <DecorativeModal title={active.label} onClose={() => setModal(null)} />}
    </>
  )
}
