// radialmenu.js
//
// Radial menu for an HTML 5 canvas.

function region_contains(anchor, size, pos) {
  var xd = pos.x - anchor.x;
  var yd = pos.y - anchor.y;
  return xd >= 0 && xd <= size.x && yd >= 0 && yd <= size.y;
}

menu_response = {
  error: -1, // report an error
  handled: 0, // we handled this event; do nothing
  close: 1, // we should close this menu
  bubble: 2 // this event should bubble upwards
}

function radial_menu(root, items, item_size) {
  if (items.length == 0) { return; }
  return radial_menu_limited(root, items, 0, Math.PI);
}

function radial_menu_limited(root, items, from, to) {
  if (items.length == 0) { return; }
  count = items.length;
  item_size = root.size;
  radius = 1.0 * item_size;
  radius = item_size;
  rsize = Math.atan2(item_size, radius);
  layers = [items];
  sweep = to - from;
  last = layers.length-1;
  depth = 1;
  // separate the items into layers:
  // note: items at greater depth require less radial space
  while ((rsize*1.5/depth) * layers[last].length > Math.abs(sweep)) {
    capacity = Math.floor(Math.abs(sweep) / ((rsize*1.5)*layers[last].length));
    layers[layers.length] = layers[last].slice(capacity, layers[last].length);
    layers[last] = layers[last].slice(0, capacity);
    last = layers.length - 1;
    depth += 1;
  }
  // even out the last two layers:
  if (depth > 1) {
    while (
      (layers[last-1].length - layers[last].length)
    > (layers[last-1].length / 2 )
    ) {
      layers[last].unshift(layers[last-1].pop());
    }
  }

  all_positions = [];
  l_radius = radius;
  for (var i = 0; i < layers.length; ++i) {
    l = layers[i];
    sweep_per = sweep / l.length;
    here = from + sweep_per/2.0;
    for (var j = 0; j < l.length; ++j) {
      all_positions.push({
        x: root.pos.x + l_radius * Math.cos(here),
        y: root.pos.y + l_radius * Math.sin(here)
      });
      here += sweep_per;
    }
    l_radius += radius;
  }

  buttons = [
    button( // the central cancel button
      function(ctx) {
        draw_block(
          ctx,
          B_CANCEL,
          {
            x: root.pos.x - root.size/2.0,
            y: root.pos.y - root.size/2.0
          },
          root.size
        );
      },
      function(state, pos) {
        return menu_response.close;
      },
      root.pos,
      {
        x: root.size,
        y: root.size,
      }
    )
  ];
  for (i = 0; i < items.length; ++i) {
    it = items[i];
    pos = all_positions[i];

    buttons.push(button(it.draw, it.tap, pos, it.size))
  }

  var result = menu(buttons);
  orig_draw = result.draw;
  result.draw = function(ctx) {
    var root = this.components[0];
    this.components.slice(1,this.components.length).forEach(function (cmp) {
      ctx.beginPath();
      ctx.moveTo(root.pos.x, root.pos.y);
      ctx.lineTo(cmp.pos.x, cmp.pos.y);
      ctx.stroke();
    });
    orig_draw(ctx);
  }
  return result;
}

function button(draw_function, trigger_function, position, size) {
  return {
    draw: draw_function,
    tap: trigger_function,
    swipe: function(state, pos, dir) { return menu_response.close; },
    pos: position,
    size: size
  };
}

function menu(components) {
  return {
    components: components,
    draw: function(ctx) {
      for (var i = 0; i < components.length; ++i) {
        components[i].draw(ctx);
      }
    },
    tap: function(state, pos) {
      for (var i = 0; i < components.length; ++i) {
        var c = components[i];
        var anchor = {
          x: c.pos.x - c.size.x/2.0,
          y: c.pos.y - c.size.y/2.0
        };
        if (region_contains(anchor, c.size, pos)) {
          return c.tap(state, pos);
        }
      }
      return menu_response.close;
    },
    swipe: function (state, pos, dir) {
      for (var i = 0; i < components.length; ++i) {
        var c = components[i];
        var anchor = {
          x: c.pos.x - c.size.x/2.0,
          y: c.pos.y - c.size.y/2.0
        };
        if (region_contains(anchor, c.size, pos)) {
          return c.swipe(state, pos, dir);
        }
      }
      return menu_response.close;
    }
  }
}
