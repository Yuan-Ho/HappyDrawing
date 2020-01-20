var XY_COMBINE_SEPARATOR = "_";
var PATH_EXPIRE_LIMIT = 2500;
var GO_DELTA = 50;
var ACTIVITY_COUNT = 10;
var RECENT_PICT_COUNT = 15;
var BLOCK_SIZE = 500;
var outside_block_dist_x = 5;
var outside_block_dist_y = 4;
var HOME_FLAG_LEN = 20;
var DEFAULT_ROOM = "Main";
var MAX_ZOOM_LEVEL = 8;
var MIN_ZOOM_LEVEL = 0.125;
var MAX_TIP_SIZE = 48;
var MAX_DOWNLOAD_BLOCK_CNT = 5;
var ADJUSTER_MARGIN = 5 * 16;

var MAIN_LAYER_NUM = 5;
var DRAFT_LAYER_NUM = 3;

var PT_PENCIL = 1;
var PT_ERASER = 2;
var PT_SCISSOR = 3;
var PT_TRASH = 4;
var PT_BATCH = 5;
var PT_NOTE = 6;
var PT_PICTURE = 7;
var PT_FILLER = 8;

var DXY_ENCODE_DIVIDER = 13;
var CODE_a = "a".charCodeAt(0);
var CODE_A = "A".charCodeAt(0);

//var ITERATE_ARRAY_X = [0, 1, 0, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0];
//var ITERATE_ARRAY_Y = [0, 0, -1, 0, 0, 1, 1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, -1, -1, -1, -1];

//var ITERATE_ARRAY_X = [0, -1, 0, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0];
//var ITERATE_ARRAY_Y = [0, 0, -1, 0, 0, 1, 1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, -1, -1, -1, -1];

var ITERATE_ARRAY_X = [0,
	-1,
	0,
	1, 1,
	0, 0,
	-1, -1, -1,
	0, 0, 0,
	1, 1, 1, 1,
	0, 0, 0, 0,
	-1, -1, -1, -1, -1,
	0, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1,
	0, 0, 0, 0, 0, 0,
	-1, -1, -1, -1, -1, -1, -1,
	0, 0, 0, 0, 0, 0, 0,
];
var ITERATE_ARRAY_Y = [0,
	0,
	-1,
	0, 0,
	1, 1,
	0, 0, 0,
	-1, -1, -1,
	0, 0, 0, 0,
	1, 1, 1, 1,
	0, 0, 0, 0, 0,
	-1, -1, -1, -1, -1,
	0, 0, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1,
	0, 0, 0, 0, 0, 0, 0,
	-1, -1, -1, -1, -1, -1, -1,
];

var g_user_id;
var g_room_info;

var ds =
	{
		is_tracking: false,

		tracking_path: null,
		tracking_pt: { x: 0, y: 0 },

		pending_paths: [],

		csp_timer_id: null,
		msg_timer_id: null,
		wheel_timer_id: null,

		//uHome: { x: 0, y: 0 },

		$coord_para: null,
		//$msg_para: null,

		raw_room_list: "",
		hovered_path: null,
		last_click_upt: null,

		//picture_list: [],
		chat_win_state: 0,
		note_win_state: 0,
		noter_style: null,

		figure_page: -1,		// -1 mean last
		num_figure_pages: 0,
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
		wait_direct_upload_paths: [],
		undoed_paths: [],
		just_undo: false,
		upload_progress: 0,
	};
var us =
	{
		user_status: {},
		user_position: {},
		last_mouse_pos: {},
		mouse_pos_uploaded: true,

		iterate_idx: 0,
	};
var pb =
	{
		selected_paths: [],
		copied_paths: [],

		dl_pbs: {},
		dl_pbs_use_time: {},
		dl_pbs_length: {},

		wait_batch_paths: [],
		transform_matrix: [1, 0, 0, 1],
	};
var ly =
	{
		active_layer: MAIN_LAYER_NUM,

		block_downloaded: {},
		main_paths: {},
		draft_paths: {},

		note_paths: {},
		picture_paths: {},

		layer_paths: [],

		drawing_ctx: null,
		draft_ctx: null,
		bground_ctx: null,
		avatar_ctx: null,
	};
var ts =
	{
		dragging: false,
		pencil_size: 1,
		eraser_size: 20,

		curr_brush_id: 1/*0*/,
		curr_blur: 2,
		curr_bglow: 0,		// breathing glow
	};
var pc =
	{
		pict_blob: null,
		pict_url: null,
		pict_ok: false,

		pict_from_me: [],
		pict_from_others: [],
	};
