// together.js
//
// A block movement game.

/***********
 * Globals *
 ***********/

CURRENT_LEVEL = null;

CANVAS = null;
CONTEXT = null;

MENUS = [];

MPOS = { x: 0, y: 0 };

BOARD_WIDTH = 11;
BOARD_HEIGHT = 11;

// TODO: Implement this?
ZOOM = 1.0;

RESOLUTION = 2;

B_FLOOR = 0;
B_WALL = 1;
B_GOAL = 2;
B_CANCEL = 3;
B_SOME_ACTIVE = 4;

SPRITENAMES = [
  "floor",
  "wall",
  "goal",
  "cancel",
  "block-horiz",
  "block-vert",
  "block-diag-u",
  "block-diag-d",
  "block-wheel-n",
  "block-wheel-e",
  "block-wheel-s",
  "block-wheel-w",
  "block-hop-h",
  "block-hop-v"
];

MSTATE = {
  down: false,
  start: {
    x: 0,
    y: 0
  }
}

// TODO: Why is this in double-blocks instead of blocks?
NEGLIGIBLE_MOVEMENT = 0.34; // blocks

// State markers:
ST_START = 0;
ST_DONE = -1;
ST_FAIL = -2;

HISTORY = [];

/***************************
 * Movement Implementation *
 ***************************/

function do_mod(state, mod) {
  var tmp;
  switch (mod.type) {
    case "swap":
      tmp = get_block(state.level, mod.from);
      set_block(state.level, mod.from, get_block(state.level, mod.to));
      set_block(state.level, mod.to, tmp);
      break;
    default:
      console.log("ERROR: Unknown mod type '" + mod.type + "' in do_mod.");
      break;
  }
}

function undo_mod(state, mod) {
  var tmp;
  switch (mod.type) {
    case "swap":
      tmp = get_block(state.level, mod.from);
      set_block(state.level, mod.from, get_block(state.level, mod.to));
      set_block(state.level, mod.to, tmp);
      break;
    default:
      console.log("ERROR: Unknown mod type '" + mod.type + "' in undo_mod.");
      break;
  }
}

function do_move(state, move) {
  HISTORY.push(move);
  for (var i = 0; i < move.modifications.length; ++i) {
    do_mod(state, move.modifications[i]);
  }
}

function undo(state) {
  bad = HISTORY.pop();
  for (var i = 0; i < bad.modifications.length; ++i) {
    undo_mod(state, bad.modifications[i]);
  }
}
// TODO: Undo button


/**********************
 * Movement Functions *
 **********************/

function general_move(name, affinity, nxt) {
  return function (state, pos) {
    var prev = pos;
    var here = {x: pos.x, y: pos.y, st: 0};
    var orig = get_block(state.level, pos);
    nxt(here);
    var b = get_block(state.level, here);
    while(b == B_FLOOR && here.st != ST_DONE && here.st != ST_FAIL) {
      prev = {x: here.x, y: here.y};
      nxt(here);
      b = get_block(state.level, here);
    }
    if (prev == pos || here.st == ST_FAIL) {
      return null;
    } else {
      return {
        name: name,
        affinity: affinity,
        modifications: [
          {
            type: "swap",
            from: { x: pos.x, y: pos.y },
            to: { x: prev.x, y: prev.y }
          }
        ]
      }
    }
  };
}

function mv_slide(dir) {
  var next;
  if (dir == 0) {
    next = function (here) {
      here.y -= 1;
    }
  } else if (dir == 1) {
    next = function (here) {
      here.x += 1;
    }
  } else if (dir == 2) {
    next = function (here) {
      here.y += 1;
    }
  } else if (dir == 3) {
    next = function (here) {
      here.x -= 1;
    }
  }
  return general_move("slide", [dir], next);
}

function mv_diag(dir) {
  var next;
  if (dir == 0) {
    next = function (here) {
      here.x += 1;
      here.y -= 1;
    }
  } else if (dir == 1) {
    next = function (here) {
      here.x += 1;
      here.y += 1;
    }
  } else if (dir == 2) {
    next = function (here) {
      here.x -= 1;
      here.y += 1;
    }
  } else if (dir == 3) {
    next = function (here) {
      here.x -= 1;
      here.y -= 1;
    }
  }
  return general_move("diag", [dir, (dir + 1) % 4], next);
}

