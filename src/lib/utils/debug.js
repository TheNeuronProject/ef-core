const getDbg = () => {
	// eslint-disable-next-line no-empty-function
	const emptyFn = () => {}
	if (typeof console === 'undefined') {
		if (typeof print === 'undefined') {
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
		log: console.log && console.log.bind(console, strTpl) || emptyFn,
		info: console.info && console.info.bind(console, strTpl) || emptyFn,
		warn: console.warn && console.warn.bind(console, strTpl) || emptyFn,
		error: console.error && console.error.bind(console, strTpl) || emptyFn
	}
}

const dbg = getDbg()

export default dbg
