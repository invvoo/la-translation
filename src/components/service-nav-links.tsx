import Link from 'next/link'
import { FileText, Mic, Stamp } from 'lucide-react'

const SERVICES = [
  { href: '/translation',    icon: FileText, label: 'Document Translation Quote', color: 'text-blue-600'    },
  { href: '/interpretation', icon: Mic,      label: 'Book an Interpreter',        color: 'text-purple-600'  },
  { href: '/notary',         icon: Stamp,    label: 'Notary / Apostille',         color: 'text-emerald-600' },
]

const TRUST_LINES: Record<'translation' | 'interpretation' | 'notary', string> = {
  translation:    'USCIS-accepted, court-certified, and notarized translations — sealed and stamped. Serving translation_clients since 2003 from our Los Angeles office.',
  interpretation: 'Court-certified and CCHI/National Board-certified medical interpreters. Serving translation_clients since 2003 from our Los Angeles office.',
  notary:         'Official notarization, apostille, and legal document assistance. Serving translation_clients since 2003 from our Los Angeles office.',
}

interface ServiceNavLinksProps {
  current: 'translation' | 'interpretation' | 'notary'
  /** "top" renders a compact inline strip; default renders the bottom card */
  position?: 'top' | 'bottom'
}

export function ServiceNavLinks({ current, position = 'bottom' }: ServiceNavLinksProps) {
  const others = SERVICES.filter((s) => !s.href.includes(current))

  if (position === 'top') {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span className="hidden sm:inline text-gray-400 mr-1">Looking for something else?</span>
        {others.map(({ href, icon: Icon, label, color }, i) => (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300 mx-1">·</span>}
            <Link href={href} className={`flex items-center gap-1 font-medium ${color} hover:underline whitespace-nowrap`}>
              <Icon className="h-3 w-3" />{label}
            </Link>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
      <p className="text-xs text-gray-400 leading-relaxed">{TRUST_LINES[current]}</p>
      <div className="flex flex-wrap justify-center gap-4 mt-3">
        {others.map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-1.5 text-xs font-medium ${color} hover:underline`}>
            <Icon className="h-3 w-3" />{label}
          </Link>
        ))}
      </div>
    </div>
  )
}
