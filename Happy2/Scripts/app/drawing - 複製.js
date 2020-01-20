var XY_COMBINE_SEPARATOR = "_";
var PATH_EXPIRE_LIMIT = 2500;
var GO_DELTA = 50;
var ACTIVITY_COUNT = 10;
var BLOCK_SIZE = 500;
var OUTSIDE_BLOCK_DIST_X = 5;
var OUTSIDE_BLOCK_DIST_Y = 4;

//var ITERATE_ARRAY_X = [0, 1, 0, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0];
//var ITERATE_ARRAY_Y = [0, 0, -1, 0, 0, 1, 1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, -1, -1, -1, -1];
var ITERATE_ARRAY_X = [0, -1, 0, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0];
var ITERATE_ARRAY_Y = [0, 0, -1, 0, 0, 1, 1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, -1, -1, -1, -1];

var g_user_id;

var ds =
	{
		is_tracking: false,

		tracking_path: null,
		tracking_pt: { x: 0, y: 0 },

		drawing_ctx: null,
		all_paths: {},
		pending_paths: [],

		csp_timer_id: null,
		msg_timer_id: null,
		uHome: { x: 0, y: 0 },

		$coord_para: null,
		$msg_para: null,
	};
var ct =
	{
		shift: { x: 0, y: 0 },
		scale: { x: 1, y: -1 },
	};
var al =
	{
		activity_cnt: {},
		recent: [],
		activity_pt: {},
		recent_idx: 0,
	};
var ua =
	{
		wait_upload_paths: [],
		undoed_paths: [],
		just_undo: false,
	};
var us =
	{
		user_status: {},
		user_position: {},
		last_mouse_pos: {},
		mouse_pos_uploaded: true,
	};

