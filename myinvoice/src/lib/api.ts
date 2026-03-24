function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit & { token?: string }) {
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(options?.headers ?? {})
  headers.set('accept', 'application/json')
  if (options?.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (options?.token) headers.set('authorization', `Bearer ${options.token}`)

  const res = await fetch(url, { ...options, headers })
  const text = await res.text()
  const body = text ? ((): unknown => { try { return JSON.parse(text) } catch { return text } })() : null
  if (res.status === 401 && !String(path).startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent('myinvoice:authExpired'))
  }
  if (!res.ok) throw new ApiError(`Request failed: ${res.status}`, res.status, body)
  return body as T
}
