import initBinding from './binding.js'
import {inform, exec} from './render-queue.js'
import {resolvePath} from './resolver.js'
import ARR from './utils/array-helper.js'
import {DOM, EFFragment} from './utils/dom-helper.js'
import dbg from './utils/debug.js'
import getEvent from './utils/event-helper.js'
import {getNamespace} from './utils/namespaces.js'
import {hasColon, splitByColon} from './utils/string-ops.js'

const typeValid = obj => ['number', 'boolean', 'string'].indexOf(typeof obj) > -1

// eslint-disable-next-line max-params
const createByTag = (tagType, tagName, tagContent, attrs, namespace) => {
	switch (tagType) {
		case 'string': {
			if (tagName === tagContent && attrs && attrs.is && typeof attrs.is === 'string') {
				const { is } = attrs
				if (namespace) return DOM.document.createElementNS(namespace, tagContent, {is})
				return DOM.document.createElement(tagContent, {is})
			}

			// Namespaced
			if (namespace) return DOM.document.createElementNS(namespace, tagContent)
			// Then basic HTMLElements
			return DOM.document.createElement(tagContent)
		}
		case 'function': {
			// Then custom component or class based custom component
			return new tagContent()
		}
		default: {
			// Then overriden basic element
			if (tagContent.tag) tagName = tagContent.tag

			if (tagContent.is) {
				const { is } = tagContent
				if (namespace) return DOM.document.createElementNS(namespace, tagName, {is})
				return DOM.document.createElement(tagName, {is})
			}

			if (namespace) return DOM.document.createElementNS(namespace, tagName)
			return DOM.document.createElement(tagName)
		}
	}
}

// eslint-disable-next-line max-params
const getElement = (tagType, tagName, tagContent, attrs, ref, refs, namespace) => {
	const element = createByTag(tagType, tagName, tagContent, attrs, namespace)
	if (ref) Object.defineProperty(refs, ref, {
		value: element,
		enumerable: true
	})
	return element
}

const getVal = (dataNode, key) => {
	const data = dataNode[key]
	if (typeof data === 'undefined') return ''
	return data
}

const regTmpl = (ctx, val, handler) => {
	if (ARR.isArray(val)) {
		const [strs, ...exprs] = val

		if (!strs) {
			const {dataNode, handlerNode, _key} = initBinding(ctx, {bind: exprs[0]})
			const _handler = () => handler(getVal(dataNode, _key))
			handlerNode.push(_handler)

			return _handler
		}

		const tmpl = new Array(strs.length + exprs.length)
		const evalList = []

		for (let i in strs) {
			tmpl[i * 2] = strs[i]
		}

		const _handler = () => {
			for (let i of evalList) i()
			return handler(''.concat(...tmpl))
		}

		evalList.push(...exprs.map((item, index) => {
			const {dataNode, handlerNode, _key} = initBinding(ctx, {bind: item})
			handlerNode.push(_handler)

			index = index * 2 + 1

			return () => {
				tmpl[index] = getVal(dataNode, _key)
			}
		}))

		return _handler
	}
	return () => val
}

