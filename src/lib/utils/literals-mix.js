const mixStr = (strs, ...exprs) => {
	let string = ''
	for (let i = 0; i < exprs.length; i++) {
		if (typeof exprs[i] === 'undefined') string += strs[i]
		else string += (strs[i] + exprs[i])
	}
	return string + strs[strs.length - 1]
}

const getVal = ({dataNode, _key}) => {
	const data = dataNode[_key]
	if (typeof data === 'undefined') return ''
	return data
}

const mixVal = (strs, ...exprs) => {
	if (!strs) return getVal(exprs[0])
	const template = [strs]
	template.push(...exprs.map(getVal))
	return mixStr(...template)
}

export {mixStr, mixVal}
