import { useState, type SubmitEvent } from 'react'
import { GreenApiClient, GreenApiError } from '../api/greenApi'
import {
  clearCredentials,
  loadCredentials,
  normalizeApiUrl,
  saveCredentials,
  type InstanceCredentials,
} from '../api/credentials'

type LoginProps = {
  onLogin: (client: GreenApiClient, credentials: InstanceCredentials) => void
}

export function LoginPage({ onLogin }: LoginProps) {
  const [form, setForm] = useState<InstanceCredentials>(
    () =>
      loadCredentials() ?? {
        idInstance: '',
        apiTokenInstance: '',
        apiUrl: 'https://api.green-api.com',
      },
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    setError(null)

    const apiUrl = normalizeApiUrl(form.apiUrl)
    const idInstance = form.idInstance.trim()
    const apiTokenInstance = form.apiTokenInstance.trim()
    if (!apiUrl || !idInstance || !apiTokenInstance) {
      setError('Заполните все поля')
      return
    }

    setBusy(true)
    try {
      const credentials = { apiUrl, idInstance, apiTokenInstance }
      const client = new GreenApiClient(credentials)
      const state = await client.getStateInstance()
      if (state.stateInstance !== 'authorized') {
        setError(
          `Инстанс не авторизован (state: ${state.stateInstance}). Отсканируйте QR-код в личном кабинете GREEN-API.`,
        )
        return
      }
      saveCredentials(credentials)
      onLogin(client, credentials)
    } catch (e) {
      // Credentials stay saved on network failures — only a definite rejection
      // from the API means the stored values are wrong.
      if (e instanceof GreenApiError && (e.httpStatus === 401 || e.httpStatus === 403)) {
        clearCredentials()
      }
      setError(e instanceof Error ? e.message : 'Не удалось подключиться к GREEN-API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='login-page'>
      <div className='login-card'>
        <div className='login-logo' aria-hidden='true'>
          MAX
        </div>
        <h1>Вход в GREEN-API</h1>
        <p className='login-hint'>Параметры доступа публикуются в личном кабинете GREEN-API.</p>
        <form onSubmit={handleSubmit}>
          <label>
            apiUrl
            <input
              type='text'
              name='apiUrl'
              autoComplete='off'
              placeholder='https://3100.api.green-api.com'
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
            />
          </label>
          <label>
            idInstance
            <input
              type='text'
              name='idInstance'
              autoComplete='off'
              inputMode='numeric'
              placeholder='3100000000'
              value={form.idInstance}
              onChange={(e) => setForm({ ...form, idInstance: e.target.value })}
            />
          </label>
          <label>
            apiTokenInstance
            <input
              type='password'
              name='apiTokenInstance'
              autoComplete='off'
              value={form.apiTokenInstance}
              onChange={(e) => setForm({ ...form, apiTokenInstance: e.target.value })}
            />
          </label>
          {error && (
            <div className='form-error' role='alert'>
              {error}
            </div>
          )}
          <button type='submit' disabled={busy}>
            {busy ? 'Проверка…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
