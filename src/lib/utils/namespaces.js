const namespaces = {
	xml: 'http://www.w3.org/XML/1998/namespace',
	html: 'http://www.w3.org/1999/xhtml',
	svg: 'http://www.w3.org/2000/svg',
	math: 'http://www.w3.org/1998/Math/MathML',
	xlink: 'http://www.w3.org/1999/xlink'
}

/**
 * Get declared namespaceURI using it's prefix
 * @param {string} prefix - Perfix for the namespaceURI
 * @returns {string} NamespaceURI defined by the prefix
 */
const getNamespace = (prefix) => {
	if (namespaces[prefix]) return namespaces[prefix]

	throw new Error(`[EF] Namespace "${prefix}" has not been declared.`)
}

/**
 * Declare namespaceURI with a prefix
 * @param {string} prefix - Perfix for the namespaceURI
 * @param {string} namespaceURI - NamespaceURI associated with the prefix
 * @returns {void}
 */
const declareNamespace = (prefix, namespaceURI) => {
	if (namespaces[prefix]) {
		throw new Error(`[EF] Namespace "${prefix}" has already been declared as "${namespaces[prefix]}".`)
	}

	namespaces[prefix] = namespaceURI
}

export {getNamespace, declareNamespace}
