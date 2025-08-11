// This component's created for showing up the image on first rendered

import Image, { ImageProps } from 'next/image'

import { cn } from '@/lib/utils'

interface ThemeImageProps extends Omit<ImageProps, 'src'> {
	lightSrc: string
	darkSrc: string
}

const ThemeImage: React.FC<ThemeImageProps> = ({ lightSrc, darkSrc, alt, className, ...props }) => {
	return (
		<>
			<Image className={cn('hidden dark:block', className)} src={darkSrc} alt={`${alt} dark image`} {...props} />
			<Image className={cn('block dark:hidden', className)} src={lightSrc} alt={`${alt} light image`} {...props} />
		</>
	)
}

export default ThemeImage
