(function(global, factory) {
	typeof exprots === 'object' && typeof module !== 'undefined'
	? module.exports = factory()
	: typeof define === 'function' && denfine.amd ? define(factory) : global.FristVersion = factory();
})(this, function() {
	var inherits = function(subClass, superClass) {
		subClass.prototype = Object.create(superClass.prototype, {
			constructor: {
				value: subClass,
				configurable: true
			}
		});
	}
	
	var possibleConstructorReturn = function(self, parent) {
		return typeof parent === 'function' && parent ? parent : self;
	}
	
	var isEl = function(el) {
		return el && el.nodeType === 1;
	}
	
	var placeholderRegexp = /\s*{{([^{}]+)}}\s*/g;
	// <aaaaaa >
	var nodeNameRegexp = /\s*<([^\s/+={}]+)/;
	
	function FristVersion() {
		this.binding = {};
		this.data = {};
		
		/**
		 * @return {HTML} 返回html片段
		 */
		this.parserHTML = function() {
			return this.render();
		}
	};
	
	
	FristVersion.prototype.observer = function(data) {
		
	}
	
	/**
	 * 渲染组件
	 * @param {String} nodeName: 节点名称
	 * @param {Object} el
	 */
	function render(nodeName, el) {
		if(!isEl(el)) return;
		var name = nodeName.match(nodeNameRegexp);
		var _nodeName = name ? name[1]: nodeName.localName;
		var Component = new FristVersion._components[_nodeName]();
		
		el.innerHTML = Component.parserHTML();
	}
	
	function registerComponent(name, component) {
		if(!FristVersion._components) {
			FristVersion._components = {};
		}
		FristVersion._components[name] = component;
	}
	
	FristVersion.render = render;
	FristVersion.inherits = inherits;
	FristVersion.registerComponent = registerComponent;
	FristVersion.possibleConstructorReturn = possibleConstructorReturn;
	return FristVersion;
});