function wheel_cw(start) {
  return function (here) {
    if (here.st == ST_START) {
      here.st = { count: 0, pos: start };
    }
    if (here.st.pos == 0) {
      here.x -= 1;
      here.st.pos = 1;
      here.st.count += 1;
    } else if (here.st.pos == 1) {
      here.y -= 1;
      here.st.pos = 2;
      here.st.count += 1;
    } else if (here.st.pos == 2) {
      here.y -= 1;
      here.st.pos = 3;
      here.st.count += 1;
    } else if (here.st.pos == 3) {
      here.x += 1;
      here.st.pos = 4;
      here.st.count += 1;
    } else if (here.st.pos == 4) {
      here.x += 1;
      here.st.pos = 5;
      here.st.count += 1;
    } else if (here.st.pos == 5) {
      here.y += 1;
      here.st.pos = 6;
      here.st.count += 1;
    } else if (here.st.pos == 6) {
      here.y += 1;
      here.st.pos = 7;
      here.st.count += 1;
    } else if (here.st.pos == 7) {
      here.x -= 1;
      here.st.pos = 0;
      here.st.count += 1;
    }
    if (here.st.count >= 8) {
      here.st = ST_FAIL;
    }
  };
}

function wheel_ccw(start) {
  return function (here) {
    if (here.st == 0) {
      here.st = { count: 0, pos: start };
    }
    if (here.st.pos == 0) {
      here.x += 1;
      here.st.pos = 1;
      here.st.count += 1;
    } else if (here.st.pos == 1) {
      here.y -= 1;
      here.st.pos = 2;
      here.st.count += 1;
    } else if (here.st.pos == 2) {
      here.y -= 1;
      here.st.pos = 3;
      here.st.count += 1;
    } else if (here.st.pos == 3) {
      here.x -= 1;
      here.st.pos = 4;
      here.st.count += 1;
    } else if (here.st.pos == 4) {
      here.x -= 1;
      here.st.pos = 5;
      here.st.count += 1;
    } else if (here.st.pos == 5) {
      here.y += 1;
      here.st.pos = 6;
      here.st.count += 1;
    } else if (here.st.pos == 6) {
      here.y += 1;
      here.st.pos = 7;
      here.st.count += 1;
    } else if (here.st.pos == 7) {
      here.x += 1;
      here.st.pos = 0;
      here.st.count += 1;
    }
    if (here.st.count >= 8) {
      here.st = ST_FAIL;
    }
  };
}

function mv_wheel(facing, dir) {
  var next;
  if (facing == 0) {
    if (dir == 1)
      next = wheel_ccw(0);
    else {
      next = wheel_cw(0);
    }
  } else if (facing == 1) {
    if (dir == 0)
      next = wheel_cw(2);
    else {
      next = wheel_ccw(6);
    }
  } else if (facing == 2) {
    if (dir == 1)
      next = wheel_cw(4);
    else {
      next = wheel_ccw(4);
    }
  } else if (facing == 3) {
    if (dir == 0)
      next = wheel_ccw(2);
    else {
      next = wheel_cw(6);
    }
  }
  return general_move("spin", [dir], next);
}

function mv_hop(dir) {
  var next;
  if (dir == 0) {
    next = function (here) {
      if (here.st == ST_START) {
        here.st = 1;
        here.y -= 2;
      } else if (here.st == 1) {
        here.st = ST_DONE;
      }
    }
  } else if (dir == 1) {
    next = function (here) {
      if (here.st == ST_START) {
        here.st = 1;
        here.x += 2;
      } else {
        here.st = ST_DONE;
      }
    }
  } else if (dir == 2) {
    next = function (here) {
      if (here.st == ST_START) {
        here.st = 1;
        here.y += 2;
      } else {
        here.st = ST_DONE;
      }
    }
  } else if (dir == 3) {
    next = function (here) {
      if (here.st == ST_START) {
        here.st = 1;
        here.x -= 2;
      } else {
        here.st = ST_DONE;
      }
    }
  }
  return general_move("hop", [dir], next);
}

