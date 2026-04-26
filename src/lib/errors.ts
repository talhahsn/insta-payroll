type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'LOCKED'
  | 'INTERNAL'

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  LOCKED: 423,
  INTERNAL: 500,
}

export class AppError extends Error {
  code: ErrorCode
  status: number

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
    this.status = STATUS_MAP[code]
    this.name = 'AppError'
  }
}

export function toApiError(err: unknown): { status: number; body: { error: string; code: string } } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: err.message, code: err.code },
    }
  }
  console.error('[Unhandled error]', err)
  return {
    status: 500,
    body: { error: 'Internal server error', code: 'INTERNAL' },
  }
}