function Path(tm, zoom, layer_num, type, user_id, uPt) {
	this.layer = layer_num;
	this.type = type;		// 0=invalid, 1=pencil, 2=eraser, 3=scissor, 4=trash, 5=batch, 6=note.
	this.userId = user_id;
	this.zoom = zoom;		// Positive=multiply, negative=divide. Records the currentZoom() when the path is drawn. Used to compress dx dy.
	this.color = "#000000";
	this.tipSize = type == PT_ERASER ? 20 : 1;
	this.brushId = 0;
	this.blur = 0;
	this.idio = {};

	if (typeof tm == "string")
		this.transform_matrix = splitToNumberArray(tm, ",");
	else
		this.transform_matrix = tm;

	this.gsid = 0;		// Negative and 0 GSIDs are also valid.
	this.subid = 0;		// helper id when gsid is the same (ie. inserted batch paths and old paths without gsid (gsid is 0).)
	this.head = { x: 0, y: 0 };
	this.blockIdx = { x: 0, y: 0 };

	if (uPt) {
		this.blockIdx.x = Math.floor((uPt.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
		this.blockIdx.y = Math.floor((uPt.y + BLOCK_SIZE / 2) / BLOCK_SIZE);
		this.head.x = uPt.x - this.blockIdx.x * BLOCK_SIZE;
		this.head.y = uPt.y - this.blockIdx.y * BLOCK_SIZE;

		//console.log("uPt.x=" + uPt.x + ", uPt.y=" + uPt.y + ". blockIdx.x=" + this.blockIdx.x + ", blockIdx.y=" + this.blockIdx.y + ".");
	}

	this.dx = [];
	this.dy = [];
}
Path.prototype.uHead = function () {
	return {
		x: this.blockIdx.x * BLOCK_SIZE + this.head.x,
		y: this.blockIdx.y * BLOCK_SIZE + this.head.y
	};
};
Path.prototype.blockKey = function () {
	return this.blockIdx.x + "," + this.blockIdx.y;
};
Path.prototype.denormalize = function (dx, dy) {
	var multiplier = this.zoom > 0 ? 1 / this.zoom : -this.zoom;

	dx = multiplyArray(dx, multiplier);
	dy = multiplyArray(dy, multiplier);

	var dobj = applyTransformArray(this.transform_matrix, dx, dy);
	this.dx = dobj.dx;
	this.dy = dobj.dy;
};
Path.prototype.normalize = function () {
	var multiplier = this.zoom < 0 ? 1 / (-this.zoom) : this.zoom;

	var dx = multiplyArray(this.dx, multiplier);
	var dy = multiplyArray(this.dy, multiplier);

	var dobj = applyTransformArray(inverseMatrix(this.transform_matrix), dx, dy);

	return dobj;
};
Path.prototype.belongsTo = function (block_idx) {
	return this.blockIdx.x == block_idx.x &&
		this.blockIdx.y == block_idx.y;
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
function prepareStyleSheet() {
	var ss = document.styleSheets[2];		// Remember to change index when a new css file is added.
	var rules = ss.cssRules;

	for (var i = 0; i < rules.length; i++) {
		var rule = rules[i];

		if (rule.selectorText == ".noter") {
			ds.noter_style = rule.style;
			break;
		}
	}
}
function onBodyLoad(e) {
	ly.layer_paths[MAIN_LAYER_NUM] = ly.main_paths;
	ly.layer_paths[DRAFT_LAYER_NUM] = ly.draft_paths;

	if (!localStorage["gen_user_id"])
		localStorage["gen_user_id"] = randomAlphaNumericString(5);
	g_user_id = localStorage["gen_user_id"];

	loadRecentPicture();

	ds.$coord_para = $("#coord_para");
	//ds.$msg_para = $("#msg_para");

	prepareStyleSheet();

	var drawing_hub = $.connection.drawingHub;
	drawing_hub.client.onNewPaths = onNewPaths;
	drawing_hub.client.onEarlyPaths = onEarlyPaths;
	drawing_hub.client.onUpdateStatus = serverUpdateStatus;
	drawing_hub.client.onUpdatePosition = serverUpdatePosition;
	drawing_hub.client.onNewNote = onNewNote;
	drawing_hub.client.onNewFigure = onNewFigure;

	// $.connection.hub.logging = true;
	$.connection.hub.start().done(onConnectionDone);

	ly.drawing_ctx = document.getElementById("drawing_canvas").getContext("2d");
	ly.draft_ctx = document.getElementById("draft_canvas").getContext("2d");
	ly.bground_ctx = document.getElementById("bground_canvas").getContext("2d");
	ly.avatar_ctx = document.getElementById("avatar_canvas").getContext("2d");

	$('#color_ipt').chromoselector({
		target: '#color_panel',
		autoshow: false,
		resizable: false,
		create: function () {
			$(this).chromoselector('show', 0);
		},
		update: function () {
			var color = $(this).chromoselector("getColor");
			var hex_color = color.getHexString();
		},
		width: 180
	});
	var cp_h = $("#color_panel").height();
	var heading_h = $("#tip_size_panel .panel-heading").outerHeight();		// 0 when hidden.
	$("#tip_size_panel .panel-body").css("height", cp_h - heading_h);

	//initCanvasSize();
	onResize(null);

	//onPencilClick();
	setTipSize(ts.pencil_size);
	setAdjust($("#blur_adjuster"), ts.curr_blur);
	setAdjust($("#bglow_adjuster"), ts.curr_bglow);

	onHandClick();
	redrawBground();
	updateUndoRedoButton();

	var elt = $("#activity_list");

	for (var i = 0; i < ACTIVITY_COUNT; i++) {
		elt.prepend("<li onclick='goActivity(this)'></li>");
	}
	populateBrushList();

	$('#createRoomDlg').on('show.bs.modal', function (event) {
		$("#room_name_ipt").val("");
		$("#create_room_result").hide();
		$("#can_picture_check").prop("checked", true);
		$("#private_check").prop("checked", false);
	}).on('shown.bs.modal', function () {
		$('#room_name_ipt').focus();
	});
	$('#saveFigureDlg').on('show.bs.modal', function (event) {
		$("#figure_name_ipt").val("");
		$("#save_figure_result").hide();
		$("#figure_ok_btn").prop("disabled", false);
	}).on('shown.bs.modal', function () {
		$('#figure_name_ipt').focus();
	});
	$('#pictureDlg').on('shown.bs.modal', function () {
		$('#pict_url_ipt').focus();
		pc.pict_ok = false;
		updateRecentPicture();
	}).on('hidden.bs.modal', function (e) {
		if (!pc.pict_ok)
			restoreTool();
	});
	$('.navbar-collapse').on('show.bs.collapse', function () {
		$("#right_sidebar").hide();
		$("#left_sidebar").hide();
	}).on("hidden.bs.collapse", function () {
		$("#right_sidebar").show();
		$("#left_sidebar").show();
	});

	$("#pencil_tool").tooltip({
		title: "Pencil.\nHotkey: P.\n",
		trigger: "hover",
	});
	$("#filler_tool").tooltip({
		title: "Filler.\nHotkey: F.\n",
		trigger: "hover",
	});
	$("#hand_tool").tooltip({
		title: "Hand.\nHotkey: H, Space.\nPan view area.",
		trigger: "hover",
	});
	$("#eraser_tool").tooltip({
		title: "Eraser.\nHotkey: E.\n",
		trigger: "hover",
	});
	$("#scissor_tool").tooltip({
		title: "Scissors.\nHotkey: S.\nGreen - delete a stroke of mine.\nRed - ignore a stroke of another one.",
		trigger: "hover",
	});
	$("#trash_tool").tooltip({
		title: "Trash.\nHotkey: T.\nGreen - delete all strokes of mine in a block.\nRed - ignore all stroke of another one in a block.",
		trigger: "hover",
	});
	$("#undo_tool").tooltip({
		title: "Undo.\nHotkey: Z, X.\n",
		trigger: "hover",
	});
	$("#redo_tool").tooltip({
		title: "Redo.\nHotkey: Z, Y.\n",
		trigger: "hover",
	});
	$("#home_tool").tooltip({
		title: "Go home.\nHotkey: O.\n",
		trigger: "hover",
	});
	$("#recent_back_tool").tooltip({
		title: "Go back.\nHotkey: N.\nGo back to where recent activities occur.",
		trigger: "hover",
	});
	$("#recent_forward_tool").tooltip({
		title: "Go forward.\nHotkey: M.\nGo forward to where recent activities occur.",
		trigger: "hover",
	});
	$("#information_tool").tooltip({
		title: "Help.\nHotkey: I.\n",
		trigger: "hover",
	})/*.tooltip('show')*/;
	$("#picture_tool").tooltip({
		title: "Image.\nUpload/link an image.",
		trigger: "hover",
	});
	$("#select_tool").tooltip({
		title: "Select.\nHotkey: L.\nSelect then copy the selected strokes.",
		trigger: "hover",
	});
	$("#paste_tool").tooltip({
		title: "Paste.\nHotkey: A.\nClick and paste the copied strokes.",
		trigger: "hover",
	});
	$("#note_tool").tooltip({
		title: "Leave a message.\nHotkey: B.\nThe message will be left at the click point.",
		trigger: "hover",
	});
	$("#zoom_in_tool").tooltip({
		title: "Zoom in.\nHotkey: +, =.\n",
		trigger: "hover",
	});
	$("#zoom_out_tool").tooltip({
		title: "Zoom out.\nHotkey: -.\n",
		trigger: "hover",
	});
	$("#checkDrawingLayer").parent().tooltip({
		title: "Show/hide drawing layer.",
		trigger: "hover",
		placement: "right",
		container: "body",
	});
	$("#checkDraftLayer").parent().tooltip({
		title: "Show/hide draft layer.",
		trigger: "hover",
		placement: "right",
		container: "body",
	});
	$("#checkDrawingLayer").parent().next("label").tooltip({
		title: "Activate drawing layer.",
		trigger: "hover",
		placement: "right",
		container: "body",
	});
	$("#checkDraftLayer").parent().next("label").tooltip({
		title: "Activate draft layer.",
		trigger: "hover",
		placement: "right",
		container: "body",
	});
	$("#btnMaxChat").tooltip({
		title: "Unfold/fold chat room.",
		trigger: "hover",
		placement: "bottom",
	});
	$("#coord_para").tooltip({
		title: "Current (X,Y) coordinate of window center.\n) x Z indicates current zoom level.\nAdd #X,Y to address bar to move to that coordinate.\nie. http://happy.hela.cc/#402,22",
		trigger: "hover",
		placement: "bottom",
		container: "body",
	});
	$("#room_dropdown_title").tooltip({
		title: "Current room name.\nClick to expand room list.\nFor rooms not in the list, you can type the room's url in the address bar to enter it.\nie. http://happy.hela.cc/room_name",
		trigger: "hover click",
		placement: "bottom",
		container: "body",
		animation: false,
	});
	$("#btnSay").tooltip({
		title: "Type nickname and words you want to say to join chat.\nThey also make up a cursor following your position seen by others.",
		trigger: "hover",
		placement: "bottom",
		container: "body",
	});
	$("#left_sidebar > li:first-child").tooltip({
		title: "Toggle left side bar.\nHotkey: ,\n",
		trigger: "hover",
		placement: "right",
		container: "body",
	});
	$("#right_sidebar > li:first-child").tooltip({
		title: "Toggle right side bar.\nHotkey: .\n",
		trigger: "hover",
		placement: "left",
		container: "body",
	});
}
function onConnectionDone() {
	//if (!location.hash)
	//	location.hash = "#0,0";
	//goHashLocation();

	//var drawing_hub = $.connection.drawingHub;
	//drawing_hub.server.getStoredPaths3(2, -1).done(onNewPaths);
	//drawing_hub.server.getHome().done(onHome);

	downloadRoomInfo(true);
}
function onRoomEnter() {
	var elt = document.getElementById("room_dropdown_title");
	elt.firstChild.nodeValue = g_room_info.Name + " ";
	document.title = g_room_info.Name + " - Happy drawing !";

	if (!(g_room_info.Attr & 2/*CAN_PICTURE*/)) {
		$("#picture_tool").hide();
	}
	var prev_name = localStorage["prev_used_name"];
	if (prev_name) {
		$("#name_ipt").val(prev_name);
		$("#status_ipt").val("");
		onClickUpdate(true);
	}
	else
		downloadChat();

	downloadRoomList();
	//downloadHotRoomList();
	downloadStatus();
	//downloadChat();		// do it after onClickUpdate to prevent simultaneous access to chat db causing double initialization of chat rolls.
	downloadNoteList();
	downloadFigurePage(-1);

	setInterval(purgeOutsideBlocks, 3 * 60 * 1000/*ms*/);
	//setInterval(checkGoArrow, 200/*ms*/);
	setInterval(/*goHashLocation*/checkHashLocation, 1000);
	setInterval(downloadRoomInfo, 3 * 60 * 1000/*ms*/);
	setInterval(onUploadTimer, 250/*ms*/);
	setInterval(uploadMousePos, 1000/*ms*/);
	setInterval(purgeOldSticker, 60 * 1000/*ms*/);
	setInterval(downloadRoomList, 3 * 60 * 1000/*ms*/);
	//setInterval(downloadHotRoomList, 3 * 60 * 1000/*ms*/);
	//setInterval(purgeOldPicture, 60 * 1000/*ms*/);
	setInterval(purgePendingPaths, 2 * 1000/*ms*/);

	var canvas_elt = document.getElementById("avatar_canvas");

	document.addEventListener("click", onCanvasClick, false);
	document.addEventListener("mousedown", onMouseDown, false);
	document.addEventListener("mousemove", onMouseMove, false);
	document.addEventListener("mouseup", onMouseUp, false);

	document.addEventListener("touchstart", onTouchStart, false);
	document.addEventListener("touchend", onTouchEnd, false);
	document.addEventListener("touchcancel", onTouchEnd, false);
	document.addEventListener("touchleave", onTouchEnd, false);
	document.addEventListener("touchmove", onTouchMove, false);

	document.addEventListener("contextmenu", onContextMenu, false);
	window.addEventListener("resize", onResize, false);
	canvas_elt.addEventListener("wheel", onWheel, false);

	var tip_size_elt = document.getElementById("tip_size_panel");
	tip_size_elt.addEventListener("mousedown", tipSizeMouseDown, false);
	tip_size_elt.addEventListener("mousemove", tipSizeMouseMove, false);
	tip_size_elt.addEventListener("mouseup", tipSizeMouseUp, false);

	$(".adjust_slider").on("mousedown", adjusterMouseDown)
						.on("mousemove", adjusterMouseMove)
						.on("mouseup", adjusterMouseUp);

	registerShortcutKey();
	//window.requestAnimationFrame(animationStep);

	//$("#info_para").hide();
	unitTest();
}
function unitTest() {
	/*var dxy_text = "";
	for (var dxy = -200; dxy <= 200; dxy++) {
		var tdxy = dxyEncode(dxy);
		console.log(dxy + " encodes to " + tdxy + ".");
		dxy_text += tdxy;
	}
	var dxy_array = dxyDecode(dxy_text);
	for (var i = 0; i < dxy_array.length; i++)
		if (dxy_array[i] != -200 + i)
			console.log("Wrong!");*/
}
function updateTransform() {
	//console.log("updateTransform. ct.shift.x=" + ct.shift.x + ", ct.shift.y=" + ct.shift.y + ", ct.scale.x=" + ct.scale.x + ", ct.scale.y=" + ct.scale.y + ".");

	ly.drawing_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, ct.shift.x, ct.shift.y);
	ly.draft_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, ct.shift.x, ct.shift.y);
	ly.bground_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, ct.shift.x, ct.shift.y);
	ly.avatar_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, ct.shift.x, ct.shift.y);

	us.mouse_pos_uploaded = false;
	moveAllPictures();
	moveAllStickers();
	moveAllNoters();

	var center = calcCenter();

	var location_tag = "#" + center.b.x + "," + center.b.y;
	if (location.hash != location_tag)
		location.hash = location_tag;
	//if (location.hash != "" && location.hash != "#" && location.hash != location_tag)
	//	location.hash = "";

	var location_tag = "(" + center.b.x + ", " + center.b.y + ") x " + currentScale();
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
function calcBlock(uPt) {
	var block_idx_x = Math.floor((uPt.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
	var block_idx_y = Math.floor((uPt.y + BLOCK_SIZE / 2) / BLOCK_SIZE);

	return { x: block_idx_x, y: block_idx_y };
}
function printBlockAndHead(uPt) {
	var block_idx_x = Math.floor((uPt.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
	var block_idx_y = Math.floor((uPt.y + BLOCK_SIZE / 2) / BLOCK_SIZE);
	var head_x = uPt.x - block_idx_x * BLOCK_SIZE;
	var head_y = uPt.y - block_idx_y * BLOCK_SIZE;

	var location_tag = "(" + block_idx_x + ", " + block_idx_y + ")-(" + head_x + ", " + head_y + ")";

	ds.$coord_para.text(location_tag);
}
function missingBlock() {
	var center = calcCenter();
	var block_idx = jQuery.extend({}, center.b);

	//var block_idx_x = center.b.x;
	//var block_idx_y = center.b.y;
	var arr = [];

	for (var i = 0; i < ITERATE_ARRAY_X.length; i++) {
		block_idx.x += ITERATE_ARRAY_X[i];
		block_idx.y += ITERATE_ARRAY_Y[i];

		if (withinRange(block_idx, center.b)) {
			var block_key = block_idx.x + "," + block_idx.y;

			if (!isBlockDownloaded(block_key)) {
				arr.push(jQuery.extend({}, block_idx));

				if (arr.length == MAX_DOWNLOAD_BLOCK_CNT)
					return arr;
			}
		}
	}
	return arr;
}
function setBlockDownloaded(block_idx_arr, value/*0=not downloaded, 1=downloading, 2=downloaded*/) {
	for (var i = 0; i < block_idx_arr.length; i++) {
		var block_idx = block_idx_arr[i];
		var block_key = block_idx.x + "," + block_idx.y;

		if (value == 1) {
			ly.note_paths[block_key] = [];
			ly.picture_paths[block_key] = [];
			ly.block_downloaded[block_key] = value;		// prevent it from being downloaded again.
		}
		else if (value == 2) {
			ly.block_downloaded[block_key] = value;
		}
		else {
			delete ly.note_paths[block_key];
			delete ly.picture_paths[block_key];
			delete ly.block_downloaded[block_key];
		}
	}
	redrawBground();
}
function checkStoredPaths() {
	ds.csp_timer_id = null;
	var block_idx_arr = missingBlock();

	if (block_idx_arr.length != 0) {
		setBlockDownloaded(block_idx_arr, 1/*true*/);

		try {
			//console.log("Download stored paths of " + block_key + ".");

			var drawing_hub = $.connection.drawingHub;
			drawing_hub.server.getStoredPaths4(block_idx_arr/*block_idx.x, block_idx.y*/).done(function (block_path_array) {
				block_path_array.forEach(function (path_array) {
					path_array.forEach(function (c_path, idx) {
						c_path.sn = idx;
					});
					onStoredPaths(path_array);		// todo: don't redraw on every paths.
				});
				setBlockDownloaded(block_idx_arr, 2);

				prepareCheckStoredPaths();
				//console.log("Download stored paths of " + block_key + " success.");
			}).fail(function (error) {
				errorPrint("drawing_hub.server.getStoredPaths3 fail - " + error);
				setBlockDownloaded(block_idx_arr, 0/*false*/);
			});
		}
		catch (ex) {
			errorPrint("drawing_hub.server.getStoredPaths3 threw an error - " + ex.name + ": " + ex.message + ".");
			setBlockDownloaded(block_idx_arr, 0/*false*/);
			//alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
		}
	}
}
function prepareCheckStoredPaths() {
	clearTimeout(ds.csp_timer_id);
	ds.csp_timer_id = setTimeout(checkStoredPaths, 100);
}
function checkHashLocation() {
	var center = calcCenter();

	var location_tag = "#" + center.b.x + "," + center.b.y;

	if (location.hash != "" && location.hash != "#" && location.hash != location_tag)
		goHashLocation();
}
function goHashLocation() {
	var result = location.hash.match(/#([-0-9]+),([-0-9]+)/);
	if (result != null) {
		var uCenter = {
			x: Number(result[1]) * BLOCK_SIZE,
			y: Number(result[2]) * BLOCK_SIZE
		};
		goLocation(uCenter);

		//location.hash = "";
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

	canvas_elt = document.getElementById("draft_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	canvas_elt = document.getElementById("bground_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	canvas_elt = document.getElementById("avatar_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	positionPanels();

	updateOutsideBlockDist();

	//ct.shift.x = window.innerWidth >> 1;
	//ct.shift.y = window.innerHeight >> 1;
}
function onResize(event) {
	var canvas_elt = document.getElementById("drawing_canvas");

	if (event) {
		ct.shift.x -= (canvas_elt.width - window.innerWidth) >> 1;
		ct.shift.y -= (canvas_elt.height - window.innerHeight) >> 1;
	}
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	canvas_elt = document.getElementById("draft_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	canvas_elt = document.getElementById("bground_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	canvas_elt = document.getElementById("avatar_canvas");
	canvas_elt.width = window.innerWidth;
	canvas_elt.height = window.innerHeight;

	positionPanels();

	if (!event)
		if (isSmallScreen()) {
			toggleRightSidebar(true);
			toggleLeftSidebar(true);
		}
		else {
			if (localStorage["prev_rsb_collapse"])
				toggleRightSidebar(localStorage["prev_rsb_collapse"] == "true");

			if (localStorage["prev_lsb_collapse"])
				toggleLeftSidebar(localStorage["prev_lsb_collapse"] == "true");
		}
	updateOutsideBlockDist();
	if (event)
		updateTransformAndRedraw();
}
function isSmallScreen() {
	return window.innerWidth < 992;
}
function positionTop(id, top) {
	var $elt = $("#" + id);
	$elt.css("top", top);
	//var pos = $elt.offset();
	//pos.top = top;
	//$elt.offset(pos);
}
function positionPanels() {
	var margin = 0;
	var top = $("#top_navbar").height();
	top += margin;

	positionTop("left_sidebar", top);
	positionTop("right_sidebar", top);

	//positionTop("layer_panel", top);
	//positionTop("chat_panel", top);

	//var left_top = top + $("#layer_panel").height();
	//left_top += margin;
	//positionTop("note_panel", left_top);

	/*var right_top = top + $("#chat_panel").height();
	right_top += margin;
	positionTop("color_panel", right_top);

	positionTop("tip_size_panel", right_top);*/
}
function downloadRoomInfo(initial) {
	var room_name = getRoomNameFromUrl();		// case may be incorrect.

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getRoom(room_name).done(function (room_info) {
			if (!room_info) {
				if (initial) {
					alert("The room \"" + room_name + "\" is not found on the server.");

					if (location.pathname != "/")
						location.assign("/");
				}
			}
			else {
				g_room_info = room_info;

				if (initial) {
					onHomeClick();
					onRoomEnter();
				}
			}
		}).fail(function (error) {
			errorPrint("drawing_hub.server.getRoom fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getRoom threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
//function onHome(bHome) {
//	ds.uHome = { x: bHome.X * BLOCK_SIZE, y: bHome.Y * BLOCK_SIZE };
//	goLocation(ds.uHome);
//}
function insertPathBatch(flag_path, path_batch, uri) {
	for (var i = 0; i < path_batch.length; i++) {
		var path = path_batch[i];

		var t_head = applyTransform(flag_path.transform_matrix, path.head);

		var uHead = {
			x: flag_path.blockIdx.x * BLOCK_SIZE + flag_path.head.x + t_head.x/*path.head.x*/,
			y: flag_path.blockIdx.y * BLOCK_SIZE + flag_path.head.y + t_head.y/*path.head.y*/
		};
		if (path.blockIdx.x != 0 || path.blockIdx.y != 0)
			throw new Error("path.blockIdx.x != 0 || path.blockIdx.y != 0");

		var insert_path = new Path(conjoinTransformMatrix(flag_path.transform_matrix, path.transform_matrix),
			path.zoom,
			flag_path.layer,
			path.type,
			flag_path.userId,
			uHead);

		if (inSameBlock(insert_path, flag_path)) {
			var dobj = applyTransformArray(flag_path.transform_matrix, path.dx, path.dy);

			insert_path.dx = dobj.dx/*path.dx*/;
			insert_path.dy = dobj.dy/*path.dy*/;
			insert_path.pb_uri = uri;
			insert_path.gsid = flag_path.gsid;
			insert_path.subid = i;
			insert_path.color = path.color;
			insert_path.tipSize = path.tipSize;
			insert_path.brushId = path.brushId;
			insert_path.blur = path.blur;
			insert_path.idio = path.idio;

			addPath(insert_path);
		}
	}
}
function getPathBatch(uri, callback) {
	var path_batch = pb.dl_pbs[uri];		// undefined=not downloaded. null=download in progress. []=download failed.

	if (path_batch) {
		// if the blob download failed, path_batch is [] and still goes into here.

		pb.dl_pbs_use_time[uri] = new Date();
		if (callback)
			callback();
		return path_batch;
	}
	else {
		if (path_batch === undefined) {
			pb.dl_pbs[uri] = null;
			downloadPathBatch(uri, callback);
		}
		return null;
	}
}
function downloadPathBatch(uri, callback) {
	getBlob(uri, function (data) {
		var path_batch = [];

		if (data != null) {
			var compressed = new Uint8Array(data);

			var text = LZString.decompressFromUint8Array(compressed);

			var reduced_paths = JSON.parse(text);

			for (var i = 0; i < reduced_paths.length; i++) {
				var r_path = reduced_paths[i];

				var path = recoverReducedPath(r_path, g_user_id/*""*/);		// g_user_id for coloring green when pasting (if user selects and copies the pb, it will be loaded into pb.copied_paths).
				path_batch.push(path);
			}
			//console.log("Downloaded PB (" + uri + "). length=" + reduced_paths.length + ".");
		}
		else
			errorPrint("Download PB (" + uri + ") failed.");

		pb.dl_pbs[uri] = path_batch;
		pb.dl_pbs_use_time[uri] = new Date();
		pb.dl_pbs_length[uri] = path_batch.length;

		processWaitBatchPaths();

		if (callback)
			callback();
	});
}
function scissorPath(s_path, dx_len) {
	var block_key = s_path.blockKey();

	var layer_paths = getLayerPaths(s_path.layer);

	var path_array = layer_paths[block_key];
	if (path_array) {
		for (var i = path_array.length - 1; i >= 0; i--) {
			var path = path_array[i];

			if (path.belongsTo(s_path.blockIdx)) {
				if (s_path.type == PT_SCISSOR) {
					if (isScissorTarget(s_path, dx_len, path)) {
						//path_array.splice(i, 1);
						removePath(path);
						return;
					}
				}
				else if (s_path.type == PT_TRASH) {
					if (s_path.userId == path.userId)
						//path_array.splice(i, 1);
						removePath(path);
				}
			}
		}
	}
}
function isBatchAllAvailable(c_paths) {
	for (var i = 0; i < c_paths.length; i++) {
		var c_path = c_paths[i];
		if (c_path.t == PT_BATCH) {
			var path_batch = getPathBatch(c_path.c);
			if (!path_batch)
				return false;
		}
	}
	return true;
}
function appendArray(dst, src) {
	for (var i = 0; i < src.length; i++)
		dst.push(src[i]);
}
function multiplyArray(arr, multiplier) {
	var arr2 = [];
	for (var i = 0; i < arr.length; i++)
		arr2.push(arr[i] * multiplier);
	return arr2;
}
function splitToNumberArray(text, separator) {
	var arr = text.split(separator);

	for (var i = 0; i < arr.length; i++) {
		arr[i] = Number(arr[i]);
	}
	return arr;
}
function onStoredPaths(c_paths) {
	if (isBatchAllAvailable(c_paths)) {
		for (var i = 0; i < c_paths.length; i++) {
			var c_path = c_paths[i];
			processNewPath(c_path);
		}
		if (!ds.is_tracking)		// prevent flicker
			redrawDrawingPaths();
	}
	else {
		appendArray(pb.wait_batch_paths, c_paths);
		processWaitBatchPaths();
	}
}
function onEarlyPaths(c_paths) {
	for (var i = 0; i < c_paths.length; i++) {
		var c_path = c_paths[i];

		if (c_path.u != g_user_id) {
			var path = cPathToPath(c_path);
			path.time = new Date();

			ds.pending_paths.push(path);
		}
	}
	if (!ds.is_tracking)		// prevent flicker
		redrawDrawingPaths();
	//console.log("onEarlyPaths. ds.pending_paths=" + ds.pending_paths.length + ".");
}
function onNewPaths(c_paths) {
	for (var i = 0; i < c_paths.length; i++) {
		var c_path = c_paths[i];
		pb.wait_batch_paths.push(c_path);

		//var uHead = {
		//	x: c_path.bx * BLOCK_SIZE + Number(c_path.hx),
		//	y: c_path.by * BLOCK_SIZE + Number(c_path.hy)
		//};
		//onActivity(c_path.u, uHead);
	}
	processWaitBatchPaths();
	//updateActivityList();
}
function processWaitBatchPaths() {
	while (pb.wait_batch_paths.length) {
		var c_path = pb.wait_batch_paths[0];

		if (processNewPath(c_path))
			pb.wait_batch_paths.shift();
		else
			break;
	}
	if (!ds.is_tracking)		// prevent flicker
		redrawDrawingPaths();
}
function processNewPath(c_path) {
	var path = cPathToPath(c_path);

	var block_key = path.blockKey();
	//var block_key = c_path.bx + "," + c_path.by;

	if (isBlockDownloaded(block_key)) {
		if (path.type == PT_SCISSOR || path.type == PT_TRASH) {
			scissorPath(path, Number(c_path.c));
		}
		else if (path.type == PT_BATCH) {
			var path_batch = getPathBatch(c_path.c);
			if (!path_batch)
				return false;
			insertPathBatch(path, path_batch, c_path.c);
		}
		else if (path.type == PT_NOTE) {
			var note = c_path.c;
			addNoter(block_key, note, path);
		}
		else if (path.type == PT_PICTURE) {
			onNewPicture(block_key, c_path.c, path);

			if (path.userId != g_user_id)
				addRecentPicture(c_path.c, false);
		}
		else if (path.type == PT_PENCIL || path.type == PT_ERASER || path.type == PT_FILLER) {
			addPath(path);

			// If the path is from stored, then the block is clean and every path should be drawn.
			// Otherwise current user's path will not be visible.
			// If the path is not from stored, then it has been drawn when mousemove and should not be drawn again.
			//if (path.userId != g_user_id || from_stored)
			//	setAttrAndDrawPath(path);

			//if (path.userId == g_user_id)
			removePendingPath(path);
		}
	}
	return true;
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
function goUserPosition(forward) {
	var user_ids = Object.keys(us.user_position);		// This operation is heavy.

	var idx = user_ids.indexOf(g_user_id);
	if (idx != -1)
		user_ids.splice(idx, 1);

	if (user_ids.length > 0) {
		if (forward) {
			us.iterate_idx++;
			if (us.iterate_idx >= user_ids.length)
				us.iterate_idx = 0;
		}
		else {
			us.iterate_idx--;
			if (us.iterate_idx < 0)
				us.iterate_idx = user_ids.length - 1;
		}
		var user_id = user_ids[us.iterate_idx];
		var pos = us.user_position[user_id];

		goLocation({ x: pos.X, y: pos.Y });
	}
}
function purgePendingPaths() {
	var now = new Date();
	var changed = false;

	for (var i = ds.pending_paths.length - 1; i >= 0; i--) {
		var path = ds.pending_paths[i];

		var diff = now.getTime() - path.time.getTime();
		if (diff >= 10 * 1000/*ms*/) {
			ds.pending_paths.splice(i, 1);
			changed = true;
		}
	}
	if (changed) {
		//console.log("purgePendingPaths. ds.pending_paths=" + ds.pending_paths.length + ".");

		if (!ds.is_tracking)		// prevent flicker
			redrawDrawingPaths();
	}
}
function removePendingPath(path) {
	for (var i = 0; i < ds.pending_paths.length; i++) {
		if (isSamePath(path, ds.pending_paths[i])) {
			ds.pending_paths.splice(i, 1);
			break;
		}
	}
	//console.log("removePendingPath. ds.pending_paths=" + ds.pending_paths.length + ".");
}
function isSamePath(path1, path2) {
	return path1.head.x == path2.head.x &&
		path1.head.y == path2.head.y &&
		path1.blockIdx.x == path2.blockIdx.x &&
		path1.blockIdx.y == path2.blockIdx.y &&
		path1.userId == path2.userId &&
		path1.type == path2.type &&
		path1.layer == path2.layer &&
		path1.dx.length == path2.dx.length;
}
function inSameBlock(path1, path2) {
	return path1.blockIdx.x == path2.blockIdx.x &&
		path1.blockIdx.y == path2.blockIdx.y;
}
function isScissorTarget(s_path, dx_len, path2) {
	return s_path.head.x == path2.head.x &&
		s_path.head.y == path2.head.y &&
		s_path.userId == path2.userId &&
		dx_len == path2.dx.length;
}
function resetDrawingAttributes(ctx) {
	ctx.globalCompositeOperation = "source-over";
	ctx.shadowBlur = 0;
}
function setDrawingAttributes(ctx, path) {
	var lw = path.tipSize;
	//var lw = path.type == PT_ERASER ? 20 : 1;
	//if (path.type == PT_ERASER)
	lw *= transformMatrixScale(path.transform_matrix);
	//else
	//	lw /= currentScale();

	ctx.globalCompositeOperation = path.type == PT_ERASER ? "destination-out" : "source-over";
	ctx.lineWidth = lw;

	//ctx.strokeStyle = path.layer == DRAFT_LAYER_NUM ? "gray" : "black";
	ctx.strokeStyle = path.color;
	ctx.fillStyle = path.color;
	ctx.shadowColor = path.color;

	var bg = path.idio.bg ? path.idio.bg * af.breath_val * 2 : 0;
	ctx.shadowBlur = (path.blur + bg) * currentScale();
}
function setAvatarAttributes(path) {
	var lw = path.tipSize;
	//var lw = path.type == PT_ERASER ? 20 : 1;
	//if (path.type == PT_ERASER)
	lw *= transformMatrixScale(path.transform_matrix);
	//else
	//	lw /= currentScale();
	var color = path.userId == g_user_id ? "green" : "red";

	ly.avatar_ctx.globalCompositeOperation = "source-over";

	ly.avatar_ctx.strokeStyle = path.type == PT_ERASER ? "white" : color;
	ly.avatar_ctx.fillStyle = path.type == PT_ERASER ? "white" : color;

	ly.avatar_ctx.shadowColor = color;
	ly.avatar_ctx.shadowBlur = 3;
	ly.avatar_ctx.lineWidth = lw;
}
function pointDistance(pt1, pt2) {
	var dx = pt1.x - pt2.x;
	var dy = pt1.y - pt2.y;

	return dx * dx + dy * dy;
}
function pathDistance(uPt, path) {
	var pt = path.uHead();

	var dist = pointDistance(uPt, pt);

	for (var i = 0; i < path.dx.length; i++) {
		pt.x += path.dx[i];
		pt.y += path.dy[i];

		var d = pointDistance(uPt, pt);
		if (d < dist)
			dist = d;
	}
	return dist;
}
function isNear(pt1, pt2) {
	var d = 5 / currentScale();

	return pt1.x <= pt2.x + d &&
			pt1.x >= pt2.x - d &&
			pt1.y <= pt2.y + d &&
			pt1.y >= pt2.y - d;
}
function isNearPath(uPt, path) {
	if (path.dx.length > 0) {
		var pt = path.uHead();

		if (isNear(uPt, pt))
			return true;

		for (var i = 0; i < path.dx.length; i++) {
			pt.x += path.dx[i];
			pt.y += path.dy[i];

			if (isNear(uPt, pt)) {
				//console.log("isNearPath. uPt.x=" + uPt.x + ", uPt.y=" + uPt.y + ".");
				return true;
			}
		}
	}
	return false;
}
function drawDrawingPaths(ctx, paths) {
	for (var i = 0; i < paths.length; i++) {
		drawDrawingPath(ctx, paths[i]);
	}
}
function drawDrawingPath(ctx, path) {
	setDrawingAttributes(ctx, path);

	drawPath(ctx, path);
}
function drawAvatarPaths(paths) {
	for (var i = 0; i < paths.length; i++) {
		drawAvatarPath(paths[i]);
	}
}
function drawAvatarPath(path) {
	setAvatarAttributes(path);
	drawPath(ly.avatar_ctx, path);
}
function drawPath(ctx, path) {
	if (path.dx.length > 0) {
		var pt = path.uHead();

		ctx.beginPath();
		ctx.moveTo(pt.x, pt.y);

		for (var i = 0; i < path.dx.length; i++) {
			pt.x += path.dx[i];
			pt.y += path.dy[i];

			ctx.lineTo(pt.x, pt.y);
		}
		if (path.type == PT_FILLER)
			ctx.fill();
		else
			ctx.stroke();

		drawBrush(ctx, path, pt);
	}
}
function drawBrush(ctx, path, ptTail) {
	var brush_def = BRUSH_DEF[path.brushId];

	if (brush_def.tipShape == 1) {
		var ptHead = path.uHead();
		var radius = ctx.lineWidth / 2;

		ctx.beginPath();

		ctx.arc(ptHead.x, ptHead.y, radius, 0, Math.PI * 2, false);
		ctx.arc(ptTail.x, ptTail.y, radius, 0, Math.PI * 2, false);

		ctx.fill();
	}
}
function setClip(ctx, block_idx) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(block_idx.x * BLOCK_SIZE - BLOCK_SIZE / 2,
			block_idx.y * BLOCK_SIZE - BLOCK_SIZE / 2,
			BLOCK_SIZE,
			BLOCK_SIZE);
	ctx.clip();
}
function resetClip(ctx) {
	ctx.restore();
}
function withinRoom(uPt) {
	if (g_room_info.Attr & 1/*LIMITED*/) {
		var entrance_x = g_room_info.EntranceX * BLOCK_SIZE;
		var entrance_y = g_room_info.EntranceY * BLOCK_SIZE;

		var left_x = entrance_x - g_room_info.Size * BLOCK_SIZE / 2;
		var top_y = entrance_y + g_room_info.Size * BLOCK_SIZE / 2;
		var bottom_y = entrance_y - g_room_info.Size * BLOCK_SIZE / 2;

		if (uPt.x < left_x)
			return false;
		if (uPt.y > top_y)
			return false;
		if (uPt.y < bottom_y)
			return false;
	}
	return true;
}
function isHomeBlock(block_idx) {
	if (block_idx.x == g_room_info.HomeX && block_idx.y == g_room_info.HomeY)
		return 1;

	var min = {
		x: Math.min(g_room_info.HomeX, g_room_info.EntranceX),
		y: Math.min(g_room_info.HomeY, g_room_info.EntranceY),
	};
	var max = {
		x: Math.max(g_room_info.HomeX, g_room_info.EntranceX),
		y: Math.max(g_room_info.HomeY, g_room_info.EntranceY),
	};
	if (withinMinMax(block_idx, min, max))
		return 2;
	return 0;
}
function withinMinMax(pt, min, max) {
	return pt.x >= min.x && pt.x <= max.x && pt.y >= min.y && pt.y <= max.y;
}
function withinRange2(center1, center2, dist_x, dist_y) {
	return Math.abs(center1.x - center2.x) <= dist_x &&
			Math.abs(center1.y - center2.y) <= dist_y;
}
function withinRange(center1, center2) {
	return withinRange2(center1, center2, outside_block_dist_x, outside_block_dist_y);

	//return Math.abs(center1.x - center2.x) <= outside_block_dist_x &&
	//		Math.abs(center1.y - center2.y) <= outside_block_dist_y;
}
function drawBground() {
	var center = calcCenter();

	for (var block_key in ly.block_downloaded) {
		if (ly.block_downloaded[block_key] == 2) {
			var block_idx = blockKeyToIdx(block_key);

			if (withinRange(block_idx, center.b)) {
				ly.bground_ctx.clearRect(block_idx.x * BLOCK_SIZE - BLOCK_SIZE / 2,
										block_idx.y * BLOCK_SIZE - BLOCK_SIZE / 2,
										BLOCK_SIZE,
										BLOCK_SIZE);

				var ihb = isHomeBlock(block_idx);
				if (ihb) {
					ly.bground_ctx.strokeStyle = ihb == 1 ? "red" : "gray";
					ly.bground_ctx.strokeRect(block_idx.x * BLOCK_SIZE - BLOCK_SIZE / 2,
											block_idx.y * BLOCK_SIZE - BLOCK_SIZE / 2,
											BLOCK_SIZE,
											BLOCK_SIZE);
				}
			}
		}
	}
}
function drawDraftPaths() {
	if (isLayerVisible(DRAFT_LAYER_NUM)) {
		var center = calcCenter();

		for (var block_key in ly.draft_paths) {
			var path_array = ly.draft_paths[block_key];

			if (path_array.length > 0) {
				var block_idx = blockKeyToIdx(block_key);

				if (withinRange(block_idx, center.b)) {
					render(DRAFT_LAYER_NUM, block_key, block_idx, path_array, ly.draft_ctx);
					//setClip(ly.draft_ctx, block_idx);
					//drawDrawingPaths(ly.draft_ctx, path_array);					
					//resetClip(ly.draft_ctx);
				}
			}
		}
	}
}
function drawMainPaths() {
	if (isLayerVisible(MAIN_LAYER_NUM)) {
		var center = calcCenter();

		for (var block_key in ly.main_paths) {
			//if (ds.all_paths.hasOwnProperty(block_key)) {		// remove this check to speed up.
			var path_array = ly.main_paths[block_key];

			if (path_array.length > 0) {
				var block_idx = blockKeyToIdx(block_key);

				if (withinRange(block_idx, center.b)) {
					render(MAIN_LAYER_NUM, block_key, block_idx, path_array, ly.drawing_ctx);
					//setClip(ly.drawing_ctx, block_idx);
					//drawDrawingPaths(ly.drawing_ctx, path_array);
					//resetClip(ly.drawing_ctx);
				}
			}
		}
	}
	drawDrawingPaths(ly.drawing_ctx, ds.pending_paths);
	drawDrawingPaths(ly.drawing_ctx, ua.wait_upload_paths);
}
function drawAllAvatarPaths() {
	if (ds.hovered_path) {
		if (isTrashing()) {
			var block_key = ds.hovered_path.blockKey();
			var layer_paths = getLayerPaths(ds.hovered_path.layer);

			var path_array = layer_paths[block_key];
			if (path_array) {
				for (var i = 0; i < path_array.length; i++) {
					var path = path_array[i];
					if (path.belongsTo(ds.hovered_path.blockIdx) && path.userId == ds.hovered_path.userId) {
						drawAvatarPath(path);
					}
				}
			}
		}
		else if (isScissoring()) {
			drawAvatarPath(ds.hovered_path);
		}
	}
	drawAvatarPaths(pb.selected_paths);

	if (pb.copied_paths.length) {
		if (isPasting()) {
			ly.avatar_ctx.save();

			ly.avatar_ctx.setTransform(ct.scale.x, 0, 0, ct.scale.y, us.last_mouse_pos.x, us.last_mouse_pos.y);
			ly.avatar_ctx.transform(pb.transform_matrix[0], pb.transform_matrix[1], pb.transform_matrix[2], pb.transform_matrix[3], 0, 0);

			drawAvatarPaths(pb.copied_paths);
			ly.avatar_ctx.restore();
		}
	}
}
function findMousePath(wMouse) {
	var uMouse = windowCoordToUniverseCoord(wMouse);
	var bMouse = calcBlock(uMouse);

	var layer_paths = getLayerPaths();
	var min_dist = 50 / currentScale();
	min_dist = min_dist * min_dist;
	var min_path = null;

	for (var block_key in layer_paths) {
		//if (ds.all_paths.hasOwnProperty(block_key)) {		// remove this check to speed up.
		var path_array = layer_paths[block_key];

		if (path_array.length > 0) {
			var block_idx = blockKeyToIdx(block_key);

			if (withinRange2(block_idx/*path_array[0].blockIdx*/, bMouse, 4/*2*/, 4/*2*/)) {
				for (var i = 0; i < path_array.length; i++) {
					var path = path_array[i];

					if (path.belongsTo(block_idx)) {
						var dist = pathDistance(uMouse, path);

						if (dist < min_dist) {
							min_dist = dist;
							min_path = path;
						}
					}
				}
			}
		}
	}
	return min_path;
}
function findPathInRect(left, top, width, height) {
	var wMin = { x: left, y: top + height };
	var wMax = { x: left + width, y: top };

	var uMin = windowCoordToUniverseCoord(wMin);
	var uMax = windowCoordToUniverseCoord(wMax);

	var bMin = calcBlock(uMin);
	var bMax = calcBlock(uMax);

	pb.selected_paths.length = 0;

	var layer_paths = getLayerPaths();

	for (var block_key in layer_paths) {
		//if (ds.all_paths.hasOwnProperty(block_key)) {		// remove this check to speed up.
		var path_array = layer_paths[block_key];

		if (path_array.length > 0) {
			var block_idx = blockKeyToIdx(block_key);

			if (withinMinMax(block_idx/*path_array[0].blockIdx*/, bMin, bMax)) {
				for (var i = 0; i < path_array.length; i++) {
					var path = path_array[i];
					var uPt = path.uHead();

					if (path.belongsTo(block_idx) &&
						withinMinMax(uPt, uMin, uMax)) {
						pb.selected_paths.push(path);
					}
				}
			}
		}
	}
}
function redrawAllPaths() {
	redrawDrawingPaths();
	redrawAvatarPaths();
}
function paintCanvas(ctx, canvas_id) {
	var canvas_elt = document.getElementById(canvas_id);

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	ctx.fillStyle = "gray";		//"#FFE87C";
	ctx.fillRect(0, 0, canvas_elt.width, canvas_elt.height);
	ctx.restore();
}
function clearCanvas(ctx, canvas_id) {
	var canvas_elt = document.getElementById(canvas_id);

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	ctx.clearRect(0, 0, canvas_elt.width, canvas_elt.height);
	ctx.restore();
}
function redrawBground() {
	paintCanvas(ly.bground_ctx, "bground_canvas");
	drawBground();
}
function redrawDrawingPaths() {
	clearCanvas(ly.draft_ctx, "draft_canvas");

	drawDraftPaths();
	//
	clearCanvas(ly.drawing_ctx, "drawing_canvas");

	drawMainPaths();
}
function redrawAvatarPaths() {
	clearCanvas(ly.avatar_ctx, "avatar_canvas");

	drawAllAvatarPaths();
}
function updateTransformAndRedraw() {
	updateTransform();
	redrawBground();
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
function onCanvasClick(e) {
	if (!acceptMouse(e)) return;

	var wMouse = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
	ds.last_click_upt = windowCoordToUniverseCoord(wMouse);

	//console.log("ds.last_click_upt.x=" + ds.last_click_upt.x + ", ds.last_click_upt.y=" + ds.last_click_upt.y + ".");

	if (isScissoring() || isTrashing()) {
		if (ds.hovered_path) {
			var path = jQuery.extend({}, ds.hovered_path);		// shallow copy
			path.type = isTrashing() ? PT_TRASH : PT_SCISSOR;

			scissorPath(path, path.dx.length);
			if (ds.hovered_path.userId == g_user_id) {
				//uploadPath(path);
				ua.wait_direct_upload_paths.push(path);
			}
			ds.hovered_path = null;
			redrawAllPaths();

			e.preventDefault();
		}
	}
	else if (isPicturing()) {
		if (pc.pict_blob) {
			var hint = fileSizeHint(pc.pict_blob.size);

			if (confirm("Image file size=" + hint + ". Press \"Ok\" to start uploading this image.")) {
				uploadPicture(pc.pict_blob);
				resetPictDialog(true);
			}
		}
		else if (pc.pict_url) {
			if (confirm("Image URL=" + pc.pict_url + ". Press \"Ok\" to link this image.")) {
				uploadPicturePath(pc.pict_url);
				resetPictDialog(true);
			}
		}
		restoreTool();
		e.preventDefault();
	}
	else if (isPasting()) {
		if (pb.copied_paths.length) {
			$("#paste_bar").show().offset({ left: wMouse.x, top: wMouse.y });
			e.preventDefault();
		}
	}
	else if (isNoting()) {
		$("#note_bar").show().offset({ left: wMouse.x, top: wMouse.y });
		$('#note_ipt').focus();
		e.preventDefault();
	}
}
function onMouseDown(e) {
	if (!acceptMouse(e)) return;

	//console.log("onMouseDown. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");
	//var mouseX = Math.round(e.clientX);
	//var mouseY = Math.round(e.clientY);

	var wMouse = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
	var uMouse = windowCoordToUniverseCoord(wMouse);
	//console.log("onMouseDown. uMouse.x=" + uMouse.x + ", uMouse.y=" + uMouse.y + ".");

	if (isScissoring() || isTrashing() || isPicturing() || isPasting() || isNoting()) {
	}
	else if (!ds.is_tracking) {
		ds.is_tracking = true;

		if (isSelecting()) {
			ds.tracking_pt.x = wMouse.x;
			ds.tracking_pt.y = wMouse.y;

			var off = { left: ds.tracking_pt.x, top: ds.tracking_pt.y };

			refocus(true);
			$("#select_rect").show().offset(off).width(0).height(0);
		}
		else if (!isPanning()) {
			ds.tracking_pt.x = uMouse.x;
			ds.tracking_pt.y = uMouse.y;

			var type = isErasing() ? PT_ERASER : (isFilling() ? PT_FILLER : PT_PENCIL);

			ds.tracking_path = new Path([1, 0, 0, 1], currentZoom(), ly.active_layer, type, g_user_id, uMouse);
			//ds.tracking_path.color = $('#color_ipt').val();
			ds.tracking_path.color = $('#color_ipt').chromoselector("getColor").getHexString();
			ds.tracking_path.tipSize = type == PT_ERASER ? ts.eraser_size : (type == PT_FILLER ? 1 : ts.pencil_size);
			ds.tracking_path.blur = type == PT_ERASER ? 0 : ts.curr_blur;

			if (type == PT_PENCIL && ts.curr_bglow != 0)
				ds.tracking_path.idio.bg = ts.curr_bglow;

			ds.tracking_path.brushId = ts.curr_brush_id;
		}
		else {
			ds.tracking_pt.x = wMouse.x;
			ds.tracking_pt.y = wMouse.y;
		}
		e.preventDefault();
	}
}
function onMouseMove(e) {
	//console.log("onMouseMove. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");
	//var mouseX = Math.round(e.clientX);
	//var mouseY = Math.round(e.clientY);		// IE give floating point clientX and Y.
	var wMouse = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
	//printBlockAndHead(windowCoordToUniverseCoord(wMouse));

	us.last_mouse_pos = wMouse;
	us.mouse_pos_uploaded = false;

	if (isScissoring() || isTrashing()) {
		var prev_hovered_path = ds.hovered_path;

		ds.hovered_path = findMousePath(wMouse);

		if (ds.hovered_path != prev_hovered_path) {
			redrawAvatarPaths();
			e.preventDefault();
		}
	}
	else if (isPasting()) {
		if (pb.copied_paths.length) {
			redrawAvatarPaths();
			e.preventDefault();
		}
	}
	else if (ds.is_tracking) {
		if (isSelecting()) {
			var off = {};

			off.left = Math.min(wMouse.x, ds.tracking_pt.x);
			off.top = Math.min(wMouse.y, ds.tracking_pt.y);

			var w = Math.abs(wMouse.x - ds.tracking_pt.x);
			var h = Math.abs(wMouse.y - ds.tracking_pt.y);

			$("#select_rect").offset(off).width(w).height(h);

			var prev_len = pb.selected_paths.length;

			findPathInRect(off.left, off.top, w, h);

			if (pb.selected_paths.length != prev_len) {
				if (pb.selected_paths.length > 600)
					pb.selected_paths.length = 600;

				redrawAvatarPaths();
			}
		}
		else if (!isPanning()) {
			var uMouse = windowCoordToUniverseCoord(wMouse);

			var dx = uMouse.x - ds.tracking_pt.x;
			var dy = uMouse.y - ds.tracking_pt.y;

			if (dx != 0 || dy != 0) {
				ds.tracking_path.dx.push(dx);
				ds.tracking_path.dy.push(dy);

				setDrawingAttributes(ly.drawing_ctx, ds.tracking_path);

				ly.drawing_ctx.beginPath();
				ly.drawing_ctx.moveTo(ds.tracking_pt.x, ds.tracking_pt.y);

				ds.tracking_pt.x = uMouse.x;
				ds.tracking_pt.y = uMouse.y;

				ly.drawing_ctx.lineTo(ds.tracking_pt.x, ds.tracking_pt.y);
				ly.drawing_ctx.stroke();

				if (ds.tracking_path.dx.length >= 350/*150*/)
					onMouseUp(e);
			}
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
}
function cPathToPath(c_path) {
	//if (c_path.g != 0)
	//	console.log("c_path.g=" + c_path.g + ".");
	var path = new Path(c_path.tm, c_path.z, c_path.l, c_path.t, c_path.u);

	if (c_path.s/*0 for old paths*/)
		path.tipSize = c_path.s;

	path.brushId = c_path.b;
	path.blur = c_path.r;

	if (c_path.i)
		path.idio = JSON.parse(c_path.i);

	path.color = c_path.o;
	path.head.x = Number(c_path.hx);
	path.head.y = Number(c_path.hy);
	path.blockIdx.x = c_path.bx;
	path.blockIdx.y = c_path.by;
	path.gsid = c_path.g;

	if (c_path.sn != undefined)		// may be undefined for new paths.
		path.subid = c_path.bx * 1000000 + c_path.by * 1000 + c_path.sn;		// Some kind of hash. Same value for same path.

	if (path.type == PT_PENCIL || path.type == PT_ERASER || path.type == PT_FILLER) {
		if (isNumber(c_path.c.substr(0, 1))) {
			// ie.-2_-2_-3_-1_-3_-2_-1_-1_-4_-1_-3_-1_-4_-1_-2_-3_-1_-3_0_-1_0_0_0_0_0_0_0_1_1_1_2_2_2_3_3_2_3_3_1_1_2_2_1_2_2_1_1_1_0_0_0_0_0_0_0_0_0_-1_-1_-1_0_-1_-2_0_0_0_0_0_0_0_0_0_2_1_2_4_3_3_4_4_4_2_3_1_3_1_1_1_2_1_2_0_0_0_0_0_0_0_0_0_-1_0_0_-1_0_-2_-2_-1_-2_-1_-2_-2_-2_-1_-3_-1_-1_-2_-1_-1_-1_-2_-2_-1_0_-1
			var arr = splitToNumberArray(c_path.c, XY_COMBINE_SEPARATOR);

			//var arr = c_path.c.split(XY_COMBINE_SEPARATOR);
			//var multiplier = path.zoom > 0 ? 1 / path.zoom : -path.zoom;

			//for (var i = 0; i < arr.length; i++) {
			//	arr[i] = Number(arr[i])/* * multiplier*/;
			//}
			//path.dx = arr.slice(0, arr.length / 2);
			//path.dy = arr.slice(arr.length / 2, arr.length);
			path.denormalize(arr.slice(0, arr.length / 2), arr.slice(arr.length / 2, arr.length));
		}
		else {
			// ie.lmjmjneqhqgsetgwfxiuiwkxmumwrxuxyvxuNosNotxpynwmvmwkugwgsbrapLlmLjmLlmLlhcicgghiklkmjmjqhqiplohokplmmn
			var dobj = dxyDecode(c_path.c);
			path.denormalize(dobj.dx, dobj.dy);
		}
	}
	return path;
}
function pathToCPath(path) {
	// console.log(JSON.stringify(path));
	//var cross_blocks = null;

	var c_path = {
		u: path.userId,
		t: path.type,
		l: path.layer,
		z: path.zoom,		// z is only used to normalize (compress) combined dx dy text.
		tm: path.transform_matrix.join(","),
		o: path.color,
		s: path.tipSize,

		b: path.brushId,
		r: path.blur,
		i: $.isEmptyObject(path.idio) ? "" : JSON.stringify(path.idio),

		hx: path.head.x.toString(),
		hy: path.head.y.toString(),

		bx: path.blockIdx.x,
		by: path.blockIdx.y,
	};
	if (path.type == PT_SCISSOR || path.type == PT_TRASH)
		c_path.c = path.dx.length.toString();
	else if (path.type == PT_PENCIL || path.type == PT_ERASER || path.type == PT_FILLER) {
		var dobj = path.normalize();

		//c_path.c = dobj.dx.join(XY_COMBINE_SEPARATOR)
		//			+ XY_COMBINE_SEPARATOR
		//			+ dobj.dy.join(XY_COMBINE_SEPARATOR);
		c_path.c = dxyEncodeObject(dobj.dx, dobj.dy);

		//cross_blocks = analyzePathCross(path);
		//console.log("cross_blocks=" + JSON.stringify(cross_blocks) + ".");
	}
	else if (path.type == PT_BATCH || path.type == PT_NOTE || path.type == PT_PICTURE)
		c_path.c = path.uri;

	//console.log("c_path=" + JSON.stringify(c_path) + ".");
	//console.log("dobj.dx.len=" + dobj.dx.length + ", c_path.c len=" + c_path.c.length + ", content=" + c_path.c + ".");
	//var dxy_encoded = dxyEncodeObject(dobj.dx, dobj.dy);
	//console.log("dxy_encoded len=" + dxy_encoded.length + ", content=" + dxy_encoded + ".");
	// dobj.dx.len=48, c_path.c len=102, content=lmjmjneqhqgsetgwfxiuiwkxmumwrxuxyvxuNosNotxpynwmvmwkugwgsbrapLlmLjmLlmLlhcicgghiklkmjmjqhqiplohokplmmn.

	return c_path;
}
function uploadEarlyPath(path) {
	var c_path = pathToCPath(path);

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.addEarlyPath(c_path, g_room_info.Name).done(function () {

		}).fail(function (error) {
			errorPrint("drawing_hub.server.addEarlyPath fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.addEarlyPath threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
	}
}
function uploadPath(c_paths) {
	//var c_path = pathToCPath(path);
	//console.log("uploadPath. c_paths.length=" + c_paths.length + ".");

	try {
		ua.upload_progress = 5;

		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.drawPaths(c_paths, g_room_info.Name).done(function (ret) {
			//ret = Math.floor(Math.random() * 4) + 1;
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
				//else
				//	msg = "Stroke uploaded successfully.";

				showAlert("warning", msg);

				//ds.$msg_para.text(msg).show();

				clearTimeout(ds.msg_timer_id);
				ds.msg_timer_id = setTimeout(function () {
					ds.msg_timer_id = null;
					//ds.$msg_para.fadeOut(750);
				}, 5 * 1000);
			}
			ua.upload_progress = 0;
		}).fail(function (error) {
			errorPrint("drawing_hub.server.drawPaths fail - " + error);
			ua.upload_progress = 0;
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.drawPaths threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
		ua.upload_progress = 0;
	}
}
function onMouseUp(e) {
	// console.log("onMouseUp. e.clientX=" + e.clientX + ", e.clientY=" + e.clientY + ".");

	if (ds.is_tracking) {
		ds.is_tracking = false;

		if (isSelecting()) {
			var $rect = $("#select_rect");

			var off = $rect.offset();
			off.left += $rect.width() / 2;
			off.top += $rect.height() / 2;

			$rect.hide();

			if (pb.selected_paths.length)
				$("#select_bar").show().offset(off);
		}
		else if (!isPanning()) {
			if (ds.tracking_path.dx.length > 0) {
				ds.tracking_path.time = new Date();

				// There are many disjoints in the path due to "beginpath and moveto on every mousemove".
				// This will cause incomplete erasing. So draw again.
				//if (isErasing())
				//	setAttrAndDrawPath(ds.tracking_path);

				ua.wait_upload_paths.push(ds.tracking_path);
				uploadEarlyPath(ds.tracking_path);
				ds.tracking_path = null;

				ua.undoed_paths.length = 0;
				updateUndoRedoButton();
				ua.just_undo = false;

				redrawDrawingPaths();		// substitute of if (isErasing())	setAttrAndDrawPath(ds.tracking_path);
			}
		}
		e.preventDefault();
	}
}
function printPath(path) {
	return "type=" + path.type + ", blockIdx=(" + path.blockIdx.x + ", " + path.blockIdx.y + "), head=(" +
		path.head.x + ", " + path.head.y + "), dx len=" + path.dx.length + ", userId=" + path.userId +
		", zoom=" + path.zoom + ", t matrix=" + path.transform_matrix.join(",") + ", gsid=" + path.gsid +
		", subid=" + path.subid + ", layer=" + path.layer + ".";
}
function onUploadTimer() {
	var now = new Date();
	while (ua.wait_upload_paths.length > 0) {
		var path = ua.wait_upload_paths[0];

		var diff = now.getTime() - path.time.getTime();

		if (diff >= 5/*2*/ * 1000/*ms*/ || ua.wait_upload_paths.length > 5/*2*/) {
			path.time = new Date();
			ds.pending_paths.push(path);
			//console.log("onUploadTimer. ds.pending_paths=" + ds.pending_paths.length + ".");

			ua.wait_upload_paths.shift();

			//console.log("upload wait_upload_path.");

			updateUndoRedoButton();
			//uploadPath(path);
			ua.wait_direct_upload_paths.push(path);
		}
		else
			break;
	}
	if (ua.upload_progress == 0) {
		var c_paths = [];

		while (ua.wait_direct_upload_paths.length > 0) {
			var path = ua.wait_direct_upload_paths.shift();
			var c_path = pathToCPath(path);

			c_paths.push(c_path);

			//console.log("upload wait_direct_upload_path. " + printPath(path));
			//uploadPath(path);
		}
		if (c_paths.length > 0)
			uploadPath(c_paths);
	}
	else {
		ua.upload_progress--;		// count down to prevent forever blocking caused by lost response.
		//console.log("onUploadTimer. ua.upload_progress=" + ua.upload_progress + ".");
	}
}
function blockKeyToIdx(block_key) {
	var arr = block_key.split(",");

	return { x: Number(arr[0]), y: Number(arr[1]) };
}
function purgeOutsideBlocks() {
	if (ds.is_tracking)
		return;

	var cnt = Object.keys(ly.block_downloaded).length;		// This operation is heavy.

	if (cnt > 2500) {
		var center = calcCenter();

		for (var block_key in ly.block_downloaded) {
			if (!withinRange(blockKeyToIdx(block_key), center.b)) {
				delete ly.block_downloaded[block_key];

				purgeOutsideNoter(block_key);
				delete ly.note_paths[block_key];
				purgeOutsidePicture(block_key);
				delete ly.picture_paths[block_key];
			}
		}
		redrawBground();

		clearLayerPaths(MAIN_LAYER_NUM, ly.main_paths);
		clearLayerPaths(DRAFT_LAYER_NUM, ly.draft_paths);
	}
	//
	// pb.dl_pbs is needed when user select and copy a pre-downloaded pb.
	cnt = Object.keys(pb.dl_pbs_use_time).length;		// This operation is heavy.

	if (cnt > 25) {
		var now = new Date();

		for (var uri in pb.dl_pbs_use_time) {
			var time = pb.dl_pbs_use_time[uri];
			var diff = now.getTime() - time.getTime();

			if (diff >= 15 * 60 * 1000/*15 minutes*/) {
				delete pb.dl_pbs[uri];
				delete pb.dl_pbs_use_time[uri];
			}
		}
	}
}
function checkGoArrow() {
	if ($("#go_up:hover").length > 0) {
		ct.shift.y += GO_DELTA;
	}
	else if ($("#go_down:hover").length > 0) {
		ct.shift.y -= GO_DELTA;
	}
	else if ($("#go_left:hover").length > 0) {
		ct.shift.x += GO_DELTA;
	}
	else if ($("#go_right:hover").length > 0) {
		ct.shift.x -= GO_DELTA;
	}
	else
		return;

	updateTransformAndRedraw();
}
function isPanning() {
	return $("#hand_tool").hasClass("active");
}
function isFilling() {
	return $("#filler_tool").hasClass("active");
}
function isErasing() {
	return $("#eraser_tool").hasClass("active");
}
function isScissoring() {
	return $("#scissor_tool").hasClass("active");
}
function isTrashing() {
	return $("#trash_tool").hasClass("active");
}
function isPicturing() {
	return $("#picture_tool").hasClass("active");
}
function isSelecting() {
	return $("#select_tool").hasClass("active");
}
function isPasting() {
	return $("#paste_tool").hasClass("active");
}
function isNoting() {
	return $("#note_tool").hasClass("active");
}
function removeCursorClass() {
	$("#avatar_canvas").removeClass("cursor_pencil cursor_hand cursor_eraser cursor_scissor cursor_trash cursor_picture cursor_select cursor_paste cursor_note");
}
function onPencilClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#pencil_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_pencil");

	setTipSize(ts.pencil_size);
	refocus();
}
function onFillerClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#filler_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_pencil");

	refocus();
}
function onHandClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#hand_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_hand");
	refocus();
}
function onEraserClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#eraser_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_eraser");

	setTipSize(ts.eraser_size);
	refocus();
}
function onScissorClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#scissor_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_scissor");
	refocus();
}
function onTrashClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#trash_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_trash");
	refocus();
}
function onPictureClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#picture_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_picture");
	refocus();
	pc.pict_ok = true;
}
function onSelectClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#select_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_select");
	refocus();
}
function onPasteClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#paste_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_paste");
	refocus();

	loadCopiedPaths();
}
function onNoteClick() {
	removeCursorClass();

	$("button.active").removeClass("active");
	$("#note_tool").addClass("active");

	$("#avatar_canvas").addClass("cursor_note");
	refocus();
}
function updateUndoRedoButton() {
	//$("#undo_tool").prop("disabled", ua.wait_upload_paths.length == 0);
	//$("#redo_tool").prop("disabled", ua.undoed_paths.length == 0);
	$("#undo_tool").toggleClass("disabled", ua.wait_upload_paths.length == 0);
	$("#redo_tool").toggleClass("disabled", ua.undoed_paths.length == 0);
}
function updateZoomInOutButton() {
	$("#zoom_in_tool").toggleClass("disabled", currentScale() >= MAX_ZOOM_LEVEL);
	$("#zoom_out_tool").toggleClass("disabled", currentScale() <= MIN_ZOOM_LEVEL);
}
function onUndoClick() {
	//console.log("onUndoClick.");

	if (ua.wait_upload_paths.length > 0) {
		var path = ua.wait_upload_paths.pop();
		ua.undoed_paths.push(path);

		updateUndoRedoButton();
		//redrawAllPaths();

		ua.just_undo = true;
	}
	refocus();
}
function onRedoClick() {
	//console.log("onRedoClick.");

	if (ua.undoed_paths.length > 0) {
		var path = ua.undoed_paths.pop();
		path.time = new Date();
		ua.wait_upload_paths.push(path);

		updateUndoRedoButton();
		//redrawAllPaths();

		ua.just_undo = false;
	}
	refocus();
}
function onHomeClick() {
	if (g_room_info) {
		var uHome = { x: g_room_info.HomeX * BLOCK_SIZE, y: g_room_info.HomeY * BLOCK_SIZE };

		goLocation(uHome);
	}
	//location.hash = "#0,0";
	//goHashLocation();
	refocus();
}
function onRecentBackClick() {
	al.recent_idx++;
	if (al.recent_idx >= al.recent.length)
		al.recent_idx = 0;

	//goRecent();
	goUserPosition(false);
	refocus();
}
function onRecentForwardClick() {
	al.recent_idx--;
	if (al.recent_idx < 0)
		al.recent_idx = al.recent.length - 1;

	//goRecent();
	goUserPosition(true);
	refocus();
}
function onInformationClick() {
	//$("#info_para").toggle();
	$("#infoDlg").modal("toggle");
	refocus();
}
function onZoomInClick(e) {
	if (ct.scale.x < MAX_ZOOM_LEVEL) {
		ct.scale.x *= 2;
		ct.scale.y *= 2;

		if (e) {
			ct.shift.x = ct.shift.x * 2 - Math.round(e.clientX);
			ct.shift.y = ct.shift.y * 2 - Math.round(e.clientY);
		}
		else {
			ct.shift.x = ct.shift.x * 2 - (window.innerWidth >> 1);
			ct.shift.y = ct.shift.y * 2 - (window.innerHeight >> 1);
		}
		updateZoomInOutButton();
		updateNoterFont();
		updatePictureScale();

		refocus(false, true);
		updateOutsideBlockDist();
		updateTransformAndRedraw();
	}
}
function onZoomOutClick(e) {
	if (ct.scale.x > MIN_ZOOM_LEVEL) {
		ct.scale.x /= 2;
		ct.scale.y /= 2;

		if (e) {
			ct.shift.x = ct.shift.x / 2 + Math.round(e.clientX) / 2;
			ct.shift.y = ct.shift.y / 2 + Math.round(e.clientY) / 2;
		}
		else {
			ct.shift.x = ct.shift.x / 2 + (window.innerWidth >> 1) / 2;
			ct.shift.y = ct.shift.y / 2 + (window.innerHeight >> 1) / 2;
		}
		updateZoomInOutButton();
		updateNoterFont();
		updatePictureScale();

		refocus(false, true);
		updateOutsideBlockDist();
		updateTransformAndRedraw();
	}
}
function updateNoterFont() {
	var fs = 1 * currentScale();
	//var mw = 20/* * ct.scale.x*/;

	ds.noter_style.fontSize = fs + "em";
	//ds.noter_font_style.maxWidth = mw + "em";
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
	else if (keyname == "F" || keyname == "f") {
		onFillerClick();
	}
	else if (keyname == "H" || keyname == "h") {
		onHandClick();
	}
	else if (keyname == "E" || keyname == "e") {
		onEraserClick();
	}
	else if (keyname == "S" || keyname == "s") {
		onScissorClick();
	}
	else if (keyname == "T" || keyname == "t") {
		onTrashClick();
	}
	else if (keyname == "L" || keyname == "l") {
		onSelectClick();
	}
	else if (keyname == "A" || keyname == "a") {
		onPasteClick();
	}
	else if (keyname == "O" || keyname == "o") {
		onHomeClick();
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
	else if (keyname == "I" || keyname == "i") {
		onInformationClick();
	}
	else if (keyname == "B" || keyname == "b") {
		onNoteClick();
	}
	else if (keyname == "+" || keyname == "Add" || keyname == "=") {
		onZoomInClick();
	}
	else if (keyname == "-" || keyname == "Subtract") {
		onZoomOutClick();
	}
	else if (keyname == ",") {
		toggleLeftSidebar();
	}
	else if (keyname == ".") {
		toggleRightSidebar();
	}
	else
		return false;
	return true;
}
function onClickUpdate(initial) {
	var name = $("#name_ipt").val();
	var status = $("#status_ipt").val();

	//if (name)
	localStorage["prev_used_name"] = name;

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.updateStatus2(g_user_id, name, status, g_room_info.Name).done(function () {
			$("#status_ipt").val("");

			if (initial)
				downloadChat();
		}).fail(function (error) {
			errorPrint("drawing_hub.server.UpdateStatus2 fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.UpdateStatus2 threw an error - " + ex.name + ": " + ex.message + ".");
		alert("Connection to server is lost. Please press browser's \"Refresh\" button (or F5) to reload the page.");
	}
	refocus();
	return false;
}
function serverUpdateStatus(user_id, user_status, from_stored) {
	us.user_status[user_id] = user_status;

	if (!from_stored) {
		onNewChat(user_status.Name, user_status.Status);
	}
}
function downloadStatus() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getAllStatus(g_room_info.Name).done(function (dict) {
			if (dict)
				for (var user_id in dict) {
					if (dict.hasOwnProperty(user_id)) {
						serverUpdateStatus(user_id, dict[user_id], true);
					}
				}
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.GetAllStatus threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function uploadMousePos() {
	if (!us.mouse_pos_uploaded) {
		us.mouse_pos_uploaded = true;

		var uMouse = windowCoordToUniverseCoord(us.last_mouse_pos);
		//console.log("uploadMousePos. uMouse.x=" + uMouse.x + ", uMouse.y=" + uMouse.y + ".");

		try {
			var drawing_hub = $.connection.drawingHub;
			drawing_hub.server.updatePosition2(g_user_id, uMouse.x, uMouse.y, g_room_info.Name).done(function () {
			}).fail(function (error) {
				errorPrint("drawing_hub.server.updatePosition2 fail - " + error);
			});
		}
		catch (ex) {
			errorPrint("drawing_hub.server.updatePosition2 threw an error - " + ex.name + ": " + ex.message + ".");
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
		//$sticker.insertBefore("#drawing_canvas");
		$sticker.insertBefore("#draft_canvas");
	}
	$sticker.children("h5").text(name);
	$sticker.children("p").text(status);

	moveSticker($sticker, pos, true);
}
function moveSticker($sticker, pos, animate) {
	//console.log("moveSticker. pos.X=" + pos.X + ", pos.Y=" + pos.Y + ".");

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
function addNoter(block_key, note, path) {
	var uHead = path.uHead();

	var elm_id = "nt_" + uHead.x + "_" + uHead.y;		// ID cannot contain ,.
	var elm = document.getElementById(elm_id);

	if (!elm) {
		var $elm = $("<p id='" + elm_id + "' class='noter'></p>");
		$elm.insertAfter("#createRoomDlg");
		$elm.text(note);

		ly.note_paths[block_key].push(path);
		moveNoter(elm_id, uHead);
	}
	else
		errorPrint("addNoter. The ID (" + elm_id + ") already exists.");
}
function moveNoter(elm_id, pos) {
	var elm = document.getElementById(elm_id);
	var wPos = universeCoordToWindowCoord(pos);

	elm.style.left = wPos.x + 'px';
	elm.style.top = wPos.y + 'px';
}
function moveAllNoters() {
	for (var block_key in ly.note_paths) {
		var path_array = ly.note_paths[block_key];

		for (var i = 0; i < path_array.length; i++) {
			var path = path_array[i];

			var uHead = path.uHead();
			var elm_id = "nt_" + uHead.x + "_" + uHead.y;

			moveNoter(elm_id, uHead);
		}
	}
}
function purgeOutsideNoter(block_key) {
	var path_array = ly.note_paths[block_key];

	for (var i = 0; i < path_array.length; i++) {
		var path = path_array[i];
		var uHead = path.uHead();
		var elm_id = "nt_" + uHead.x + "_" + uHead.y;

		var $elm = $("#" + elm_id);
		$elm.remove();
	}
}
function createFigure(name, uri) {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.createFigure(g_room_info.Name, name, uri, g_user_id).done(function (suc) {
			if (suc) {
				$('#saveFigureDlg').modal('hide');
			}
			else {
				$("#save_figure_result").text("Failed. Maybe the name contain invalid characters.").show();
				$("#figure_ok_btn").prop("disabled", false);
			}
		}).fail(function (error) {
			$("#save_figure_result").text("Failed. Maybe figure with the same name already exists. " + error).show();
			$("#figure_ok_btn").prop("disabled", false);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.createFigure threw an error - " + ex.name + ": " + ex.message + ".");
		$("#save_figure_result").text("Sorry, create figure failed. " + ex.name + ": " + ex.message + ".").show();
	}
}
function doSaveFigure() {
	$("#figure_ok_btn").prop("disabled", true);

	var name = $("#figure_name_ipt").val();

	var text = localStorage.getItem("copied_paths");
	var uri = localStorage.getItem("copied_paths_uri");

	if (uri) {
		createFigure(name, uri);
	}
	else if (text) {
		uploadPathBatch(text, function (response_uri) {
			if (response_uri) {
				createFigure(name, response_uri);
			}
			else {
				$("#save_figure_result").text("Sorry, path batch upload failed.").show();
			}
		});
	}
}
function doCreateRoom() {
	var name = $("#room_name_ipt").val();
	var size = 9;
	var can_picture = $("#can_picture_check").prop("checked");
	var is_private = $("#private_check").prop("checked");

	var attr = 1/*LIMITED*/;
	if (can_picture)
		attr |= 2/*CAN_PICTURE*/;
	if (is_private)
		attr |= 4/*IS_PRIVATE*/;

	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.createRoom(name, size, attr).done(function (suc) {
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
		errorPrint("drawing_hub.server.createRoom threw an error - " + ex.name + ": " + ex.message + ".");
		$("#create_room_result").text("Sorry, create room failed. " + ex.name + ": " + ex.message + ".").show();
	}
}
function getRoomNameFromUrl() {
	var text = decodeURIComponent(location.pathname);

	var arr = text.split("/");

	text = arr[1];

	//console.log("location.pathname=" + location.pathname + ". Decoded=" + text + ".");

	if (text.length == 0)
		text = DEFAULT_ROOM;

	return text;		// case may be incorrect.
}
function onFigureClick(elt) {
	var figure_uri = $(elt).data("figure_uri");

	getPathBatch(figure_uri, function () {
		localStorage.removeItem("copied_paths");
		localStorage.setItem("copied_paths_uri", figure_uri);

		onPasteClick();
	});
}
function onRoomClick(elt) {
	var room_name = $(elt).text();
	if (room_name == DEFAULT_ROOM)
		room_name = "";
	location.assign("/" + room_name);
}
function onFigurePageClick(elt) {
	var page_id = $(elt).data("figure_page");

	if (page_id >= 0 && page_id < ds.num_figure_pages && page_id != ds.figure_page)
		downloadFigurePage(page_id);		// todo: load from pre-stored.
}
function onNewFigure() {
	downloadFigurePage(-1);
}
function populateFigurePageNav() {
	var $container = $("#figure_nav");
	var $children = $container.children();

	var $prev_elt = $children.first().detach();
	var $next_elt = $children.last().detach();

	$container.empty();

	$prev_elt.toggleClass("disabled", ds.figure_page <= 0);
	$prev_elt.children("a").data("figure_page", ds.figure_page - 1);

	$container.append($prev_elt);

	for (var i = 0; i < ds.num_figure_pages; i++) {
		var html = "<li><a onclick='onFigurePageClick(this)'>" + (i + 1) + "</a></li>";
		var $elt = $(html);

		$elt.toggleClass("active", i == ds.figure_page);
		$elt.children("a").data("figure_page", i);

		$container.append($elt);
	}
	$next_elt.toggleClass("disabled", ds.figure_page >= ds.num_figure_pages - 1);
	$next_elt.children("a").data("figure_page", ds.figure_page + 1);

	$container.append($next_elt);
}
function downloadFigurePage(page_id) {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getFigurePage(g_room_info.Name, page_id).done(function (res) {
			if (res.list) {
				ds.figure_page = res.page_id;
				if (page_id === -1)
					ds.num_figure_pages = res.page_id + 1;
				populateFigurePageNav();

				var $container = $("#figure_content");
				$container.empty();

				for (var i = 0; i < res.list.length; i++) {
					var uc = res.list[i];

					var html = "<li class='list-group-item'><a onclick='onFigureClick(this)'></a></li>";
					var $elt = $(html);

					$elt.children("a").text((i + 1) + ". " + uc.Name).data("figure_uri", uc.Uri);

					$container.prepend($elt);
				}
			}
		}).fail(function (error) {
			errorPrint("drawing_hub.server.getFigurePage fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getFigurePage threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function downloadRoomList() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getRoomList().done(function (list) {
			if (list != ds.raw_room_list) {
				var arr = list.split(';');
				$("li.user_room").remove();

				var $target = $("#room_list_ul");

				for (var i = Math.max(0, arr.length - 15) ; i < arr.length; i++) {
					var room_name = arr[i];
					var $elt = $("<li class='user_room'><a onclick='onRoomClick(this)'></a></li>");
					$elt.children("a").text(room_name);
					$target.prepend($elt);
				}
				ds.raw_room_list = list;
			}
		}).fail(function (error) {
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getRoomList threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function downloadHotRoomList() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getHotRoomList().done(function (list) {
			var $container = $("#hot_room_content");
			$container.empty();

			for (var i = 0; i < list.length; i++) {
				var uc = list[i];

				var html = "<li class='list-group-item'><a onclick='onRoomClick(this)'></a> (" + uc.c + ")</li>";
				var $elt = $(html);
				$elt.children("a").text(uc.r);

				$container.append($elt);
			}
		}).fail(function (error) {
			errorPrint("drawing_hub.server.getHotRoomList fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getHotRoomList threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function refocus(leave_selected_paths, bypass_redraw) {
	$("#note_bar").hide();
	$("#select_bar").hide();
	$("#paste_bar").hide();

	$('.navbar-collapse').collapse('hide');

	$("button.active").focus();

	ds.hovered_path = null;

	if (!leave_selected_paths)
		pb.selected_paths.length = 0;

	pb.copied_paths.length = 0;

	if (!bypass_redraw)
		redrawAllPaths();
}
function resetPictDialog(include_input) {
	$("#pict_info > mark:first").text("");
	$("#pict_info > mark:last").text("");
	$("#pict_info > strong").text("");
	$("#pict_error").text("");

	$("#pict_ok_btn").prop("disabled", true);
	$("#pict_preview_img").remove();

	if (include_input) {
		$("#pict_url_ipt").val("");
		$("#pict_file_chooser").val("");		// Triggers onPictChosen() with files.length == 0.

		pc.pict_blob = null;
		pc.pict_url = null;

		$("#my_recent_pict_tbl tr").removeClass("info");
		$("#others_pict_tbl tr").removeClass("info");
	}
}
function onPictRecent(url) {
	pc.pict_blob = null;
	$("#pict_file_chooser").val("");
	$("#pict_url_ipt").val("");

	loadPict(url, 0);
}
function onPictUrl() {
	pc.pict_blob = null;
	$("#pict_file_chooser").val("");
	$("#my_recent_pict_tbl tr").removeClass("info");
	$("#others_pict_tbl tr").removeClass("info");

	var url = $("#pict_url_ipt").val();
	loadPict(url, 0);
}
function loadPict(url, file_size) {
	resetPictDialog(false);

	pc.pict_url = null;

	var html = "<img id='pict_preview_img' class='img-responsive center-block img-thumbnail' />";
	var $elt = $(html);
	var image = $elt[0];

	image.onload = function (event) {
		var hint = file_size ? fileSizeHint(file_size) : "";

		$("#pict_info > strong").text(hint);
		$("#pict_info > mark:first").text(image.naturalWidth);
		$("#pict_info > mark:last").text(image.naturalHeight);

		if (!pc.pict_blob) {
			pc.pict_url = url;
			$("#pict_ok_btn").prop("disabled", false);
		}
		else {
			if (image.naturalWidth > 2000) {
				$("#pict_error").text("Image width (" + image.naturalWidth + ") too large. Only images with width <= 2000 are accepted.");
			}
			else if (image.naturalHeight > 2000) {
				$("#pict_error").text("Image height (" + image.naturalHeight + ") too large. Only images with height <= 2000 are accepted.");
			}
			else if (file_size > 2048 * 1024) {
				$("#pict_error").text("Image file size (" + hint + ") too large. Only files smaller than 2 MB are accepted.");
			}
			else
				$("#pict_ok_btn").prop("disabled", false);
		}
	};
	image.onerror = function (event) {
		$("#pict_error").text("Sorry, image loading failed.");
	};
	image.src = url;
	$("#pictureDlg .modal-body").prepend($elt);
}
function onPictChosen(files) {
	pc.pict_blob = null;

	if (files.length == 1) {
		$("#pict_url_ipt").val("");
		$("#my_recent_pict_tbl tr").removeClass("info");
		$("#others_pict_tbl tr").removeClass("info");

		var type = files[0].type;

		if (type.substring(0, 6) === "image/") {
			pc.pict_blob = files[0];

			var getBlobURL = (window.URL && URL.createObjectURL.bind(URL)) ||
							(window.webkitURL && webkitURL.createObjectURL.bind(webkitURL)) ||
							window.createObjectURL;

			var pict_blob_url = getBlobURL(pc.pict_blob);

			loadPict(pict_blob_url, pc.pict_blob.size);
		}
	}
}
function uploadPicturePath(uri) {
	var picture_path = new Path([1, 0, 0, 1], 1, ly.active_layer, PT_PICTURE, g_user_id, ds.last_click_upt);
	picture_path.uri = uri;

	ua.wait_direct_upload_paths.push(picture_path);

	addRecentPicture(uri, true);
}
function uploadPicture(pict_blob) {
	var upload_files = new FormData();
	upload_files.append("picture", pict_blob);

	var post_data = {
		//x: Math.round(ds.last_click_upt.x),
		//y: Math.round(ds.last_click_upt.y),
		//room: g_room_info.Name,
		upload_files: upload_files,
	};
	postGoods("/picture", post_data, function (suc, response) {
		if (suc && response.uri) {
			errorPrint("Upload image success. " + response.uri);
			uploadPicturePath(response.uri);
		}
		else {
			alert("Sorry, image upload failed.");
		}
	});
}
function moveAllPictures() {
	for (var block_key in ly.picture_paths) {
		var path_array = ly.picture_paths[block_key];

		for (var i = 0; i < path_array.length; i++) {
			var path = path_array[i];
			movePicture(path);
		}
	}
}
function movePicture(picture_path) {
	var uHead = picture_path.uHead();
	var elm_id = "upc_" + picture_path.gsid;
	var elm = document.getElementById(elm_id);

	if (elm) {
		var wPos = universeCoordToWindowCoord(uHead);

		wPos.x -= elm.width / 2;
		wPos.y -= elm.height / 2;

		//console.log("movePicture. elm.width=" + elm.width + ", elm.height=" + elm.height + ".");

		elm.style.left = wPos.x + 'px';
		elm.style.top = wPos.y + 'px';
	}
}
function onNewPicture(block_key, uri, picture_path) {
	var elm_id = "upc_" + picture_path.gsid;
	var elm = document.getElementById(elm_id);

	if (!elm) {
		//var html = "<img src='" + uri + "' class='user_picture' />";		// xss attack ?
		var html = "<img id='" + elm_id + "' class='user_picture not_show' />";
		var $elm = $(html);

		$elm[0].src = uri;

		$elm.on("load error", function (event) {
			scalePicture(event.target);

			movePicture(picture_path);

			$elm.removeClass("not_show");
		});
		insertPicture($elm);
		ly.picture_paths[block_key].push(picture_path);
	}
	else
		errorPrint("onNewPicture. The ID (" + elm_id + ") already exists.");
}
function updatePictureScale() {
	$("#picture_container > img").each(function (idx, elt) {
		scalePicture(elt);
	});
}
function scalePicture(elt) {
	var fs = 1 * currentScale() / 2;
	elt.width = elt.naturalWidth * fs;
	elt.height = elt.naturalHeight * fs;		// If omit this line, reported image.height will be wrong.
}
function insertPicture(tgt_elt) {
	var tgt_id = Number(tgt_elt[0].id.substr(4));		// "upc_"

	var elts = $("#picture_container > img");

	for (var i = elts.length - 1; i >= 0; i--) {
		var elt = elts[i];

		var id = Number(elt.id.substr(4));		// "upc_"

		if (tgt_id > id) {
			tgt_elt.insertAfter(elt);
			return;
		}
	}
	$("#picture_container").prepend(tgt_elt);
}
function purgeOutsidePicture(block_key) {
	var path_array = ly.picture_paths[block_key];

	for (var i = 0; i < path_array.length; i++) {
		var path = path_array[i];
		var elm_id = "upc_" + path.gsid;

		var $elm = $("#" + elm_id);
		$elm.remove();
	}
}
function purgeOldPicture() {
	var now = new Date();

	for (var i = ds.picture_list.length - 1; i >= 0; i--) {
		var info = ds.picture_list[i];

		var diff = now.getTime() - info.time.getTime();

		if (diff >= 10 * 60 * 1000/*ms*/) {
			info.elt.remove();
			ds.picture_list.splice(i, 1);
		}
	}
}
function downloadChat() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getChat(g_room_info.Name).done(function (list) {
			for (var i = 0; i < list.length; i++)
				onNewChat(list[i].Speaker, list[i].Words);
		}).fail(function (error) {
			errorPrint("drawing_hub.server.getChat fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getChat threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function onNewChat(speaker, words) {
	if (speaker.length > 0 && words.length > 0) {
		var html = "<p><span></span>: <span></span></p>";
		var $elt = $(html);

		$elt.children("span").first().text(speaker).next("span").text(words);

		var $container = $("#chat_content");
		var $children = $container.children();

		if ($children.length >= 100)
			$children.last().remove();

		$container.prepend($elt);
	}
}
function onMaxChatClick(hide) {
	if (hide === true)
		ds.chat_win_state = 2;
	else if (hide === false)
		ds.chat_win_state = 0;
	else {
		ds.chat_win_state++;
		if (ds.chat_win_state == 3)
			ds.chat_win_state = 0;
	}
	var $chat_win = $("#chat_content");

	if (ds.chat_win_state == 0) {
		$chat_win.height(window.innerHeight / 4).show();
	}
	else if (ds.chat_win_state == 1) {
		$chat_win.height(window.innerHeight / 2).show();
	}
	else if (ds.chat_win_state == 2) {
		$chat_win.hide();
	}
	// todo: change height when window resize.
	//positionPanels();
}
function onMaxFigureClick() {
	var $figure_win = $("#figure_content");
	$figure_win.toggle();

	$("#figure_nav").parent().toggle();
}
function onMaxNoteClick() {
	ds.note_win_state++;
	if (ds.note_win_state == 3)
		ds.note_win_state = 0;

	var $note_win = $("#note_content");

	if (ds.note_win_state == 0) {
		$note_win.height(window.innerHeight / 4).show();
	}
	else if (ds.note_win_state == 1) {
		$note_win.height(window.innerHeight / 2).show();
	}
	else if (ds.note_win_state == 2) {
		$note_win.hide();
	}
	// todo: change height when window resize.
}
function onSaveClick() {
	if (pb.selected_paths.length) {
		onSelectCopyClick();
		$('#saveFigureDlg').modal('show');
	}
	else
		refocus();
}
function onSelectCopyClick() {
	//console.log(JSON.stringify(ds.selected_paths));
	var r_paths = [];

	if (pb.selected_paths.length) {
		//console.log("Before sort. pb.selected_paths=" + printPathArrayGsid(pb.selected_paths) + ".");
		pb.selected_paths.sort(orderPath);
		//console.log("After sort. pb.selected_paths=" + printPathArrayGsid(pb.selected_paths) + ".");

		var uFlag = pb.selected_paths[0].uHead();
		var flag_pb_uri = pb.selected_paths[0].pb_uri;

		for (var i = 0; i < pb.selected_paths.length; i++) {
			var path = pb.selected_paths[i];
			var uHead = path.uHead();

			uHead.x -= uFlag.x;
			uHead.y -= uFlag.y;

			var dobj = path.normalize();

			//var multiplier = path.zoom < 0 ? 1 / (-path.zoom) : path.zoom;

			var r_path = {
				t: path.type,
				hx: uHead.x,
				hy: uHead.y,
				//dx: multiplyArray(path.dx, multiplier),
				//dy: multiplyArray(path.dy, multiplier),
				dx: dobj.dx,
				dy: dobj.dy,
				z: path.zoom,		// z is only used to normalize (compress) dx dy text.
				tm: path.transform_matrix.join(","),
				o: path.color,
				s: path.tipSize,

				b: path.brushId,
				r: path.blur,
				i: $.isEmptyObject(path.idio) ? "" : JSON.stringify(path.idio),
			};
			r_paths.push(r_path);

			if (path.pb_uri != flag_pb_uri)
				flag_pb_uri = null;
		}
		if (flag_pb_uri && pb.dl_pbs_length[flag_pb_uri] == pb.selected_paths.length) {
			localStorage.removeItem("copied_paths");
			localStorage.setItem("copied_paths_uri", flag_pb_uri);

			//console.log("onSelectCopyClick. flag_pb_uri=" + flag_pb_uri + ", pb.selected_paths.length=" + pb.selected_paths.length + ".");
		}
		else {
			var text = JSON.stringify(r_paths);		// todo: compress

			localStorage.setItem("copied_paths", text);
			localStorage.removeItem("copied_paths_uri");

			//console.log("copied_paths=" + text + ".");
		}
		pb.transform_matrix = [1, 0, 0, 1];
	}
	refocus();
}
function recoverReducedPath(r_path, user_id) {
	if (!r_path.z)
		r_path.z = 1;
	if (!r_path.tm)
		r_path.tm = "1,0,0,1";

	var path = new Path(r_path.tm, r_path.z, 0, r_path.t, user_id);
	if (r_path.o)
		path.color = r_path.o;
	if (r_path.s)
		path.tipSize = r_path.s;
	if (r_path.b)
		path.brushId = r_path.b;
	if (r_path.r)		// default value 0 is also skipped.
		path.blur = r_path.r;
	if (r_path.i)
		path.idio = JSON.parse(r_path.i);

	path.head.x = r_path.hx;
	path.head.y = r_path.hy;

	//path.blockIdx.x = 0;
	//path.blockIdx.y = 0;

	path.denormalize(r_path.dx, r_path.dy);
	//var multiplier = path.zoom > 0 ? 1 / path.zoom : -path.zoom;

	//path.dx = multiplyArray(r_path.dx, multiplier);
	//path.dy = multiplyArray(r_path.dy, multiplier);

	return path;
}
function loadCopiedPaths() {
	var text = localStorage.getItem("copied_paths");
	var uri = localStorage.getItem("copied_paths_uri");

	pb.copied_paths.length = 0;

	if (text) {
		var r_paths = JSON.parse(text);

		for (var i = 0; i < r_paths.length; i++) {
			var r_path = r_paths[i];

			var path = recoverReducedPath(r_path, g_user_id);

			pb.copied_paths.push(path);
		}
		//console.log("loadCopiedPaths. r_paths.length=" + r_paths.length + ".");
	}
	else if (uri) {
		var path_batch = getPathBatch(uri);

		if (path_batch) {
			appendArray(pb.copied_paths, path_batch);

			//console.log("loadCopiedPaths. path_batch.length=" + path_batch.length + ".");
		}
		else
			errorPrint("loadCopiedPaths. path_batch not available.");		// todo: indication to user.
	}
}
function analyzePathCross(path) {
	var cross_blocks = {};
	cross_blocks[path.blockKey()] = path.blockIdx;

	var uPt = path.uHead();

	for (var i = 0; i < path.dx.length; i++) {
		uPt.x += path.dx[i];
		uPt.y += path.dy[i];

		var bPt = calcBlock(uPt);
		cross_blocks[bPt.x + "," + bPt.y] = bPt;
	}
	//delete cross_blocks[path.blockKey()];		// not the head block.

	// Find blocks totally contained by the path.
	if (path.type == PT_FILLER) {
		var along_blocks = [];
		for (var key in cross_blocks) {
			//console.log("along_blocks add (" + cross_blocks[key].x + ", " + cross_blocks[key].y + ").");
			along_blocks.push(cross_blocks[key]);
		}
		for (var i = 0; i < along_blocks.length; i++)
			for (var j = i + 1; j < along_blocks.length; j++) {
				if (along_blocks[i].x == along_blocks[j].x) {
					var kx = along_blocks[i].x;
					var min_y = Math.min(along_blocks[i].y, along_blocks[j].y);
					var max_y = Math.max(along_blocks[i].y, along_blocks[j].y);

					for (var ky = min_y + 1; ky < max_y; ky++) {
						//console.log("inside blocks add (" + kx + ", " + ky + ").");
						cross_blocks[kx + "," + ky] = { x: kx, y: ky };
					}
				}
				else if (along_blocks[i].y == along_blocks[j].y) {		// Consider when head and tail does not meet, there will be a section of path where no points or blocks exist. So cannot only take only x or y direction.
					var ky = along_blocks[i].y;
					var min_x = Math.min(along_blocks[i].x, along_blocks[j].x);
					var max_x = Math.max(along_blocks[i].x, along_blocks[j].x);

					for (var kx = min_x + 1; kx < max_x; kx++) {
						//console.log("inside blocks add (" + kx + ", " + ky + ").");
						cross_blocks[kx + "," + ky] = { x: kx, y: ky };
					}
				}
			}
	}
	return cross_blocks;
}
function analyzePathSpan(transform_matrix, paths) {
	var bFlag = calcBlock(ds.last_click_upt);

	var spanned_blocks = {};

	for (var i = 0; i < paths.length; i++) {
		var path = paths[i];

		var uHead = applyTransform(transform_matrix, path.head);

		if (path.blockIdx.x != 0 || path.blockIdx.y != 0)
			throw new Error("path.blockIdx.x != 0 || path.blockIdx.y != 0");

		uHead.x += ds.last_click_upt.x;
		uHead.y += ds.last_click_upt.y;

		var bPt = calcBlock(uHead);
		bPt.x -= bFlag.x;
		bPt.y -= bFlag.y;

		var block_key = bPt.x + "," + bPt.y;

		spanned_blocks[block_key] = bPt;
		//console.log("span block (" + block_key + ").");
	}
	return spanned_blocks;
}
function uploadFlagPath(transform_matrix, zoom, uri, spanned_blocks) {
	var flag_path = new Path(transform_matrix, zoom, ly.active_layer, PT_BATCH, g_user_id, ds.last_click_upt);
	flag_path.uri = uri;

	for (var block_key in spanned_blocks) {
		var bPt = spanned_blocks[block_key];

		var spanned_flag_path = jQuery.extend(true, {}, flag_path);

		spanned_flag_path.blockIdx.x += bPt.x;
		spanned_flag_path.head.x -= bPt.x * BLOCK_SIZE;

		spanned_flag_path.blockIdx.y += bPt.y;
		spanned_flag_path.head.y -= bPt.y * BLOCK_SIZE;

		//console.log("push spanned_flag_path. " + printPath(spanned_flag_path));

		ua.wait_direct_upload_paths.push(spanned_flag_path);
	}
}
function uploadPathBatch(text, callback) {
	var compressed = LZString.compressToUint8Array(text);

	//console.log("copied_paths. before compress: " + text.length + ", after compress: " + compressed.length + ".");

	var blob = new Blob([compressed], { type: 'application/x-path-batch' });

	var upload_files = new FormData();
	upload_files.append("path_batch", blob);

	var post_data = {
		fm: 2,
		upload_files: upload_files,
	};

	postGoods("/PathBatch", post_data, function (suc, response) {
		if (suc && response.uri) {
			//console.log("Upload path batch success. " + response.uri);

			localStorage.setItem("copied_paths_uri", response.uri);
			callback(response.uri);
		}
		else {
			callback(null);
		}
	});
}
function onDoPasteClick() {
	var text = localStorage.getItem("copied_paths");
	var uri = localStorage.getItem("copied_paths_uri");
	var zoom = currentZoom();
	var transform_matrix = pb.transform_matrix.slice();		// copy

	var spanned_blocks = analyzePathSpan(transform_matrix, pb.copied_paths);

	if (uri) {
		uploadFlagPath(transform_matrix, zoom, uri, spanned_blocks);

		//console.log("onDoPasteClick. uri=" + uri + ".");
	}
	else if (text) {
		uploadPathBatch(text, function (response_uri) {
			if (response_uri) {
				uploadFlagPath(transform_matrix, zoom, response_uri, spanned_blocks);
			}
			else {
				alert("Sorry, path batch upload failed.");
			}
		});
	}
	refocus();
}
function isLayerVisible(layer_num) {
	var $check = $(layer_num == DRAFT_LAYER_NUM ? "#checkDraftLayer" : "#checkDrawingLayer");

	var checked = $check.prop("checked");

	return checked;
}
function onCheckLayer(layer_num) {
	refocus();
	//redrawDrawingPaths();
}
function onClickLayer(layer_num, elt) {
	var $label = $(elt);
	var $check = $label.prev().children("input");

	var checked = $check.prop("checked");

	if (!checked) {
		$check.click();
	}
	$label.parent().parent().find("label").removeClass("btn-primary");
	$label.addClass("btn-primary");

	ly.active_layer = layer_num;
}
function helpClick(event, elt) {
	if (event.target == elt) {
		//console.log("helpClick.");

		var $elt = $(elt);
		var $check = $elt.children("input");

		$check.click();
	}
}
function getLayerPaths(layer_num) {
	if (layer_num === undefined)
		layer_num = ly.active_layer;

	return ly.layer_paths[layer_num];
}
function currentZoom() {
	if (ct.scale.x < 1)
		return -1 / ct.scale.x;
	else
		return ct.scale.x;
}
function currentScale() {
	return ct.scale.x;
}
function updateOutsideBlockDist() {
	var w = window.innerWidth >> 1;
	w = Math.ceil(w / Math.abs(ct.scale.x) / BLOCK_SIZE);
	w += 2;		// margin

	outside_block_dist_x = w;

	var h = window.innerHeight >> 1;
	h = Math.ceil(h / Math.abs(ct.scale.y) / BLOCK_SIZE);
	h += 2;		// margin

	outside_block_dist_y = h;

	//console.log("outside_block_dist_x=" + outside_block_dist_x + ", outside_block_dist_y=" + outside_block_dist_y + ".");
}
function onWheel(event) {
	if (event.target.tagName === "TEXTAREA" || event.target.tagName === "INPUT")
		return;
	if (ds.wheel_timer_id != null)
		return;

	var e = event;

	if (!e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {

		// wheelDelta for Chrome and IE. deltaY for FireFox.
		var final_delta = e.wheelDelta || e.deltaY * -30;

		/*if (isViewSky())
			wheelStickerPane(final_delta, e.shiftKey);
		else if (e.shiftKey)
			window.scrollBy(0, -final_delta);
		else
			window.scrollBy(final_delta, 0);*/

		//console.log("final_delta=" + final_delta + ". wheelDelta=" + e.wheelDelta +
		//			", detail=" + e.detail + ", deltaY=" + e.deltaY + ", deltaX=" + e.deltaX + ", wheelDeltaY=" + e.wheelDeltaY + ".");

		ds.wheel_timer_id = setTimeout(function () {
			ds.wheel_timer_id = null;

			if (e.deltaY < 0)
				onZoomInClick(e);
			else
				onZoomOutClick(e);
		}, 500);


		if (e.preventDefault) e.preventDefault();
		if (e.stopPropagation) e.stopPropagation();
		e.cancelBubble = true;
		e.returnValue = false;
		return false;
	}
}
function inverseMatrix(m) {
	var n = [];
	var denominator = m[0] * m[3] - m[1] * m[2];

	n[0] = m[3] / denominator;
	n[1] = -m[1] / denominator;
	n[2] = -m[2] / denominator;
	n[3] = m[0] / denominator;

	return n;
}
function applyTransform(m, pt) {
	return {
		x: m[0] * pt.x + m[2] * pt.y,
		y: m[1] * pt.x + m[3] * pt.y,
	};
}
function applyTransformArray(m, dx, dy) {
	var dx2 = [];
	var dy2 = [];

	var c_pt = { x: 0, y: 0 };
	var p_pt = { x: 0, y: 0 };

	for (var i = 0; i < dx.length; i++) {
		c_pt.x += dx[i];
		c_pt.y += dy[i];

		var a_pt = applyTransform(m, c_pt);

		dx2.push(a_pt.x - p_pt.x);
		dy2.push(a_pt.y - p_pt.y);

		p_pt = a_pt;
	}
	return { dx: dx2, dy: dy2 };
}
function conjoinTransformMatrix(m, n) {
	return [
		m[0]/*a*/ * n[0]/*a'*/ + m[1]/*b*/ * n[2]/*c'*/,
		m[0]/*a*/ * n[1]/*b'*/ + m[1]/*b*/ * n[3]/*d'*/,
		m[2]/*c*/ * n[0]/*a'*/ + m[3]/*d*/ * n[2]/*c'*/,
		m[2]/*c*/ * n[1]/*b'*/ + m[3]/*d*/ * n[3]/*d'*/,
	];
	//return [
	//	m[0]/*a*/ * n[0]/*a'*/ + m[1]/*b*/ * n[2]/*c'*/,
	//	m[0]/*a*/ * n[1]/*b'*/ + m[1]/*b*/ * n[3]/*d'*/,
	//	m[2]/*c*/ * n[0]/*a'*/ + m[3]/*d*/ * n[2]/*c'*/,
	//	m[2]/*c*/ * n[1]/*b'*/ + m[3]/*d*/ * n[3]/*d'*/,
	//	m[4]/*e*/ * n[0]/*a'*/ + m[5]/*f*/ * n[2]/*c'*/ + n[4]/*e'*/,
	//	m[4]/*e*/ * n[1]/*b'*/ + m[5]/*f*/ * n[3]/*d'*/ + n[5]/*f'*/,
	//];
}
function limitTransformMatrix(m) {
	for (var i = 0; i < m.length; i++)
		if (m[i] > 0) {
			if (m[i] > MAX_ZOOM_LEVEL)
				m[i] = MAX_ZOOM_LEVEL;
			else if (m[i] < MIN_ZOOM_LEVEL)
				m[i] = MIN_ZOOM_LEVEL;
		}
		else if (m[i] < 0) {
			if (m[i] < -MAX_ZOOM_LEVEL)
				m[i] = -MAX_ZOOM_LEVEL;
			else if (m[i] > -MIN_ZOOM_LEVEL)
				m[i] = -MIN_ZOOM_LEVEL;
		}
}
function onTransformClick(a, b, c, d) {
	pb.transform_matrix = conjoinTransformMatrix(pb.transform_matrix, [a, b, c, d]);

	// todo: limit according to current copied paths' transform matrix.
	limitTransformMatrix(pb.transform_matrix);

	redrawAvatarPaths();
}
function onResetClick() {
	pb.transform_matrix = [1, 0, 0, 1];
	redrawAvatarPaths();
}
function submitNote() {
	var note = $("#note_ipt").val();

	if (note.length) {
		var note_path = new Path([1, 0, 0, 1], 1, ly.active_layer, PT_NOTE, g_user_id, ds.last_click_upt);
		note_path.uri = note;

		ua.wait_direct_upload_paths.push(note_path);
		$("#note_ipt").val("");
		//
		var $check = $("#check_broadcast_note");
		if ($check.prop("checked")) {
			addNote(note, note_path);
		}
		else
			$check.parent().click();		// reset to checked.
	}
	refocus();
	return false;
}
function addNote(note, note_path) {
	var note_info = {
		note: note,

		hx: note_path.head.x.toString(),
		hy: note_path.head.y.toString(),

		bx: note_path.blockIdx.x,
		by: note_path.blockIdx.y,
	};
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.addNote(g_room_info.Name, note_info).done(function () {
		}).fail(function (error) {
			errorPrint("drawing_hub.server.addNote fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.addNote threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function downloadNoteList() {
	try {
		var drawing_hub = $.connection.drawingHub;
		drawing_hub.server.getNoteList(g_room_info.Name).done(function (list) {
			for (var i = 0; i < list.length; i++)
				onNewNote(list[i]);
		}).fail(function (error) {
			errorPrint("drawing_hub.server.getNoteList fail - " + error);
		});
	}
	catch (ex) {
		errorPrint("drawing_hub.server.getNoteList threw an error - " + ex.name + ": " + ex.message + ".");
	}
}
function onNewNote(info) {
	var uPt = {
		x: info.bx * BLOCK_SIZE + Number(info.hx),
		y: info.by * BLOCK_SIZE + Number(info.hy)
	};
	var text = "{ x: " + uPt.x + ", y: " + uPt.y + " }";
	var html = "<p><a onclick='goNoteLocation(" + text + ")'></a></p>";
	var $elt = $(html);

	$elt.children("a").text(info.note);

	$("#note_content").prepend($elt);
}
function goNoteLocation(uPt) {
	goLocation(uPt);
	refocus(false, true);
}
function transformMatrixScale(m) {
	for (var i = 0; i < m.length; i++)
		if (m[i] != 0)
			return Math.abs(m[i]);
}
function removePath(path) {
	var cross_blocks = analyzePathCross(path);

	for (var block_key in cross_blocks) {
		deletePath(block_key, path);
	}
}
function addPath(path) {
	if (path.type != PT_PENCIL && path.type != PT_ERASER && path.type != PT_FILLER)
		throw new Error("path.type=" + path.type + ".");

	var cross_blocks = analyzePathCross(path);

	for (var block_key in cross_blocks) {
		insertPath(block_key, path);
	}
}
function printPathArrayGsid(path_array) {
	var text = "";
	for (var i = 0; i < path_array.length; i++)
		text += path_array[i].gsid + "-" + path_array[i].subid + ",";

	return text;
}
function deletePath(block_key, path) {
	var layer_paths = getLayerPaths(path.layer);

	var path_array = layer_paths[block_key];
	if (path_array) {
		var idx = path_array.indexOf(path);

		if (idx != -1) {
			path_array.splice(idx, 1);

			clearSquare(path.layer, block_key);
		}
	}
}
function insertPath(block_key, path) {
	var layer_paths = getLayerPaths(path.layer);

	if (!layer_paths[block_key])
		layer_paths[block_key] = [];

	var path_array = layer_paths[block_key];

	var idx = findInsertIndex(path_array, path);

	path_array.splice(idx + 1, 0, path);

	clearSquare(path.layer, block_key);
}
function findInsertIndex(path_array, path) {
	// todo: binary search. need to support duplicated gsids.

	for (var i = path_array.length - 1; i >= 0 ; i--) {
		var comp_path = path_array[i];

		if (path.gsid > comp_path.gsid)
			return i;
		else if (path.gsid == comp_path.gsid) {
			if (path.subid > comp_path.subid)
				return i;
			else if (path.subid == comp_path.subid) {
				// happens when insert batch's flag path is old (no gsid).
				//console.log("path.subid == comp_path.subid.");
				return i;
			}
		}
	}
	return -1;
	//todo: overwrite if same gsid and subid. happens when purge and download again for cross paths.
}
function orderPath(path1, path2) {
	if (path1.gsid != path2.gsid)
		return path1.gsid - path2.gsid;
	return path1.subid - path2.subid;
}
function isBlockDownloaded(block_key) {
	return Boolean(ly.block_downloaded[block_key]);
}
function clearLayerPaths(layer_num, layer_paths) {
	for (var block_key in layer_paths) {
		var path_array = layer_paths[block_key];
		var prev_len = path_array.length;

		path_array = path_array.filter(function (path) {
			return isBlockDownloaded(path.blockKey());
		});

		if (path_array.length != prev_len)
			clearSquare(layer_num, block_key);

		if (path_array.length == 0) {
			delete layer_paths[block_key];
		}
		else
			layer_paths[block_key] = path_array;
	}
}
var debug_len = 0;
function debugCheck() {
	var path_array = ly.drawing_paths["173,134"];
	if (path_array) {
		if (path_array.length < debug_len)
			console.log("ly.drawing_paths['173,134']=" + printPathArrayGsid(path_array) + ".");

		debug_len = path_array.length;
	}
}
function errorPrint(msg) {
	console.log(msg);
}
function changeTipSize(e) {
	var margin = 5;
	var $panel = $("#tip_size_panel .panel-body");
	var height = $panel.height();

	var off = $panel.offset();
	var y = Math.round(e.clientY);
	var diff = y - off.top;

	//console.log("changeTipSize. y=" + y + ", off.top=" + off.top + ", diff=" + diff + ", height=" + height + ".");

	if (diff > margin && diff <= height - margin) {
		var ratio = (diff - margin) / (height - 2 * margin);
		var tip_size = Math.ceil(MAX_TIP_SIZE * ratio);

		setTipSize(tip_size);

		if (isErasing())
			ts.eraser_size = tip_size;
		else
			ts.pencil_size = tip_size;
		//console.log("changeTipSize. ratio=" + ratio + ", tip_size=" + tip_size + ".");
	}
}
function setTipSize(tip_size) {
	var margin = 5;

	var $panel = $("#tip_size_panel .panel-body");
	var height = $panel.height();

	var ratio = tip_size / MAX_TIP_SIZE;
	var diff = ratio * (height - 2 * margin) + margin;

	var $dragger = $("#tip_size_dragger");

	$dragger.css("width", tip_size)
		.css("min-width", tip_size)
		.css("height", tip_size)
		.css("top", diff - tip_size / 2 - margin)
		.css("left", 20/*half of #tip_size_panel's width*/ - tip_size / 2);

	$("#tip_size_panel .panel-title").text(tip_size);
}
function tipSizeMouseDown(e) {
	if (!ts.dragging) {
		ts.dragging = true;

		changeTipSize(e);
		e.preventDefault();
	}
}
function tipSizeMouseMove(e) {
	if (ts.dragging) {

		changeTipSize(e);
		e.preventDefault();
	}
}
function tipSizeMouseUp(e) {
	if (ts.dragging) {
		ts.dragging = false;

		changeTipSize(e);
		e.preventDefault();
	}
}
function dxyEncodeObject(dx, dy) {
	var text = "";
	for (var i = 0; i < dx.length; i++) {
		text += dxyEncode(dx[i]);
		text += dxyEncode(dy[i]);
	}
	return text;
}
function dxyEncode(dxy) {
	// Big endian
	var d = dxy;
	var t = "";

	for (var i = 0; i < 10/*arbitrary*/; i++) {
		var m = d % DXY_ENCODE_DIVIDER;
		var d = (d - m) / DXY_ENCODE_DIVIDER;

		var tm = String.fromCharCode((i == 0 ? CODE_a : CODE_A) + m + DXY_ENCODE_DIVIDER - 1);
		t = tm + t;

		if (!d)
			break;
	}
	return t;
	// a-y, A-Y. no z or Z.
}
function dxyDecode(text) {
	var dx = [];
	var dy = [];
	var d = 0;

	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);

		if (c < CODE_a) {
			d = d * DXY_ENCODE_DIVIDER + c - CODE_A - DXY_ENCODE_DIVIDER + 1;
		}
		else {
			d = d * DXY_ENCODE_DIVIDER + c - CODE_a - DXY_ENCODE_DIVIDER + 1;

			if (dy.length < dx.length)
				dy.push(d);
			else
				dx.push(d);
			d = 0;
		}
	}
	return { dx: dx, dy: dy };
}
function isNumber(char) {
	return char >= "0" && char <= "9" || char == "-";
}
function addRecentPicture(url, from_me) {
	var list = from_me ? pc.pict_from_me : pc.pict_from_others;

	var idx = list.indexOf(url);
	if (idx != -1)
		list.splice(idx, 1);
	else if (list.length >= RECENT_PICT_COUNT)
		list.pop();

	list.unshift(url);

	if (from_me) {
		var text = pc.pict_from_me.join(",");
		localStorage.setItem("my_recent_pict", text);
	}
}
function loadRecentPicture() {
	var text = localStorage.getItem("my_recent_pict");
	if (text) {
		pc.pict_from_me = text.split(",");
	}
}
function updateRecentPicture() {
	var $tbl = $("#my_recent_pict_tbl");
	$tbl.empty();

	for (var i = 0; i < RECENT_PICT_COUNT; i++) {
		var url = pc.pict_from_me[i];
		if (url)
			insertRecentPicture($tbl, url, i);
	}

	$tbl = $("#others_pict_tbl");
	$tbl.empty();

	for (var i = 0; i < RECENT_PICT_COUNT; i++) {
		var url = pc.pict_from_others[i];
		if (url)
			insertRecentPicture($tbl, url, i);
	}
}
function insertRecentPicture($tbl, url, idx) {
	var html = "<tr onclick='onRecentPictClick(this)'><th></th><td class='rptnc'><img class='img-thumbnail' /></td><td><a target='_blank' class='text-info'></a></td></tr>";
	var $row = $(html);

	$row.children("th").text(idx + 1);
	$row.find("img")[0].src = url;
	$row.find("a").text(url)[0].href = url;

	$tbl.append($row);
}
function onRecentPictClick(elt) {
	var $row = $(elt);
	var url = $row.find("a")[0].href;

	$("#my_recent_pict_tbl tr").removeClass("info");
	$("#others_pict_tbl tr").removeClass("info");

	$row.addClass("info");

	onPictRecent(url);
}
function onTouchStart(event) {
	if (!acceptMouse(event)) return;

	var touch = event.changedTouches[0];
	//debugLog("touchstart. (" + touch.pageX + ", " + touch.pageY + ").");
	event.clientX = touch.clientX;
	event.clientY = touch.clientY;
	onMouseDown(event);
}
function onTouchEnd(event) {
	var touch = event.changedTouches[0];
	//debugLog("touchend. (" + touch.pageX + ", " + touch.pageY + ").");
	event.clientX = touch.clientX;
	event.clientY = touch.clientY;
	onMouseUp(event);
}
function onTouchMove(event) {
	var touch = event.changedTouches[0];
	//debugLog("touchmove. (" + touch.pageX + ", " + touch.pageY + ").");
	event.clientX = touch.clientX;
	event.clientY = touch.clientY;
	onMouseMove(event);
}
function onContextMenu(event) {
	if (ds.is_tracking)
		event.preventDefault();
};
function toggleRightSidebar(collapse) {
	var $elt = $("#right_sidebar > li > button > span");

	if (collapse === undefined) {
		collapse = $elt.hasClass("glyphicon-chevron-right");
		localStorage["prev_rsb_collapse"] = collapse.toString();
	}
	if (collapse) {
		$elt.removeClass("glyphicon-chevron-right");
		$elt.addClass("glyphicon-chevron-left");

		$("#chat_panel").hide();
		$("#brush_panel").hide();
		$("#color_panel").hide();
		$("#tip_size_panel").hide();
		$("#blur_adjuster").hide();
		$("#bglow_adjuster").hide();
	}
	else {
		$elt.removeClass("glyphicon-chevron-left");
		$elt.addClass("glyphicon-chevron-right");

		$("#chat_panel").show();
		$("#brush_panel").show();
		$("#color_panel").show();
		$("#tip_size_panel").show();
		$("#blur_adjuster").show();
		$("#bglow_adjuster").hide();	//.show();

		if (isSmallScreen())
			toggleLeftSidebar(true);
	}
	refocus();		// Let button lose focus.
}
function toggleLeftSidebar(collapse) {
	var $elt = $("#left_sidebar > li > button > span");

	if (collapse === undefined) {
		collapse = $elt.hasClass("glyphicon-chevron-left");
		localStorage["prev_lsb_collapse"] = collapse.toString();
	}
	if (collapse) {
		$elt.removeClass("glyphicon-chevron-left");
		$elt.addClass("glyphicon-chevron-right");

		$("#layer_panel").hide();
		$("#note_panel").hide();
		$("#hot_room_panel").hide();
		$("#figure_panel").hide();
	}
	else {
		$elt.removeClass("glyphicon-chevron-right");
		$elt.addClass("glyphicon-chevron-left");

		$("#layer_panel").show();
		$("#note_panel").show();
		$("#hot_room_panel").show();
		$("#figure_panel").show();

		if (isSmallScreen())
			toggleRightSidebar(true);
	}
	refocus();		// Let button lose focus.
}
function acceptMouse(event) {
	//console.log("event.target.tagName=" + event.target.tagName + ", event.target.id=" + event.target.id + ".");
	return $(event.target).hasClass("accept_mouse");
}
function populateBrushList() {
	var $container = $("#brush_content");

	for (var i = 0; i < BRUSH_DEF.length; i++) {
		var brush = BRUSH_DEF[i];

		var html = "<li class='list-group-item cursor_pointer' onclick='onBrushClick(this, " + i + ")'></li>";
		var $elt = $(html);
		$elt.text(brush.name);

		if (i == ts.curr_brush_id)
			$elt.addClass("active");

		$container.append($elt);
	}
}
function onBrushClick(elt, brush_id) {
	ts.curr_brush_id = brush_id;

	var $elt = $(elt);

	$("#brush_content li.active").removeClass("active");

	$elt.addClass("active");
}
function setAdjust(elt, value) {
	var $panel = $(elt);
	var width = $panel.width();
	var $bar = $panel.children(".progress-bar");

	var max_v = Number($bar.attr("aria-valuemax"));
	var min_v = Number($bar.attr("aria-valuemin"));

	var ratio = (value - min_v) / (max_v - min_v);
	var diff = ratio * (width - ADJUSTER_MARGIN) + ADJUSTER_MARGIN;

	$bar.css("width", diff)
		.css("min-width", ADJUSTER_MARGIN);
	$bar.children("span").text(value);
}
function onAdjust(event) {
	var $panel = $(event.currentTarget);
	var width = $panel.width();

	var off = $panel.offset();
	var x = Math.round(event.clientX);
	var diff = x - off.left;

	var $bar = $panel.children(".progress-bar");

	var max_v = Number($bar.attr("aria-valuemax"));
	var min_v = Number($bar.attr("aria-valuemin"));

	var ratio = 0;
	var value = min_v;

	if (diff >= ADJUSTER_MARGIN) {
		ratio = (diff - ADJUSTER_MARGIN) / (width - ADJUSTER_MARGIN);
		value = Math.ceil((max_v - min_v) * ratio + min_v);
	}
	$bar.css("width", diff)
		.css("min-width", ADJUSTER_MARGIN);
	$bar.children("span").text(value);

	if (event.currentTarget.id == "blur_adjuster")
		ts.curr_blur = value;
	if (event.currentTarget.id == "bglow_adjuster")
		ts.curr_bglow = value;
}
function adjusterMouseDown(event) {
	if (!ts.dragging) {
		ts.dragging = true;
		onAdjust(event);
		return false;
	}
}
function adjusterMouseMove(event) {
	if (ts.dragging) {
		onAdjust(event);
		return false;
	}
}
function adjusterMouseUp(event) {
	if (ts.dragging) {
		ts.dragging = false;
		onAdjust(event);
		return false;
	}
}
function showAlert(cls/*success, info, warning, danger*/, msg) {

	var $elt = $("<div class='alert alert-dismissible'></div>");

	$elt.text(msg).addClass("alert-" + cls);

	$elt.prepend("<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>");

	$elt.prependTo("#alert_container > div");

	setTimeout(function () {
		$elt.alert("close");
	}, 30 * 1000);
}