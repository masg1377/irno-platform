/**
 * Standard API response envelope used by hub-api.
 * All endpoints return this shape.
 */
export interface ApiResponse<T> {
  data: T
  meta?: ApiMeta
}

export interface ApiErrorResponse {
  error: {
    statusCode: number
    message: string
    details?: unknown
  }
}

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

/**
 * Paginated list wrapper.
 */
export interface PaginatedList<T> {
  items: T[]
  meta: Required<ApiMeta>
}
