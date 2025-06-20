const REGEX = {
	POSITIVE_NUMBER: /^\d+$/,
	ZERO_TO_TWELVE_RANGE: /^(0|[1-9]|1[0-2])$/,
	ZERO_POINT_ZERO_FIVE_TO_FIFTY_RANGE: /^(?:0\.(?:0[5-9]|[1-9]\d?)|[1-9](?:\.\d+)?|[1-4]\d(?:\.\d+)?|50(?:\.0+)?)$/
} as const

export default REGEX
