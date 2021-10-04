const getDbg = () => {
	if (typeof console === 'undefined') {
		if (typeof print === 'undefined') {
			// eslint-disable-next-line no-empty-function
			const emptyFn = () => {}
			return {
				log: emptyFn,
				info: emptyFn,
				warn: emptyFn,
				error: emptyFn
			}
		}

		const assemblePrintContent = (type, args) => `[EF][${type}] ${args.join(' ')}`

		return {
			log: (...args) => print(assemblePrintContent('LOG ', args)),
			info: (...args) => print(assemblePrintContent('INFO', args)),
			warn: (...args) => print(assemblePrintContent('WARN', args)),
			error: (...args) => print(assemblePrintContent('ERROR', args))
		}
	}

	// Wrap console functions for `[EF]` prefix
	const strTpl = '[EF] %s'
	return {
		log: console.log.bind(console, strTpl),
		info: console.info.bind(console, strTpl),
		warn: console.warn.bind(console, strTpl),
		error: console.error.bind(console, strTpl)
	}
}

const dbg = getDbg()

export default dbg
