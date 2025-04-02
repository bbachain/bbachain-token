'use client'

import { AppHero } from '../ui/ui-layout'

const links: { label: string; href: string }[] = [
  { label: 'BBAChain Docs', href: 'https://docs.bbachain.com/' },
  { label: 'BBAChain Faucet', href: 'https://faucet.bbachain.com/' },
  { label: 'BBAChain Stack Overflow', href: 'https://bbachain.stackexchange.com/' },
  { label: 'BBAChain Labs', href: 'https://github.com/bbachain/' },
]

export default function DashboardFeature() {
  return (
    <div>
      <AppHero title="gm" subtitle="Say hi to your new BBAChain dApp." />
      <div className="max-w-xl mx-auto py-6 sm:px-6 lg:px-8 text-center">
        <div className="space-y-2">
          <p>Here are some helpful links to get you started.</p>
          {links.map((link, index) => (
            <div key={index}>
              <a href={link.href} className="link" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
