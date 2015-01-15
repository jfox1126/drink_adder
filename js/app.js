$(document).ready(function() {
	
	var ingArray = new Array();
	var addIng = function() {
		if (event.which === 13) {
			var name = $('#ing-name').val().trim();
			var qty = $('#ing-qty').val();
			var unit = $('#ing-unit').val().trim();
			//var ingEntry = '<li class="entry">' + '<div class="ing-name-entry">' + name + '</div>' + '<div class="ing-qty-entry">' + qty + '</div>' + '<div class="ing-unit-entry">' + unit + '</div>'; 			
			var ingEntry = [
				name,
				qty,
				unit
			]
			//console.log(ingEntry);
			if (name.length == 0 || qty.length == 0 || unit.length == 0) {
				alert("Please enter all fields");
			} else {
				ingArray.push(ingEntry);
				$('#ing-list').append('<li class = "ing-entry">'+ ingEntry[0] + ", " + ingEntry[1] + ingEntry[2] +'</li>');
				$('.ing-input').val('');
			}
		}
	}
	$('.ing-input').keydown(function() {
		addIng();
	})

	var instArray = new Array();
	var addInst = function() {
		if (event.which === 13) {
			var instFunc = $('#function-input').val().trim();
			var rawInputs = new Array();
			for (var i = 1; i <= 5; i++) {
				rawInputs[i] = $('#var' + i).val().trim();
			};
			var cleanInputs = new Array();
			for (var i = 0; i<rawInputs.length; i++) {
				if (rawInputs[i]) {
					cleanInputs.push(rawInputs[i]);
				}
			}
			//console.log(cleanInputs)
			var instEntry = '<li class="instEntry">' + instFunc + '(' + cleanInputs + ')' + '</li>';
			var instruction = [
				instFunc,
				cleanInputs
			]
			if (instFunc == 0) {
				alert("Please enter an instruction function");
			} else {
				instArray.push(instruction);
				$('#inst-list').append(instEntry);
				$('#function-input').val('');
				$('.inst-inputs').val('');
			}
			console.log(instArray);
		}
	}

	$('.inst-inputs').keydown(function() {
		addInst();
	})
})

