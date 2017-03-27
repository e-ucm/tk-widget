'use strict';

const d3 = require('d3');

var tk = { version: "0.1.0" };

var tk_vis_fn,
		tk_vis_internal_fn;

function Vis(config) {
	var $$ = this.internal = new VisInternal(this);
	$$.loadConfig(config);
	$$.init();
}

tk.generate = function (config) {
	return new Vis(config);
}

function VisInternal(api) {
	var $$ = this;
	$$.api = api;
	$$.config = $$.getDefaultConfig();


}

tk.vis = {
	fn: Vis.prototype,
	internal: {
		fn: VisInternal.prototype,
	}
};
tk_vis_fn = tk.vis.fn;
tk_vis_internal_fn = tk.vis.internal.fn;

tk_vis_internal_fn.init = function () {
	var $$ = this, config = $$.config;
	$$.initParams();
	if (config.data) {
		$$.initWithData(config.data);
	}
	else if (config.data_json) {
		$$.initWithData(JSON.parse(config.data_json));
	}
	else {
		throw Error('json data is required.');
	}
};

tk_vis_internal_fn.initParams = function () {
	var $$ = this, config = $$.config;

	// MEMO: clipId needs to be unique because it conflicts when multiple charts exist
	$$.visId = "tk-" + (+new Date()) + '-vis';
	$$.visIdForCompeting = $$.visId + '-competing';
	$$.visIdForCollaborating = $$.visId + '-collaborating';
	$$.visIdForCompromising = $$.visId + '-compromising';
	$$.visIdForAvoiding = $$.visId + '-avoiding';
	$$.visIdForAccomodating = $$.visId + '-accomodating';


	$$.currentWidth = undefined;
	$$.currentHeight = undefined;
	$$.width = undefined;
	$$.height = undefined;
	$$.box_size = {
		width : undefined,
		height : undefined
	}
	
	$$.boxes = {
		competing:{
			row: 0,
			col: 0,
			id: $$.visIdForCompeting,
			text: 'b',
			activated: false,
		},
		collaborating: {
			row: 0,
			col: 1,
			id: $$.visIdForCollaborating,
			text: 'e',
			activated: false,
		},
		avoiding:{
			row: 1,
			col: 0,
			id: $$.visIdForAvoiding,
			text: 'a',
			activated: false,
		},
		accomodating:{
			row: 1,
			col: 1,
			id: $$.visIdForAccomodating,
			text: 'c',
			activated: false,
		},
		compromising:{
			row: .5,
			col: .5,
			id: $$.visIdForCompromising,
			text: 'd',
			activated: false,
		},
	};
};

tk_vis_internal_fn.initWithData = function (data) {
	var $$ = this, config = $$.config;
	var defs, main, prop, binding = true;

	$$.data = data;
	$$.initBoxes(data);
	
	if (!config.bindto) {
		$$.selectChart = d3.selectAll([]);
	}
	else if (typeof config.bindto.node === 'function') {
		$$.selectChart = config.bindto;
	}
	else {
		$$.selectChart = d3.select(config.bindto);
	}
	if ($$.selectChart.empty()) {
		$$.selectChart = d3.select(document.createElement('div')).style('opacity', 0);
		binding = false;
	}

	$$.selectChart.html("").classed("tk", true);

	// Init sizes
	$$.updateSizes();

	/*-- Basic Elements --*/

	// Define svgs
	$$.svg = $$.selectChart.append("svg")
		.style("overflow", "hidden");

	if ($$.config.svg_classname) {
		$$.svg.attr('class', $$.config.svg_classname);
	}

	for (prop in $$.boxes) {
		if ($$.boxes.hasOwnProperty(prop)) {
			$$.drawRect($$.boxes[prop]);
		}
	}

	// Draw with targets
	if (binding) {
		$$.updateDimension();
		$$.redraw();
	}
	// export element of the chart
	$$.api.element = $$.selectChart.node();
};


tk_vis_internal_fn.initBoxes = function (data) {
	var $$ = this, prop, val, target, key;
	
	for (var prop in $$.boxes) {
		if ($$.boxes.hasOwnProperty(prop)) {
			val = $$.boxes[prop];
			if(prop in data && data.hasOwnProperty(prop)) {
				['activated', 'text'].forEach(function (key) {
					target = data[prop];
					if (key && target && typeof target === 'object' && key in target) {
						val[key] = target[key];
					}
				});
			}
		}
	}
};

tk_vis_internal_fn.updateDimension = function (withoutAxis) {
	var $$ = this;

	$$.updateSizes();
	$$.updateSvgSize();
};

tk_vis_internal_fn.getDefaultConfig = function () {
	var config = {
		bindto: '#chart',
		svg_classname: undefined,
		size_width: undefined,
		size_height: undefined,
		margin: 10,
		color_fill_deactivated: 'white',
		color_fill_activated: '#aaaaff',
		color_stroke: 'grey',
		data: undefined,
		margin: {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5,
		},
	};

	Object.keys(this.additionalConfig).forEach(function (key) {
		config[key] = this.additionalConfig[key];
	}, this);

	return config;
};

tk_vis_internal_fn.additionalConfig = {};

