jQuery.extend({
  getQueryParameters : function(str) {
	  return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
  }
});

var possibleItemsController = 
{
	ingredientsMap: {},
	ingredientsList: [],

	unitsMap: {},
	unitsList: [],

	functionsMap: {},
	functionsList: [],

	nonIngredientsMap: {},
	iceList: [],
	containersList: [],

	initialize: function(completionHandler) {
		var that = this;
		var loadPossibleIngredientsTask = $.getJSON( "data/ing.json", function( data ) {
			that.ingredientMap = data;
			that.ingredientsList.push('');
			$.each(data, function(k,v) {
				that.ingredientsList.push(k);
			});

			that.ingredientsList.sort(function (a, b) {
    			return a.toLowerCase().localeCompare(b.toLowerCase());
    		});
		});
		

		var loadUnitsTask = $.getJSON("data/unit.json", function(data) {
			that.unitsList.push('');
			$.each(data, function(k, v) {
				var unitName = v.name;
				that.unitsList.push(unitName);
				that.unitsMap[unitName] = v;
			});

			that.unitsList.sort();
		});

		var loadFunctionsTask = $.getJSON("data/functions.json", function(data) {
			that.functionsList.push('');
			$.each(data, function(k, v) {
				that.functionsList.push(v.func);
				that.functionsMap[v.func] = v;
			});
			that.functionsList.sort();
		});

		var loadNonIngredeientsTask = $.getJSON("data/noning.json", function(data) {
			that.nonIngredientsMap = data;
			$.each(data.ice, function(k,v) {
				that.iceList.push(v);
			});

			$.each(data.containers, function(k,v) {
				that.containersList.push(v);
			});
			
		});

		$.when(loadPossibleIngredientsTask, loadUnitsTask, loadFunctionsTask, loadNonIngredeientsTask).done(completionHandler);
	}
};

var drinkDataController = 
{
	ingredients: [],
	instructions: [],
	drinkId: "",
	drinkName: "",
	drinkUrl: "",
	drinkType: "",

	initialize: function(drinkId, completionHandler) {
		var that = this;
		that.drinkId = drinkId;

		var fileName = "drinks/" + drinkId + ".json";
		loadDrinkDataTask = $.getJSON(fileName, function(data) {
			that.drinkName = data.name;

    		$.each(data.ingredients, function(k,v) {
    			that.ingredients.push(v);
    		});
		    
    		$.each(data.instructions, function(k,v) {
    			var funcData = possibleItemsController.functionsMap[v.func];

    			var instructionData = v;
    			if (!instructionData.name) {
    				instructionData.name = v.id;
    			}

    			if (!instructionData.format) {
    				instructionData.format = funcData.formats[0];
    			}

    			that.instructions.push(instructionData);
    		});
    	});

    	$.when(loadDrinkDataTask).done(completionHandler)
	},

	getNameFromId: function(id) {
		var result = id;

		$.each(this.ingredients, function(k,v) {
			if (v.id == id)
				result = v.name;
		});

		$.each(this.instructions, function(k,v) {
			if (v.id == id)
				result = v.name;
		});

		return result;
	},

	allIds: function() {
		var ids = [];
		$.each(this.ingredients, function(k,v) {
			ids.push(v.id);
		});

		$.each(this.instructions, function(k,v) {
			ids.push(v.id);
		})

		return ids;
	},

	consumedIds: function() {
		var ids = [];
		$.each(this.instructions, function(i, inst) {
			$.each(inst.ingredients, function(k,v) {
				ids.push(v);
			});
		});

		return ids;
	},

	usableIds: function() {
		var usableIds = [];
		var consumedIds = this.consumedIds();
		var allIds = this.allIds();
		$.each(allIds, function(k,v) {
			if ($.inArray(v, consumedIds) < 0) {
				usableIds.push(v);
			}
		});

		return usableIds;
	},

	usableComposites: function() {
		var ids = [];
		var usableIds = this.usableIds();
		$.each(usableIds, function(k,v) {
			if (v.indexOf("composite") >= 0)
				ids.push(v);
		});

		return ids;
	},

	usableIngredients: function() {
		var ids = [];
		var usableIds = this.usableIds();
		$.each(usableIds, function(k,v) {
			if (v.indexOf("composite") < 0)
				ids.push(v);
		});

		return ids;
	},

	ingredientsTableData: function() {
		return this.ingredients;
	},

	instructionsTableData: function() {
		var tableData = [];
		$.each(this.instructions, function(k,v) {
			var rowData = jQuery.extend(true, {}, v);
			for (var i=0; i<6; i++) {
				var keyName = "var" + (i+1).toString();
				var val = "";
				if (i < v.ingredients.length) {
					val = v.ingredients[i];
				} 

				rowData[keyName] = val;
			}

			// format the text string as well
			var funcData = possibleItemsController.functionsMap[v.func];
			var inputIds = v.ingredients;
			var inputNames = [];
			$.each(inputIds, function(k,v) {
				var name = drinkDataController.getNameFromId(v);
				inputNames.push(name);
			});

			var formatStrings = [];
			formatStrings.push(v.format);
			var format = formatInstructions(inputNames, formatStrings)[0];
			rowData.displayText = format;

			tableData.push(rowData);
		});

		return tableData;
	},

	genUniqueId: function(input) {
		var ids = [];
		$.each(this.ingredients, function(i, v) { ids.push(v.id); });
		$.each(this.instructions, function(i, v) { ids.push(v.id); });

		var i = 1;
		var currId = input;
		do
		{
			currId = input + "_" + i.toString();
			i++;
		} while ($.inArray(currId, ids) >= 0);

		return currId;
	},

	addIngredient : function(name, quantity, unit) {
		var id = this.genUniqueId(name);

		var ingredientEntry = {
			"name": name,
			"qty": quantity,
			"unit": unit,
			"id": id
		};

		this.ingredients.push(ingredientEntry);

		this.dataChangedHandler();
	},

	removeIngredient: function(rowIndex) {
		this.ingredients.splice(rowIndex, 1);

		this.dataChangedHandler();
	},

	addInstruction: function(funcData, inputIds, formatIndex) {
		var id = this.genUniqueId("composite");
		var instEntry = {
			"func": funcData.func,
			"id": id,
			"name": id,
			"ingredients": inputIds,
			"format": funcData.formats[formatIndex]
		};



		this.instructions.push(instEntry);

		this.dataChangedHandler();
	},

	removeInstruction: function(rowIndex) {
		this.instructions.splice(rowIndex, 1);

		this.dataChangedHandler();
	},

	setNameForInstruction: function(rowIndex, newName) {
		this.instructions[rowIndex].name = newName;

		this.dataChangedHandler();
	},

	validateInstruction: function(funcData, inputs) {
		if (inputs.length < funcData.minvariables)
			return false;

		if (inputs.length > funcData.maxvariables)
			return false;

		return true;
	},

	getCurrentDrink: function() {
		var result = {
			"id": this.drinkId,
			"name": this.drinkName,
			"ingredients": this.ingredients,
			"instructions": this.instructions,
			"classification": this.drinkType,
			"imageUrl": this.drinkUrl
		};

		return result;
	},

	serializeCurrentDrink: function() {
		var resultString = JSON.stringify(this.getCurrentDrink(), undefined, 2);
		return resultString;
	},

	saveCurrentDrink: function() {
		postDrink(this.getCurrentDrink(), function() {
			alert("Save Succeeded");
		})
	},

	dataChangedHandler: null,
};

