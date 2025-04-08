import { useState, useEffect } from 'react'

export const useIsMobile = () => {
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const updateIsMobile = () => {
			if (typeof window !== 'undefined') {
				const isMobileQuery = window.matchMedia('(max-width: 500px)')
				setIsMobile(isMobileQuery.matches)
			}
		}

		updateIsMobile()
		window.addEventListener('resize', updateIsMobile)

		return () => window.removeEventListener('resize', updateIsMobile)
	}, [])

	return isMobile
}
