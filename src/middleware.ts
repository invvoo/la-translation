import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }
  if (pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // ── Client portal routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/client') && !pathname.startsWith('/client/login') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/client/login'
    return NextResponse.redirect(url)
  }
  if (pathname === '/client/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/client/translation_jobs'
    return NextResponse.redirect(url)
  }

  // ── Vendor portal routes ──────────────────────────────────────────────────
  if (
    pathname.startsWith('/vendor') &&
    !pathname.startsWith('/vendor/login') &&
    !pathname.startsWith('/vendor/signup') &&
    !pathname.startsWith('/vendor/interpret-inquiry') &&
    !pathname.startsWith('/vendor/translation-acceptance') &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/vendor/login'
    return NextResponse.redirect(url)
  }
  if (pathname === '/vendor/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/vendor/translation_jobs'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*', '/vendor/:path*'],
}
