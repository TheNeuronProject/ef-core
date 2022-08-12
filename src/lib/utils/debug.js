import noop from './noop.js'

const getDbg = () => {
	if (typeof console === 'undefined') {
		if (typeof print === 'undefined') {
			return {
				log: noop,
				info: noop,
				warn: noop,
				error: noop
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
		log: console.log && console.log.bind(console, strTpl) || noop,
		info: console.info && console.info.bind(console, strTpl) || noop,
		warn: console.warn && console.warn.bind(console, strTpl) || noop,
		error: console.error && console.error.bind(console, strTpl) || noop
	}
}

const dbg = getDbg()

export default dbg
