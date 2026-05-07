import { NextRequest, NextResponse } from 'next/server'

/**
 * Hostname-based routing:
 * jobs.splendit.cz/* → /careers/* (public job portal)
 */
export function middleware(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname

  if (host.startsWith('jobs.') && !pathname.startsWith('/careers')) {
    const url      = req.nextUrl.clone()
    url.pathname   = pathname === '/' ? '/careers' : `/careers${pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
