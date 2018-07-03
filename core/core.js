(function(global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined'
	? module.exports = factory()
	: typeof define === 'function' && define.amd ? define(factory) : global.Cvtsp = factory();
})(this, function() {

	var create = Object.create || function(superClass) {
		function O() {};
		O.prototype = superClass.prototype;
		return new O();
	}

	// 类（class）继承 原形链的继承
	// subClass 子类
	// superClass 父类
	var inherits = function(subClass, superClass) {
		subClass.prototype = create(superClass.prototype);
		subClass.prototype.constructor = subClass;
	}

	var possibleConstructorReturn = function(self, parent) {
		return parent && typeof parent === 'function' ? parent : self;
	}
	
	// dom操作的基础方法
	function isTextNode(el) {
		return el && el.nodeType === 3;
	} 

	function findChilds(el, callback) {
		var childs = el.children;
		
		for(var i = 0, child; child = childs[i++];) {
			callback(child);
			findChilds(child, callback);
		}
	}

	function getAttributes(el) {
		var obj = {};
		var attrs = el.attributes;

		for(var i = 0, attr; attr = attrs[i++];) {
			var name = attr.name;
			var value = attr.value;
			obj[name] = value;
		}

		return obj;
	}

	var componentRegexp = /\s*<([^\s]+)/;
	var isEventRegexp = /\s*@/;
	var isPropertyRegexp = /\s*:/;
	var isExistRegexp = /[^{}]*({{([^{}]+)}})[^{}]*/g;
	var getTextInRegexp = /[^{}]*{{([^{}]+)}}/;
	var zimuRegexp = /\s*([\w]+)\s*/g;

	/**
	 * 2. 监听类
	 * 元素的属性赋值,  Component属性赋值
	 * @param {Element| Component} el
	 * @param {Constructor} context: 上下文环境
	 * @param {String}: 属性
	 * @param {String}: 表达式
	 * el[attr] = exp;
	 */
	function Watcher(el, context, attr, exp) {
		this.el = el;
		this.context = context;
		this.attr = attr;
		this.exp = exp;

		this.update();
	}

	Watcher.prototype.update = function() {
		var keys = Object.keys(this.context.data);
		var values = keys.map(function(key) {
			return this.context.data[key];
		}.bind(this))

		var func = Function.apply(this, keys.concat('return ' + this.exp));
		var result = func.apply(this, values);

		this.el[this.attr] = result;
	}

	/**
	 * 
	 * @param {Stirng} str: 'divj,html,body,h1 h2 b ' // 100
	 * @param {Boolean} exp:true 大小
	 * @return {Function}
	 */
	function makeMap(str, exp) {
		var obj = {};
		var lists = str.split(',');   //[div, html]

		for(var i = 0, list; list = lists[i++];) {
			obj[list] = true;
		}
		return exp
		? function(val) {return obj[val.toLowerCase()]}
		: function(val) { return obj[val]}
	}

	var isHtmlTag = makeMap('div,html,body,h1,h2,b,a,header,button', true);

	// 1. 核心类
	function Cvtsp() {
		this.parent = null;
		this.children = [];
		this.data = {};
		// 存储属性监听的队列
		this._binding = {};
	}

	Cvtsp.prototype.init = function() {
		var timer = setTimeout(_ => {
			clearTimeout(timer);
			timer = null;
			Object.getOwnPropertyNames(this).forEach(function(key) {
				if(this.parent.props[key]) {
					this.parent.props[key] = this[key];
				}
			}.bind(this))
	
			Object.assign(this.data, this.parent.props);
			
			// 1. 数据双向绑定
			this.observer(this.data);

			// 2. 模版解析
			this.parserHTML();
		})
	}

	Cvtsp.prototype.observer = function(data) {
		Object.keys(data).forEach(function(key) {
			var value = data[key];

			// important init
			this._binding[key] = {
				watcher: []    //[Watcher, Watcher, Watcher, ...] 放所有操作了当前属性{key}的关联 dom操作,属性赋值
			};
			var _binding = this._binding[key];
			Object.defineProperty(data, key, {
				configurable: true,
				get: function() {
					return value;
				},
				set: function(newVal) {
					if(value === newVal) return;
					// 当前值覆盖旧值
					value = newVal;
					// 数据发生变化了
					_binding.watcher.forEach(function(watch) {
						watch.update(); // dom内容实时更新
					})
				}
			})
		}.bind(this))
	}

	Cvtsp.prototype.parserHTML = function() {
		var _this = this;
		var template = this.template();
		this.parent.innerHTML = template;

		// 获取每个dom ==> 获取dom上的属性
		// 1. 获取所有的子节点
		findChilds(this.parent, function(child) {
			var attrs = getAttributes(child);
			
			// 2. 区分标准html元素 还是组件元素
			parserHtmlNode(child, attrs);

			// 我们只要text节点
			parserTextNode(child);
			
		});

		function parserHtmlNode(child, attrs) {
			if(isHtmlTag(child.tagName)) {
				// 3. 区分key是否为事件还是属性
				Object.keys(attrs).forEach(function(attr) {
					// 是否为事件类型
					if(isEventRegexp.test(attr)) {
						//console.log(attr) @click  attrs[attr] child
						child.addEventListener(attr.replace(isEventRegexp, ''), function(event) {
							var event = event || window.event;
							var eventName = attrs[attr];
							
							_this[eventName] && _this[eventName].call(_this, event); 
						}, false);
					}
				})
			}else {
				parserComponentNode(child, attrs);
			}
		}

		function parserComponentNode(child, attrs) {
			var component = render(child, child);

			Object.keys(attrs).forEach(function(attr) {
				var exp = attrs[attr];
				// 动态属性
				if(isPropertyRegexp.test(attr)) {
					var everyKeyLists = exp.match(zimuRegexp);
					everyKeyLists.forEach(function(key) {
						_this._binding[key].watcher.push(new Watcher(
							component,
							_this,
							attr.replace(isPropertyRegexp, ''),
							exp
						))
					})
				}
			})
		}

		function parserTextNode(child) {
			var childNodes = child.childNodes;
			for(var i = 0,child; child = childNodes[i++];) {
				if(isTextNode(child)) {
					var turnText = child.textContent;
					var placeholders = turnText.match(isExistRegexp);  //所有的花括号分割

					if(placeholders && placeholders.length) {
						placeholders.forEach(function(p) {
							// 1. 获取花括号中的所有表达式
							var exp = p.match(getTextInRegexp)[1];
							
							// 2. 获取表达式中每个key值
							var everyKeyLists = exp.match(zimuRegexp);
							everyKeyLists.forEach(function(key) {
								//el, context, attr, exp
								_this._binding[key].watcher.push(new Watcher(
									child,
									_this,
									'textContent',  
									exp
								));
							})
						})
					}
				}
			}

		}
	}	


	/**
	 * 渲染节点
	 * @param {String|Element} nodeName 
	 * @param {Element} el 
	 * @return {Component}
	 */
	function render(nodeName, el) {
		// 1. 获取nodeName名字
		var name = typeof nodeName === 'string' ? nodeName.match(componentRegexp)[1] : nodeName.tagName; // app
		var Component = Cvtsp._components[name.toLowerCase()];
		el.props = Component.defaultProps || {};

		return Component && new Component(el);
	}

	/**
	 * 注册全局组件
	 * @param {String} name: 组件的名称
	 * @param {Function} component: 构造函数
	 */
	function registerComponent(name, component) {
		if(!Cvtsp._components) {
			Cvtsp._components = {};
		}
		Cvtsp._components[name.toLowerCase()] = component;
	}

	Cvtsp.render = render;
	Cvtsp.inherits = inherits;
	Cvtsp.registerComponent = registerComponent;
	Cvtsp.possibleConstructorReturn = possibleConstructorReturn;

	return Cvtsp;
});