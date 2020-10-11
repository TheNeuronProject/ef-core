const namespaces = {
	svg: 'http://www.w3.org/2000/svg',
	math: 'http://www.w3.org/1998/Math/MathML',
	xlink: 'http://www.w3.org/1999/xlink'
}

/**
 * Get declared namespaceURI using it's perfix
 * @param {string} perfix - Perfix for the namespaceURI
 * @returns {string} NamespaceURI defined by the perfix
 */
const getNamespace = (perfix) => {
	if (namespaces[perfix]) return namespaces[perfix]

	throw new Error(`[EF] Namespace "${perfix}" has not been declared.`)
}

/**
 * Declare namespaceURI with a perfix
 * @param {string} perfix - Perfix for the namespaceURI
 * @param {string} namespaceURI - NamespaceURI associated with the perfix
 * @returns {void}
 */
const declareNamespace = (perfix, namespaceURI) => {
	if (namespaces[perfix]) {
		throw new Error(`[EF] Namespace "${perfix}" has already been declared as "${namespaces[perfix]}".`)
	}

	namespaces[perfix] = namespaceURI
}

export {getNamespace, declareNamespace}
