'use client'

import {WalletError} from '@bbachain/wallet-adapter-base'
import {ConnectionProvider, WalletProvider,} from '@bbachain/wallet-adapter-react'
import {WalletModalProvider} from '@bbachain/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'
import {ReactNode, useCallback, useMemo} from 'react'
import {useCluster} from '../cluster/cluster-data-access'

require('@bbachain/wallet-adapter-react-ui/styles.css')

export const WalletButton = dynamic(async () => (await import('@bbachain/wallet-adapter-react-ui')).WalletMultiButton, {
  ssr: false,
})

export function BBAChainProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()
  const endpoint = useMemo(() => cluster.endpoint, [cluster])
  const onError = useCallback((error: WalletError) => {
    console.error(error)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

