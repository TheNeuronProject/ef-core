import initBinding from './binding.js'
import {queue, inform, exec} from './render-queue.js'
import {resolvePath} from './resolver.js'
import ARR from './utils/array-helper.js'
import {DOM, EFFragment} from './utils/dom-helper.js'
import getEvent from './utils/event-helper.js'
import {mixVal} from './utils/literals-mix.js'
import {getNamespace} from './utils/namespaces.js'
import dbg from './utils/debug.js'

const typeValid = obj => ['number', 'boolean', 'string'].indexOf(typeof obj) > -1

const createByTag = ({tagName, tagContent, attrs, namespace}) => {
	const tagType = typeof tagContent

	switch (tagType) {
		case 'string': {
			const creationOption = {}
			if (tagName === tagContent && attrs && attrs.is && typeof attrs.is === 'string') creationOption.is = attrs.is
			// if (tagContent.indexOf(':') > -1) [, tagContent] = tagContent.split(':')
			// Namespaced
			if (namespace) return DOM.document.createElementNS(namespace, tagContent, creationOption)
			// Then basic HTMLElements
			return DOM.document.createElement(tagContent, creationOption)
		}
		case 'function': {
			// Then custom component or class based custom component
			return new tagContent()
		}
		default: {
			// Then overriden basic element
			if (tagContent.tag) tagName = tagContent.tag
			// if (tagName.indexOf(':') > -1) [, tagName] = tagName.split(':')
			if (namespace) {
				return DOM.document.createElementNS(namespace, tagName, {is: tagContent.is})
			}

			return DOM.document.createElement(tagName, {is: tagContent.is})
		}
	}
}

const getElement = ({tagName, tagContent, attrs, ref, refs, namespace}) => {
	const element = createByTag({tagName, tagContent, attrs, namespace})
	if (ref) Object.defineProperty(refs, ref, {
		value: element,
		enumerable: true
	})
	return element
}

const regTmpl = ({val, ctx, handlers, subscribers, innerData, handler}) => {
	if (ARR.isArray(val)) {
		const [strs, ...exprs] = val
		const tmpl = [strs]

		const _handler = () => handler(mixVal(...tmpl))

		tmpl.push(...exprs.map((item) => {
			const {dataNode, handlerNode, _key} = initBinding({bind: item, ctx, handlers, subscribers, innerData})
			handlerNode.push(_handler)
			return {dataNode, _key}
		}))

		return _handler
	}
	return () => val
}

const addValListener = ({ctx, syncTrigger, handlers, subscribers, innerData, element, lastNode, key, expr, custom}) => {
	const addListener = custom && '$on' || 'addEventListener'
	const {parentNode, _key} = initBinding({bind: expr, ctx, handlers, subscribers, innerData})

	const _update = () => {
		inform()
		if (custom) parentNode[_key] = lastNode[key]
		else parentNode[_key] = lastNode[key]
		exec()
	}

	if (syncTrigger) {

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
		 *  k: keyCodes                 : array<number>/undefined
		 */
		const {l, s, i, p, h, a, c, t, u, k} = syncTrigger
		element[addListener](l, (e) => {
			if (!!h !== !!e.shiftKey ||
				!!a !== !!e.altKey ||
				!!c !== !!e.ctrlKey ||
				!!t !== !!e.metaKey ||
				(k && k.indexOf(e.which) === -1)) return
			if (s) e.stopPropagation()
			if (i) e.stopImmediatePropagation()
			if (p) e.preventDefault()
			_update()
		}, !!u)
	} else if (key === 'value') {
		// Listen to input, keyup and change events in order to work in most browsers.
		element[addListener]('input', _update, true)
		element[addListener]('keyup', _update, true)
		element[addListener]('change', _update, true)
	} else {
		const dispatch = custom && '$dispatch' || 'dispatchEvent'
		element[addListener]('change', () => {
			// Trigger change to the element it-self
			element[dispatch](getEvent('--ef-change-event--'), {bubbles: true, canceoable: false})
			if (element.tagName === 'INPUT' && element.type === 'radio' && element.name !== '') {
				// Trigger change to the the same named radios
				const radios = DOM.document.querySelectorAll(`input[name=${element.name}][type=radio]`)
				if (radios) {
					const selected = ARR.copy(radios)
					ARR.remove(selected, element)

					/* Event triggering could cause unwanted render triggers
					 * no better ways came up at the moment
					 */
					for (let i of selected) i.dispatchEvent(getEvent('--ef-change-event--'))
				}
			}
		}, true)
		// Use custom event to avoid loops and conflicts
		element[addListener]('--ef-change-event--', _update)
	}
}