// eslint-disable-next-line max-params
const applyEventListener = (element, custom, handler, {l, s, i, p, h, a, c, t, u, e, o, k}) => {

	/*
	 *  l: listener                 : string
	 *  s: stopPropagation          : number/undefined
	 *  i: stopImmediatePropagation : number/undefined
	 *  p: preventDefault           : number/undefined
	 *  h: shiftKey                 : number/undefined
	 *  a: altKey                   : number/undefined
	 *  c: ctrlKey                  : number/undefined
	 *  t: metaKey                  : number/undefined
	 *  u: capture                  : number/undefined
	 *  e: passive                  : number/undefined
	 *  o: once                     : number/undefined
	 *  k: keyCodes                 : array<number>/undefined
	 */

	const checkEventProps = (event) => {
		if (!!h !== !!event.shiftKey ||
			!!a !== !!event.altKey ||
			!!c !== !!event.ctrlKey ||
			!!t !== !!event.metaKey ||
			(k && k.indexOf(event.which) === -1)) return false
		return true
	}

	const handleStopOptions = (event) => {
		if (s) event.stopPropagation()
		if (i) event.stopImmediatePropagation()
	}

	let eventOptions = {
		capture: !!u
	}

	let baseEventHandler = (event) => {
		handleStopOptions(event)
		if (p && !e) event.preventDefault()
		handler(event)
	}

	let eventHandler = (event) => {
		if (!checkEventProps(event)) return
		baseEventHandler(event)
	}

	if (e || o) {
		const makePassiveEventHandler = () => {
			baseEventHandler = (event) => {
				handleStopOptions(event)
				setTimeout(() => handler(event), 0)
			}
			eventHandler = (event) => {
				if (!checkEventProps(event)) return
				baseEventHandler(event)
			}
		}

		const makeOnceEventHandler = () => {
			const removeListener = custom && '$off' || 'removeEventListener'
			eventHandler = (event) => {
				if (!checkEventProps(event)) return
				element[removeListener](l, eventHandler, eventOptions)
				baseEventHandler(event)
			}
		}

		if (DOM.passiveSupported || DOM.onceSupported) {
			if (e === 0 && DOM.passiveSupported) {
				eventOptions.passive = false
			} else if (e) {
				if (DOM.passiveSupported) eventOptions.passive = true
				else makePassiveEventHandler()
			}

			if (o) {
				if (DOM.onceSupported) eventOptions.once = true
				else makeOnceEventHandler()
			}

		} else {
			if (e) makePassiveEventHandler()
			if (o) makeOnceEventHandler()
		}
	}

	const addListener = custom && '$on' || 'addEventListener'
	element[addListener](l, eventHandler, eventOptions)
}

// eslint-disable-next-line max-params
const addValListener = (ctx, trigger, updateLock, element, lastNode, key, expr, custom) => {
	const addListener = custom && '$on' || 'addEventListener'
	const {parentNode, _key} = initBinding(ctx, {bind: expr})

	const handler = () => {
		updateLock.locked = true
		inform()
		parentNode[_key] = lastNode[key]
		exec()
		updateLock.locked = false
	}

	const eventOptions = {
		capture: true
	}

	if (trigger) {
		applyEventListener(element, custom, handler, trigger)
	} else if (key === 'value') {
		// Listen to input, keyup and change events in order to work in most browsers.
		element[addListener]('input', handler, eventOptions)
		element[addListener]('keyup', handler, eventOptions)
		element[addListener]('change', handler, eventOptions)
	} else {
		const dispatch = custom && '$dispatch' || 'dispatchEvent'
		element[addListener]('change', () => {
			// Trigger change to the element it-self
			element[dispatch](getEvent('__ef_change_event__'), {bubbles: false, cancelable: false})
			if (element.tagName === 'INPUT' && element.type === 'radio' && element.name !== '') {
				// Trigger change to the the same named radios
				const radios = DOM.document.querySelectorAll(`input[name=${element.name}][type=radio]`)
				if (radios) {
					const selected = ARR.copy(radios)
					ARR.remove(selected, element)

					/* Event triggering could cause unwanted render triggers
					 * no better ways came up at the moment
					 */
					for (let i of selected) i.dispatchEvent(getEvent('__ef_change_event__'))
				}
			}
		}, eventOptions)
		// Use custom event to avoid loops and conflicts
		element[addListener]('__ef_change_event__', handler)
	}
}

const getAttrHandler = (ctx, {element, key, custom}) => {
	// Pass directly to custom component
	if (custom) return (val) => {
		element[key] = val
	}

	// Beautify class name
	if (key === 'class') return (val) => {
		val = `${val}`.replace(/\s+/g, ' ').trim()
		// Remove attribute when value is empty
		if (!val) return element.removeAttribute(key)
		element.setAttribute(key, val)
	}

	// Handle namespace
	if (hasColon(key)) {
		const [prefix] = splitByColon(key)
		const namespace = ctx.localNamespaces[prefix] || getNamespace(prefix)
		return (val) => {
			// Remove attribute when value is empty
			if (val === '') return element.removeAttributeNS(namespace, key)
			element.setAttributeNS(namespace, key, val)
		}
	}

	return (val) => {
		// Remove attribute when value is empty
		if (val === '') return element.removeAttribute(key)
		element.setAttribute(key, val)
	}
}

