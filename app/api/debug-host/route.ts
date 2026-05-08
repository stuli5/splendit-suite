import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.json({
    host:             req.headers.get('host'),
    xForwardedHost:   req.headers.get('x-forwarded-host'),
    xForwardedFor:    req.headers.get('x-forwarded-for'),
    url:              req.url,
    nextUrlHostname:  req.nextUrl.hostname,
  })
}
