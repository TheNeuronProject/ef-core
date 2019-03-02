// Wrap console functions for `[EF]` perfix
const strTpl = '[EF] %s'
const dbg = {
	log: console.log.bind(console, strTpl),
	info: console.info.bind(console, strTpl),
	warn: console.warn.bind(console, strTpl),
	error: console.error.bind(console, strTpl)
}

export default dbg