var mainController = 
{
	ingredientsTable: null,
	instructionsTable: null,
	instructionsList: null,

	ingredientsSelect: null,
	quantityTextEdit: null,
	unitSelect: null,
	functionSelect: null,

	instructionPreview: null,

	initialize: function() {
		this.initializeUI();
	},

	initializeUI: function() {
		// Set up the basic info about the drink
		$("#drinkNameLabel").text(drinkDataController.drinkName);

		// Initialize our data tables
		this.ingredientsTable = $('#ingredientTable').DataTable( {
		    columns: [
		        {
	                "class":          'details-control',
	                "orderable":      false,
	                "data":           null,
	                "defaultContent": '',
	                "width": "20px"
	            },
		        { data: 'name', width: "220px" },
		        { data: 'qty', width: "80px" },
		        { data: 'unit', width: "220px" },
		        { data: 'id' , width: "200px"}
		    ],
		    info: false,
		    paging: false,
		    filter: false,
		    // data: drinkDataController.ingredientsTableData()
		});

		var pixelWidth = "120px";
		this.instructionsTable = $('#instructionsTable').DataTable( {
			columns: [
		        {
	                "class":          'details-control',
	                "orderable":      false,
	                "data":           null,
	                "defaultContent": '',
	                "width": "20px"
	            },
		        { data: 'func', width: pixelWidth },
		        { data: 'var1', width: pixelWidth },
		        { data: 'var2', width: pixelWidth },
		        { data: 'var3', width: pixelWidth },
		        { data: 'var4', width: pixelWidth },
		        { data: 'var5', width: pixelWidth },
		        { data: 'var6', width: pixelWidth },
		        { data: 'name', width: pixelWidth, 'class' : 'edit' },
				{ data: 'id', width: pixelWidth }
		    ],
		    info: false,
		    paging: false,
		    filter: false,
		    // data: drinkDataController.instructionsTableData()
		});

		this.instructionsList = $('#instructionsList').DataTable( {
			columns: [
		        {
	                "data": 'displayText',
	            }
	        ],
		    info: false,
		    paging: false,
		    filter: false,
		});

		this.ingredientSelect = $('#ingredientSelect');
		this.initializeSelect(this.ingredientSelect, possibleItemsController.ingredientsList, 0);

		this.quantityTextEdit = $('#ing-qty');

		this.unitSelect = $('#unitSelect');
		this.initializeSelect(this.unitSelect, possibleItemsController.unitsList, 0);

		this.functionSelect = $('#functionInput');
		this.initializeSelect(this.functionSelect, possibleItemsController.functionsList, 0);

		this.refreshDataTables();

		// Set up the event handlers. 
		var that = this;

		drinkDataController.dataChangedHandler = function() {
			that.refreshDataTables();
		};

		// First do the ingredients stuff
		$('.ing-input').keydown(function() {
			if (event.which === 13) { that.addNewIngredient(); }
		});

		$('#ing-add').click(function() {
			that.addNewIngredient();
		});

		$('#ingredientTable tbody').on('click', 'td.details-control', function () {
	    	var tr = $(this).closest('tr')[0];
	    	that.removeIngredient(tr.sectionRowIndex);
		});

		// Next do the instructions stuff
		this.functionSelect.change(function() {
			that.onFunctionChanged();
		});

		$('.inst-inputs').change(function() {
			that.onInputIngredientChanged();
		})

		$('.inst-inputs').keydown(function() { 
			if (event.which === 13) { that.addNewInstruction(); }
		})

		$('#instructionAdd').click(function() {
			that.addNewInstruction();
		});

		$('#instructionsTable tbody').on('click', 'td.details-control', function () {
			var tr = $(this).closest('tr')[0];
	    	that.removeInstruction(tr.sectionRowIndex);
		});

		// Next do some of the global stuff
		$('#drinkSave').click(function() {
			drinkDataController.saveCurrentDrink();
		})
	},

	onFunctionChanged: function() {
		var funcData = this.getSelectedFunctionData();

		// Select the first (blank item in the select)
		$('.inst-inputs').val("");

		var maxInputs = funcData ? funcData.maxvariables : 0;
		for (var i=1; i<7; i++)
		{
			var id = "#var" + i.toString();

			// disable the selects above max inputs
			if (i > maxInputs)
			{
				$(id).attr('disabled', 'disabled');
			}
			else
			{
				$(id).removeAttr('disabled');			
			}
		}

		$('#instructionAdd').attr('disabled', 'disabled');

		if (!funcData)
			return;

		this.populateIngredientSelects();
		this.updateInstructionPreview();

	},

	onInputIngredientChanged: function() {
		// On of the selected functions has changed Validate it and stuff
		var funcData = this.getSelectedFunctionData();
		var inputs = this.getSelectedInputIds();

		if (!drinkDataController.validateInstruction(funcData, inputs)) {
			$('#instructionAdd').attr('disabled', 'disabled');
		} else {
			$('#instructionAdd').removeAttr('disabled');
		}

		this.updateInstructionPreview();

		// var formatStrings = formatInstructions(getSelectedIngredients(), funcData.formats);
		// updateInstructionPreview(formatStrings, 0);
	},

	refreshDataTables: function() {
		this.ingredientsTable.clear();
		this.ingredientsTable.rows.add(drinkDataController.ingredientsTableData()).draw();

		this.instructionsTable.clear();
		this.instructionsTable.rows.add(drinkDataController.instructionsTableData()).draw();

		this.instructionsList.clear();
		this.instructionsList.rows.add(drinkDataController.instructionsTableData()).draw();

		var drinkJSON = drinkDataController.serializeCurrentDrink();
		$("#previewSection").html(drinkJSON);

		buildTree(drinkDataController.getCurrentDrink());

		this.populateIngredientSelects();

		var that = this;

		$('.edit').editable(function(value, settings) {
			var index = this.parentElement.sectionRowIndex;
			drinkDataController.setNameForInstruction(index, value);
		    return "";	
		  }, {
	         indicator : 'Saving...',
	         tooltip   : 'Click to edit...'
	     });
	},

	addNewIngredient: function() {
		var name = this.ingredientSelect.find("option:selected").text();
		var qty = this.quantityTextEdit.val();
		var unit = this.unitSelect.find("option:selected").text();

		if (isNaN(parseFloat(qty))) {
			alert("Quantity is not a number dumbass!");
			return;
		}

		if (name.length == 0 || qty.length == 0 || unit.length == 0) {
			alert("Please enter all fields");
		} else {
			drinkDataController.addIngredient(name, qty, unit);
			this.refreshDataTables();
			$('.ing-input').val('');
			this.ingredientSelect.focus();
		}
	},

	removeIngredient: function(rowIndex) {
		drinkDataController.removeIngredient(rowIndex);
		this.refreshDataTables();
	},

	addNewInstruction: function() {
		var funcData = this.getSelectedFunctionData();
		var inputIds = this.getSelectedInputIds();
		var formatIndex = this.getSelectedFormatIndex();

		if (!drinkDataController.validateInstruction(funcData, inputIds))
			return;

		drinkDataController.addInstruction(funcData, inputIds, formatIndex);

		this.refreshDataTables();

		this.functionSelect.val("");
		this.onFunctionChanged();
		this.functionSelect.focus();
	},

	removeInstruction: function(rowIndex) {
		drinkDataController.removeInstruction(rowIndex);
		this.refreshDataTables();
	},

	getSelectedFunctionData: function() {
		var funcId = this.functionSelect.find("option:selected").text();
		var funcData = possibleItemsController.functionsMap[funcId];
		return funcData;
	},

	getSelectedInputIds: function() {
		var inputIds = [];
		$('.inst-inputs option:selected').each(function(i, v) {
			if (this.text.length > 0) {
				inputIds.push(v.text);
			}
		});

		return inputIds;
	},

	initializeSelect: function(select, options, selectedIndex) {
		select.html('');
		$.each(options, function(key, value) {
			select.append(
				$("<option></option>")
				.attr("value",key)
				.text(value));
		});
	},

	populateIngredientSelects: function() {
		var addOptGroup = function(label, items, elem) {
			var innerText = "";
			$.each(items, function(k, v) {
				innerText += "<option value='" + v + "'>" + v + "</option>";
			});

			elem
				.append($("<optgroup label='--" + label + "--'></optgroup>"))
    			.append(innerText);
		}

		for (var i = 0; i < 7; i++) {
			var element = $("#var" + i.toString());
			element.html("<option value=''></option>");

			addOptGroup("INGREDIENTS", drinkDataController.usableIngredients(), element);
			addOptGroup("COMPOSITES", drinkDataController.usableComposites(), element);
			addOptGroup("ICE", possibleItemsController.iceList, element);
			addOptGroup("CONTAINERS", possibleItemsController.containersList, element);
		}
	},

	updateInstructionPreview: function(selectedIndex) {
		var funcData = this.getSelectedFunctionData();
		var inputIds = this.getSelectedInputIds();
		var inputNames = [];
		$.each(inputIds, function(k,v) {
			var name = drinkDataController.getNameFromId(v);
			inputNames.push(name);
		});

		var formatStrings = formatInstructions(inputNames, funcData.formats);

		if (!selectedIndex)
			selectedIndex = 0;

		var optionsInnerText = "<form id='myFormID'>";
		$.each(formatStrings, function(k,v) {
			var checkedString = selectedIndex == k ? " checked='checked' " : " ";
			optionsInnerText += "<label><input type='radio' name='instructionPreview' val='" + k + "' " + checkedString + "/>" + v + "</label><br/>"
		});

		optionsInnerText += "</form>"

		$("#instructionPreview").html(optionsInnerText);
	},

	getSelectedFormatIndex: function() {
		var radioButtons = $("#myFormID input:radio[name='instructionPreview']");
		var selectedIndex = radioButtons.index(radioButtons.filter(':checked'));
		return selectedIndex;
	}
};



