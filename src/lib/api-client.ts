import type { ApiErrorBody } from '@/types/api'

/**
 * Best-effort message for failed fetches (expects `{ error: string }` from API).
 */
export async function getErrorMessageFromResponse(res: Response): Promise<string> {
  try {
    const j = (await res.clone().json()) as ApiErrorBody
    if (j.error) return j.error
    if (j.message) return j.message
  } catch {
    // not JSON
  }
  return res.statusText || 'Request failed'
}

export async function readJsonError(res: Response): Promise<never> {
  const msg = await getErrorMessageFromResponse(res)
  throw new Error(msg)
}

export async function postJson<TBody extends object, TRes = unknown>(
  url: string,
  body: TBody,
  init?: Omit<RequestInit, 'body' | 'method'>
): Promise<TRes> {
  const { headers, ...rest } = init ?? {}
  const res = await fetch(url, {
    ...rest,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) await readJsonError(res)
  return (await res.json()) as TRes
}
