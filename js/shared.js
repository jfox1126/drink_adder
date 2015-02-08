function postDrink(drinkResult, successHandler) {
	if (drinkResult) {
		var postString = JSON.stringify(drinkResult);
		$.post( "UploadDrink.html?drink=" + drinkResult.id, postString, function() {
			console.log("Post has succeeded")
			successHandler(drinkResult.id);
		}, "text");
	}
}

function uploadDrink(name, id, ingredients, instructions, classification, url, successHandler) {
	var drinkResult = {
		"id": id,
		"name": name,
		"ingredients": ingredients,
		"instructions": instructions,
		"classification": classification,
		"imageUrl": url
	};

	postDrink(drinkResult, successHandler)
}

function formatListAsString(list) {
	var result = "";
	var l = list.length;

	if (l == 1) {
		return list[0];
	} else if (l == 2) {
		return list[0] + " and " + list[1];
	} else {
		$.each(list, function(i, v) {
			result += v;
			if (i < l - 2)
				result += ", "
			else if (i == l - 2)
				result += ", and ";
		});

		return result;
	}
}

function formatInstruction(selectedIngredients, formatString, instructionHint)
{
	var result = "";
	var formatList = [];
	$.each(selectedIngredients, function(k,v) {
		if (v.length > 0)
			formatList.push(v);
	});
	
	var listIndex = formatString.indexOf("$list");
	if (listIndex >= 0) {
		var leftString = formatString.split("$list")[0];
		var rightString = formatString.split("$list")[1];

		var count = function(s) {
			var r = s.match(new RegExp("%s", "g"));
			if (r)
				return r.length;
			else 
				return 0;
		};

		var leftCount = count(leftString);
		var rightCount = count(rightString);

		if (leftCount + 1 + rightCount > formatList.length)
			return "Invalid, Not enough ingredients";

		// reset and build up our format list
		

		leftList = [];
		listList = [];
		rightList = [];
		$.each(formatList, function(i, v) {
			if (i < leftCount)
				leftList.push(v);
			else if (i < formatList.length - rightCount)
				listList.push(v);
			else
				rightList.push(v)
		});

		formatList = [];
		formatList = formatList.concat(leftList);
		formatList.push(formatListAsString(listList));
		formatList = formatList.concat(rightList);
	}

	formatString = formatString.replace("$list", "%s");

	result = vsprintf(formatString, formatList);

	result = result + instructionHint;

	return result;
}

function formatInstructions(selectedIngredients, formatStrings, instructionHint) {
	var results = [];
	$.each(formatStrings, function(k,v) {
		var result = formatInstruction(selectedIngredients, v, instructionHint);
		results.push(result);
	});

	return results;
}

function cacheBuster() {
	var date = new Date();
	var time = date.getTime();
	return "?cacheBuster=" + time;
}








// SVG Stuff

var buildTree = function(drinkObj) {

	$("#viz").html("");

	var allInstructions = drinkObj.instructions;
	var allIngredients = drinkObj.ingredients;

	var ingredientIds = [];
	var functionOutputIds = [];
	var instructionMap = {};
	var ingredientMap = {};
	var nodeMap = {};

	// Make a map of our ingredients
	$.each(allIngredients, function(k,v){
		ingredientMap[v.id] = v;
	})

	// step 1: go through and find all of the ids which are the outputs of functions,
	// as well as all of the ids which are input to functions. There should be 1 id in
	// functionOutputIds which is not in ingredientIds, this is the final drink (root node)
	for (var i=0; i<allInstructions.length; i++) {
		var inst = allInstructions[i];
		functionOutputIds.push(inst.id);
		instructionMap[inst.id] = inst;
		for (var j=0; j<inst.ingredients.length; j++) {
			var ing = inst.ingredients[j];
			ingredientIds.push(ing);
		}
	}

	// There should be exactly 1 root
	var roots = [];
	for (var i=0; i<functionOutputIds.length; i++) {
		var id = functionOutputIds[i];
		if ($.inArray(id, ingredientIds) < 0) {
			roots.push(id);
		}
	}

	if (roots.length != 1) {
		console.log("roots does not equal 1, roots are: " + JSON.stringify(roots));
		return;
	}


	// Next, let's create a node for every single node that we are going to have in our tree,
	// after doing that, we can start connecting the nodes
	var addNode = function(v) {
		var label;
		var nodeType;
		if (v in ingredientMap) {
			label = ingredientMap[v].name;
			nodeType = INGREDIENT_ID;
		} else if (v in instructionMap) {
			label = instructionMap[v].func;
			nodeType = COMPOSITE_ID;
		} else {
			// TODO - Make this better for things like ice
			label = v.substring(0, v.length - 2);
			nodeType = NON_ING_ID;
		}

		var newNode = {
			id: v,
			children: [],
			label: label,
			type: nodeType
		};

		nodeMap[v] = newNode;
	}

	addNode(roots[0]);
	$.each(ingredientIds, function(k,v) {
		addNode(v);
	});


	// Now that we have all of the nodes, start linking them together. Go through each instruction and
	// find it in the instructionMap. Find it in the node map and then find all of the its children.
	$.each(instructionMap, function(id,instruction) {
		$.each(instruction.ingredients, function(i, v) {
			// TEST
			nodeMap[v].parent = nodeMap[id];

			nodeMap[id].children.push(nodeMap[v]);
		});
	});

	// var rootNode = nodeMap[roots[0]];

	var rootNodes = [];
	$.each(roots, function(k,v) {
		rootNodes.push(nodeMap[v]);
	});

	buildSVG(rootNodes);
}

