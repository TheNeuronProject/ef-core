// Enough for ef's usage, so no need for a full polyfill
const legacyAssign = (ee, ...ers) => {
	for (let er of ers) {
		for (let i in er) {
			ee[i] = er[i]
		}
	}

	return ee
}

const assign = Object.assign || legacyAssign

export {assign, legacyAssign}
