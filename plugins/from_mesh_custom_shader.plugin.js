E2.plugins["from_mesh_custom_shader"] = function(core, node) {
	var self = this;
	var renderer = core.renderer; 
	var gl = renderer.context;
	
	this.desc = 'Auto-generate a shader embedding user-defined main bodies tailored to correctly and optimally render the supplied mesh.';
	this.input_slots = [
		 { name: 'mesh', dt: core.datatypes.MESH },
		 { name: 'is3d', dt: core.datatypes.BOOL, desc: 'Type: Bool<break>En- or disable depth buffer write and masking.' },
		 { name: 'color', dt: core.datatypes.COLOR, desc: 'Type: Color<break>Diffuse color. Will module the texture color.' },
		 { name: 'blend mode', dt: core.datatypes.FLOAT },
		 { name: 'texture', dt: core.datatypes.TEXTURE }
	];
	
	this.output_slots = [ 
		{ name: 'shader', dt: core.datatypes.SHADER } 
	];
	
	this.state = { 
		vs_src: 'void main(void)\n{\n\tvec4 dc = color;\n\tgl_Position = p_mat * v_mat * m_mat * vec4(v_pos, 1.0);\n\n\tf_col = dc;\n}',
		ps_src: 'void main(void)\n{\n\tgl_FragColor = f_col;\n}',
		slot_ids: {} 
	};

	this.shader = null;
	this.changed = true;
	
	this.reset = function()
	{
		// Retransmit the shader handle if we've been stopped.
		self.changed = true;
	};
	
	this.open_editor = function(src_id, title, done_func, dest) { return function(e)
	{
		var diag = make('span');
		var src = $('<textarea></textarea>'); 
		
		diag.css('margin', '0px');
		diag.css('padding', '2px');

		src.css('margin', '0px');
		src.css('padding', '0px');
		src.css('margin-top', '2px');
		src.css('border', 'none');
		src.css('width', '455px');
		src.css('height', '400px');
		src.css('resize', 'none');
		src.css('font-size', '9pt');
		src.css('font-family', 'Monospace');
		src.css('overflow', 'scroll');
		src.css('word-wrap', 'normal');
		src.css('white-space', 'pre');
		src.css('background-color', '#ddd');
		
		src.val(self.state[src_id]);
		
		diag.append(src);
		
		var btn_span = make('span');
		var comp_btn = $('<input id="comp_btn" type="button" value="Compile" title="Click to rebuild the shader." />');
		var add_btn = $('<input id="add_btn" type="button" value="Add slot" title="Click to add new shader input slot." />');
		var rem_btn = $('<input id="rem_btn" type="button" value="Remove slot" title="Click to remove the selected slot(s)." />');
		var slot_list = $('<select size="4" />');
		
		slot_list.css('border', 'none');
		slot_list.css('width', '457px');
		slot_list.css('margin-left', '2px');
		slot_list.css('background-color', '#ddd');

		btn_span.css('width', '455px');
		btn_span.append(comp_btn);
		btn_span.append(add_btn);
		btn_span.append(rem_btn);
		
		diag.append(make('br'));
		diag.append(btn_span);
		diag.append(make('br'));
		diag.append(slot_list);

		comp_btn.click(function(e)
		{
			dest(src.val());
			done_func(null);
		});
		
		add_btn.click(function(e)
		{
			var diag2 = make('div');
			var inp = $('<input type="input" />'); 
			var dt_sel = $('<select />');
			var dts = core.datatypes;
			var allowed = [dts.FLOAT, dts.COLOR, dts.TRANSFORM, dts.VERTEX];
			
			for(var i = 0, len = allowed.length; i < len; i++)
			{
				var dt = allowed[i];
				
				dt_sel.append($('<option>', { value : dt.id }).text(dt.name));
			}
			
			var l1 = make('span');
			var lbl = $('<div>Identifier:</div>');
			
			inp.css('width', '220px');
			lbl.css('padding-top', '3px');
			lbl.css('float', 'left');
			lbl.css('width', '80px');
			
			l1.append(lbl);
			l1.append(inp);
			
			diag2.append(l1);
			diag2.append(make('br'));
			
			var l2 = make('span');
			
			lbl = $('<div>Data type:</div>');
			lbl.css('padding-top', '3px');
			lbl.css('float', 'left');
			lbl.css('width', '78px');
			l2.append(lbl);
			l2.append(dt_sel);
			
			diag2.append(l2);
			
			var done_func = function()
			{
				var sname = inp.val();
				var cdt = parseInt(dt_sel.val());
		
				for(var sdt in core.datatypes)
				{
					sdt = core.datatypes[sdt];
					
					if(sdt.id === cdt)
					{
						var cid = sname.replace(' ', '_').toLowerCase();
						var sid = node.add_slot(E2.slot_type.input, { name: cid, dt: sdt });
	
						self.state.slot_ids[cid] = { id: sid, dt: sdt, uniform: null, value: null };
						slot_list.append($('<option>', { value: sid }).text(cid));
						break;
					}
				}
				
				diag2.dialog('close');
				self.rebuild_shader();
				self.changed = true;
			};
			
			diag2.dialog({
				width: 360,
				height: 170,
				modal: true,
				title: 'Create new slot.',
				show: 'slide',
				hide: 'slide',
				buttons: {
					'OK': function()
					{
						done_func();
					},
					'Cancel': function()
					{
						$(this).dialog('close');
					}
				},
				open: function()
				{
					diag2.keyup(function(e)
					{
						if(e.keyCode === $.ui.keyCode.ENTER)
							done_func();
					});
				}
			});
		});
		
		rem_btn.click(function(e)
		{
			var sel = slot_list.val();
			
			if(sel === null)
				return;
				
			var cid = slot_list.find("option[value='" + sel + "']").remove().text();
			
			sel = parseInt(sel);
			
			delete self.state.slot_ids[cid];
			node.remove_slot(E2.slot_type.input, sel);
			self.rebuild_shader();
			self.changed = true;
		});
		
		diag.dialog({
			width: 460,
			height: 150,
			modal: true,
			title: 'Edit ' + title + ' shader.',
			show: 'slide',
			hide: 'slide',
			buttons: {
				'OK': function()
				{
					dest(src.val());
					done_func(diag);
				},
				'Cancel': function()
				{
					$(this).dialog('close');
				}
			}
		});
	}};
	
	this.create_ui = function()
	{
		var layout = make('div');
		var inp_vs = $('<input id="vs_btn" type="button" value="Vertex" title="Click to edit source." />');
		var inp_ps = $('<input id="ps_btn" type="button" value="Pixel" title="Click to edit source." />');
		
		inp_vs.css('width', '55px');
		inp_ps.css('width', '55px');
		
		var done_func = function(diag)
		{
			self.rebuild_shader();
			self.changed = true;
			
			if(diag)
				diag.dialog('close');
		};
		
		inp_vs.click(self.open_editor('vs_src', 'vertex', done_func, function(v) { self.state.vs_src = v; }));
		inp_ps.click(self.open_editor('ps_src', 'pixel', done_func, function(v) { self.state.ps_src = v; }));

		layout.append(inp_vs);
		layout.append(make('br'));
		layout.append(inp_ps);
		
		return layout;
	};

	this.connection_changed = function(on, conn, slot)
	{
		if(!on && slot.type === E2.slot_type.input)
		{
			if(slot.index === 0)
			{
				self.mesh = null;
				self.shader = null;
			}
			else if(slot.index === 4)
				self.tex = null;
		}
	};
	
	this.rebuild_shader = function()
	{
		if(!self.mesh)
			return;

		var uniforms = '';
		
		for(var ident in self.state.slot_ids)
		{
			var dt = '';
			var slot = self.state.slot_ids[ident];
			var dtid = slot.dt.id;
			
			if(dtid === core.datatypes.FLOAT.id)
				dt = 'mediump float';
			else if(dtid === core.datatypes.COLOR.id)
				dt = 'vec4';
			else if(dtid === core.datatypes.TRANSFORM.id)
				dt = 'mat4';
			else if(dtid === core.datatypes.VECTOR.id)
				dt = 'vec3';
			
			uniforms += 'uniform ' + dt + ' ' + ident + ';\n';
		}
		
		self.shader = self.mesh.generate_shader(null, uniforms + self.state.vs_src, uniforms + self.state.ps_src);
	
		for(var ident in self.state.slot_ids)
		{
			var slot = self.state.slot_ids[ident];
			
			slot.uniform = gl.getUniformLocation(self.shader.program, ident);
		}
		
		// Decorate with an apply_uniforms method that maps
		// our values to the generated shader.
		self.shader.apply_uniforms = function()
		{
			gl.uniform4fv(this.diffuseColorUniform, new Float32Array(self.color.rgba));
		
			if(this.uv0CoordAttribute !== undefined)
			{
				gl.enableVertexAttribArray(this.uv0CoordAttribute);

				if(self.tex !== null)
				{
					gl.uniform1i(this.tex0Uniform, 0);
					self.tex.enable(gl.TEXTURE0);
				}
				else
				{
					gl.bindTexture(gl.TEXTURE_2D, null);
				}
			}
	
			for(var ident in self.state.slot_ids)
			{
				var slot = self.state.slot_ids[ident];
			
				
				if(slot.uniform === null || slot.value === null)
					continue;
					
				var dtid = slot.dt.id;
				
				if(dtid === core.datatypes.FLOAT.id)
					gl.uniform1f(slot.uniform, slot.value);
				else if(dtid === core.datatypes.COLOR.id)
					gl.uniform4fv(slot.uniform, new Float32Array(slot.value));	
				else if(dtid === core.datatypes.TRANSFORM.id)
					gl.uniformMatrix4fv(slot.uniform, false, slot.value);
				else if(dtid === core.datatypes.VECTOR.id)
					gl.uniform3fv(slot.uniform, new Float32Array(slot.value));	
			}
			
			var r = core.renderer;

			r.set_depth_enable(self.is3d);
			r.set_blend_mode(self.blend_mode);
		};
	};
	
	this.update_input = function(slot, data)
	{
		if(slot.uid === undefined)
		{
			if(slot.index === 0)
			{
				self.mesh = data;
				self.rebuild_shader();
			}
			else if(slot.index === 1)
				self.is3d = data;
			else if(slot.index === 2)
				self.color = data;
			else if(slot.index === 3)
				self.blend_mode = data;
			else if(slot.index === 4)
				self.tex = data;
		}
		else
		{
			self.state.slot_ids[slot.name].value = data;
		}
	};
	
	this.update_state = function(delta_t)
	{
		if(self.changed)
		{
			self.changed = false;
			self.updated = true;
		}
	};
	
	this.update_output = function(slot)
	{
		return self.shader;
	};
	
	this.state_changed = function(ui)
	{
		if(!ui)
		{
			self.mesh = null;
			self.is3d = false;
			self.color = new Color(1.0, 1.0, 1.0, 1.0);
			self.blend_mode = core.renderer.blend_mode.NORMAL;
			self.tex = null;
		}
	};
};
