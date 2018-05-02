var template = parseEft(
'>div.{{class.text = box test}}' +
'\n	#testattr' +
'\n #emptyattr = {{empty = &}}' +
'\n	#id = id1' +
'\n	.text0' +
'\n	>br' +
'\n	.{{root.text}}' +
'\n	>br' +
'\n	.{{class.text}}' +
'\n	>div#testRef' +
'\n		#style = {{style}}' +
'\n		.text1{{info.node1}}' +
'\n		-branch' +
'\n		>br' +
'\n		.Message: ' +
'\n		>br' +
'\n		.Two way binded 1: ' +
'\n		>input' +
'\n			#type = text' +
'\n			%value = {{class.text}}' +
'\n		>br' +
'\n		.Two way binded 2: ' +
'\n		>input' +
'\n			#type = text' +
'\n			%value = {{class.text2 = 23333}}' +
'\n		>br' +
'\n		.One way binded with particle update:' +
'\n		>input' +
'\n			#type = text' +
'\n			%value = 1: {{class.text}} 2: {{class.text2}}' +
'\n		>br' +
'\n		>input' +
'\n			#type = radio' +
'\n			#name = testradio' +
'\n			%checked = {{testRadio1 = true}}' +
'\n		.checked: {{testRadio1}}' +
'\n		>input' +
'\n			#type = radio' +
'\n			#name = testradio' +
'\n			%checked = {{testRadio2 = false}}' +
'\n		.checked: {{testRadio2}}' +
'\n		>input' +
'\n			#type = checkbox' +
'\n			%checked = {{testCheck = true}}' +
'\n		.checked: {{testCheck}}' +
'\n		>br' +
'\n		.Input style here: ' +
'\n		>br' +
'\n		>textarea' +
'\n			%value = {{style = background-color: #ECECEC}}' +
'\n			@keydown.ctrl.13.27 = key' +
'\n			@keydown.13.32 = space' +
'\n		>br' +
'\n		>br' +
'\n		>input' +
'\n			#type = number' +
'\n			%value = {{numInput = 0}}' +
'\n		. x 3 = ' +
'\n		>input' +
'\n			#type = number' +
'\n			%value = {{numOutput}}' +
'\n		>br' +
'\n		.{{text}}text2' +
'\n	>button' +
'\n		@click = sendMsg:some data' +
'\n		.{{btnText = sendMsg}}' +
'\n	+list')

var template2 = parseEft('  this is a comment' +
'\n  >div.{{class = some class name}}' +
'\n    #style = {{attr.style}}' +
'\n    #id = testdiv' +
'\n  	#some-attr = some text' +
'\n  	#content =' +
'\n  	%title = {{name}}' +
'\n  	%anotherProperty = text' +
'\n  	.Name: {{name}}&nJob: {{job}}' +
'\n  	>br' +
'\n  	-node1' +
'\n  	>p' +
'\n  		#class = some class name' +
'\n  		@click.shift.alt.stop = alertNotice:{{attr.style = color: #666}}' +
'\n  		@mousedown = setState' +
'\n  		@click.capture.stop = capture' +
'\n  		>span' +
'\n  	  	.Notice: {{notice = ]]}}' +
'\n  		. test' +
'\n  		-node2' +
'\n  		+list1')

var data1 = {
	$data: {
			class: 'box test class',
			name: 'Bob',
			job: 'Assist Alice',
			notice: 'Hold shift and alt and then click here. An alert should pop up'
	},
	$methods: {
		alertNotice: function (info) {
			alert(info.state.$data.notice)
		}
	}
}

var module1 = ef.create(template)
var module2 = ef.create(template2)

ef.inform()

var state = new module1()
var state2 = new module1()
var state3 = new (class extends module2 {
	$mount(...args) {
		super.$mount(...args)
		console.log('MMMOUNT!!')
	}
})()
var state4 = new module2(data1)

state3.list1.push(state4)
state2.branch = state3

// state.$data.text = 'box'
// state2.$data.text = 'box'
// state3.$data.text = 'box'
// state4.$data.text = 'box'

// state.$data.root.text = 'component 1'
state2.$data.root.text = 'component 2'
state3.$data.class = 'box'
state3.$data.name = 'Alice'
state3.$data.job = 'Developer'
// state3.$data.notice = 'N/A'
state4.$data.job = 'Assisting Alice'

var data2 = {
	$data: {
		text: 'box',
		root: {
			text: 'On this node that button works.'
		}
	},
	$methods: {
		sendMsg: function (info) {
			console.log('Event triggered:', info.e)
			console.log('Value passed:', info.value)
			alert('The message is \n"' + info.state.$data.class.text + '"!')
		}
	},
	list: [state2]
}

state.$update(data2)

state.$subscribe('numInput', ({state, value}) => {
	console.log('IN', value)
	state.$data.numOutput = parseFloat(value, 10) * 3
})
state.$subscribe('numOutput', ({state, value}) => {
	console.log('OUT', value)
	state.$data.numInput = parseFloat(value, 10) / 3
})

var states = []

state2.$data.style = '100'

state2.$data.btnText = 'Run Test!'

state2.$subscribe('style', function (info) {
	state2.$data.text = 'Click the button below to run a ' + info.value + ' components render test.'
})

state2.$methods.sendMsg = function (info) {
	ef.inform()
	var count = parseInt(info.state.$data.style)
	var startTime = Date.now()
	console.time('Create')
	for (var i = 0; i < count; i++) states.push(new module1())
	state4.list1.push.apply(state4.list1, states)
	// ef.exec()
	console.timeEnd('Create')
	var endTime = Date.now()
	var time = endTime - startTime
	var msg = '' + count + ' components rendered in ' + time + 'ms.'
	info.state.$data.text = msg
	console.log(msg)
	// states = []
	// ef.inform()
	startTime = Date.now()
	console.time('Destroy')
	for (var i = 0; i < states.length; i++) {
		states[i].$destroy()
	}
	ef.exec()
	console.timeEnd('Destroy')
	endTime = Date.now()
	states = []
	time = endTime - startTime
	msg = '' + count + ' components destroied in ' + time + 'ms.'
	console.log(msg)
}

// state4.$methods.sendMsg = function(thisState) { alert('The message is "\n' + thisState.$data.text + '"!') }
state.$mount({target: document.body})
ef.exec()