$(document).ready(function() {
	var queryParams = $.getQueryParameters();
	var drinkId = queryParams['drink'];

	possibleItemsController.initialize(function() { 
		drinkDataController.initialize(drinkId, function() {
			mainController.initialize();
		}) 
	});




	var everythingWrapper = function() {

	// var nonIngredients = {};
	// var functionMap = {};
	
	// var ingredientsTable = $('#ingredientTable').DataTable( {
	//     columns: [
	//         {
 //                "class":          'details-control',
 //                "orderable":      false,
 //                "data":           null,
 //                "defaultContent": '',
 //                "width": "20px"
 //            },
	//         { data: 'name', width: "220px" },
	//         { data: 'qty', width: "80px" },
	//         { data: 'unit', width: "220px" },
	//         { data: 'id' , width: "200px"}
	//     ],
	//     info: false,
	//     paging: false,
	//     filter: false
	// });

	// var pixelWidth = "120px";
	// var instructionsTable = $('#instructionsTable').DataTable( {
	// 	columns: [
	//         {
 //                "class":          'details-control',
 //                "orderable":      false,
 //                "data":           null,
 //                "defaultContent": '',
 //                "width": "20px"
 //            },
	//         { data: 'func', width: pixelWidth },
	//         { data: 'var1', width: pixelWidth },
	//         { data: 'var2', width: pixelWidth },
	//         { data: 'var3', width: pixelWidth },
	//         { data: 'var4', width: pixelWidth },
	//         { data: 'var5', width: pixelWidth },
	//         { data: 'var6', width: pixelWidth },
	//         { data: 'name', width: pixelWidth },
	// 		{ data: 'id', width: pixelWidth }
	//     ],
	//     info: false,
	//     paging: false,
	//     filter: false
	// });

	var row = instructionsTable.row(0);
	row.child("<div id='instructionPreview'></div>").show();

	// $('#ingredientTable tbody').on('click', 'td.details-control', function () {
	//     var tr = $(this).closest('tr');
	//     if (tr[0].rowIndex < 2)
	//     	return;
	    
	//     var row = ingredientsTable.row( tr );
	//  	row.remove().draw();

	//  	refresh();
	// });

	var loadData = function() {
		
		var loadIng = $.getJSON( "data/ing.json", function( data ) {
		  var ingredientOptions = [];
		  ingredientOptions.push('');
		  $.each( data, function( key, val ) {
		  	ingredientOptions.push(key);
		  });
		  ingredientOptions.sort();

			$.each(ingredientOptions, function(key, value) {   
			     $('#ingredientSelect')
			         .append($("<option></option>")
			         .attr("value",key)
			         .text(value)); 
			});
		});

		var loadUnit = $.getJSON("data/unit.json", function(data) {
			var availableUnits = [];
			$.each(data, function(item) {
				var unitName = this.name;
				availableUnits.push(unitName);
			});
			availableUnits.sort();

			$.each(availableUnits, function(key, value) {   
			     $('#unitSelect')
			         .append($("<option></option>")
			         .attr("value",key)
			         .text(value)); 
			});
		});

		var loadFunc = $.getJSON("data/functions.json", function(data) {
			var functions = [];
			functions.push('');
			$.each(data, function(item) {
				functions.push(this.func);
				functionMap[this.func] = this;
			});
			functions.sort();

			$.each(functions, function(key, value) {   
			     $('#functionInput')
			         .append($("<option></option>")
			         .attr("value",key)
			         .text(value)); 
			});
		});

		var loadNonIng = $.getJSON("data/noning.json", function(data) {
			nonIngredients = data;
		});

		var loadDrinkData = $.when(loadIng, loadUnit, loadFunc, loadNonIng)
		.done(function() {
		    if (drinkId && drinkId.length > 0) {
		    	// We are trying to read in an existing drink
		    	var fileName = "drinks/" + drinkId + ".json";
		    	loadDrinkData = $.getJSON(fileName, function(data) {

		    		buildTree(data);


		    		// name, ingredients, instructions, 
		    		$("#drinkNameLabel").text(data.name);

		    		$.each(data.ingredients, function(k,v) {
		    			ingredientsTable.row.add(v).draw();
		    		});
		    		

		    		$.each(data.instructions, function(k,v) {
		    			var rowData = {
		    				func: v.func,
		    				id: v.id
		    			};

		    			if (!rowData.name) {
		    				rowData.name = rowData.id;
		    			}

		    			for (var i=0; i<6; i++) {
		    				var keyName = "var" + (i+1).toString();
		    				var val = "";
		    				if (i < v.ingredients.length) {
		    					val = v.ingredients[i];
		    				} 

		    				rowData[keyName] = val;
		    			}

		    			instructionsTable.row.add(rowData).draw();
		    		});

		    	}).done (function() {
		    		refresh();
		    		onFunctionChange();
		    	}); // empty completion handler to block
		    }
		});

		$.when(loadDrinkData).done(function() {
			refresh();
		    onFunctionChange();
		})
	};

	// loadData();


	var ids = [];
	var genUniqueId = function(input) {
		var i = 1;
		var currId = input;
		do
		{
			currId = input + "_" + i.toString();
			i++;
		} while ($.inArray(currId, ids) >= 0);

		ids.push(currId);
		return currId;
	}

	var addIng = function() {
			var name = $('#ingredientSelect  option:selected').text();
			var qty = $('#ing-qty').val();
			var unit = $('#unitSelect  option:selected').text();

			if (isNaN(parseFloat(qty))) {
				alert("Quantity is not a number dumbass!");
				return;
			}

			console.log("Adding: " + JSON.stringify(ingEntry));
			if (name.length == 0 || qty.length == 0 || unit.length == 0) {
				alert("Please enter all fields");
			} else {

				var id = genUniqueId(name);
				var ingEntry = {
					"name": name,
					"qty": qty,
					"unit": unit,
					"id": id
				};

				ingredientsTable.row.add(ingEntry).draw();
				refresh();

				$('.ing-input').val('');
				$('#ingredientSelect').focus();
			}
		
	}

	$('.ing-input').keydown(function() {
		if (event.which === 13) {
			addIng();
		}
	})

	$('#ing-add').click(function() {
		addIng();
	});


	var getSelectedIngredients = function() {
		var inputs = [];
		$('.inst-inputs option:selected').each(function(x) {
			if (this.text.length > 0) {
				inputs.push(this.text);
			}
		});

		return inputs;
	}

	var getSelectedIngredientNames = function() {
		var ids = getSelectedIngredients();
		
	}

	var getFunctionData = function() {
		var func = $('#functionInput  option:selected').text();
		var funcData = functionMap[func];

		return funcData;
	}

	var addInst = function() {
		var func = $('#functionInput  option:selected').text();
		var funcData = functionMap[func];
		console.log(JSON.stringify(funcData, 2));
		var inputs = getSelectedIngredients();

		if (!validateInst(funcData, inputs))
			return;

		var id = genUniqueId("composite");
		var instEntry = {
			"func": funcData.func,
			"id": id
		};

		for (var i=1; i<7; i++) {
			var id = "var" + i.toString();
			var val = inputs[i-1] ? inputs[i-1] : "";
			if (val.length > 0 && $.inArray(val, ids) < 0) {
				// If this is something that's not in the ids collection it means we are using one of the
				// non ingredient items. Get it a unique id for book keeping
				val = genUniqueId(val);
			}
			instEntry[id] = val;
		}

		instructionsTable.row.add(instEntry).draw();
		refresh();

		$('#functionInput').val("");
		onFunctionChange();
		$('#functionInput').focus();
	}

	var validateInst = function(funcData, inputs) {
		if (inputs.length < funcData.minvariables)
			return false;

		if (inputs.length > funcData.maxvariables)
			return false;

		return true;
	};

	$('#instructionsTable tbody').on('click', 'td.details-control', function () {
	    var tr = $(this).closest('tr');
	    if (tr[0].rowIndex < 2)
	    	return;

	    var row = instructionsTable.row( tr );
	 	row.remove().draw();

	 	refresh();
	});

	var onFunctionChange = function() {
		var newFunc = $('#functionInput  option:selected').text();
		var funcData = functionMap[newFunc];

		// Select the first (blank item in the select)
		$('.inst-inputs').val("");


		var maxInputs = funcData ? funcData.maxvariables : 0;

		for (var i=1; i<7; i++)
		{
			var id = "#var" + i.toString();

			// disable the selects above max inputs
			if (i > maxInputs)
			{
				$(id).attr('disabled', 'disabled');
			}
			else
			{
				$(id).removeAttr('disabled');			
			}
		}

		$('#instructionAdd').attr('disabled', 'disabled');

		if (!funcData)
			return;
		// <label><input type=\"radio\" name=\"Radio One\">Radio One</label><br/>
		// set up instruction preview
		
		updateInstructionPreview(funcData.formats, 0);
		
	};

	var updateInstructionPreview = function(options, selectedIndex) {
		var optionsInnerText = "<form>";
		$.each(options, function(k,v) {
			var checkedString = selectedIndex == k ? " checked='checked' " : " ";
			optionsInnerText += "<label><input type='radio' name='instructionPreview' val='" + k + "' " + checkedString + "/>" + v + "</label><br/>"
		});
		optionsInnerText += "</form>"

		$("#instructionPreview").html(optionsInnerText);
	}

	$('#functionInput').change(onFunctionChange);

	$('.inst-inputs').change(function() {
		// On of the selected functions has changed Validate it and stuff
		var funcData = getFunctionData();
		var inputs = getSelectedIngredients();

		if (!validateInst(funcData, inputs)) {
			$('#instructionAdd').attr('disabled', 'disabled');
		} else {
			$('#instructionAdd').removeAttr('disabled');
		}

		var formatStrings = formatInstructions(getSelectedIngredients(), funcData.formats);
		updateInstructionPreview(formatStrings, 0);
	})

	$('.inst-inputs').keydown(function() {
		if (event.which === 13) {
			addInst();
		}
	})

	$('#instructionAdd').click(function() {
		addInst();
	});

	$('#drinkSave').click(function() {
		saveCurrentDrink();
	})

	
	var populateIngredientSelect = function(index, usableIds, bIngredients, bComposites, bIce, bContainers) {

		var addOptGroup = function(label, items, elem) {
			var innerText = "";
			$.each(items, function(k, v) {
				innerText += "<option value='" + v + "'>" + v + "</option>";
			});

			elem
				.append($("<optgroup label='--" + label + "--'></optgroup>"))
    			.append(innerText);
		}

		var composites = [];
		var ingredients = [];
		var ice = [];
		var containers = [];

		$.each(usableIds, function(k,v) {
			if (v.indexOf("composite") < 0)
				ingredients.push(v);
			else
				composites.push(v);
		});

		$.each(nonIngredients.ice, function(k,v) {
			ice.push(v);
		});

		$.each(nonIngredients.containers, function(k,v) {
			containers.push(v);
		});
		
		var element = $("#var" + index.toString());
		element.html("<option value=''></option>");

		if (bIngredients)
		{
			addOptGroup("INGREDIENTS", ingredients, element);
		}

		if (bComposites)
		{
			addOptGroup("COMPOSITES", composites, element);
		}

		if (bIce)
		{
			addOptGroup("ICE", ice, element);
		}

		if (bContainers)
		{
			addOptGroup("CONTAINERS", containers, element);
		}
	};


	var refresh = function() {
		// zero out ids in-case anything was added or removed
		ids = [];
		var usedIds = [];
		var usableIds = [];

		var drinkName = $("#drinkNameLabel").text();

		// First grab all of the ingredients which are available
		var ingredients = [];
		var ingredientsTableData = ingredientsTable.rows().data();
		for (var i=1; i<ingredientsTableData.length; i++)
		{
			var ing = ingredientsTableData[i];
			ingredients.push(ing);
			ids.push(ing.id);
		}

		var instructions = [];
		var instructionsTableData = instructionsTable.rows().data();
		for (var i=1; i<instructionsTableData.length; i++)
		{
			var inst = instructionsTableData[i];

			ids.push(inst.id);

			var instructionIngredients = [];
			for (var j=1; j<7; j++) {
				var ing = inst["var" + j.toString()];
				if (ing.length > 0) {
					usedIds.push(ing);
					instructionIngredients.push(ing);
				}
			}

			var completedInstruction = {
				func: inst.func,
				id: inst.id,
				ingredients: instructionIngredients
			};

			instructions.push(completedInstruction);
		}

		// Filter out which ids haven't been used
		$.each(ids, function(k,v) {
			if ($.inArray(v, usedIds) < 0)
				usableIds.push(v);
		})


		for (var i=1; i<7; i++) {
			populateIngredientSelect(i, usableIds, true, true, true, true);
		}

		var drinkClassification = "High Ball";

		var imageUrl = "http://fake.com";


		var result = {
			"id": drinkId,
			"name": drinkName,
			"ingredients": ingredients,
			"instructions": instructions,
			"classification": drinkClassification,
			"imageUrl": imageUrl
		};

		var resultString = JSON.stringify(result, undefined, 2);
		$("#previewSection").html(resultString);

		currentResult = result;
	};

	var currentResult;

	var saveCurrentDrink = function() {
		if (currentResult) {
			var postString = JSON.stringify(currentResult);
			$.post( "UploadDrink.html?drink=" + drinkId, postString, function() {
				console.log("Post has succeeded")
				// Request Completed, do something
			}, "text");
		}
	}


	loadData();
};
})













