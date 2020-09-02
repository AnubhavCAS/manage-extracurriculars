function getFormattedStringForID(str) {
	return str.replace(/\s/g, "_");
}

function switchContainerTab(newTab) {
	$("#container-tabs").children().each(
		function(i) {
			if ($(this).attr("id") != newTab) {
				$(this).hide();
			}
		}
	);
	$("#" + newTab).show();
}

function setAlertText(type, text) {
	let alertElement = $("#view-extracurricular").is(":hidden") ? $("#addCatButton-alert") : $("#view-extracurricular-alert");
	let icon = "";
	if (type == "danger") {
		icon = '<i class="fas fa-exclamation-triangle"></i> ';
	} else if (type == "success") {
		icon = '<i class="fas fa-check"></i> ';
	} else if (type == "info") {
		icon = '<i class="fas fa-info-circle"></i> ';
	}
	alertElement.empty();
	alertElement.append(icon + text);
	((text == "") ? alertElement.hide() : alertElement.show());
	alertElement.removeClass();
	alertElement.addClass("alert alert-" + type);
}

function doesExtracurricularExist(name) {
	for (let i = 0; i < localExtracurricularCache.length; i++) {
		let object = localExtracurricularCache[i];
		if (object.includes(name)) {
			return true;
		}
	}
	return false;
}

function doesPassCategoryNameTest(categoryName) {
	if (categoryName.replace(/\s/g, "") == "") {
		setAlertText("danger", "Please enter a valid category name.");
		return false;
	}
	if (localCategoryCache.includes(categoryName)) {
		setAlertText("danger", "There is already a category with the name '" + categoryName + "'. Please enter another category name.");
		return false;
	}
	if (!regexAlpha.test(categoryName)) {
		setAlertText("danger", "You can only have normal alphabets and spaces in your category name.");
		return false;
	}
	return true;
}

function doesPassExtracurricularNameTest(name) {
	if (name.replace(/\s/g, "") == "") {
		setAlertText("danger", "Please enter a valid extracurricular name.");
		return false;
	} else if (name.indexOf("_") > -1) {
		setAlertText("danger", "You cannot have '_' in your extracurricular name");
		return false;
	} else if (doesExtracurricularExist(name)) {
		setAlertText("danger", "An extracurricular already exists with this name. Please choose another name.");
		return false;
	}
	return true;
}

function filterEditEvent(event) {
	let key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
	if (!regexAlpha.test(key)) {
		event.preventDefault();
		return false;
	}
}

function trimUserInput(event) {
	$(this).val(this.value.trim());
}