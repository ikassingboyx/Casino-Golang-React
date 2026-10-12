import axios from 'axios'

// Readable message from a failed API call (the backend sends { error }).
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error ?? err.message
  return String(err)
}
