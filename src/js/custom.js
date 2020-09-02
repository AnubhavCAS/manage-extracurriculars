const {ipcRenderer} = require('electron');
var localCategoryCache = [];
var localExtracurricularCache = [];
var quillEditor = null;
var regexAlpha = new RegExp("^[a-zA-Z ]+$");
ipcRenderer.send("requestCache");

function addCategory(name) {
	let nameID = getFormattedStringForID(name);
	$("#categoryList").append(
"<div class='card'>\
	<div class='card-header card-blue inline absolute' id='cat" + nameID + "'>\
		<h5 class='mb-0'>\
			<input type='text' spellcheck='false' id='cat-" + nameID + "-edit' class='cat-edit-field a-cat' value='" + name + "'>\
			<a href='#' id='cat-" + nameID + "-display' class='a-cat' data-toggle='collapse' data-target='#collapse" + nameID + "' aria-expanded='false' aria-controls='collapse" + nameID + "'>"
				+ name + 
			"</a>\
			<a href='#' id='cat-tickedit-" + nameID + "'>\
				<i class='fas fa-check'></i>\
			</a>\
			<a href='#' id='cat-canceledit-" + nameID + "'>\
				<i class='fas fa-times'></i>\
			</a>\
			<a href='#' id='cat-edit-" + nameID + "'>\
				<i class='fas fa-pencil-alt'></i>\
			</a>\
			<a href='#' id='cat-delete-" + nameID + "'>\
				<i class='fas fa-trash'></i>\
			</a>\
		</h5>\
	</div>\
	<div id='collapse" + nameID + "' class='collapse' aria-labelledby='cat" + nameID + "'>\
		<div class='card-body'>\
			<table class='table table-striped'>\
				<thead class='card-blue'>\
					<tr>\
						<th scope='col'>Date</th>\
						<th scope='col'>Activity Name</th>\
					</tr>\
				</thead>\
				<tbody id='catBody" + nameID + "'>\
					<tr>\
						<td>-</td>\
						<td>-</td>\
					</tr>\
				</tbody>\
			</table>\
			<button type='button' class='btn btn-dark new-extracurricular' id='add-new-" + nameID + "'>\
				<span class='fa-stack'>\
					<i class='fa fa-circle fa-stack-2x'></i>\
					<i class='fa fa-plus fa-stack-1x fa-inverse'></i>\
				</span>\
				Add new extracurricular\
			</button>\
		</div>\
	</div>\
</div>");
	$("#cat-tickedit-" + nameID).hide();
	$("#cat-canceledit-" + nameID).hide();
	$("#cat-" + nameID + "-edit").hide();
	$("#cat-" + nameID + "-edit").keypress(filterEditEvent);
	$("#cat-tickedit-" + nameID).click(
		(e) => {
			let newCategoryName = $("#cat-" + nameID + "-edit").val().trim();
			if (!doesPassCategoryNameTest(newCategoryName)) {
				return false;
			}
			ipcRenderer.send("requestRenameCategory", name, newCategoryName);
		}
	);
	$("#cat-canceledit-" + nameID).click(
		(e) => {
			$("#cat-tickedit-" + nameID).hide();
			$("#cat-canceledit-" + nameID).hide();
			$("#cat-edit-" + nameID).show();
			$("#cat-" + nameID + "-edit").hide();
			$("#cat-" + nameID + "-display").show();
			$("#cat-" + nameID + "-edit").val($("#cat-" + nameID + "-display").html());
		}
	);
	$("#cat-edit-" + nameID).click(
		(e) => {
			$("#cat-tickedit-" + nameID).show();
			$("#cat-canceledit-" + nameID).show();
			$("#cat-edit-" + nameID).hide();
			$("#cat-" + nameID + "-edit").show();
			$("#cat-" + nameID + "-display").hide();
		}
	);
	$("#cat-delete-" + nameID).confirm({
		text: "Are you sure you want to delete the category '" + name + "'?",
		title: "Confirm delete category",
		confirmButton: "Yes, delete",
		cancelButton: "No",
		confirm: (button) => {
			if (!localCategoryCache.includes(name)) {
				setAlertText("danger", "There is no category with the name '" + name + "'.");
				return false;
			}
			if (localCategoryCache.length == 1) {
				setAlertText("danger", "You cannot remove the only category remaining.");
				return false;
			}
			for (let i = 0; i < localExtracurricularCache.length; i++) {
				if (localExtracurricularCache[i][3].split(",").includes(name)) {
					setAlertText("danger", "You can only remove empty categories.");
					return false;
				}
			}
			ipcRenderer.send("requestDeleteCategory", name);
		},
		post: false,
		confirmButtonClass: "btn btn-danger",
		cancelButtonClass: "btn btn-default",
		dialogClass: "modal-dialog modal-lg",
	});
	$("#add-new-" + nameID).click(
		(e) => {
			setupCreateExtracurricularTab(name);
			switchContainerTab("new-extracurricular");
		}
	);
}

