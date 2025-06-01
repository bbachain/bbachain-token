'use client'

import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'
import React, { ReactNode, useState } from 'react'

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(new QueryClient())

	return (
		<QueryClientProvider client={client}>
			<ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
		</QueryClientProvider>
	)
}
