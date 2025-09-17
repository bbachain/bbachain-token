'use client'

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'
import { type Persister, PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import React, { ReactNode, useEffect, useState } from 'react'

const defaultOptions = {
	queries: {
		gcTime: 1000 * 60 * 60 * 24, // 24 jam
		staleTime: 1000 * 60 * 5 // 5 menit
	}
}

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(() => new QueryClient({ defaultOptions }))
	const [persister, setPersister] = useState<Persister | null>(null)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const storagePersister = createAsyncStoragePersister({
				storage: window.localStorage
			})
			setPersister(storagePersister)
		}
	}, [])

	if (!persister) {
		return null
	}

	return (
		<PersistQueryClientProvider
			client={client}
			persistOptions={{
				persister,
				dehydrateOptions: {
					shouldDehydrateQuery: (query) => query.meta?.persist === true
				}
			}}
		>
			<ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
		</PersistQueryClientProvider>
	)
}
