const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

var categoryCache = [];
var extracurricularCache = [];
var cachesLoaded = false;
var sendCacheOnLoad = false;
var mainWindow = null;
var regexAlpha = new RegExp("^[a-zA-Z ]+$");

let db = new sqlite3.Database(path.join(app.getAppPath("userData").replace("app.asar", ""), "data.db"),
	(err) => {
		if (err) {
			throw err;
		}
		db.serialize(
			() => {
				db.run("CREATE TABLE IF NOT EXISTS `categories` (`catName` TEXT PRIMARY KEY)");
				db.run("CREATE TABLE IF NOT EXISTS `extracurriculars` (`extraName` TEXT PRIMARY KEY, `extraDetails` TEXT, `date` TEXT, `catName` TEXT)");
				db.all("SELECT * FROM `categories`", [], 
					(err, rows) => {
						if (err) {
							throw err;
						}
						if (rows.length == 0) {
							db.run("INSERT INTO `categories` (`catName`) VALUES(\'Default\')");
							categoryCache.push("Default");
						} else {
							rows.forEach(
								(row) => {
									categoryCache.push(row.catName);
								}
							);
						}
					}
				);
				db.all("SELECT * FROM `extracurriculars`", [], 
					(err, rows) => {
						if (err) {
							throw err;
						}
						rows.forEach(
							(row) => {
								extracurricularCache.push([row.extraName, row.date, row.extraDetails, row.catName]);
							}
						);
						cachesLoaded = true;
						if (sendCacheOnLoad) {
							mainWindow.webContents.send("cacheUpdate", categoryCache, extracurricularCache);
							sendCacheOnLoad = false;
						}
					}
				);
			}
		);
	}
);

function createWindow() {
	const mainWindow = new BrowserWindow({
		title: "Manage extracurriculars",
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
		},
	})
	mainWindow.loadFile('src/index.html');
	mainWindow.removeMenu();
}

function doesExtracurricularExist(name) {
	for (let i = 0; i < extracurricularCache.length; i++) {
		let object = extracurricularCache[i];
		if (object.includes(name)) {
			return true;
		}
	}
	return false;
}

function doesPassCategoryNameTest(categoryName) {
	if (categoryName.replace(/\s/g, "") == "") {
		event.sender.send('setAlert', "danger", "Please enter a valid category name.");
		return false;
	}
	if (categoryCache.includes(categoryName)) {
		event.sender.send('setAlert', "danger", "There is already a category with the name '" + categoryName + "'. Please enter another category name.");
		return false;
	}
	if (categoryName.indexOf("_") > -1) {
		event.sender.send('setAlert', "danger", "You cannot have '_' in your category name.");
		return false;
	}
	if (!regexAlpha.test(categoryName)) {
		event.sender.send('setAlert', "danger", "You can only have normal alphabets and spaces in your category name.");
		return false;
	}
	return true;
}

function doesPassExtracurricularNameTest(name) {
	if (name.replace(/\s/g, "") == "") {
		event.sender.send('setAlert', "danger", "Please enter a valid extracurricular name.");
		return false;
	} else if (name.indexOf("_") > -1) {
		event.sender.send('setAlert', "danger", "You cannot have '_' in your extracurricular name");
		return false;
	} else if (doesExtracurricularExist(name)) {
		event.sender.send('setAlert', "danger", "An extracurricular already exists with this name. Please choose another name.");
		return false;
	}
	return true;
}

ipcMain.on('requestCache',
	(event) => {
		if (!cachesLoaded) {
			event.sender.send('loadingCache');
			sendCacheOnLoad = true;
			return false;
		}
		event.sender.send('cacheUpdate', categoryCache, extracurricularCache);
	}
);

ipcMain.on('requestAddCategory',
	(event, categoryName) => {
		if (!doesPassCategoryNameTest(categoryName)) {
			return false;
		}
		categoryCache.push(categoryName);
		db.run("INSERT INTO `categories` (`catName`) VALUES(?)", categoryName);
		event.sender.send('confirmAddCategory', categoryName);
	}
);

ipcMain.on('requestDeleteCategory',
	(event, categoryName) => {
		if (!categoryCache.includes(categoryName)) {
			event.sender.send('setAlert', "danger", "There is no category with the name '" + categoryName + "'.");
			return false;
		}
		if (categoryCache.length == 1) {
			event.sender.send('setAlert', "danger", "You cannot remove the only category remaining.");
			return false;
		}
		for (let i = 0; i < categoryCache.length; i++) {
			if (categoryCache[i][3].split(",").includes(name)) {
				event.sender.send('setAlert', "danger", "You can only remove empty categories.");
				return false;
			}
		}
		categoryCache.splice(categoryCache.indexOf(categoryName), 1);
		db.run("DELETE FROM `categories` WHERE `catName` = ?", categoryName);
		event.sender.send('confirmDeleteCategory', categoryName);
	}
);

