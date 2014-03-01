E2.p = E2.plugins["viewport_height_generator"] = function(core, node)
{
	this.desc = 'Emits current renderer view height.';
	
	this.input_slots = [];
	
	this.output_slots = [ { name: 'height', dt: core.datatypes.FLOAT, desc: 'The current renderer viewport height.' } ];
	
	this.canvas = core.renderer.canvas[0];
};

E2.p.prototype.reset = function()
{
};

E2.p.prototype.update_output = function(slot)
{
	return this.canvas.height;
};