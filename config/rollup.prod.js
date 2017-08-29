import chalk from 'chalk'
// Import base config
import base from './rollup.base'

// Log build environment
console.log('Build Target:', chalk.bold.green(process.env.BUILD_TARGET || 'development'))

if (process.env.BUILD_TARGET === 'production') base.output.file = `${base.proPath}/${base.bundle}.min.js`
else base.output.file = `${base.proPath}/${base.bundle}.dev.js`

base.output.sourcemap = process.env.BUILD_ENV === 'DEMO' || process.env.BUILD_ENV === 'CI' ? base.output.sourcemap : false

export default base
