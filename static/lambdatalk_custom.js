//// LAMBDATALK's DICT is public and can be populated outside LAMBDATALK.
//// A few examples:

//// 1) TURTLE FOR SVG
LAMBDATALK.DICT['turtle'] = function () {
  var draw = function(str) { // {turtle x0 y0 a0 M100 T90 M50 T-45 ...}
    var args = str.split(' ');
    var x0 = parseFloat(args[0]),
        y0 = parseFloat(args[1]),
        a0 = parseFloat(args[2]),
        poly = [];
    poly.push( [x0, y0, a0] );
    for (var i=3; i < args.length; i++) {
      var act = args[i].charAt(0),
          val = parseFloat(args[i].substring(1));
      if (act === 'M') {
        var p = poly[poly.length-1],
            a = p[2] * Math.PI / 180.0,
            x = p[0] + val * Math.sin(a),
            y = p[1] + val * Math.cos(a);
        poly.push( [x,y,p[2]] )
      } else {
        var p = poly.pop();
        poly.push( [p[0],p[1],p[2]+val] )
      }
    }
    for (var pol = '', i=0; i < poly.length; i++)
      pol += Math.round(poly[i][0]) + ' ' +  Math.round(poly[i][1]) + ' ';
    return pol
  };
  return draw( LAMBDATALK.supertrim(arguments[0]) );
};

//// 2) LONG INTEGER

LAMBDATALK.DICT['long_add'] = function () {
  var args = LAMBDATALK.supertrim(arguments[0]).split(' '),
         a = args[0].split("").reverse(),
         b = args[1].split("").reverse(),
         n = Math.max(a.length, b.length),
         c = [],
         d = 0;
  for (var i=0; i < n; i++) {
    c[i] = (a[i] | 0) + (b[i] | 0) + d;
    if (c[i] > 9) {
      c[i] -= 10;
      d = 1;
    } else {
      d = 0;
    }
  }
  if (d === 1) c.push(1);
  return c.reverse().join('')
};

LAMBDATALK.DICT['long_mult'] = function () {
  var args = LAMBDATALK.supertrim(arguments[0]).split(' '),
         a = args[0].split("").reverse(),
         b = args[1].split("").reverse(),
         c = [];
  for ( var i1 = 0; i1 < a.length; i1++ ) {
    for ( var i2 = 0; i2 < b.length; i2++ ) {
      var j = i1 + i2;
      c[j] = a[i1] * b[i2] + (c[j] | 0);
      if ( c[j] > 9 ) {
        var f = Math.floor( c[j] / 10 );
        c[j] -= f * 10;
        c[j+1] = f + (c[j+1] | 0);
      }
    }
  }
  return c.reverse().join("")
};

//// more to see in http://lambdaway.free.fr/lambdaspeech/