function uploadDrink(name, id, ingredients, instructions, classification, url, successHandler) {
	var drinkResult = {
		"id": id,
		"name": name,
		"ingredients": ingredients,
		"instructions": instructions,
		"classification": classification,
		"imageUrl": url
	};

	if (drinkResult) {
		var postString = JSON.stringify(drinkResult);
		$.post( "UploadDrink.html?drink=" + id, postString, function() {
			console.log("Post has succeeded")
			successHandler(id);
		}, "text");
	}
}