ipcMain.on('requestRenameCategory',
	(event, oldName, newName) => {
		if (!doesPassCategoryNameTest(newName)) {
			return false;
		}
		db.serialize(
			() => {
				db.run("UPDATE `categories` SET `catName` = ? WHERE `catName` = ?", newName, oldName);
				db.run("UPDATE `extracurriculars` SET `catName` = replace(`catName`, ?, ?)", oldName, newName);
			}
		);
		for (let i = 0; i < extracurricularCache.length; i++) {
			let object = extracurricularCache[i];
			object[3] = object[3].replace(oldName, newName);
		}
		for (let i = 0; i < categoryCache.length; i++) {
			if (categoryCache[i] == oldName) {
				categoryCache[i] = newName;
				break;
			}
		}
		event.sender.send('confirmRenameCategory', categoryCache, extracurricularCache, oldName, newName);
	}
);

ipcMain.on('requestAddExtracurricular',
	(event, categoryName, name, dates, additionalInfo) => {
		if (!doesPassExtracurricularNameTest(name)) {
			return false;
		} else if (dates.replace(/\s/g, "") == "") {
			event.sender.send('setAlert', "danger", "Please enter a valid date.");
			return false;
		}
		extracurricularCache.push([name, dates, additionalInfo, categoryName]);
		db.run("INSERT INTO `extracurriculars` (`extraName`, `extraDetails`, `date`, `catName`) VALUES(?, ?, ?, ?)", name, additionalInfo, dates, categoryName);
		event.sender.send('confirmAddExtracurricular', [name, dates, additionalInfo, categoryName]);
	}
);

ipcMain.on('requestDeleteExtracurricular',
	(event, name) => {
		if (!doesExtracurricularExist(name)) {
			event.sender.send('setAlert', "danger", "There is no extracurricular with the name '" + name + "'.");
			return false;
		}
		db.run("DELETE FROM `extracurriculars` WHERE `extraName` = ?", name);
		for (let i = 0; i < extracurricularCache.length; i++) {
			if (extracurricularCache[i][0] == name) {
				extracurricularCache.splice(i, 1);
				break;
			}
		}
		event.sender.send('confirmDeleteExtracurricular', name);
	}
);

ipcMain.on('requestEditExtracurricular',
	(event, oldName, newName, dates, info) => {
		if (newName.replace(/\s/g, "") == "") {
			event.sender.send('setAlert', "danger", "Please enter a valid extracurricular name.");
			return false;
		} else if (newName.indexOf("_") > -1) {
			event.sender.send('setAlert', "danger", "You cannot have '_' in your extracurricular name");
			return false;
		} else if (dates.replace(/\s/g, "") == "") {
			event.sender.send('setAlert', "danger", "Please enter a valid date.");
			return false;
		} else if ((oldName != newName) && doesExtracurricularExist(newName)) {
			event.sender.send('setAlert', "danger", "An extracurricular already exists with this name. Please choose another name.");
			return false;
		}
		for (let i = 0; i < extracurricularCache.length; i++) {
			if (extracurricularCache[i][0] == oldName) {
				extracurricularCache[i] = [newName, dates, info, extracurricularCache[i][3]];
				break;
			}
		}
		db.run("UPDATE `extracurriculars` SET `extraName` = ?, `extraDetails` = ?, `date` = ? WHERE `extraName` = ?", newName, info, dates, oldName);
		event.sender.send('confirmEditExtracurricular', oldName, newName, dates, info);
	}
);

ipcMain.on("requestAddCategoryToExtracurricular",
	(event, name, catName) => {
		if (!categoryCache.includes(catName)) {
			event.sender.send('setAlert', "danger", "There is no category with the name '" + catName + "'");
			return false;
		}
		for (let i = 0; i < extracurricularCache.length; i++) {
			if (extracurricularCache[i][0] == name) {
				if (extracurricularCache[i][3].split(",").includes(catName)) {
					event.sender.send('setAlert', "danger", "'" + name + "' already has the category '" + catName + "'");
					return false;
				}
				extracurricularCache[i][3] += "," + catName;
				db.run("UPDATE `extracurriculars` SET `catName` = ? WHERE `extraName` = ?", extracurricularCache[i][3], name);
				break;
			}
		}
		event.sender.send('confirmAddCategoryToExtracurricular', name, catName);
	}
);

ipcMain.on("requestRemoveCategoryFromExtracurricular",
	(event, name, catName) => {
		if (!categoryCache.includes(catName)) {
			event.sender.send('setAlert', "danger", "There is no category with the name '" + catName + "'");
			return false;
		}
		for (let i = 0; i < extracurricularCache.length; i++) {
			if (extracurricularCache[i][0] == name) {
				let catList = extracurricularCache[i][3].split(",");
				if (!catList.includes(catName)) {
					event.sender.send('setAlert', "danger", "'" + extraCurricular + "' does not belong to the category '" + catName + "'");
					return false;
				}
				if (catList.length == 1) {
					event.sender.send('setAlert', "danger", "You cannot remove the only category remaining.");
					return false;
				}
				catList.splice(catList.indexOf(catName), 1);
				extracurricularCache[i][3] = catList.join(",");
				db.run("UPDATE `extracurriculars` SET `catName` = ? WHERE `extraName` = ?", extracurricularCache[i][3], name);
				break;
			}
		}
		event.sender.send('confirmRemoveCategoryFromExtracurricular', name, catName);
	}
);

app.whenReady().then(() => {
	createWindow();
	
	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
});