// var buildTree = function(drinkObj) {
// 	var allInstructions = drinkObj.instructions;
// 	var allIngredients = drinkObj.ingredients;

// 	var ingredientIds = [];
// 	var functionOutputIds = [];
// 	var instructionMap = {};
// 	var ingredientMap = {};
// 	var nodeMap = {};

// 	// Make a map of our ingredients
// 	$.each(allIngredients, function(k,v){
// 		ingredientMap[v.id] = v;
// 	})

// 	// step 1: go through and find all of the ids which are the outputs of functions,
// 	// as well as all of the ids which are input to functions. There should be 1 id in
// 	// functionOutputIds which is not in ingredientIds, this is the final drink (root node)
// 	for (var i=0; i<allInstructions.length; i++) {
// 		var inst = allInstructions[i];
// 		functionOutputIds.push(inst.id);
// 		instructionMap[inst.id] = inst;
// 		for (var j=0; j<inst.ingredients.length; j++) {
// 			var ing = inst.ingredients[j];
// 			ingredientIds.push(ing);
// 		}
// 	}

// 	// There should be exactly 1 root
// 	var roots = [];
// 	for (var i=0; i<functionOutputIds.length; i++) {
// 		var id = functionOutputIds[i];
// 		if ($.inArray(id, ingredientIds) < 0) {
// 			roots.push(id);
// 		}
// 	}