BLOCKMOVES = [
  [],
  [],
  [],
  [],
  [ mv_slide(1), mv_slide(3) ],
  [ mv_slide(0), mv_slide(2) ],
  [ mv_diag(0), mv_diag(2) ],
  [ mv_diag(1), mv_diag(3) ],
  [ mv_wheel(0, 1), mv_wheel(0, 3) ],
  [ mv_wheel(1, 0), mv_wheel(1, 2) ],
  [ mv_wheel(2, 1), mv_wheel(2, 3) ],
  [ mv_wheel(3, 0), mv_wheel(3, 2) ],
  [ mv_hop(1), mv_hop(3) ],
  [ mv_hop(0), mv_hop(2) ],
];

/***********
 * Helpers *
 ***********/

function load_level(level) {
  CURRENT_LEVEL.width = level.width;
  CURRENT_LEVEL.height = level.height;
  CURRENT_LEVEL.blocks = level.blocks;
}

function sprite_for(block) {
  name = "unknown"
  if (0 <= block && block < SPRITENAMES.length) {
    name = SPRITENAMES[block];
  }
  img = $("#s-" + name)[0];
  if (img === undefined) {
    console.log("ERROR: Can't find image: " + name);
    img = $("#s-unknown")[0];
  }
  return img;
}

function cmetrics(state) {
  var cw = state.canvas.width;
  var ch = state.canvas.height;
  var cs = Math.min(cw, ch);
  var scale = cs / (Math.max(state.level.width, state.level.height) + 1.0);
  var ox = (cw - (scale * state.level.width))/2;
  var oy = (ch - (scale * state.level.height))/2;
  return {
    width: cw,
    height: ch,
    size: cs,
    scale: scale,
    offset: {
      x: ox,
      y: oy
    }
  };
}

/**********************
 * Level Manipulation *
 **********************/

function get_block(level, pos) {
  if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
    return -1;
  }
  return level.blocks[pos.x + level.width * pos.y];
}

function set_block(level, pos, value) {
  level.blocks[pos.x + level.width * pos.y] = value;
}

/******************
 * Possible Moves *
 ******************/

// Moves available based on block type.
function block_moves(block) {
  if (block >= 0 && block < BLOCKMOVES.length) {
    result = [];
    BLOCKMOVES[block].forEach(function (bmf) {
      result.push(
        function(state, pos) {
          rslt = bmf(state, pos);
          if (rslt != null) {
            rslt.block = block;
            rslt.sprite = sprite_for(block);
          }
          return rslt;
        }
      );
    });
    return result;
  }
  return [];
}

// Moves available for the block at position pos.
function moves_for(state, pos) {
  var block = get_block(state.level, pos);
  var result = block_moves(block)
  var here = {x: 0, y: 0};
  if (result.length == 0) {
    return [];
  }
  for (here.x = pos.x - 1; here.x <= pos.x + 1; ++here.x) {
    for (here.y = pos.y - 1; here.y <= pos.y + 1; ++here.y) {
      if (here.x == pos.x && here.y == pos.y) {
        continue;
      }
      var b  = get_block(state.level, here)
      result = result.concat(block_moves(b));
    }
  }
  for (var i = 0; i < result.length; ++i) {
    result[i] = result[i](state, pos);
  }
  return result.filter(function (x) { return x != null; });
}

// Simple moves.
function direct_moves(state, pos) {
  result = block_moves(get_block(state.level, pos));
  for (var i = 0; i < result.length; ++i) {
    result[i] = result[i](state, pos);
  }
  return result.filter(function (x) { return x != null; });
}

function move_possibilities(state, pos, dir) {
  var all = moves_for(state, pos);
  var here;
  result = [];
  for (var i = 0; i < all.length; ++i) {
    here = all[i];
    if (here.affinity.indexOf(dir) >= 0) {
      result.push(here);
    }
  }
  return result;
}

/**************************
 * Coordinate conversions *
 **************************/

// http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/18053642#18053642
// mouse -> canvas pos conversion
function mpos__cpos(state, mpos) {
    var rect = state.canvas.getBoundingClientRect();
    var m = cmetrics(state);
    // TODO: Why the factor of 2?
    var x = (mpos.x - (rect.left + m.offset.x/2.0));
    var y = (mpos.y - (rect.top + m.offset.y/2.0));
    x /= m.scale/2.0;
    y /= m.scale/2.0;
    //x = Math.floor(x);
    //y = Math.floor(y);
    x *= 100.0;
    y *= 100.0;
    return {
      //x: (2 * (mpos.x - rect.left) - m.offset.x) / m.scale,
      //y: (2 * (mpos.y - rect.top) - m.offset.y) / m.scale
      x: x,
      y: y
    };
}

