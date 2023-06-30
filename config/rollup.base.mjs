import chalk from 'chalk'

// Rollup plugins
import eslint from '@rollup/plugin-eslint'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import progress from 'rollup-plugin-progress'

switch (process.env.BUILD_ENV) {
	case 'DEV': {
		console.log(chalk.cyan('+--------------=+| DEVELOP BUILD |+=--------------+'))
		break
	}
	case 'CI': {
		console.log(chalk.green('+--------------=+| CI BUILD |+=--------------+'))
		break
	}
	default: {
		console.log(chalk.yellow('+--------------=+| NORMAL BUILD |+=--------------+'))
	}
}

const isProduction = process.env.NODE_ENV === 'production'

// Log build environment
console.log('Build Target:', chalk.bold.green(process.env.BUILD_TARGET || 'development'))

export default {
	input: 'src/ef-core.js',
	output: {
		name: 'ef',
		format: 'umd',
		sourcemap: true
	},
	bundle: 'ef-core',
	devPath: 'test',
	proPath: 'dist',
	plugins: [
		progress({
			clearLine: false
		}),
		eslint({
			exclude: ['*.json', '**/*.json']
		}),
		resolve({
			browser: true,
		}),
		commonjs(),
		esbuild({
			target: 'es2015',
			sourceMap: !isProduction,
			minify: isProduction
		}),
		replace({
			preventAssignment: true,
			values: {
				'process.env.NODE_ENV': `'${process.env.BUILD_TARGET || 'development'}'`
			}
		})
	]
}