// 	if (roots.length != 1) {
// 		console.log("roots does not equal 1, roots are: " + JSON.stringify(roots));
// 		return;
// 	}


// 	// Next, let's create a node for every single node that we are going to have in our tree,
// 	// after doing that, we can start connecting the nodes
// 	var addNode = function(v) {
// 		var label;
// 		var nodeType;
// 		if (v in ingredientMap) {
// 			label = ingredientMap[v].name;
// 			nodeType = INGREDIENT_ID;
// 		} else if (v in instructionMap) {
// 			label = instructionMap[v].func;
// 			nodeType = COMPOSITE_ID;
// 		} else {
// 			// TODO - Make this better for things like ice
// 			label = v.substring(0, v.length - 2);
// 			nodeType = NON_ING_ID;
// 		}

// 		var newNode = {
// 			id: v,
// 			children: [],
// 			label: label,
// 			type: nodeType
// 		};

// 		nodeMap[v] = newNode;
// 	}

// 	addNode(roots[0]);
// 	$.each(ingredientIds, function(k,v) {
// 		addNode(v);
// 	});


// 	// Now that we have all of the nodes, start linking them together. Go through each instruction and
// 	// find it in the instructionMap. Find it in the node map and then find all of the its children.
// 	$.each(instructionMap, function(id,instruction) {
// 		$.each(instruction.ingredients, function(i, v) {
// 			// TEST
// 			nodeMap[v].parent = nodeMap[id];

