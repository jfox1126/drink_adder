$(document).ready(function() {
	var loadData = function() {
		$.getJSON("data/drinksList.json" + cacheBuster(), function(data) {

			$.each(data, function(k, v) {
				v.editLink = "<a href='Index.html?drink=" + v.id + "' >Edit...</a>"
			});

			var columnWidth = "100px";
			var drinkListTable = $('#drinkListTable').DataTable( {
			    columns: [
			        { data: 'id', width: columnWidth },
			        { data: 'name', width: columnWidth },
			        { data: 'modified', width: columnWidth },
			        { data: 'editLink', width: columnWidth }
			    ],
			    info: false,
			    paging: false,
			    filter: false,
			    data: data
			});
		});
	}

	loadData();

	var genDrinkId = function(drinkName) {
		var result = drinkName.replace(/ /g, "_");
		result = result.toLowerCase();
		result = result.replace(/[\W]+/g,"");
		return result;
	}

	var addNewDrink = function() {
		// First get the text for the new drink Name
		var newDrinkName = $("#newDrinkName").val();
		var newDrinkId = genDrinkId(newDrinkName);

		uploadDrink(newDrinkName, newDrinkId, [], [], "", "", function(id) {
			// Navigate to the drink editing page
			window.location.href = '../Index.html?drink=' + id;
		});
	};

	$('#createDrinkButton').click(function() {
		addNewDrink();
	});
});