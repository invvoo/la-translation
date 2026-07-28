import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/admin/sidebar'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  // Verify the signed-in user is a registered employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!employee) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=unauthorized')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* pt-12 on mobile offsets the fixed top bar; md:pt-0 removes it on desktop */}
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        {children}
      </main>
    </div>
  )
}