tk_vis_internal_fn.loadConfig = function (config) {
	var this_config = this.config, target, keys, read;
	function find() {
		var key = keys.shift();
		//console.log("key =>", key, ", target =>", target);
		if (key && target && typeof target === 'object' && key in target) {
			target = target[key];
			return find();
		}
		else if (!key) {
			return target;
		}
		else {
			return undefined;
		}
	}
	Object.keys(this_config).forEach(function (key) {
		target = config;
		keys = key.split('_');
		read = find();
		//console.log("CONFIG : ", key, read);
		if (isDefined(read)) {
			this_config[key] = read;
		}
	});
};

tk_vis_internal_fn.drawRect= function(box) {
	var $$ = this, g, r, t,
			row = box.row,
			col = box.col,
			id = box.id,
			text = box.text,
			m = $$.config.margin,
			left = m.left,
			top = m.top,
			w = $$.box_size.width,
			h = $$.box_size.height,
			fillColor = box.activated ? $$.config.color_fill_activated : $$.config.color_fill_deactivated,
			strokeColor = $$.config.color_stroke;

	g = $$.svg.append('g')
		.attr('id', id)
		.attr("class", CLASS.box);
	r = g.append("rect")
		.attr("x", left+w*col)
		.attr("y", top+h*row)
		.attr("width", w)
		.attr("height", h)
		.style("fill", fillColor)
		.style("stroke", strokeColor);
	t = g.append("text")
		.attr("class", CLASS.text)
		.attr("x", col > .5 ? w*(col+1)-left : left*2+w*col)
		.attr("y", row > .5 ? h*(row+1)-top : top*3+h*row)
		.text(text);
	return r;
}

tk_vis_internal_fn.redraw = function() {
	var $$ = this, prop, g, r, t, col, row, box, fillColor,
		m = $$.config.margin,
		left = m.left,
		top = m.top,
		w = $$.box_size.width,
		h = $$.box_size.height;

	for (var prop in $$.boxes) {
		if ($$.boxes.hasOwnProperty(prop)) {
			box = $$.boxes[prop];
			fillColor = box.activated ? $$.config.color_fill_activated : $$.config.color_fill_deactivated
			g = $$.svg.select('#'+box.id);
			col = box.col;
			row = box.row;
			g.select('rect')
				.attr("x", left+w*col)
				.attr("y", top+h*row)
				.attr("width", w)
				.attr("height", h)
				.style("fill", fillColor);
			t = g.select('text')
				.attr("x", col > .5 ? w*(col+1)-left : left*2+w*col)
				.attr("y", row > .5 ? h*(row+1)-top : top*3+h*row);
		}
	}
};

tk_vis_internal_fn.updateSvgSize = function () {
	var $$ = this;
	$$.svg.attr('width', $$.currentWidth).attr('height', $$.currentHeight);
	$$.selectChart.style('max-height', $$.currentHeight + "px");
	
	$$.svg.selectAll('.'+CLASS.box).select('rect')
		.attr('width', $$.box_size.width)
		.attr('height', $$.box_size.height)
};

tk_vis_internal_fn.updateSizes = function () {
	var $$ = this, config = $$.config, margin = config.margin;
	$$.currentWidth = $$.getCurrentWidth();
	$$.currentHeight = $$.getCurrentHeight();

	$$.width = $$.currentWidth - margin.left - margin.right;
	$$.height = $$.currentHeight - margin.top - margin.bottom;
	if ($$.width < 0) { $$.width = 0; }
	if ($$.height < 0) { $$.height = 0; }

	$$.box_size = $$.box_size || {};
	$$.box_size.width = $$.width / 2;
	$$.box_size.height = $$.height / 2;
}

tk_vis_internal_fn.getCurrentWidth = function () {
	var $$ = this, config = $$.config;
	return config.size_width ? config.size_width : $$.getParentWidth();
};

tk_vis_internal_fn.getCurrentHeight = function () {
	var $$ = this, config = $$.config;
	return config.size_height ? config.size_height : $$.getParentHeight();
};

tk_vis_internal_fn.getParentWidth = function () {
	var $$ = this;
	return $$.getParentRectValue('width');
};

tk_vis_internal_fn.getParentHeight = function () {
	var h = this.selectChart.style('height');
	return h.indexOf('px') > 0 ? +h.replace('px', '') : 0;
};

tk_vis_internal_fn.getParentRectValue = function (key) {
	var parent = this.selectChart.node(), v;
	while (parent && parent.tagName !== 'BODY') {
		try {
			v = parent.getBoundingClientRect()[key];
		} catch(e) {
			if (key === 'width') {
				// In IE in certain cases getBoundingClientRect
				// will cause an "unspecified error"
				v = parent.offsetWidth;
			}
		}
		if (v) {
			break;
		}
		parent = parent.parentNode;
	}
	return v;
};

tk_vis_internal_fn.updateAndRedraw = function () {
	var $$ = this, config = $$.config;
	$$.updateSizes();
	$$.updateSvgSize();
	// Draw with new sizes & scales
	$$.redraw();
};

var CLASS = tk_vis_internal_fn.CLASS = {
	box: 'tk-box',
	text: 'tk-text',
}

var isDefined = tk_vis_internal_fn.isDefined = function (v) {
	return typeof v !== 'undefined';
};

tk_vis_fn.resize = function (size) {
	var $$ = this.internal, config = $$.config;
	config.width = size ? size.width : null;
	config.height = size ? size.height : null;
	this.flush();
};

tk_vis_fn.flush = function () {
	var $$ = this.internal;
	$$.updateAndRedraw();
};

tk_vis_fn.update = function (data) {
	var $$ = this.internal;
	$$.initBoxes(data);
	this.flush();
};

module.exports = tk;