function registerShortcutKey() {
	document.addEventListener("keydown", keyhandler, false);
	document.addEventListener("keyup", keyhandler, false);

	var last_key = null;

	function keyhandler(event) {
		if (event.altKey || event.ctrlKey/* || event.shiftKey*/ || event.metaKey)
			return;
		if (event.target.tagName === "TEXTAREA" || event.target.tagName === "INPUT")
			return;
		//console.log("repeat: " + event.repeat);		// not work in IE.

		var keyname = null;

		if (event.key) keyname = event.key;
		else if (event.keyIdentifier && event.keyIdentifier.substring(0, 2) !== "U+")
			keyname = event.keyIdentifier;
		else
			keyname = keyCodeToKeyName[event.keyCode];

		if (!keyname) return;

		var stop_propagation = false;

		if (event.type === "keydown") {
			var repeat = last_key === keyname;
			last_key = keyname;

			if (typeof onKeyDown === "function") {
				if (onKeyDown(keyname, repeat))
					stop_propagation = true;
			}
		}
		if (event.type === "keyup") {
			last_key = null;
			if (typeof onKeyUp === "function") {
				if (onKeyUp(keyname))
					stop_propagation = true;
			}
		}
		//
		if (stop_propagation) {
			if (event.stopPropagation) event.stopPropagation();
			else event.cancelBubble = true;
			if (event.preventDefault) event.preventDefault();
			else event.returnValue = false;

			return false;
		}
	}
}
var keyCodeToKeyName = {
	32: "Spacebar",
	33: "PageUp", 34: "PageDown", 35: "End", 36: "Home",
	37: "Left", 38: "Up", 39: "Right", 40: "Down",

	65: "A", 66: "B", 67: "C", 68: "D", 69: "E", 70: "F", 71: "G", 72: "H", 73: "I",
	74: "J", 75: "K", 76: "L", 77: "M", 78: "N", 79: "O", 80: "P", 81: "Q", 82: "R",
	83: "S", 84: "T", 85: "U", 86: "V", 87: "W", 88: "X", 89: "Y", 90: "Z",

	107: "Add", 109: "Subtract",
	61: "=", 173: "-", 187: "=", 188: ",", 189: "-", 190: ".",
};
function postGoods(url, post_data, callback) {
	var data_to_send;
	var process_data = true;
	var content_type;

	if (post_data.upload_files) {
		data_to_send = post_data.upload_files;
		process_data = false;
		content_type = false;

		for (var name in post_data) {
			if (name === "upload_files" || !post_data.hasOwnProperty(name)) continue;
			var value = post_data[name];
			if (typeof value === "function" || typeof value === "undefined") continue;
			data_to_send.append(name, value);		// This seems changing \n to \r\n in words (on Chrome but not on IE).
		}
	}
	else
		data_to_send = post_data;

	//$.post(url, data_to_send)
	$.ajax({
		type: "POST",
		url: url,
		data: data_to_send,
		processData: process_data,
		contentType: content_type
	})
	.done(function (data, textStatus, jqXHR) {
		//console.log("data=" + data + ". textStatus=" + textStatus
		//				+ ". jqXHR.readyState=" + jqXHR.readyState + ". jqXHR.status=" + jqXHR.status
		//				+ ". jqXHR.statusText=" + jqXHR.statusText
		//				+ ". jqXHR.responseText=" + jqXHR.responseText
		//				+ ".");
		if (data.err_msg)
			callback(false, data.err_msg);
		else if (data.captcha_or_wait_seconds) {
			askCaptchaAndPostGoods(url, post_data, callback, data.captcha_or_wait_seconds);
		}
		else
			callback(true, data);
	})
	.fail(function (jqXHR, textStatus, errorThrown) {
		console.log("errorThrown=" + errorThrown + ". textStatus=" + textStatus
                        + ". jqXHR.readyState=" + jqXHR.readyState + ". jqXHR.status=" + jqXHR.status
                        + ". jqXHR.statusText=" + jqXHR.statusText + ". jqXHR.responseText=" + jqXHR.responseText + ".");
		// For net::ERR_CONNECTION_RESET type error, it will be:
		// errorThrown=. textStatus=error. jqXHR.readyState=0. jqXHR.status=0. jqXHR.statusText=error. jqXHR.responseText=.
		var rep;
		var m = jqXHR.responseText.match(/<title>(.+)<\/ ?title>/i);
		if (!m)
			rep = jqXHR.responseText.substr(0, 250);
		else
			rep = m[1];
		callback(false, rep);
	});
}
function getGoods(url, callback) {
	$.get(url)
	.done(function (data, textStatus, jqXHR) {
		//console.log("data=" + data + ". textStatus=" + textStatus
		//				+ ". jqXHR.readyState=" + jqXHR.readyState + ". jqXHR.status=" + jqXHR.status
		//				+ ". jqXHR.statusText=" + jqXHR.statusText
		// + ". jqXHR.responseText=" + jqXHR.responseText		// too big to print every time.
		//+ ".");
		callback(data);
	})
	.fail(function (jqXHR, textStatus, errorThrown) {
		console.log("errorThrown=" + errorThrown + ". textStatus=" + textStatus
                        + ". jqXHR.readyState=" + jqXHR.readyState + ". jqXHR.status=" + jqXHR.status
                        + ". jqXHR.statusText=" + jqXHR.statusText + ". jqXHR.responseText=" + jqXHR.responseText + ".");
		// For net::ERR_CONNECTION_RESET type error, it will be:
		// errorThrown=. textStatus=error. jqXHR.readyState=0. jqXHR.status=0. jqXHR.statusText=error. jqXHR.responseText=.
		callback(null);
	});
}
function getBlob(url, callback) {
	var xhr = new XMLHttpRequest();

	xhr.open("GET", url);
	xhr.responseType = "arraybuffer";

	xhr.onload = function () {
		if (this.status == 200)
			callback(this.response);
		else {
			console.log("getBlob(" + url + ") failed. " + this.statusText);
			callback(null);
		}
	};
	xhr.onerror = function () {
		callback(null);
	};
	xhr.send(null);
}
function fileSizeHint(file_size) {
	if (file_size >= 1000 * 1000)
		return (file_size / 1024 / 1024).toPrecision(3) + " MB";
	else if (file_size >= 1000)
		return (file_size / 1024).toPrecision(3) + " KB";
	else
		return file_size + " Bytes";
}
