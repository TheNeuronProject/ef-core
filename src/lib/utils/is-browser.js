import dbg from './debug.js'

const isBrowser = typeof document !== 'undefined' && typeof Node !== 'undefined'

if (process.env.NODE_ENV !== 'production') {
	if (isBrowser) dbg.info('Running in browser mode.')
	else dbg.info('Running in non-browser mode, please be sure to set a DOM simulation using `setDOMSimulation`.')
}

export default isBrowser