var buildSVG = function(rootNodes) {
	var labels = [];
	var nodes = [];
	var lines = [];

	var minX = 0;
	var minY = 0;

	$.each(rootNodes, function(k,v) {
		var rootNode = v;

		buildSVGNode(rootNode, 0, minY, labels, nodes, lines);

		// Figure out our min x & y
		$.each(nodes, function(i,node) {
			if (node.x < minX)
				minX = node.x;

			if (node.y < minY)
				minY = node.y;
		});
	});
	

	minX = minX - (NODE_SIZE * 2);
	minY = minY - (NODE_SIZE * 2);
	var viewBoxWidth = (-1 * minX) + (NODE_SIZE * 2);
	var viewBoxHieght = (-1 * minY) + (NODE_SIZE * 2);

	/* <circle cx="150" cy="100" r="80" fill="green" /> */

	var targetWidth = 1000;
	var targetHeight = targetWidth * (viewBoxHieght/viewBoxWidth);
	var svg = d3.select("#viz").append("svg") 
		.attr("viewBox", minX + ", " + minY + ", " + viewBoxWidth + ", " + viewBoxHieght)
		.attr("width", targetWidth)
		.attr("height", targetHeight);

	$.each(lines, function(i, line) {
		// <path d="M 175 200 l 150 0" stroke="green" stroke-width="3" fill="none" />

		var path = "";
		$.each(line.coords, function(i, coord) {
			path += i == 0 ? "M " : "L ";
			path += coord.x + " " + coord.y + " ";
		})

		svg.append("path")
			.attr("stroke-width", 2)
			.attr("stroke", line.color)
			.attr("fill", "none")
			.attr("d", path)
			.attr("stroke-linejoin", "round");
	});

	$.each(nodes, function(i,node) {
		var shape;
		if (node.shape == "circle") {
			shape = svg.append("circle")
				.attr('cx', node.x)
				.attr('cy', node.y)
				.attr('r', NODE_SIZE);
		} else if (node.shape == "square") {
			var offsetX = node.x - NODE_SIZE;
			var offsetY = node.y - NODE_SIZE;
			shape = svg.append("rect")
				.attr('x', offsetX)
				.attr('y', offsetY)
				.attr('width', NODE_SIZE * 2)
				.attr('height', NODE_SIZE * 2);
		} else if (node.shape == "diamond") {
			// <polygon points="200,10 250,190 160,210" style="fill:lime;stroke:purple;stroke-width:1" />
			var coords = node.x + "," + (node.y - NODE_SIZE) + " " + (node.x + NODE_SIZE) + "," + node.y + " " + node.x + "," + (node.y + NODE_SIZE) + " " + (node.x - NODE_SIZE) + "," + node.y;
			shape = svg.append("polygon")
				.attr('points', coords);
		}

		shape
			.attr('fill', node.color)
			.attr('stroke', "black");
	});

	// <text x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>
	$.each(labels, function(i,label) {
		svg.append("text")
			.attr('x', label.x)
			.attr('y', label.y)
			.attr('font-size', 8)
			.attr('text-anchor', "middle")
			.attr('dominant-baseline', "middle")
			.html(label.label);
	});
}

var NODE_SIZE = 20;
var NODE_V_SPACING = 52;
var NODE_H_SPACING = 80;
var NODE_H_TURN = 30;
var STROKE_WEIGHT = 2;

var INGREDIENT_ID = 1;
var NON_ING_ID = 2;
var COMPOSITE_ID = 3;

var buildSVGNode = function(node, x, y, labels, nodes, lines) {
	var color;
	var shape;
	if (node.type == INGREDIENT_ID) {
		color = "#FF0000";
		shape = "circle";
	}
	else if (node.type == NON_ING_ID) {
		color = "#66CCFF";
		shape = "square";
	}
	else if (node.type == COMPOSITE_ID) {
		color = "#CCFF99";
		shape = "diamond";
	}

	var nodeItem = {
		"x": x,
		"y": y,
		"radius": NODE_SIZE,
		"type": node.type,
		"color": color,
		"shape": shape
	};
	nodes.push(nodeItem);

	var labelItem = {
		"x": x,
		"y": y,
		"label": node.label
	};
	labels.push(labelItem);

	$.each(node.children, function(k, child) {
		// First need to say where the line is gonna go
		var coords = [];
		var newX = x;
		var newY = y;

		// Compute the drop y, for subway style
		var yOffset = ((node.children.length - 1) * 0.5) * STROKE_WEIGHT;
		yOffset -= (STROKE_WEIGHT * k);
		yOffset = newY	+ yOffset;

		coords.push({"x": newX, "y": yOffset});

		// Move to the turn
		newX -= NODE_H_TURN;
		coords.push({"x": newX, "y": yOffset});

		newX -= NODE_H_SPACING;
		newY -= (k * NODE_V_SPACING);
		coords.push({"x": newX, "y": newY});

		newX -= NODE_H_TURN;
		coords.push({"x": newX, "y": newY});

		var newColor = buildSVGNode(child, newX, newY, labels, nodes, lines);

		var lineItem = {
			"coords": coords,
			"color": newColor
		};
		lines.push(lineItem);

	});
		
	return color;
}