function removeCategory(name) {
	$("#cat" + getFormattedStringForID(name)).parent("div").remove();
}

function refreshCategories() {
	$("#categoryList").empty();
	$("#categoryList").append("<br><br>");
	localCategoryCache.forEach(
		(catName) => {
			addCategory(catName);
		}
	);
}

function refreshExtracurriculars() {
	localCategoryCache.forEach(
		(categoryName) => {
			$("#catBody" + getFormattedStringForID(categoryName)).empty();
		}
	);
	localExtracurricularCache.forEach(
		(obj) => {
			addExtracurricular(obj);
		}
	);
}

function addExtracurricular(obj) {
	let formattedObj = getFormattedStringForID(obj[0]);
	obj[3].split(",").forEach(
		(categoryName) => {
			$("#catBody" + getFormattedStringForID(categoryName)).append("\
		<tr id='extracurricular-" + formattedObj + "' class='clickable extracurricular-'>\
			<td>" + obj[1].split(" ")[0] + "</td>\
			<td>" + obj[0] + "</td>\
		</tr>");
			$("[id='extracurricular-" + $.escapeSelector(formattedObj) + "'").off("click");
			$("[id='extracurricular-" + $.escapeSelector(formattedObj) + "'").click(
				(e) => {
					setupViewExtracurricularTab(obj);
					switchContainerTab("view-extracurricular");
				}
			)
		}
	);
}

function removeExtracurricular(name) {
	let obj = $("#extracurricular-" + getFormattedStringForID(name)).parent("tbody");
	$("#extracurricular-" + getFormattedStringForID(name)).remove();
	if (localExtracurricularCache.length == 0) {
		obj.append("\
	<tr>\
		<th scope='row'>-</th>\
		<td>-</td>\
		<td>-</td>\
	</tr>");
	}
}

function setupCreateExtracurricularTab(categoryName, name, date, contents) {
	$("#new-extracurricular-head").html(!name ? ("Add a new extracurricular to <kbd class='dark'>" + categoryName + "</kbd>") : "Modifying extracurricular '" + name + "'");
	$("#new-extracurricular-name").val(name || "");
	$("#new-extracurricular-datepicker").val(date || "");
	quillEditor.setContents(contents || [{ insert: '\n' }]);
	$("#new-extracurricular-category").val(name ? name : categoryName);
	$("#new-extracurricular-submit").html(name ? "Modify extracurricular" : "Add extracurricular");
}

function setupViewExtracurricularTab(obj) {
	$("#view-extracurricular-name").html(obj[0]);
	$("#view-extracurricular-date").empty();
	var catDropdownStr = "";
	var catStr = "";
	var objCat = obj[3].split(",");
	localCategoryCache.forEach(
		(categoryName) => {
			if (!objCat.includes(categoryName)) {
				catDropdownStr += "<button class='dropdown-item' type='button'>" + categoryName + "</button> ";
			}
		}
	);
	objCat.forEach(
		(categoryName) => {
			catStr += "<kbd class='dark'>" + categoryName + " <i class='fas fa-times-circle clickable remove-cat'></i></kbd> "
		}
	);
	$("#view-extracurricular-category").html(catStr +
	"<div class='dropdown inline-block'>\
		<i class='fas fa-plus-circle clickable' id='add-category-dropdown' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'></i>\
		<div class='dropdown-menu' aria-labelledby='add-category-dropdown'>" + catDropdownStr + "</div>\
	</div>");
	obj[1].split(" ").forEach(
		(date) => {
			$("#view-extracurricular-date").append("<mark>" + date + "</mark> ");
		}
	);
	quillEditor.setContents(JSON.parse(obj[2]));
	$("#view-extracurricular-info").html(quillEditor.root.innerHTML);
	$("#modify-extracurricular").off("click");
	$("#modify-extracurricular").click(
		(e) => {
			setupCreateExtracurricularTab(obj[0], obj[0], obj[1], JSON.parse(obj[2]));
			switchContainerTab("new-extracurricular");
		}
	);
	$("#delete-extracurricular").off("click");
	$("#delete-extracurricular").confirm({
		text: "Are you sure you want to delete the extracurricular '" + obj[0] + "'?",
		title: "Confirm delete extracurricular",
		confirmButton: "Yes, delete",
		cancelButton: "No",
		confirm: (button) => {
			if (!doesExtracurricularExist(obj[0])) {
				setAlertText("danger", "There is no extracurricular with the name '" + obj[0] + "'.");
				return false;
			}
			ipcRenderer.send("requestDeleteExtracurricular", obj[0]);
		},
		post: false,
		confirmButtonClass: "btn btn-danger",
		cancelButtonClass: "btn btn-default",
		dialogClass: "modal-dialog modal-lg",
	});
}