// eslint-disable-next-line max-params
const addAttr = (ctx, element, attr, key, custom) => {
	if (typeValid(attr)) {
		if (custom) {
			if (attr === '') {
				element[key] = true
			} else {
				element[key] = attr
			}

			return
		}
		// Do not set or update `is` again
		if (key === 'is') return
		// Handle namespaces
		if (hasColon(key)) {
			const [prefix] = splitByColon(key)
			if (prefix !== 'xmlns') {
				const ns = ctx.localNamespaces[prefix] || getNamespace(prefix)
				return element.setAttributeNS(ns, key, attr)
			}
		}
		return element.setAttribute(key, attr)
	}

	const handler = getAttrHandler(ctx, {element, key, custom})
	regTmpl(ctx, attr, handler)
}

// eslint-disable-next-line max-params
const addProp = (ctx, element, value, propPath, trigger, updateOnly, custom) => {
	const keyPath = ARR.copy(propPath)
	const lastKey = keyPath.pop()
	if (custom) keyPath.unshift('$data')
	const lastNode = resolvePath(keyPath, element)
	if (typeValid(value)) lastNode[lastKey] = value
	else {
		const updateLock = {locked: false}
		let handler = null

		if (updateOnly) {
			handler = () => {
				updateLock.locked = false
			}
		} else {
			handler = (val) => {
				if (!updateLock.locked && lastNode[lastKey] !== val) {
					lastNode[lastKey] = val
				}
				updateLock.locked = false
			}
		}

		regTmpl(ctx, value, handler)
		if (
			trigger ||
			(propPath.length === 1 && (lastKey === 'value' || lastKey === 'checked')) &&
			!value[0]
		) {
			addValListener(ctx, trigger, updateLock, element, lastNode, lastKey, value[1], custom)
		}
	}
}

const rawHandler = val => val

// eslint-disable-next-line max-params
const addEvent = (ctx, element, trigger, custom) => {

	/*
	 *  m: method                   : string
	 *  v: value                    : string/array/undefined
	 */
	const {m, v} = trigger
	const _handler = regTmpl(ctx, v, rawHandler)

	const callEventHandler = (event) => {
		const value = _handler()
		if (ctx.methods[m]) ctx.methods[m]({e: event, event, value, state: ctx.state})
		else {
			if (process.env.NODE_ENV !== 'production') dbg.warn(`Bubbling up event '${m}'...`)
			event.data = value
			ctx.state.$emit(m, event)
		}
	}

	applyEventListener(element, custom, callEventHandler, trigger)
}

// eslint-disable-next-line max-params
const createElement = (ctx, info, namespace, fragment, custom) => {
	if (fragment) return [new EFFragment(), 'fragment']

	/*
	 *  t: tag           : class | string | int, 0 means fragment
	 *  a: attr          : object
	 *  p: prop          : object
	 *  e: event trigger : array
	 *  r: reference     : string
	 */
	const {t, a, p, e, r} = info
	const tagName = t
	const tagContent = ctx.scope[t] || t
	const tagType = typeof tagContent
	const element = getElement(tagType, tagName, tagContent, a, r, ctx.refs, namespace)
	if (a) for (let key in a) addAttr(ctx, element, a[key], key, custom)
	if (p) for (let [propPath, value, trigger, updateOnly] of p) addProp(ctx, element, value, propPath, trigger, updateOnly, custom)
	if (e) for (let trigger of e) addEvent(ctx, element, trigger, custom)

	return [element, tagType]
}

export {createElement, typeValid}