// 			nodeMap[id].children.push(nodeMap[v]);
// 		});
// 	});

// 	// var rootNode = nodeMap[roots[0]];

// 	var rootNodes = [];
// 	$.each(roots, function(k,v) {
// 		rootNodes.push(nodeMap[v]);
// 	});

// 	buildSVG(rootNodes);
// }

// var buildSVG = function(rootNodes) {
// 	var labels = [];
// 	var nodes = [];
// 	var lines = [];

// 	var minX = 0;
// 	var minY = 0;

// 	$.each(rootNodes, function(k,v) {
// 		var rootNode = v;

// 		buildSVGNode(rootNode, 0, minY, labels, nodes, lines);

// 		// Figure out our min x & y
// 		$.each(nodes, function(i,node) {
// 			if (node.x < minX)
// 				minX = node.x;

// 			if (node.y < minY)
// 				minY = node.y;
// 		});
// 	});
	

// 	minX = minX - (NODE_SIZE * 2);
// 	minY = minY - (NODE_SIZE * 2);
// 	var viewBoxWidth = (-1 * minX) + (NODE_SIZE * 2);
// 	var viewBoxHieght = (-1 * minY) + (NODE_SIZE * 2);

// 	/* <circle cx="150" cy="100" r="80" fill="green" /> */

