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
		var loadPossibleIngredientsTask = $.getJSON( "data/ing.json" + cacheBuster(), function( data ) {
			that.ingredientMap = data;
			that.ingredientsList.push('');
			$.each(data, function(k,v) {
				that.ingredientsList.push(k);
			});

			that.ingredientsList.sort(function (a, b) {
    			return a.toLowerCase().localeCompare(b.toLowerCase());
    		});
		});
		

		var loadUnitsTask = $.getJSON("data/unit.json" + cacheBuster(), function(data) {
			that.unitsList.push('');
			$.each(data, function(k, v) {
				var unitName = v.name;
				that.unitsList.push(unitName);
				that.unitsMap[unitName] = v;
			});

			that.unitsList.sort();
		});

		var loadFunctionsTask = $.getJSON("data/functions.json" + cacheBuster(), function(data) {
			that.functionsList.push('');
			$.each(data, function(k, v) {
				that.functionsList.push(v.func);
				that.functionsMap[v.func] = v;
			});
			that.functionsList.sort();
		});

		var loadNonIngredeientsTask = $.getJSON("data/noning.json" + cacheBuster(), function(data) {
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
	imageUrl: "",
	drinkType: "",

	initialize: function(drinkId, completionHandler) {
		var that = this;
		that.drinkId = drinkId;

		var fileName = "drinks/" + drinkId + ".json" + cacheBuster();
		loadDrinkDataTask = $.getJSON(fileName, function(data) {
			that.drinkName = data.name;
			that.imageUrl = data.imageUrl;

    		$.each(data.ingredients, function(k,v) {
    			that.ingredients.push(v);
    		});
		    
    		$.each(data.instructions, function(k,v) {
    			var funcData = possibleItemsController.functionsMap[v.func];

    			var instructionData = v;
    			if (!instructionData.hasOwnProperty("name")) {
    				instructionData.name = v.id;
    			}

    			if (!instructionData.format) {
    				instructionData.format = funcData.formats[0];
    			}

    			if (!instructionData.instructionHint) {
    				instructionData.instructionHint = "";
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

			var instructionHint = rowData.instructionHint;

			var formatStrings = [];
			formatStrings.push(v.format);
			var format = formatInstructions(inputNames, formatStrings, instructionHint)[0];
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

	addInstruction: function(funcData, inputIds, formatIndex, instructionHint) {
		var id = this.genUniqueId("composite");
		var instEntry = {
			"func": funcData.func,
			"id": id,
			"name": "",
			"ingredients": inputIds,
			"format": funcData.formats[formatIndex],
			"formatIndex": formatIndex,
			"instructionHint": instructionHint
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

		this.nameChangedHandler();
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
			"imageUrl": this.imageUrl
		};

		return result;
	},

	setImageUrl: function(imageUrl) {
		this.imageUrl = imageUrl;

		this.dataChangedHandler();
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
	nameChangedHandler: null,
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

	instructionHint: null,

	instructionPreview: null,

	imageTextEdit: null,
	imagePreview: null,

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
		    filter: false
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
		        { data: 'displayText', width: '600px' },
		        { data: 'name', width: '200px', 'class' : 'edit' },
				{ data: 'id', width: '120px', height: '50px' }
		    ],
		    info: false,
		    paging: false,
		    filter: false
		});

		// this.instructionsList = $('#instructionsList');

		this.ingredientSelect = $('#ingredientSelect');
		this.initializeSelect(this.ingredientSelect, possibleItemsController.ingredientsList, 0);

		this.quantityTextEdit = $('#ing-qty');

		this.unitSelect = $('#unitSelect');
		this.initializeSelect(this.unitSelect, possibleItemsController.unitsList, 0);

		this.functionSelect = $('#functionInput');
		this.initializeSelect(this.functionSelect, possibleItemsController.functionsList, 0);

		this.imageTextEdit = $("#image-url");
		this.imagePreview = $("#previewImage");

		this.instructionHint = $("#instructionDescription")

		this.imageTextEdit.val(drinkDataController.imageUrl);

		this.refreshDataTables();

		// Set up the event handlers. 
		var that = this;

		drinkDataController.dataChangedHandler = function() {
			that.refreshDataTables();
		};

		drinkDataController.nameChangedHandler = function() {
			that.refreshDataTables(false);

			that.updateInstructionPreview();
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

		this.instructionHint.bind('keyup', function() {
			that.updateInstructionPreview();
		})

		$('#instructionAdd').click(function() {
			that.addNewInstruction();
		});

		$('#instructionsTable tbody').on('click', 'td.details-control', function () {
			var tr = $(this).closest('tr')[0];
	    	that.removeInstruction(tr.sectionRowIndex);
		});


		this.imageTextEdit.keydown(function() { 
			if (event.which === 13) { that.setPreviewImage(); }
		})

		$('#imageSave').click(function() {
			that.setPreviewImage();
		});

		this.imagePreview.error( function(e){
			that.imagePreview.attr("src", "resources/error_button.png");
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

		$("#instructionPreview").html("");

		this.instructionHint.val("");

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
	},

	refreshDataTables: function(clearIngredientSelects) {
		this.ingredientsTable.clear();
		this.ingredientsTable.rows.add(drinkDataController.ingredientsTableData()).draw();

		this.instructionsTable.clear();
		this.instructionsTable.rows.add(drinkDataController.instructionsTableData()).draw();

		var drinkJSON = drinkDataController.serializeCurrentDrink();
		$("#previewSection").html(drinkJSON);

		buildTree(drinkDataController.getCurrentDrink());

		if (typeof clearIngredientSelects == 'undefined' || clearIngredientSelects === true)
			this.populateIngredientSelects();

		var that = this;

		$('.edit').editable(function(value, settings) {
			var index = this.parentElement.sectionRowIndex;
			drinkDataController.setNameForInstruction(index, value);
		    return "";	
		  }, {
	         indicator : 'Saving...',
	         tooltip   : 'Click to give name'
	     });

		this.imagePreview.attr("src", drinkDataController.imageUrl);
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
		var instructionHint = this.instructionHint.val();

		if (!drinkDataController.validateInstruction(funcData, inputIds))
			return;

		drinkDataController.addInstruction(funcData, inputIds, formatIndex, instructionHint);

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

	updateInstructionPreview: function() {
		var selectedIndex = this.getSelectedFormatIndex();
		var funcData = this.getSelectedFunctionData();
		var inputIds = this.getSelectedInputIds();
		var inputNames = [];
		$.each(inputIds, function(k,v) {
			var name = drinkDataController.getNameFromId(v);
			inputNames.push(name);
		});

		var instructionHint = this.instructionHint.val();

		var formatStrings = formatInstructions(inputNames, funcData.formats, instructionHint);

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
		if (!selectedIndex || selectedIndex < 0)
			selectedIndex = 0;

		return selectedIndex;
	},

	setPreviewImage: function() {
		var imageUrl = this.imageTextEdit.val();
		drinkDataController.setImageUrl(imageUrl);
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
})

