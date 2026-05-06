import { NextRequest } from 'next/server'
import { handlePublicApiResource, publicApiMethodNotAllowed } from '@/lib/public-api'

export async function GET(req: NextRequest) {
  return handlePublicApiResource(req, 'goals')
}

export const POST = publicApiMethodNotAllowed
export const PUT = publicApiMethodNotAllowed
export const PATCH = publicApiMethodNotAllowed
export const DELETE = publicApiMethodNotAllowed