$(document).ready(
	() => {
		$("#menu-toggle").click(
			(e) => {
				e.preventDefault();
				$("#wrapper").toggleClass("toggled");
			}
		);
		$("#addCatButton").click(
			(e) => {
				let categoryName = $("#catName").val().trim();
				if (!doesPassCategoryNameTest(categoryName)) {
					return false;
				}
				ipcRenderer.send("requestAddCategory", categoryName);
			}
		);
		$("#new-extracurricular-submit").click(
			(e) => {
				let add = $("#new-extracurricular-submit").html().startsWith("Add");
				let name = $("#new-extracurricular-name").val().trim();
				let dates = $("#new-extracurricular-datepicker").val();
				let additionalInfo = JSON.stringify(quillEditor.getContents());
				let categoryName = $("#new-extracurricular-category").val();
				let alertText = "";
				if (name.replace(/\s/g, "") == "") {
					alertText = "Please enter a valid extracurricular name.";
				} else if (name.indexOf("_") > -1) {
					alertText = "You cannot have '_' in your extracurricular name";
				} else if (dates.replace(/\s/g, "") == "") {
					alertText = "Please enter a valid date.";
				} else if (add && doesExtracurricularExist(name)) {
					alertText = "An extracurricular already exists with this name. Please choose another name.";
				}
				setAlertText("danger", alertText);
				if (alertText != "") {
					return false;
				}
				ipcRenderer.send(add ? "requestAddExtracurricular" : "requestEditExtracurricular", categoryName, name, dates, additionalInfo);
			}
		);
		$("#click-dash").click(
			(e) => {
				switchContainerTab("dashboard");
			}
		);
		$('#new-extracurricular-datepicker').datepicker({
			clearBtn: true,
      		format: 'dd-mm-yyyy',
      		multidate: true,
      		multidateSeparator: " "
    	});
		var toolbarOptions = [
			['bold', 'italic', 'underline', 'strike'],        // toggled buttons
			[{ 'list': 'ordered'}, { 'list': 'bullet' }],
			[{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
			[{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
			[{ 'header': [1, 2, 3, 4, 5, 6, false] }],
			['clean']                                         // remove formatting button
		];
		quillEditor = new Quill('#new-extracurricular-additional',
			{
				modules: {
					toolbar: toolbarOptions
				},
				theme: 'snow'
			}
		);
		$(document).on("click", ".dropdown-item",
			function() {
				var catName = $(this).text();
				var extraCurricular = $("#view-extracurricular-name").html();
				if (catName == "") {
					return true;
				}
				if (!localCategoryCache.includes(catName)) {
					setAlertText("danger", "There is no category with the name '" + catName + "'");
					return false;
				}
				for (let i = 0; i < localExtracurricularCache.length; i++) {
					if (localExtracurricularCache[i][0] == extraCurricular) {
						if (localExtracurricularCache[i][3].split(",").includes(catName)) {
							setAlertText("danger", "'" + extraCurricular + "' already has the category '" + catName + "'");
							return false;
						}
						break;
					}
				}
				ipcRenderer.send("requestAddCategoryToExtracurricular", extraCurricular, catName);
			}
		);
		$(document).on("click", ".remove-cat",
			function() {
				var catName = $(this).parent().text().trim();
				var extraCurricular = $("#view-extracurricular-name").html();
				if (catName == "") {
					return true;
				}
				for (let i = 0; i < localExtracurricularCache.length; i++) {
					if (localExtracurricularCache[i][0] == extraCurricular) {
						let catList = localExtracurricularCache[i][3].split(",");
						if (!catList.includes(catName)) {
							setAlertText("danger", "'" + extraCurricular + "' does not belong to the category '" + catName + "'");
							return false;
						}
						if (catList.length == 1) {
							setAlertText("danger", "You cannot remove the only category remaining.");
							return false;
						}
						break;
					}
				}
				ipcRenderer.send("requestRemoveCategoryFromExtracurricular", extraCurricular, catName);
			}
		);
		$('button.ql-bold').attr('title', 'Bold');
		$('button.ql-italic').attr('title', 'Italic');
		$('button.ql-underline').attr('title', 'Underline');
		$('button.ql-strike').attr('title', 'Strikethrough');
		$('button.ql-list').attr('title', 'List');
		$('button.ql-script[value="super"]').attr('title', 'Superscript');
		$('button.ql-script[value="sub"]').attr('title', 'Subscript');
		$('button.ql-clean').attr('title', 'Clear Formatting');
		$("#catName").keypress(filterEditEvent);
	}
)

ipcRenderer.on('cacheUpdate', 
	(event, categoryCache, extracurricularCache) => {
		$("#catName").removeAttr("disabled");
		$("#addCatButton").removeAttr("disabled");
		setAlertText("info", "");
		localCategoryCache = categoryCache;
		localExtracurricularCache = extracurricularCache;
		if (extracurricularCache.length > 0) {
			$.when(refreshCategories()).then(refreshExtracurriculars());
		} else {
			refreshCategories();
		}
	}
);

ipcRenderer.on('loadingCache',
	(event) => {
		setAlertText("info", "Loading cache.... please wait.");
	}
);

ipcRenderer.on('confirmAddCategory',
	(event, categoryName) => {
		localCategoryCache.push(categoryName);
		addCategory(categoryName);
		setAlertText("success", "A new category called '" + categoryName + "' has been added.");
	}
);

ipcRenderer.on('confirmDeleteCategory',
	(event, categoryName) => {
		localCategoryCache.splice(localCategoryCache.indexOf(categoryName), 1);
		removeCategory(categoryName);
		setAlertText("success", "The category '" + categoryName + "' has been deleted.");
	}
);

ipcRenderer.on('confirmRenameCategory',
	(event, categoryCache, extracurricularCache, oldName, newName) => {
		setAlertText("success", "The category '" + oldName + "' has been successfully renamed to '" + newName + "'");
		localCategoryCache = categoryCache;
		localExtracurricularCache = extracurricularCache;
		if (extracurricularCache.length > 0) {
			$.when(refreshCategories()).then(refreshExtracurriculars());
		} else {
			refreshCategories();
		}
	}
);

ipcRenderer.on('confirmAddExtracurricular',
	(event, obj) => {
		localExtracurricularCache.push(obj);
		addExtracurricular(obj);
		switchContainerTab("dashboard");
	}
);

ipcRenderer.on('confirmDeleteExtracurricular',
	(event, name) => {
		for (let i = 0; i < localExtracurricularCache.length; i++) {
			if (localExtracurricularCache[i][0] == name) {
				localExtracurricularCache.splice(i, 1);
				break;
			}
		}
		switchContainerTab("dashboard");
		removeExtracurricular(name);
		setAlertText("success", "The extracurricular '" + name + "' has been deleted.");
	}
);

ipcRenderer.on('confirmEditExtracurricular',
	(event, oldName, newName, dates, info) => {
		for (let i = 0; i < localExtracurricularCache.length; i++) {
			if (localExtracurricularCache[i][0] == oldName) {
				localExtracurricularCache[i] = [newName, dates, info, localExtracurricularCache[i][3]];
				setupViewExtracurricularTab(localExtracurricularCache[i]);
				break;
			}
		}
		let obj = $("#extracurricular-" + getFormattedStringForID(oldName));
		obj.empty();
		obj.html("\
	<td>" + dates.split(" ")[0] + "</td>\
	<td>" + newName + "</td>");
		obj.attr("id", "extracurricular-" + getFormattedStringForID(newName));
		switchContainerTab("view-extracurricular");
	}
);

ipcRenderer.on('confirmAddCategoryToExtracurricular',
	(event, name, catName) => {
		for (let i = 0; i < localExtracurricularCache.length; i++) {
			if (localExtracurricularCache[i][0] == name) {
				localExtracurricularCache[i][3] += "," + catName;
				$.when(refreshCategories()).then(refreshExtracurriculars());
				setupViewExtracurricularTab(localExtracurricularCache[i]);
				break;
			}
		}
		setAlertText("success", "'" + name + "' is now a part of category '" + catName + "'");
	}
);

ipcRenderer.on('confirmRemoveCategoryFromExtracurricular',
	(event, name, catName) => {
		for (let i = 0; i < localExtracurricularCache.length; i++) {
			if (localExtracurricularCache[i][0] == name) {
				let catList = localExtracurricularCache[i][3].split(",");
				catList.splice(catList.indexOf(catName), 1);
				localExtracurricularCache[i][3] = catList.join(",");
				$.when(refreshCategories()).then(refreshExtracurriculars());
				setupViewExtracurricularTab(localExtracurricularCache[i]);
				setAlertText("success", "'" + name + "' is no more a part of category '" + catName + "'");
				break;
			}
		}
	}
);

ipcRenderer.on('setAlert',
	(event, type, alertText) => {
		setAlertText(type, alertText);
	}
);