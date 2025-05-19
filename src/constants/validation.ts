const INVALID_VALIDATION_MESSAGE = {
	IMAGE_SIZE: 'Image size must be less than 5MB',
	FILE_TYPE: 'Only .jpg, .jpeg, and .png files are accepted',
	FORMAT_NUMBER: 'Only non-negative whole numbers are allowed (no commas or decimals).',
	DECIMALS_RANGE: 'Decimals must be a number between 0 and 12',
	METADATA_URI: 'Invalid metadata url',
} as const

const VALIDATION_MESSAGE = {
	REQUIRED: 'This field is required',
	INVALID: INVALID_VALIDATION_MESSAGE
} as const

export default VALIDATION_MESSAGE
