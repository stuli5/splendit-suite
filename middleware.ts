import { NextRequest, NextResponse } from 'next/server'

/**
 * Hostname-based routing:
 * jobs.splendit.cz/* → /careers/* (public job portal)
 *
 * Firebase App Hosting may pass the original hostname via
 * X-Forwarded-Host rather than the Host header.
 */
export function middleware(req: NextRequest) {
  const host = (
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    ''
  ).split(':')[0].toLowerCase()

  const pathname = req.nextUrl.pathname

  const isJobsDomain = host === 'jobs.splendit.cz' || host.startsWith('jobs.')

  if (isJobsDomain && !pathname.startsWith('/careers')) {
    const url    = req.nextUrl.clone()
    url.pathname = pathname === '/' ? '/careers' : `/careers${pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
