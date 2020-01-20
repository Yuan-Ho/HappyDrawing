var sm =
	{
		squares: {},
		image_pool: [],
	};

function Square() {
	this.images = [];
}
function getPoolImage() {
	if (sm.image_pool.length > 0)
		return sm.image_pool.shift();
	else
		return new Image();
}
function putPoolImage(image) {
	sm.image_pool.push(image);
}
function clearSquare(layer_num, block_key) {
	var square = sm.squares[block_key];

	if (square) {
		var image = square.images[layer_num];
		if (image) {
			putPoolImage(image);
			delete square.images[layer_num];
		}
		// if (square.images.length == 0)		// does not work. the length property of a sparse array is not updated after delete.
		if (!square.images.some(Boolean))
			delete sm.squares[block_key];
	}
}
function render(layer_num, block_key, block_idx, path_array, ctx) {
	if (path_array.length > 5) {
		var square = sm.squares[block_key];

		if (!square) {
			square = new Square();
			sm.squares[block_key] = square;
		}
		var image = square.images[layer_num];
		if (image) {
			if (image.complete) {
				resetDrawingAttributes(ctx);

				ctx.drawImage(image,
								block_idx.x * BLOCK_SIZE - BLOCK_SIZE / 2,
								block_idx.y * BLOCK_SIZE - BLOCK_SIZE / 2);
				return;
			}
		}
		else {
			var canvas_elt = document.getElementById("render_canvas");
			var render_ctx = canvas_elt.getContext("2d");

			clearCanvas(render_ctx, "render_canvas");

			render_ctx.setTransform(1, 0, 0, 1,
									BLOCK_SIZE / 2 - block_idx.x * BLOCK_SIZE,
									BLOCK_SIZE / 2 - block_idx.y * BLOCK_SIZE);

			drawDrawingPaths(render_ctx, path_array);

			square.images[layer_num] = getPoolImage();
			square.images[layer_num].src = canvas_elt.toDataURL();
		}
	}
	setClip(ctx, block_idx);
	drawDrawingPaths(ctx, path_array);
	resetClip(ctx);
}