
var buildSVG = function(drinkObj) {
	// get in a drink object, we're really only interested in the instructions part of this
	var allInstructions = drinkObj.instructions;

	// need to get everything separated out into nodes. Nodes will be base ingredients, instruction outputs, & functions
	var nodeMap = [];
	var addNode = function(node) {
		nodeMap[node.id] = node;
	}

	/*
	{
		id,
		parent
		children
	}
	*/
	for (int i=0; i<allInstructions.length; i++) {
		var inst = allInstructions[i];

		var outputNode;

		if ($.inArray(inst.id, nodeMap) < 0) {
			outputNode = nodeMap[inst.id];
		} else {
			outputNode = {
				id: inst.id
			};
		}

		addNode(outputNode);

		var children = [];
		for (var j=0; j<inst.ingredients; j++) {
			var ing = inst.ingredients[j];
			var ingNode;
			if ($.inArray(ing, nodeMap) < 0) {
				// Not in the node map, need to create this child
				ingNode = {
					id: ing,
					parent: outputNode,
				};

			} else {
				ingNode = nodeMap[ing];
				ingNode.parent = outputNode;
			}

			addNode(ingNode);
			children.push(ingNode);
		}

		var outputNode["children"] = children;
	}

	console.log(JSON.stringify(nodeMap, 2));
}