// 	var targetWidth = 1000;
// 	var targetHeight = targetWidth * (viewBoxHieght/viewBoxWidth);
// 	var svg = d3.select("#viz").append("svg") 
// 		.attr("viewBox", minX + ", " + minY + ", " + viewBoxWidth + ", " + viewBoxHieght)
// 		.attr("width", targetWidth)
// 		.attr("height", targetHeight);

// 	$.each(lines, function(i, line) {
// 		// <path d="M 175 200 l 150 0" stroke="green" stroke-width="3" fill="none" />

// 		var path = "";
// 		$.each(line.coords, function(i, coord) {
// 			path += i == 0 ? "M " : "L ";
// 			path += coord.x + " " + coord.y + " ";
// 		})

// 		svg.append("path")
// 			.attr("stroke-width", 2)
// 			.attr("stroke", line.color)
// 			.attr("fill", "none")
// 			.attr("d", path)
// 			.attr("stroke-linejoin", "round");
// 	});

// 	$.each(nodes, function(i,node) {
// 		var shape;
// 		if (node.shape == "circle") {
// 			shape = svg.append("circle")
// 				.attr('cx', node.x)
// 				.attr('cy', node.y)
// 				.attr('r', NODE_SIZE);
// 		} else if (node.shape == "square") {
// 			var offsetX = node.x - NODE_SIZE;
// 			var offsetY = node.y - NODE_SIZE;
// 			shape = svg.append("rect")
// 				.attr('x', offsetX)
// 				.attr('y', offsetY)
// 				.attr('width', NODE_SIZE * 2)
// 				.attr('height', NODE_SIZE * 2);
// 		} else if (node.shape == "diamond") {
// 			// <polygon points="200,10 250,190 160,210" style="fill:lime;stroke:purple;stroke-width:1" />
// 			var coords = node.x + "," + (node.y - NODE_SIZE) + " " + (node.x + NODE_SIZE) + "," + node.y + " " + node.x + "," + (node.y + NODE_SIZE) + " " + (node.x - NODE_SIZE) + "," + node.y;
// 			shape = svg.append("polygon")
// 				.attr('points', coords);
// 		}