const getAttrHandler = ({element, key, custom, ctx}) => {
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
	if (key.indexOf(':') > -1) {
		const [prefix] = key.split(':')
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

const addAttr = ({element, attr, key, ctx, handlers, subscribers, innerData, custom}) => {
	if (typeValid(attr)) {
		if (custom) {
			if (attr === '') element[key] = true
			else element[key] = attr
			return
		}
		// Do not set or update `is` again
		if (key === 'is') return
		// Handle namespaces
		if (key.indexOf(':') > -1) {
			const [prefix] = key.split(':')
			if (prefix !== 'xmlns') return element.setAttributeNS(ctx.localNamespaces[prefix] || getNamespace(prefix), key, attr)
		}
		return element.setAttribute(key, attr)
	}

	const handler = getAttrHandler({element, key, custom, ctx})
	queue([regTmpl({val: attr, ctx, handlers, subscribers, innerData, handler})])
}

const addProp = ({element, propPath, value, syncTrigger, updateOnly, ctx, handlers, subscribers, innerData, custom}) => {
	const keyPath = ARR.copy(propPath)
	const lastKey = keyPath.pop()
	if (custom) keyPath.unshift('$data')
	const lastNode = resolvePath(keyPath, element)
	if (typeValid(value)) lastNode[lastKey] = value
	else {
		let handler = (val) => {
			if (lastNode[lastKey] !== val) lastNode[lastKey] = val
		}
		// eslint-disable-next-line no-empty-function
		if (updateOnly) handler = () => {}
		const _handler = regTmpl({val: value, ctx, handlers, subscribers, innerData, handler})
		if (syncTrigger ||
			(propPath.length === 1 && (lastKey === 'value' || lastKey === 'checked')) &&
			!value[0]) addValListener({ctx, syncTrigger, handlers, subscribers, innerData, element, lastNode, key: lastKey, expr: value[1], custom})
		queue([_handler])
	}
}

const rawHandler = val => val

const addEvent = ({element, event, ctx, handlers, subscribers, innerData, custom}) => {
	const addListener = custom && '$on' || 'addEventListener'

	/*
	 *  l: listener                 : string
	 *  m: method                   : string
	 *  s: stopPropagation          : number/undefined
	 *  i: stopImmediatePropagation : number/undefined
	 *  p: preventDefault           : number/undefined
	 *  h: shiftKey                 : number/undefined
	 *  a: altKey                   : number/undefined
	 *  c: ctrlKey                  : number/undefined
	 *  t: metaKey                  : number/undefined
	 *  u: capture                  : number/undefined
	 *  k: keyCodes                 : array<number>/undefined
	 *  v: value                    : string/array/undefined
	 */
	const {l, m, s, i, p, h, a, c, t, u, k, v} = event
	const _handler = regTmpl({val: v, ctx, handlers, subscribers, innerData, handler: rawHandler})

	element[addListener](l, (e) => {
		if (!!h !== !!e.shiftKey ||
			!!a !== !!e.altKey ||
			!!c !== !!e.ctrlKey ||
			!!t !== !!e.metaKey ||
			(k && k.indexOf(e.which) === -1)) return
		if (s) e.stopPropagation()
		if (i) e.stopImmediatePropagation()
		if (p) e.preventDefault()
		if (ctx.methods[m]) ctx.methods[m]({e, value: _handler(), state: ctx.state})
		else if (process.env.NODE_ENV !== 'production') dbg.warn(`Method named '${m}' not found! Value been passed is:`, _handler())
	}, !!u)
}

const createElement = ({info, ctx, innerData, refs, handlers, subscribers, namespace, fragment, custom}) => {
	if (fragment) return new EFFragment()

	/*
	 *  t: tag       : class | string | int, 0 means fragment
	 *  a: attr      : object
	 *  p: prop      : object
	 *  e: event     : array
	 *  r: reference : string
	 */
	const {t, a, p, e, r} = info
	const tagName = t
	const tagContent = ctx.scope[t] || t
	const element = getElement({tagName, tagContent, attrs: a, ref: r, refs, namespace})
	if (a) for (let key in a) addAttr({element, custom, attr: a[key], key, ctx, handlers, subscribers, innerData})
	if (p) for (let [propPath, value, syncTrigger, updateOnly] of p) addProp({element, custom, value, propPath, syncTrigger, updateOnly, ctx, handlers, subscribers, innerData})
	if (e) for (let event of e) addEvent({element, custom, event, ctx, handlers, subscribers, innerData})

	return element
}

export {createElement, typeValid}
