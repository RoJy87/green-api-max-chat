export type InstanceCredentials = {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

const STORAGE_KEY = 'green-api-credentials'

export function loadCredentials(): InstanceCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InstanceCredentials
    if (!parsed.idInstance || !parsed.apiTokenInstance || !parsed.apiUrl) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCredentials(credentials: InstanceCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  // The apiTokenInstance is part of every request URL — never allow an
  // unencrypted transport.
  if (/^https:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^http:\/\//i, '')}`
}