function Path(type, user_id, uPt) {
	this.type = type;		// 0=invalid, 1=pencil, 2=eraser.
	this.userId = user_id;

	this.head = { x: 0, y: 0 };
	this.blockIdx = { x: 0, y: 0 };

	if (uPt) {
		//console.log("uPt.x=" + uPt.x + ", uPt.y=" + uPt.y + ".");

		this.blockIdx.x = Math.floor((uPt.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
		this.blockIdx.y = Math.floor((uPt.y + BLOCK_SIZE / 2) / BLOCK_SIZE);
		this.head.x = uPt.x - this.blockIdx.x * BLOCK_SIZE;
		this.head.y = uPt.y - this.blockIdx.y * BLOCK_SIZE;
	}

	this.dx = [];
	this.dy = [];

	this.uHead = function () {
		return { x: this.blockIdx.x * BLOCK_SIZE + this.head.x, y: this.blockIdx.y * BLOCK_SIZE + this.head.y };
	};
}
function randomPick(text) {
	var idx = Math.floor(Math.random() * text.length);
	return text[idx];
}
function randomAlphaNumericCharacter() {
	return randomPick("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
}
function randomAlphaNumericString(len) {
	var text = "";
	for (var i = 0; i < len; i++)
		text += randomAlphaNumericCharacter();
	return text;
}
function onBodyLoad(e) {
	g_user_id = randomAlphaNumericString(4);
	ds.$coord_para = $("#coord_para");
	ds.$msg_para = $("#msg_para");

	var drawing_hub = $.connection.drawingHub;
	drawing_hub.client.onNewPaths = onNewPaths;
	drawing_hub.client.onUpdateStatus = serverUpdateStatus;
	drawing_hub.client.onUpdatePosition = serverUpdatePosition;

	// $.connection.hub.logging = true;
	$.connection.hub.start().done(onConnectionDone);

	onPencilClick();
	updateUndoRedoButton();

	var elt = $("#activity_list");

	for (var i = 0; i < ACTIVITY_COUNT; i++) {
		elt.prepend("<li onclick='goActivity(this)'></li>");
	}

	$('#createRoomDlg').on('show.bs.modal', function (event) {
		$("#room_name_ipt").val("");
		$("#create_room_result").hide();
	})
}
function onConnectionDone() {
	var canvas_elt = document.getElementById("drawing_canvas");
	ds.drawing_ctx = canvas_elt.getContext("2d");

	initCanvasSize();

	//if (!location.hash)
	//	location.hash = "#0,0";
	//goHashLocation();

	//var drawing_hub = $.connection.drawingHub;
	//drawing_hub.server.getStoredPaths3(2, -1).done(onNewPaths);
	//drawing_hub.server.getHome().done(onHome);

	downloadRoomInfo(true);
	onRoomEnter();
}
function onRoomEnter() {
	downloadStatus();

	setInterval(purgeOutsideBlocks, 3 * 60 * 1000/*ms*/);
	setInterval(checkGoArrow, 200/*ms*/);
	//setInterval(checkHashLocation, 1000);
	setInterval(downloadRoomInfo, 3 * 60 * 1000/*ms*/);
	setInterval(onUploadTimer, 300/*ms*/);
	setInterval(uploadMousePos, 1000/*ms*/);
	setInterval(purgeOldSticker, 60 * 1000/*ms*/);

	var canvas_elt = document.getElementById("drawing_canvas");

	canvas_elt.addEventListener("mousedown", onMouseDown, false);
	document.addEventListener("mousemove", onMouseMove, false);
	document.addEventListener("mouseup", onMouseUp, false);

	window.addEventListener("resize", onResize, false);

	registerShortcutKey();

	$("#info_para").hide();
}
function updateTransform() {
	//console.log("updateTransform. ct.shift.x=" + ct.shift.x + ", ct.shift.y=" + ct.shift.y + ".");
	//console.log("updateTransform. ct.scale.x=" + ct.scale.x + ", ct.scale.y=" + ct.scale.y + ".");
	ds.drawing_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, ct.shift.x, ct.shift.y);

	us.mouse_pos_uploaded = false;
	moveAllStickers();

	var center = calcCenter();

	//var location_tag = "#" + uCenter.x + "," + uCenter.y;
	//location.hash = location_tag;

	var location_tag = "(" + center.b.x + ", " + center.b.y + ")";
	ds.$coord_para.text(location_tag);

	prepareCheckStoredPaths();
}
function calcCenter() {
	var wCenter = { x: window.innerWidth >> 1, y: window.innerHeight >> 1 };
	var uCenter = windowCoordToUniverseCoord(wCenter);

	var block_idx_x = Math.floor((uCenter.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
	var block_idx_y = Math.floor((uCenter.y + BLOCK_SIZE / 2) / BLOCK_SIZE);

	return { w: wCenter, u: uCenter, b: { x: block_idx_x, y: block_idx_y } };
}
function missingBlock() {
	var center = calcCenter();

	var block_idx_x = center.b.x;
	var block_idx_y = center.b.y;

	for (var i = 0; i < ITERATE_ARRAY_X.length; i++) {
		block_idx_x += ITERATE_ARRAY_X[i];
		block_idx_y += ITERATE_ARRAY_Y[i];

		var block_key = block_idx_x + "," + block_idx_y;

		if (!ds.all_paths[block_key]) {
			return { x: block_idx_x, y: block_idx_y };
		}
	}
	return null;
}
function checkStoredPaths() {
	ds.csp_timer_id = null;

	var block_idx = missingBlock();

	if (block_idx != null) {
		var block_key = block_idx.x + "," + block_idx.y;
		ds.all_paths[block_key] = [];		// prevent it from being downloaded again.

		try {
			//console.log("Download stored paths of " + block_key + ".");

			var drawing_hub = $.connection.drawingHub;
			drawing_hub.server.getStoredPaths3(block_idx.x, block_idx.y).done(function (path_array) {
				onNewPaths(path_array, true);
				prepareCheckStoredPaths();

				//console.log("Download stored paths of " + block_key + " success.");
			});
		}
		catch (ex) {
			console.log("drawing_hub.server.getStoredPaths3 threw an error - " + ex.name + ": " + ex.message + ".");
			delete ds.all_paths[block_key];
			alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
		}
	}
}
function prepareCheckStoredPaths() {
	clearTimeout(ds.csp_timer_id);
	ds.csp_timer_id = setTimeout(checkStoredPaths, 100);
}
function checkHashLocation() {
	var wCenter = { x: window.innerWidth >> 1, y: window.innerHeight >> 1 };
	var uCenter = windowCoordToUniverseCoord(wCenter);

	var location_tag = "#" + uCenter.x + "," + uCenter.y;

	if (location.hash != location_tag)
		goHashLocation();
}
function goHashLocation() {
	var result = location.hash.match(/#([-0-9]+),([-0-9]+)/);
	if (result != null) {
		var uCenter = { x: Number(result[1]), y: Number(result[2]) };
		goLocation(uCenter);
	}
}
function goLocation(uPt) {
	var wCenter = { x: window.innerWidth >> 1, y: window.innerHeight >> 1 };

	ct.shift.x = wCenter.x - uPt.x * ct.scale.x;
	ct.shift.y = wCenter.y - uPt.y * ct.scale.y;

	updateTransformAndRedraw();
}
function initCanvasSize() {
	var canvas_elt = document.getElementById("drawing_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	//ct.shift.x = window.innerWidth >> 1;
	//ct.shift.y = window.innerHeight >> 1;
}
function onResize() {
	var canvas_elt = document.getElementById("drawing_canvas");

	ct.shift.x -= (canvas_elt.width - window.innerWidth) >> 1;
	ct.shift.y -= (canvas_elt.height - window.innerHeight) >> 1;

	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	updateTransformAndRedraw();
}
function checkHome(go) {
	// why polling?
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getHome().done(function (bHome) {
			ds.uHome = { x: bHome.X * BLOCK_SIZE, y: bHome.Y * BLOCK_SIZE };

			if (go)
				goLocation(ds.uHome);
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.getHome threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
	}
}
function downloadRoomInfo(go) {
	var room_name = getRoomNameFromUrl();

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getRoom(room_name).done(function (room_info) {
			if (!room_info && go) {
				alert("The room \"" + room_name + "\" is not found on the server.");

				if (location.pathname != "/")
					location.assign("/");
			}
			else {
				ds.uHome = { x: room_info.HomeX * BLOCK_SIZE, y: room_info.HomeY * BLOCK_SIZE };

				if (go)
					goLocation(ds.uHome);
			}
		}).fail(function (error) {
			console.log("drawing_hub.server.getRoom fail - " + error)
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.getRoom threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
//function onHome(bHome) {
//	ds.uHome = { x: bHome.X * BLOCK_SIZE, y: bHome.Y * BLOCK_SIZE };
//	goLocation(ds.uHome);
//}
function onNewPaths(path_array, from_stored) {
	for (var j = 0; j < path_array.length; j++) {
		var c_path = path_array[j];

		var path = new Path(c_path.t, c_path.u);
		path.head.x = c_path.hx;
		path.head.y = c_path.hy;
		path.blockIdx.x = c_path.bx;
		path.blockIdx.y = c_path.by;

		var block_key = c_path.bx + "," + c_path.by;

		if (ds.all_paths[block_key]) {		// has been downloaded before.
			var arr = c_path.c.split(XY_COMBINE_SEPARATOR);

			for (var i = 0; i < arr.length; i++) {
				arr[i] = Number(arr[i]);
				//if (arr[i] > 100)
				//	arr[i] = 100;
				//else if (arr[i] < -100)
				//	arr[i] = -100;
			}
			path.dx = arr.slice(0, arr.length / 2);
			path.dy = arr.slice(arr.length / 2, arr.length);

			ds.all_paths[block_key].push(path);

			// If the path is from stored, then the block is clean and every path should be drawn.
			// Otherwise current user's path will not be visible.
			// If the path is not from stored, then it has been drawn when mousemove and should not be drawn again.
			if (path.userId != g_user_id || from_stored)
				drawPath(path);

			if (path.userId == g_user_id)
				removePendingPath(path);
		}
		if (!from_stored)
			onActivity(path.userId, path.uHead());
	}
	if (!from_stored)
		updateActivityList();
}
function onActivity(user_id, uHead) {
	if (!al.activity_cnt[user_id])
		al.activity_cnt[user_id] = 0;
	al.activity_cnt[user_id]++;
	al.activity_pt[user_id] = jQuery.extend({}, uHead);

	//console.log("uHead.x=" + uHead.x + ", uHead.y=" + uHead.y + ".");

	var idx = al.recent.indexOf(user_id);
	if (idx != -1)
		al.recent.splice(idx, 1);
	else if (al.recent.length >= ACTIVITY_COUNT)
		al.recent.pop();

	al.recent.unshift(user_id);
}
function updateActivityList() {
	$("#activity_list > li").each(function (idx, elt) {
		if (idx < al.recent.length) {
			var $elt = $(elt);
			var user_id = al.recent[idx];
			var activity_cnt = al.activity_cnt[user_id];
			var activity_pt = al.activity_pt[user_id];

			$elt.text(user_id + " (" + activity_cnt + ")");
			$elt.data("activity_pt", jQuery.extend({}, activity_pt));
		}
	});
}
function goActivity(elt) {
	var $elt = $(elt);
	var activity_pt = $elt.data("activity_pt");

	goLocation(activity_pt);
}
function goRecent() {
	if (al.recent_idx >= 0 && al.recent_idx < al.recent.length) {
		var user_id = al.recent[al.recent_idx];
		var activity_pt = al.activity_pt[user_id];

		goLocation(activity_pt);
	}
}
function removePendingPath(path) {
	for (var i = 0; i < ds.pending_paths.length; i++) {
		if (isSamePath(path, ds.pending_paths[i])) {
			ds.pending_paths.splice(i, 1);
			break;
		}
	}
}
function isSamePath(path1, path2) {
	return path1.head.x == path2.head.x &&
		path1.head.y == path2.head.y &&
		path1.blockIdx.x == path2.blockIdx.x &&
		path1.blockIdx.y == path2.blockIdx.y &&
		path1.userId == path2.userId &&
		path1.type == path2.type &&
		path1.dx.length == path2.dx.length;
}
function setDrawingAttributes(is_erasing) {
	if (is_erasing) {
		ds.drawing_ctx.globalCompositeOperation = "destination-out";
		ds.drawing_ctx.lineWidth = 20;
	}
	else {
		ds.drawing_ctx.globalCompositeOperation = "source-over";
		ds.drawing_ctx.lineWidth = 1;
	}
}
function drawPath(path) {
	if (path.dx.length > 0) {
		setDrawingAttributes(path.type == 2);

		var pt = path.uHead();

		ds.drawing_ctx.beginPath();
		ds.drawing_ctx.moveTo(pt.x, pt.y);

		for (var i = 0; i < path.dx.length; i++) {
			pt.x += path.dx[i];
			pt.y += path.dy[i];

			ds.drawing_ctx.lineTo(pt.x, pt.y);
		}

		ds.drawing_ctx.stroke();
	}
}
function withinRange(center1, center2) {
	return Math.abs(center1.x - center2.x) <= OUTSIDE_BLOCK_DIST_X &&
			Math.abs(center1.y - center2.y) <= OUTSIDE_BLOCK_DIST_Y;
}
function drawAllPaths() {
	var center = calcCenter();

	for (var block_key in ds.all_paths) {
		//if (ds.all_paths.hasOwnProperty(block_key)) {		// remove this check to speed up.
		var path_array = ds.all_paths[block_key];

		for (var i = 0; i < path_array.length; i++) {
			var path = path_array[i];

			if (withinRange(path.blockIdx, center.b))
				drawPath(path);
			else
				break;		// All paths in the block have same path.blockIdx.
		}
		//}
		//else
		//	console.log("Not own property - " + block_key + ".");
	}
	for (var i = 0; i < ds.pending_paths.length; i++) {
		drawPath(ds.pending_paths[i]);
	}
	for (var i = 0; i < ua.wait_upload_paths.length; i++) {
		drawPath(ua.wait_upload_paths[i]);
	}
}
function redrawAllPaths() {
	var canvas_elt = document.getElementById("drawing_canvas");

	ds.drawing_ctx.save();
	ds.drawing_ctx.setTransform(1, 0, 0, 1, 0, 0);

	ds.drawing_ctx.clearRect(0, 0, canvas_elt.width, canvas_elt.height);
	ds.drawing_ctx.restore();

	drawAllPaths();
}
function updateTransformAndRedraw() {
	updateTransform();
	redrawAllPaths();
}
function universeCoordToWindowCoord(uPt) {
	var wPt = { x: 0, y: 0 };

	wPt.x = uPt.x * ct.scale.x + ct.shift.x;
	wPt.y = uPt.y * ct.scale.y + ct.shift.y;

	return wPt;
}
function windowCoordToUniverseCoord(wPt) {
	var uPt = { x: 0, y: 0 };

	uPt.x = (wPt.x - ct.shift.x) / ct.scale.x;
	uPt.y = (wPt.y - ct.shift.y) / ct.scale.y;

	return uPt;
}
function onMouseDown(e) {
	// console.log("onMouseDown. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");
	//var mouseX = Math.round(e.clientX);
	//var mouseY = Math.round(e.clientY);

	var wMouse = { x: Math.round(e.clientX), y: Math.round(e.clientY) };

	var uMouse = windowCoordToUniverseCoord(wMouse);
	//console.log("onMouseDown. uMouse.x=" + uMouse.x + ", uMouse.y=" + uMouse.y + ".");

	if (!ds.is_tracking) {
		ds.is_tracking = true;

		if (!isPanning()) {
			ds.tracking_pt.x = uMouse.x;
			ds.tracking_pt.y = uMouse.y;

			var type = isErasing() ? 2 : 1;
			ds.tracking_path = new Path(type, g_user_id, uMouse);
		}
		else {
			ds.tracking_pt.x = wMouse.x;
			ds.tracking_pt.y = wMouse.y;
		}
		e.preventDefault();
	}
}
function onMouseMove(e) {
	// console.log("onMouseMove. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");
	//var mouseX = Math.round(e.clientX);
	//var mouseY = Math.round(e.clientY);		// IE give floating point clientX and Y.
	var wMouse = { x: Math.round(e.clientX), y: Math.round(e.clientY) };

	if (ds.is_tracking) {
		if (!isPanning()) {
			setDrawingAttributes(isErasing());

			var uMouse = windowCoordToUniverseCoord(wMouse);
			ds.drawing_ctx.beginPath();
			ds.drawing_ctx.moveTo(ds.tracking_pt.x, ds.tracking_pt.y);

			// todo: don't push if dx, dy are all 0.
			ds.tracking_path.dx.push(uMouse.x - ds.tracking_pt.x);
			ds.tracking_path.dy.push(uMouse.y - ds.tracking_pt.y);

			ds.tracking_pt.x = uMouse.x;
			ds.tracking_pt.y = uMouse.y;

			ds.drawing_ctx.lineTo(ds.tracking_pt.x, ds.tracking_pt.y);
			ds.drawing_ctx.stroke();

			if (ds.tracking_path.dx.length >= 150)
				onMouseUp(e);
		}
		else {
			ct.shift.x += wMouse.x - ds.tracking_pt.x;
			ct.shift.y += wMouse.y - ds.tracking_pt.y;

			ds.tracking_pt.x = wMouse.x;
			ds.tracking_pt.y = wMouse.y;

			updateTransformAndRedraw();
		}
		e.preventDefault();
	}
	us.last_mouse_pos = wMouse;
	us.mouse_pos_uploaded = false;
}
function uploadPath(path) {
	// console.log(JSON.stringify(path));

	var c_path = {
		c: path.dx.join(XY_COMBINE_SEPARATOR)
			+ XY_COMBINE_SEPARATOR
			+ path.dy.join(XY_COMBINE_SEPARATOR),

		u: path.userId,
		t: path.type,

		hx: path.head.x,
		hy: path.head.y,

		bx: path.blockIdx.x,
		by: path.blockIdx.y,
	};

	try {
		var drawing_hub = $.connection.drawingHub;
		var ret = drawing_hub.server.drawAPath2(c_path).done(function (ret) {
			if (ret != 0) {
				var msg;
				if (ret == 1)
					msg = "This stroke is not uploaded successfully.";
				else if (ret == 2)
					msg = "This block is full and cannot accept any more strokes.";
				else if (ret == 3)
					msg = "This block is almost full.";
				else if (ret == 4)
					msg = "You are drawing too fast.";

				ds.$msg_para.text(msg).show();

				clearTimeout(ds.msg_timer_id);
				ds.msg_timer_id = setTimeout(function () {
					ds.msg_timer_id = null;
					ds.$msg_para.fadeOut(750);
				}, 5 * 1000);
			}
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.drawAPath threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
	}
}
function onMouseUp(e) {
	// console.log("onMouseUp. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");

	if (ds.is_tracking) {
		ds.is_tracking = false;

		if (!isPanning()) {
			if (ds.tracking_path.dx.length > 0) {
				ds.tracking_path.time = new Date();

				// There are many disjoints in the path due to "beginpath and moveto on every mousemove".
				// This will cause incomplete erasing. So draw again.
				if (isErasing())
					drawPath(ds.tracking_path);

				ua.wait_upload_paths.push(ds.tracking_path);
				ua.undoed_paths.length = 0;
				updateUndoRedoButton();
				ua.just_undo = false;
			}
		}
		e.preventDefault();
	}
}
function onUploadTimer() {
	if (ua.wait_upload_paths.length > 0) {
		var path = ua.wait_upload_paths[0];

		var now = new Date();
		var diff = now.getTime() - path.time.getTime();

		if (diff >= 3 * 1000/*ms*/) {
			ds.pending_paths.push(path);
			ua.wait_upload_paths.shift();

			updateUndoRedoButton();
			uploadPath(path);
		}
	}
}
function purgeOutsideBlocks() {
	var cnt = Object.keys(ds.all_paths).length;		// This operation is heavy.

	if (cnt > 500) {
		var center = calcCenter();

		for (var block_key in ds.all_paths) {
			if (ds.all_paths.hasOwnProperty(block_key)) {
				var arr = block_key.split(",");

				var block_idx_x = Number(arr[0]);
				var block_idx_y = Number(arr[1]);

				if (!withinRange({ x: block_idx_x, y: block_idx_y }, center.b))
					//if (Math.abs(block_idx_x - center.b.x) > OUTSIDE_BLOCK_DIST_X ||
					//	Math.abs(block_idx_y - center.b.y) > OUTSIDE_BLOCK_DIST_Y)
					delete ds.all_paths[block_key];
			}
		}
	}
}
function checkGoArrow() {
	if ($("#go_up:hover").length > 0) {
		ct.shift.y += GO_DELTA;
		//ct.scale.y *= 2;
		//ct.shift.y = ct.shift.y * 2 - (window.innerHeight >> 1);		// assume keep window center unmoved.
	}
	else if ($("#go_down:hover").length > 0) {
		ct.shift.y -= GO_DELTA;
		//ct.scale.y /= 2;
		//ct.shift.y = ct.shift.y / 2 + (window.innerHeight >> 1) / 2;		// assume keep window center unmoved.
	}
	else if ($("#go_left:hover").length > 0) {
		ct.shift.x += GO_DELTA;
		//ct.scale.x *= 2;
		//ct.shift.x = ct.shift.x * 2 - (window.innerWidth >> 1);		// assume keep window center unmoved.
	}
	else if ($("#go_right:hover").length > 0) {
		ct.shift.x -= GO_DELTA;
		//ct.scale.x /= 2;
		//ct.shift.x = ct.shift.x / 2 + (window.innerWidth >> 1) / 2;		// assume keep window center unmoved.
	}
	else
		return;

	updateTransformAndRedraw();
}
function isPanning() {
	return $("#hand_tool").hasClass("active");
}
function isErasing() {
	return $("#eraser_tool").hasClass("active");
}
function onPencilClick() {
	//ds.is_panning = false;
	$("#pencil_tool").addClass("active");
	$("#hand_tool").removeClass("active");
	$("#eraser_tool").removeClass("active");

	$("#drawing_canvas").removeClass("cursor_pencil cursor_hand cursor_eraser").addClass("cursor_pencil");
}
function onHandClick() {
	//ds.is_panning = true;
	$("#pencil_tool").removeClass("active");
	$("#hand_tool").addClass("active");
	$("#eraser_tool").removeClass("active");

	$("#drawing_canvas").removeClass("cursor_pencil cursor_hand cursor_eraser").addClass("cursor_hand");
}
function onEraserClick() {
	//ds.is_panning = false;
	$("#pencil_tool").removeClass("active");
	$("#hand_tool").removeClass("active");
	$("#eraser_tool").addClass("active");

	$("#drawing_canvas").removeClass("cursor_pencil cursor_hand cursor_eraser").addClass("cursor_eraser");
}
function updateUndoRedoButton() {
	$("#undo_tool").prop("disabled", ua.wait_upload_paths.length == 0);
	$("#redo_tool").prop("disabled", ua.undoed_paths.length == 0);
}
function onUndoClick() {
	if (ua.wait_upload_paths.length > 0) {
		var path = ua.wait_upload_paths.pop();
		ua.undoed_paths.push(path);

		updateUndoRedoButton();
		redrawAllPaths();

		ua.just_undo = true;
	}
}
function onRedoClick() {
	if (ua.undoed_paths.length > 0) {
		var path = ua.undoed_paths.pop();
		path.time = new Date();
		ua.wait_upload_paths.push(path);

		updateUndoRedoButton();
		redrawAllPaths();

		ua.just_undo = false;
	}
}
function onHomeClick() {
	goLocation(ds.uHome);
	//location.hash = "#0,0";
	//goHashLocation();
}
function onRecentBackClick() {
	al.recent_idx++;
	if (al.recent_idx >= al.recent.length)
		al.recent_idx = 0;

	goRecent();
}
function onRecentForwardClick() {
	al.recent_idx--;
	if (al.recent_idx < 0)
		al.recent_idx = al.recent.length - 1;

	goRecent();
}
function onInformationClick() {
	$("#info_para").toggle();
}
function restoreTool() {
	onPencilClick();
}
function goArrowKey(delta, up_down) {
	if (up_down)
		ct.shift.y += delta;
	else
		ct.shift.x += delta;

	updateTransformAndRedraw();
}
function onKeyUp(keyname) {
	//console.log("onKeyUp (" + keyname + ").");

	if (ds.is_tracking)
		return false;

	if (keyname == "Spacebar" || keyname == " ") {
		restoreTool();
	}
	else
		return false;
	return true;
}
function onKeyDown(keyname, repeat) {
	//console.log("onKeyDown (" + keyname + "). repeat=" + repeat + ".");

	if (ds.is_tracking)
		return false;

	if (keyname == "P" || keyname == "p") {
		onPencilClick();
	}
	else if (keyname == "H" || keyname == "h") {
		onHandClick();
	}
	else if (keyname == "Z" || keyname == "z") {
		if (ua.just_undo)
			onRedoClick();
		else
			onUndoClick();
	}
	else if (keyname == "Y" || keyname == "y") {
		onRedoClick();
	}
	else if (keyname == "X" || keyname == "x") {
		onUndoClick();
	}
	else if (keyname == "Spacebar" || keyname == " ") {
		if (!repeat)
			onHandClick();
	}
	else if (keyname == "Right" || keyname == "ArrowRight") {
		goArrowKey(-GO_DELTA, false);
	}
	else if (keyname == "Left" || keyname == "ArrowLeft") {
		goArrowKey(GO_DELTA, false);
	}
	else if (keyname == "Up" || keyname == "ArrowUp") {
		goArrowKey(GO_DELTA, true);
	}
	else if (keyname == "Down" || keyname == "ArrowDown") {
		goArrowKey(-GO_DELTA, true);
	}
	else if (keyname == "N" || keyname == "n") {
		onRecentBackClick();
	}
	else if (keyname == "M" || keyname == "m") {
		onRecentForwardClick();
	}
	else
		return false;
	return true;
}
function onClickUpdate() {
	var name = $("#name_ipt").val();
	var status = $("#status_ipt").val();

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.updateStatus(g_user_id, name, status).done(function () {
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.UpdateStatus threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
	}
	return false;
}
function serverUpdateStatus(user_id, user_status) {
	us.user_status[user_id] = user_status;
}
function downloadStatus() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getAllStatus().done(function (dict) {
			for (var user_id in dict) {
				if (dict.hasOwnProperty(user_id)) {
					serverUpdateStatus(user_id, dict[user_id]);
				}
			}
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.GetAllStatus threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function uploadMousePos() {
	if (!us.mouse_pos_uploaded) {
		us.mouse_pos_uploaded = true;

		var uMouse = windowCoordToUniverseCoord(us.last_mouse_pos);

		try {
			var drawing_hub = $.connection.drawingHub;
			drawing_hub.server.updatePosition(g_user_id, uMouse.x, uMouse.y).done(function () {
			});
		}
		catch (ex) {
			console.log("drawing_hub.server.updatePosition threw an error - " + ex.name + ": " + ex.message + ".");
		}
	}
}
function serverUpdatePosition(dict) {
	for (var user_id in dict) {
		if (dict.hasOwnProperty(user_id)) {
			var user_status = us.user_status[user_id];

			var name = user_status ? (user_status.Name ? user_status.Name : "No name") : "Unknown";
			var status = user_status ? user_status.Status : "";

			var pos = dict[user_id];
			pos.time = new Date();
			us.user_position[user_id] = pos;

			//console.log("User " + name + " (" + user_id + ") [" + status + "] moved to " + pos.X + ", " + pos.Y + ".");
			if (user_id != g_user_id)
				updateUserSticker(user_id, name, status, pos);
		}
	}
}
function updateUserSticker(user_id, name, status, pos) {
	var elem_id = "uskr_" + user_id;
	var $sticker = $("#" + elem_id);

	if ($sticker.length == 0) {
		$sticker = $("<div id='" + elem_id + "' class='sticker unselectable'><h5></h5><p></p></div>");
		$sticker.insertBefore("#info_para");
	}
	$sticker.children("h5").text(name);
	$sticker.children("p").text(status);

	moveSticker($sticker, pos, true);
}
function moveSticker($sticker, pos, animate) {
	var wPos = universeCoordToWindowCoord({ x: pos.X, y: pos.Y });

	wPos.x -= $sticker.width() / 2;
	wPos.y -= $sticker.height() / 2;

	var css_properties = {
		left: wPos.x,
		top: wPos.y
	};
	if (animate || $sticker.is(":animated")) {
		$sticker.animate(css_properties,
			{
				duration: 1000,
				queue: false,
				easing: "linear",
			});
	}
	else {
		$sticker.css(css_properties);
	}
}
function moveAllStickers() {
	for (var user_id in us.user_position) {
		if (us.user_position.hasOwnProperty(user_id)) {
			var pos = us.user_position[user_id];

			var $sticker = $("#uskr_" + user_id);		// when user_id is me, $sticker.length will be 0. 

			moveSticker($sticker, pos, false);
		}
	}
}
function purgeOldSticker() {
	var now = new Date();

	for (var user_id in us.user_position) {
		if (us.user_position.hasOwnProperty(user_id)) {

			var diff = now.getTime() - us.user_position[user_id].time.getTime();
			if (diff >= 2 * 60 * 1000/*ms*/) {

				var $sticker = $("#uskr_" + user_id);		// when user_id is me, $sticker.length will be 0. 
				$sticker.remove();
				delete us.user_position[user_id];
			}
		}
	}
}
function doCreateRoom() {
	var name = $("#room_name_ipt").val();
	var size = 3;

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.createRoom(name, size).done(function (suc) {
			if (suc) {
				location.assign("/" + name);
			}
			else {
				$("#create_room_result").text("Failed. Maybe the name contain invalid characters.").show();
			}
		}).fail(function (error) {
			$("#create_room_result").text("Failed. Maybe room with the same name already exists. " + error).show();
		});
	}
	catch (ex) {
		console.log("drawing_hub.server.createRoom threw an error - " + ex.name + ": " + ex.message + ".");
		$("#create_room_result").text("Sorry, create room failed. " + ex.name + ": " + ex.message + ".").show();
	}
}
function getRoomNameFromUrl() {
	var text = decodeURIComponent(location.pathname);

	var arr = text.split("/");

	text = arr[1];

	console.log("location.pathname=" + location.pathname + ". Decoded=" + text + ".");

	if (text.length == 0)
		text = "Main";

	return text;
}