// canvas -> block pos conversion
function cpos__bpos(cpos) {
  return {
    x: Math.floor(cpos.x/100.0),
    y: Math.floor(cpos.y/100.0)
  };
}

// block -> canvas pos conversion
function bpos__cpos(bpos) {
  return {
    x: bpos.x*100,
    y: bpos.y*100
  };
}

/***********
 * Drawing *
 ***********/

function keep_drawing() {
  redraw();
  setTimeout(keep_drawing, 1000/30.0);
}

function redraw() {
  if (CANVAS == null) {
    CANVAS = $("#together-canvas")[0];
  }
  draw(
    {
      canvas: CANVAS,
      level: CURRENT_LEVEL
    },
    MENUS
  );
}

function draw(state, menus) {
  var ctx = state.canvas.getContext("2d");
  var i, x, y;
  var cw = parseInt($(state.canvas).css("width")) * RESOLUTION;
  var ch = parseInt($(state.canvas).css("height")) * RESOLUTION;
  state.canvas.width = cw;
  state.canvas.height = ch;
  var m = cmetrics(state);
  if (state.level == null) {
    console.log("Warning: null state during draw.");
    return;
  }
  ctx.translate(m.offset.x, m.offset.y);
  ctx.scale(m.scale/100.0, m.scale/100.0);
  for (x = 0; x < state.level.width; ++x) {
    for (y = 0; y < state.level.height; ++y) {
      i = x + y*state.level.width;
      if (x % 2 - y % 2 == 0) {
        ctx.strokeStyle = "#000000";
      } else {
        ctx.strokeStyle = "#dddddd";
      }
      ctx.strokeRect(x*100, y*100, 99, 99);
      draw_block(
        ctx,
        state.level.blocks[i],
        bpos__cpos({x: x, y: y}),
        100.0
      );
    }
  }
  menus.forEach(function (m) {
    m.draw(ctx);
  });
  // DEBUG
  //draw_cursor(ctx, state);
}

// Draw mouse position
function draw_cursor(ctx, state) {
  cpos = mpos__cpos(state, MPOS);
  ctx.beginPath();
  ctx.arc(cpos.x, cpos.y, 10, 0, 2*Math.PI);
  ctx.stroke();
}

function draw_block(ctx, block, cpos, scale) {
  sprite = sprite_for(block);
  ctx.drawImage(sprite, cpos.x, cpos.y, scale, scale);
}

/******************
 * Event handlers *
 ******************/

function handle_down(evt) {
  MSTATE.down = true;
  MSTATE.start = mpos__cpos(evt.data, { x: evt.clientX, y: evt.clientY } );
}

function handle_up(evt) {
  var cpos = mpos__cpos(evt.data, { x: evt.clientX, y: evt.clientY } );
  var bpos = cpos__bpos(cpos);
  var dist = Math.sqrt(
    Math.pow(cpos.x - MSTATE.start.x, 2)
  + Math.pow(cpos.y - MSTATE.start.y, 2)
  );
  // TODO: Why this?!?
  var m = cmetrics(evt.data)
  //console.log("Start: " + MSTATE.start.x + ", " + MSTATE.start.y);
  //console.log("End: " + cpos.x + ", " + cpos.y);
  //console.log("Dist: " + dist + " / " + NEGLIGIBLE_MOVEMENT * m.scale);
  if (dist <= NEGLIGIBLE_MOVEMENT * m.scale) {
    // a tap
    if (MENUS.length > 0) {
      for (var i = 0; i < MENUS.length; ++i) {
        var result = MENUS[i].tap(evt.data, MSTATE.start);
        if (result == menu_response.close) {
          MENUS.pop();
        } else if (result != menu_response.bubble) {
          // else handled or error...
          break;
        }
      }
    } else {
      tap_on(evt.data, bpos);
    }
  } else {
    // a swipe
    var dir = -1; // n, e, s, w -> 0, 1, 2, 3
    if (Math.abs(cpos.x - MSTATE.start.x) > Math.abs(cpos.y - MSTATE.start.y)) {
      if (cpos.x > MSTATE.start.x) {
        dir = 1;
      } else {
        dir = 3;
      }
    } else {
      if (cpos.y > MSTATE.start.y) {
        dir = 2;
      } else {
        dir = 0;
      }
    }
    if (MENUS.length > 0) {
      for (var i = 0; i < MENUS.length; ++i) {
        var result = MENUS[i].swipe(evt.data, MSTATE.start, dir);
        if (result == menu_response.close) {
          MENUS.pop();
        } else if (result != menu_response.bubble) {
          // else handled or error...
          break;
        }
      }
    } else {
      swipe_from(evt.data, cpos__bpos(MSTATE.start), dir);
    }
  }
  redraw();
}

