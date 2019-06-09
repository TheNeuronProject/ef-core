const createElement = (tag, attrs, ...children) => {
	return [
		{
			t: tag,
			a: attrs
		},
		...children
	]
}

export default createElement