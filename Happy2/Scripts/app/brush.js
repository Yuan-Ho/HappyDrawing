var af =
	{
		start_time: null,
		breath_val: 0,
		last_draw_time: 0,
	};

var BRUSH_DEF = [];

BRUSH_DEF[0] = {		// 0 is default
	name: "Raw",
};
BRUSH_DEF[1] = {
	name: "Round brush",
	tipShape: 1,		// circle
};

function triWave(t) {
	var t1 = t % 2;
	if (t1 <= 1)
		return t1;
	return 2 - t1;
	// returns a value between 0 and 1.
}
function animationStep(timestamp) {
	if (!af.start_time)
		af.start_time = timestamp;

	var elapsed_time = timestamp - af.start_time;		// ms

	af.breath_val = triWave(elapsed_time / 2000);

	if (!ds.is_tracking &&
		timestamp - af.last_draw_time > 100) {
		af.last_draw_time = timestamp;
		redrawDrawingPaths();
	}
	window.requestAnimationFrame(animationStep);
}