// 		shape
// 			.attr('fill', node.color)
// 			.attr('stroke', "black");
// 	});

// 	// <text x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>
// 	$.each(labels, function(i,label) {
// 		svg.append("text")
// 			.attr('x', label.x)
// 			.attr('y', label.y)
// 			.attr('font-size', 8)
// 			.attr('text-anchor', "middle")
// 			.attr('dominant-baseline', "middle")
// 			.html(label.label);
// 	});
// }

// var NODE_SIZE = 20;
// var NODE_V_SPACING = 52;
// var NODE_H_SPACING = 80;
// var NODE_H_TURN = 30;
// var STROKE_WEIGHT = 2;

// var INGREDIENT_ID = 1;
// var NON_ING_ID = 2;
// var COMPOSITE_ID = 3;

// var buildSVGNode = function(node, x, y, labels, nodes, lines) {
// 	var color;
// 	var shape;
// 	if (node.type == INGREDIENT_ID) {
// 		color = "#FF0000";
// 		shape = "circle";
// 	}
// 	else if (node.type == NON_ING_ID) {
// 		color = "#66CCFF";
// 		shape = "square";
// 	}
// 	else if (node.type == COMPOSITE_ID) {
// 		color = "#CCFF99";
// 		shape = "diamond";
// 	}

// 	var nodeItem = {
// 		"x": x,
// 		"y": y,
// 		"radius": NODE_SIZE,
// 		"type": node.type,
// 		"color": color,
// 		"shape": shape
// 	};
// 	nodes.push(nodeItem);

// 	var labelItem = {
// 		"x": x,
// 		"y": y,
// 		"label": node.label
// 	};
// 	labels.push(labelItem);

// 	$.each(node.children, function(k, child) {
// 		// First need to say where the line is gonna go
// 		var coords = [];
// 		var newX = x;
// 		var newY = y;

// 		// Compute the drop y, for subway style
// 		var yOffset = ((node.children.length - 1) * 0.5) * STROKE_WEIGHT;
// 		yOffset -= (STROKE_WEIGHT * k);
// 		yOffset = newY	+ yOffset;

// 		coords.push({"x": newX, "y": yOffset});

// 		// Move to the turn
// 		newX -= NODE_H_TURN;
// 		coords.push({"x": newX, "y": yOffset});

// 		newX -= NODE_H_SPACING;
// 		newY -= (k * NODE_V_SPACING);
// 		coords.push({"x": newX, "y": newY});

// 		newX -= NODE_H_TURN;
// 		coords.push({"x": newX, "y": newY});

// 		var newColor = buildSVGNode(child, newX, newY, labels, nodes, lines);

// 		var lineItem = {
// 			"coords": coords,
// 			"color": newColor
// 		};
// 		lines.push(lineItem);

// 	});
		
// 	return color;
// }