function handle_move(evt) {
  MPOS.x = evt.clientX;
  MPOS.y = evt.clientY;
}

/*******************
 * Action handlers *
 *******************/

function tap_on(state, pos) {
  //console.log("tap");
  console.log("tap (" + pos.x + ", " + pos.y + ")");
}

function swipe_from(state, pos, dir) {
  console.log("swipe (" + pos.x + ", " + pos.y + ") -> " + dir);
  var mps;
  var b = get_block(state.level, pos);
  var m = cmetrics(state);
  var rpos = bpos__cpos(pos);
  rpos.x += m.scale/2.0;
  rpos.y += m.scale/2.0;
  if (b >= B_SOME_ACTIVE) {
    console.log("active");
    mps = move_possibilities(state, pos, dir);
    if (mps.length == 0) {
      console.log("no-moves");
      // TODO: animate 'x'
    } else if (mps.length == 1) {
      console.log("do-move");
      do_move(state, mps[0]);
    } else {
      console.log("complicated");
      var rfrom, rto;
      if (dir == 0) {
        rfrom = (5.0*Math.PI) / 4.0;
        rto = (7.0*Math.PI) / 4.0;
      } else if (dir == 1) {
        rfrom = -Math.PI / 4.0;
        rto = Math.PI / 4.0;
      } else if (dir == 2) {
        rfrom = Math.PI / 4.0;
        rto = 3.0 * Math.PI / 4.0;
      } else { // if (dir == 3) {
        rfrom = (3.0*Math.PI) / 4.0;
        rto = (5.0*Math.PI) / 4.0;
      }
      items = [];
      mps.forEach(function (ps) {
        items.push({
          size: { x: m.scale, y: m.scale},
          draw: function(ctx) {
            draw_block(
              ctx,
              ps.block,
              {
                x: this.pos.x - m.scale / 2.0,
                y: this.pos.y - m.scale / 2.0
              },
              m.scale
            );
          },
          tap: function(state, pos) {
            do_move(state, ps);
            return menu_response.close;
          }
        });
      });
      show_menu(
        radial_menu_limited(
          {
            pos: rpos,
            size: m.scale
          },
          items,
          rfrom,
          rto
        )
      );
        //get_possible_moves_menu(state, pos, dir, mps));
    }
  } else {
    console.log("inactive: " + get_block(state.level, pos));
    // TODO: Animate '?'
  }
}

/********
 * Init *
 ********/

function init() {
  CURRENT_LEVEL = {};
  CURRENT_LEVEL.width = BOARD_WIDTH;
  CURRENT_LEVEL.height = BOARD_HEIGHT;
  CURRENT_LEVEL.blocks = new Array(CURRENT_LEVEL.width * CURRENT_LEVEL.height);

  jqc = $("#together-canvas");
  CANVAS = jqc[0];
  CONTEXT = CANVAS.getContext("2d");

  jqc.on(
    {
      mousedown: handle_down,
      mouseup: handle_up,
      mousemove: handle_move
    },
    null,
    {
      canvas: CANVAS,
      level: CURRENT_LEVEL
    }
  );

  // DEBUG:
  load_level(LEVELS[1]);
  setTimeout(keep_drawing, 1000/30.0);
}

/*********
 * Menus *
 *********/

function show_menu(m) {
  MENUS.push(m);
}

/****************
 * Global setup *
 ****************/

$(window).resize(function () {
  redraw();
});

$(window).on("load", function() {
  init();
});
