/*	LAMBDATALK | copyleft_GPL alainmarty 2019 */

//// LAMBDATALK & LAMBDATANK version 2019/05/07

"use strict";

var LAMBDATALK = (function() {
  var regexp = /\{([^\s{}]*)(?:[\s]*)([^{}]*)\}/g;
  var DICT = {}, LAMB_num = 0;  // primitives, lambdas & defs
  var MACR = {}, MACR_num = 0;  // macros
  var QUOT = {}, QUOT_num = 0;  // quotes
  var PAIR = {}, PAIR_num = 0;  // pairs, lists, trees
  var ARRA = {}, ARRA_num = 0;  // arrays

// 1) MAIN FUNCTION
  var evaluate = function(s) {
    var bal = balance(s);
    if (bal.left === bal.right) {
      s = preprocessing(s);
      s = eval_specials(s,'require',eval_require);
      s = eval_specials(s,'script',eval_script);
      s = eval_specials(s,'style',eval_style);
      s = eval_specials(s,'quote',eval_quote);
      s = eval_macros(s);
      s = eval_specials(s,'let',eval_let);

      s = eval_specials(s,'lambda',eval_lambda);
      s = eval_specials(s,'if',eval_if);
      s = eval_specials(s,'def',eval_def,true);

      s = eval_forms(s);
      s = postprocessing(s);
    }
    return { val:s, bal:bal };
  };

// 2) EVAL SEQUENCES OF NESTED FORMS FROM INSIDE OUT

  var eval_forms = function(s) { // nested (first rest)
    while (s !== (s = s.replace(regexp, eval_form)));
    return s;
  };

  var eval_form = function() {
    var f = arguments[1] || "", r = arguments[2] || "";
    return DICT.hasOwnProperty(f)
      ? DICT[f].apply(null, [r]) : "[" + f + " " + r + "]";
  };

// 3) CATCH & EVAL SPECIAL FORMS

  var eval_specials = function(s,symbol,eval_symbol,flag) {
    while (s !== (s = form_replace(s, symbol, eval_symbol, flag))) ;
    return s; 
  };

  var eval_macros = function(s) {
    s = eval_specials(s,'macro',eval_macro);
    for (var key in MACR)
      s = s.replace( MACR[key].one, MACR[key].two );
    return s
  };

//// LAMBDA : {lambda {args} expression}
  var eval_lambda = function(s) { 
    s = eval_specials(s,'lambda',eval_lambda);
    var index = s.indexOf("}"),
        argStr = supertrim(s.substring(1, index)),
        args = argStr === "" ? [] : argStr.split(" "),
        body = supertrim(s.substring(index + 2)),
        name = "_LAMB_" + LAMB_num++;
    DICT[name] = function() {
      var valStr = supertrim(arguments[0]),
          vals = valStr === "" ? [] : valStr.split(" "),
          bod = body;
      if (vals.length < args.length) {          // 1) partial call
          for (var i = 0; i < vals.length; i++)
            bod = bod.replace(RegExp(args[i], "g"), vals[i]);
          var _args_ = args.slice(vals.length).join(" ");
          bod = eval_lambda("{" + _args_ + "} " + bod);
      } else if (vals.length === args.length) { // 2) total call
          for (var i=0; i < args.length; i++)
            bod = bod.replace( RegExp(args[i], "g"), vals[i] );
      } else {          // 3) extra are gathered in the last one
          var _vals_ = vals.slice(0,args.length);
          _vals_[args.length-1] = vals.slice(args.length-1,vals.length).join(' ');
          for (var i=0; i < args.length; i++)
            bod = bod.replace( RegExp(args[i], "g"), _vals_[i] ); 
      }
      bod = eval_specials(bod,'if',eval_if);
      return eval_forms(bod);
    };
    return name;
  };

//// DEF : {def name expression}
  var eval_def = function(s, flag) { 
    s = eval_specials(s,'def',eval_def,false);
    var index = s.search(/\s/);
    var name = s.substring(0, index).trim();
    var body = s.substring(index).trim();
    if (body.substring(0, 6) === "_LAMB_") {
      DICT[name] = DICT[body];
    } else {
      body = eval_forms(body);
      DICT[name] = function() {
        return body;
      };
    }
    return flag ? name : "";
  };

//// IF : {if bool then one else two}
  var eval_if = function(s) {
    s = eval_specials(s,'if',eval_if);
    var index1 = s.indexOf( 'then' ),
        index2 = s.indexOf( 'else' ),
        bool   = s.substring(0,index1).trim(),
        one    = s.substring(index1+5,index2).trim(),
        two    = s.substring(index2+5).trim(); 
    return (eval_forms(bool) === 'true')? one : two
  };

//// LET : (let ( (arg val) ...) body) -> ((lambda (args) body) vals) 
  var eval_let = function(s) {
    s = eval_specials(s,'let',eval_let);
    s = supertrim(s);
    var varvals = catch_form("{", s);
    var body = supertrim(s.replace(varvals, ""));
    varvals = varvals.substring(1, varvals.length - 1);
    var avv = [], i = 0;
    while (true) {
      avv[i] = catch_form("{", varvals);
      if (avv[i] === "none") break;
      varvals = varvals.replace(avv[i], "");
      i++;
    }
    for (var one = "", two = "", i = 0; i < avv.length - 1; i++) {
      var index = avv[i].indexOf(" ");
      one += avv[i].substring(1, index) + " ";
      two += avv[i].substring(index + 1, avv[i].length - 1) + " ";
    }
    return "{{lambda {" + one + "} " + body + "} " + two + "}";
//    var foo = eval_lambda( "{" + one + "} " + body );
//    return eval_forms( "{" + foo + " " + two + "}" );
  };

//// QUOTE : {quote ...} or '{...} -> _QUOT_xxx
  var eval_quote = function(s) { // (quote expressions)
    return quote(s);
  };

//// SCRIPT : {script JS code}
var eval_script = function (s) {    // some JS code
  var js = document.createElement('script');
  js.innerHTML = s; // unquote( s );
  document.head.appendChild( js );
  // document.head.removeChild( js ); // maybe not
  // console.log( '[ok script]' );
  return ''
};

//// STYLE : {style CSS rules}
var eval_style = function (s) {    // some CSS code
  var cs = document.createElement('style');
  cs.innerHTML = s; // unquote( s );
  document.head.appendChild( cs );
  // document.head.removeChild( cs ); // don't do that !
  // console.log( '[ok style]' );
  return ''
};

//// MACRO : {macro reg-exp to LAMBDATALK-exp}
var eval_macro = function(s) {
  var index = s.indexOf('to'),
      one = supertrim(s.substring(0, index)),
      two = supertrim(s.substring(index+2));
  one = RegExp( one, 'g' );
  two = two.replace( /€/g, '$' ); // because of PHP conflicts with $
  var name = '_MACR_' + MACR_num++;
  MACR[name] = {one:one, two:two };
  return '';
};

//// REQUIRE : {require lib_1 lib_2 ...}
var LIBS;   // initially undefined

var eval_require = function(s) { 
  if (LIBS !== undefined) return '';
  var WAIT = "<div style='font-size:2.0em; text-align:center; color:red;'>"
           + "Loading libraries...</div>"; 
  LAMBDATANK.display_update( WAIT );
  s = preprocessing( s );
  var libs = s.split(' ');  
  for (var i=0; i < libs.length; i++) {
    var x = new XMLHttpRequest();
    x.open('GET', 'pages/' + libs[i] + '.txt', false);  // false -> lock
    x.onreadystatechange = function () { 
      if (x.readyState == 4) {
        console.log( libs[i] + ': ' + x.statusText );
        if (x.status === 200) 
          LIBS += decodeHtmlEntity( x.responseText )
      }
    };
    x.send(null);   
  }
  console.log( 'libraries loaded' );
  // now unlocked and return libraries in a hidden container
  return "{{hide} " + LIBS + "}"
};

//// 4) PREPROCESSING / POSTPROCESSING
var preprocessing = function(s) {
    LAMB_num = 0;
    QUOT_num = 0;
    ARRA_num = 0;
    PAIR_num = 0;
    MACR_num = 0;
    s = comments( s );
    s = block2quote( s );
    s = HTML_macros( s );
    s = apo2quote( s );
    return s;
};

var postprocessing = function(s) {
    s = s.replace(/(_QUOT_\d+)/g, unquote);
    s = s.replace(/(_ARRA_\d+)/g, array_display);
    s = s.replace(/(_PAIR_\d+)/g, pair_display);
    s = syntax_highlight( s );
    LAMB_num = 0;
    QUOT_num = 0;
    ARRA_num = 0;
    PAIR_num = 0;
    MACR_num = 0;
    return s;
};

//// 5) HELPER FUNCTIONS 

//// while (s !== (s = form_replace(s, "sym",  eval_sym))) ;
var form_replace = function(str, symbol, func, flag) {
    symbol = "{" + symbol + " ";
    var s = catch_form(symbol, str);
    return s === "none" ? str : str.replace(symbol + s + "}", func(s, flag));
};
var catch_form = function(symbol, str) {
    var start = str.indexOf(symbol);
    if (start == -1) return "none";
    var d1, d2;
    if (symbol === "{") { // {:x v} in let
      d1 = 0; d2 = 1;
    } else {              // {symbol ...}
      d1 = symbol.length; d2 = 0;
    }
    var nb = 1, index = start;
    while (nb > 0) {
      index++;
      if (str.charAt(index) == "{") nb++;
      else if (str.charAt(index) == "}") nb--;
    }
    return str.substring(start + d1, index + d2);
};
var balance = function(s) {
    var strt = s.match(/\{/g),
        stop = s.match(/\}/g);
    strt = strt ? strt.length : 0;
    stop = stop ? stop.length : 0;
    return { left: strt, right: stop };
  };
var supertrim = function(s) {
    return s.trim().replace(/\s+/g, " ");
};
var quote = function(s) { // (quote x) -> _QUOT_n
    var name = "_QUOT_" + QUOT_num++;
    QUOT[name] = s;
    return name;
};
var unquote = function(s) { // _QUOT_n -> x
    var ss = QUOT[s]; //
    if (ss === '') return; 
    return ss.charAt(0) !== "_"
      ? ss                                // from (quote x)
      : "{" + ss.substring(1) + "}";      // from '(x)
};

var comments = function (s) {
  s = s.trim()
       .replace( /°°°[\s\S]*?°°°/g, '' )  // delete multiline comments
       .replace( /;;(.*?)\n/g, '\n' );    // delete one line comments
  return s;
};
var block2quote = function ( str ) {      // °° some text °° -> _QUOT_xxx
  var tab = str.match( /°°[\s\S]*?°°/g );
  if (tab == null) return str;
  for (var i=0; i< tab.length; i++) {
    var temp = tab[i];
    temp = temp.replace( /°°/g, '' );
    temp = quote(temp);
    str = str.replace( tab[i], temp );
  }
  return str;
};
var apo2quote = function (s) {  // '{x} -> {quote _x}
  return s.replace(/'\{/g, "{quote _");   //'
};
var HTML_macros = function(s) {
  s += '\n'; // add a CR at the end for "closing" a final alternate form  
  s = s.replace( /_h([1-6]) (.*?)\n/g, '{h$1 $2}' )      // titles
       .replace( /_p (.*?)\n/g, '{p $1}' )               // paragraphs
       .replace( /_ul(\w*?) ([^\n]*?)\n/g,               // ul
            '{div {@ style="margin-left:{+ 20 $1}px; padding:0"}• $2}' )
       .replace( /_img (.*?)\n/g, '{img {@ src="$1"  width="100%"}}' )
       .replace( /\[\[([^\[\]\|]*?)\]\]/g, '{a {@ href="?view=$1"}$1}' )
       .replace( /\[\[([^\|]*?)\|([^\[\]]*?)\]\]/g, '{a {@ href="$2"}$1}' );
  return s;
};
var decodeHtmlEntity = function(str) {
  // https://gist.github.com/CatTail/4174511
  return str.replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  });
};
var array_display = function(str) { // _ARRA_xxx -> [a,b,c,d]
  str = str.replace( /_ARRA_\d+/g, 
    function(v) { return eval_forms( '{#.disp ' + v + '}' ) });
  return str;
};
var pair_display = function(str) {  // _PAIR_xxx -> ((a b) (c d))
  str = str.replace( /_PAIR_\d+/g, 
    function(v) { return eval_forms( '{pair.disp ' + v + '}' ) });
  return str;
};
var syntax_highlight = function( str ) { // highlight {} and special forms 
  str = str.replace( 
     /\{(lambda |def |if |let |quote |macro |script |style |macro |require)/g,
     '<span style="color:#f00;">{$1</span>' )
           .replace( /(\{|\})/g, '<span style="color:#888">$1</span>' );
  return str;
};

//// END OF THE LAMBDATALK'S KERNEL

//// 6) START DICTIONARY
//   can always be populated outside the LAMBDATALK function

DICT["lib"] = function() {
    var str = "",
      index = 0;
    for (var key in DICT) {
      if (DICT.hasOwnProperty(key) 
          && key.substring(0, 6) !== "_LAMB_") {
        str += key + ", ";
        index++;
      }
    }
    return "DICT: [" + index + "] [" + str.substring(0, str.length - 2) + "]";
};

//// STRINGS

DICT["equal?"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    return a[0] === a[1];
};
DICT['empty?'] = function() { // {empty? string}
  var args = supertrim(arguments[0]);
  return (args === ''); 
};
DICT['chars'] = function() { // {chars some text}
  var args = arguments[0].trim();
  return args.length; 
};
DICT['charAt'] = function() { // {charAt i some text}
  var args = supertrim(arguments[0]).split(' '), // ["i","some","text"]
      i = args.shift(),
      s = args.join(' ');
  return s.charAt(parseInt(i)); 
};
DICT['substring'] = function() { // {substring i0 i1 some text}
  var args = supertrim(arguments[0]).split(' '), // ["i0","i1","some","text"]
      i0 = parseInt(args.shift()),
      i1 = parseInt(args.shift()),
      s  = args.join(' ');
  return s.substring(i0,i1); 
};
DICT['length'] = function () { // {length a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args.length;
};
DICT['first'] = function () { // {first a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[0];
};
DICT['rest'] = function () { // {rest a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args.slice(1).join(' ');
};
DICT['last'] = function () { // {last a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[args.length-1];
};
DICT['nth'] = function () { // {nth n a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[args.shift()];
};
DICT['replace'] = function () { // {replace one by two in text}
  var str = supertrim(arguments[0]); // one by two in text
  var index = str.indexOf('by');
  var one = str.substring(0,index).trim();
  str = str.substring(index+2).trim();
  index = str.indexOf('in');
  var two = str.substring(0,index).trim().replace(/€/g,'$');
  two = (two !== 'space')? two : ' ';
  str = str.substring(index+2).trim();
  str = str.replace( RegExp(one,'g'), two );
  return str;
};

//// LOCALSTORAGE

DICT["localStorage.display"] = function() {
    var str = "",
      index = 0;
    for (var key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        str += key + "\n";
        index++;
      }
    }
    str = "localStorage: " + index + " items\n[\n" 
        + str.substring(0, str.length - 1) + '\n]';
    return str;
};
DICT["localStorage.removeItem"] = function() {
    var a = arguments[0].trim();
    localStorage.removeItem( 'ls_' + a )
    return a + ' is removed'
};
DICT["localStorage.getItem"] = function() {
    var a = arguments[0].trim();
    return localStorage.getItem( 'ls_' + a );
};
DICT["localStorage.clear"] = function() {
    localStorage.clear();
    return ''
};

//// MATHS

DICT["+"] = function() {
    var a = supertrim(arguments[0]).split(" "), r;
    if (a.length === 0)
      r = 0;
    else if (a.length === 1)
      r = a[0];
    else if (a.length === 2)
      r = Number(a[0]) + Number(a[1]);
    else
      for (var r = 0, i = 0; i < a.length; i++)
        r += Number(a[i]);
    return r;
};
DICT["*"] = function() {
    var a = supertrim(arguments[0]).split(" "), r;
    if (a.length === 0)
      r = 1;
    else if (a.length === 1)
      r = a[0];
    else if (a.length === 2)
      r = a[0] * a[1];
    else
      for (var r = 1, i = 0; i < a.length; i++)
        r *= a[i];
    return r;
};
DICT["-"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var r = a[0];
    if (a.length === 1) {
      r = -r;
    } else {
      for (var i = 1; i < a.length; i++)
        r -= a[i];
    }
    return r;
};
DICT["/"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var r = a[0];
    if (a.length === 1) {
      r = 1 / r;
    } else {
      for (var i = 1; i < a.length; i++)
        r /= a[i];
    }
    return r;
};
DICT["%"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    return Number(a[0]) % Number(a[1]);
};

DICT["<"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var x = Number(a[0]),
        y = Number(a[1]);
    return (x < y) ? "true" : "false";
};
DICT[">"] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var x = Number(a[0]),
        y = Number(a[1]);
    return (x > y) ? "true" : "false";
};
DICT["<="] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var x = Number(a[0]),
        y = Number(a[1]);
    return (x <= y) ? "true" : "false";
};
DICT[">="] = function() {
    var a = supertrim(arguments[0]).split(" ");
    var x = Number(a[0]),
        y = Number(a[1]);
    return (x >= y) ? "true" : "false";
};
DICT['='] = function() {      // {= one two}
  var a = supertrim(arguments[0]).split(' '),
      x = Number(a[0]), 
      y = Number(a[1]); 
  return (!(x < y) && !(y < x))? 'true' : 'false';  
};

DICT['not'] = function () { 
  var a = supertrim(arguments[0]); 
  return (a === 'true')? 'false' : 'true';
};
DICT['or'] = function () {
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret=false, i=0; i< terms.length; i++)
    if (terms[i] === 'true')
      return 'true';
  return ret;
};
DICT['and'] = function () { // (and (= 1 1) (= 1 2)) -> false 
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret=true, i=0; i< terms.length; i++)
    if (terms[i] === 'false')
      return 'false';
  return ret;
};
var mathtags = [ "abs", "acos", "asin", "atan", "ceil", "cos", "exp", "floor", "pow", "log", "random", "round", "sin", "sqrt", "tan", "min", "max" ];
for (var i = 0; i < mathtags.length; i++) {
    DICT[mathtags[i]] = (function(tag) {
      return function() {
        return tag.apply(null, supertrim(arguments[0]).split(" "));
      };
    })(Math[mathtags[i]]);
}
DICT["PI"] = function() {
    return Math.PI;
};
DICT["E"] = function() {
    return Math.E;
};
DICT['date'] = function () { 
    var now = new Date();
    var year    = now.getFullYear(), 
        month   = now.getMonth() + 1, 
        day     = now.getDate(),
        hours   = now.getHours(), 
        minutes = now.getMinutes(), 
        seconds = now.getSeconds();
    if (month<10) month = '0' + month;
    if (day<10) day = '0' + day;
    if (hours<10) hours = '0' + hours;
    if (minutes<10) minutes = '0' + minutes;
    if (seconds<10) seconds = '0' + seconds;
    return year+' '+month+' '+day+' '+hours+' '+minutes+' '+seconds;
};  

////

DICT['serie'] = function () { // {serie start end [step]}
  var args = supertrim(arguments[0]).split(' ');
  var start = parseFloat( args[0] ),
      end   = parseFloat( args[1] ),
      step  = parseFloat( args[2] || 1),
      str   = '';
  if (step == 0) return start;  
  step = Math.abs(step);
  if (start < end)
    for (var i=start; i<=end; i+= step) { str += i + ' '; }
  else if (start > end)
    for (var i=start; i>=end; i-= step) { str += i + ' '; }
  return str.substring(0, str.length-1);
};
DICT['map'] = function () { // {map func serie}
  var args = supertrim(arguments[0]).split(' ');
  var func = args.shift(); 
  var str = '';
  if (DICT[func] !== undefined) {
    for (var i=0; i< args.length; i++)
      str += DICT[func].call( null, args[i] ) + ' ';
  }
  return str.substring(0, str.length-1);
};
DICT['reduce'] = function () { // {reduce *userfunc* serie}
  var args = supertrim(arguments[0]).split(' ');
  var func = args.shift();
  var res = '{{' + func + ' ' + args[0] + '}';
  for (var i=1; i< args.length-1; i++)
    res = '{' + func + ' ' + res + ' ' + args[i] + '}';
  res += ' ' + args[args.length-1] + '}';
  return eval_forms(res);
};

//// ARRAYS (with list-like functions)
// following: https://developer.mozilla.org/fr/
//            docs/Web/JavaScript/Reference/Objets_globaux/Array

DICT['#.new'] = function () { // {array.new 12 34 56} -> [12,34,56]
  var args = supertrim(arguments[0]);
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = (args != '')? args.split(' ') : [];
  return name;
};
var isARRA = function (z) {
  return (z !== '' && z.substring(0,6) === '_ARRA_') 
};
DICT['#.disp'] = function () { // {array.disp z} or {z}
  var args = arguments[0].trim(), str = ''; 
  var rdisp = function( a ) {
    for (var i=0; i<ARRA[a].length; i++) {
      if (isARRA(ARRA[a][i])) {
        str += '[';
        rdisp( ARRA[a][i] );
        str = str.substring(0, str.length-1) + '],';
      } else
        str += ARRA[a][i] + ',';
    }
    return str.substring(0, str.length-1) ;
  };
  return (isARRA(args))? '[' + rdisp( args ) + ']' : args;
};
DICT['#.join'] = function () {    // {#.join _ARRA_n}
  var args = arguments[0].trim();
  return ARRA[args].join('')
};
DICT['#.split'] = function () {   // {#.split string}
  var args = arguments[0].trim();
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = args.split('');
  return name;
};
DICT['#.array?'] = function () { // {#.array? z}
  var args = arguments[0].trim();
  //return (isARRA(args))? 'left' : 'right';
  return (isARRA(args));
};
DICT['#.null?'] = function () { // {#.null z}
  var args = arguments[0].trim();
  //return (ARRA[args][0] === undefined)? 'left' : 'right';
  if (ARRA[args] === undefined) return true;
  return (ARRA[args][0] === undefined);
};
DICT['#.empty?'] = function () { // {#.empty z}
  var args = arguments[0].trim();
  //return (ARRA[args].length < 1)? 'left' : 'right';
  return (ARRA[args].length < 1);
};
DICT['#.in?'] = function() { // {#.in? :a :v}
  var args = supertrim(arguments[0]).split(' ');
  //return (ARRA[args[0]].lastIndexOf(args[1]) !==-1)? 'left' : 'right';
  return (ARRA[args[0]].lastIndexOf(args[1]) !==-1);
};
DICT['#.length'] = function () { // {#.length z}
  var args = arguments[0].trim(); // z
  return (isARRA(args))? ARRA[args].length : 0;
};
DICT['#.get'] = function () { // {#.item z i}
  var args = supertrim(arguments[0]).split(' '); // [z,i]
  return (isARRA(args[0]))? ARRA[args[0]][args[1]] : args[0];
};
DICT['#.first'] = function () { // {#.first z}
  var args = arguments[0].trim(); // z
  return ARRA[args][0];
};
DICT['#.last'] = function () { // {#.last z}
  var args = arguments[0].trim(); // z
  return ARRA[args][ARRA[args].length-1];
};
DICT['#.rest'] = function () { // {#.rest z}
  var args = arguments[0].trim(); // z
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args].slice(1); // a new one
  return name;
};
DICT['#.slice'] = function () { // {#.slice z i0 i1}
  var args = supertrim(arguments[0]).split(' '); // [z,i0,i1]
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].slice(args[1],args[2]); // a new one
  return name;
};
DICT['#.duplicate'] = function () { // {#.slice z}
  var args = supertrim(arguments[0]).split(' ');
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].slice(); // a new one
  return name;
};
DICT['#.reverse'] = function () { // {#.reverse z}
  var args = supertrim(arguments[0]).split(' ');
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].slice().reverse(); // a new one
  return name;
};
DICT['#.concat'] = function () { // {#.concat z1 z2}
  var args = supertrim(arguments[0]).split(' '); // [z1,z2]
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].concat(ARRA[args[1]]); // a new one
  return name;
};

///// side effects, the input array is modified

DICT['#.set!'] = function () { // {#.set! z i val}
  var args = supertrim(arguments[0]).split(' '); // [z,i,val]
  ARRA[args[0]][args[1]] = args[2];
  return args[0];
};
DICT['#.push!'] = 
DICT['#.addlast!'] = function () { // {#.push! z val}
  var args = supertrim(arguments[0]).split(' '); // [z,val]
  ARRA[args[0]].push( args[1] );
  return args[0];
};
DICT['#.pop!'] = 
DICT['#.sublast!'] = function () { // {#.pop! z}
  var args = arguments[0].trim(); // z
  ARRA[args].pop();
  return args;
};
DICT['#.unshift!'] =
DICT['#.addfirst!'] = function () { // {#.unshift! z val}
  var args = arguments[0].trim().split(' '); // [z,val]
  ARRA[args[0]].unshift( args[1] );
  return args[0];
};
DICT['#.shift!'] =
DICT['#.subfirst!'] = function () { // {#.shift! z}
  var args = supertrim(arguments[0]);
  ARRA[args].shift();
  return args;
};
DICT['#.reverse!'] = function () { // {#.reverse! z}
  var args = supertrim(arguments[0]);
  ARRA[args].reverse();
  return args;
};
DICT['#.sort!'] = function () { // {#.sort! comp z }
  var args = supertrim(arguments[0]).split(' ');
  if (args[0] === '<') 
     ARRA[args[1]].sort( function(a,b) { return a - b } );
  else
     ARRA[args[1]].sort( function(a,b) { return b - a } );
  return args[1];
};

// waiting for: includes indexOf join lastIndexOf toString splice! copyWithin! fill!

//// PAIRS  
//   use arrays extended with list-like functions
//   if needed they can be defined as user functions

DICT['cons'] =    // added for historic reasons
DICT['pair'] = function () { // {pair 12 34}
  var a = supertrim(arguments[0]).split(' '); // [12,34]
  var name = '_PAIR_' + PAIR_num++;
  PAIR[name] = a;
  return name; 
};
var ispair = function(s) {
  return (s !== '' && s.substring(0,6) === '_PAIR_') 
};
DICT['pair?'] = function () { // {pair? xx}
  var a = arguments[0].trim(); // xx
  //return (ispair(a))? 'left' : 'right'; 
  return (ispair(a)); 
};
DICT['nil?'] = function () { // {nil? xx}
  var a = arguments[0].trim(); // xx
  //return (a === 'nil')? 'left' : 'right'; 
  return (a === 'nil'); 
};
DICT['car'] =           // added for historic reasons
DICT['list.first'] =    // added for consistance with lists
DICT['left'] = function () { // {left _PAIR_n}
  var a = arguments[0].trim(); // _PAIR_n
  return (ispair(a))? PAIR[a][0] : a;
};
DICT['cdr'] =          // added for historic reasons
DICT['list.rest'] =    // added for consistance with lists
DICT['right'] =  function () { // {right _PAIR_n}
  var a = arguments[0].trim(); // _PAIR_n
  return (ispair(a))? PAIR[a][1] : a; 
};
DICT['pair.disp'] = function () { 
// {cons {cons 12 34} {cons 56 78}}            -> ((12 34) (56 78))
// {cons 12 {cons 34 {cons 56 {cons 78 nil}}}} -> (12 (34 (56 (78 nil))))
  var recur = function (z) {
    return ( ispair(z) )?  
       '(' + recur( PAIR[z][0] ) + ' ' + recur( PAIR[z][1] ) + ')' : z;
  };
  var z = arguments[0];
  return ( ispair(z) )? recur( z ) : z;
};
DICT['list.new'] = function () { // {list.new 12 34 56 78 90}
  var recur = function (arr) {
    return (arr.length > 0)?
       '{pair ' + arr.shift() + ' ' + recur( arr ) + '}' : 'nil';
  };
  var args = supertrim(arguments[0]);
  if (args === '') return 'nil';
  return recur( args.split(' ') )
};
DICT['list.disp'] = function () {  // {list.disp 12 34 56} -> 12 34 56
  var recur = function (z) {
    return (z !== 'nil')? PAIR[z][0] + ' ' + recur( PAIR[z][1] ) : '';
  };
  var z = arguments[0].trim();
  return (ispair(z))? recur( z ) : z;
};
DICT['list.null?'] = function () { // equivalent to {equal? z nil}
  var z = arguments[0];
  return (z === 'nil' || z === '()') ? 'true' : 'false'
};
DICT['list.length'] = function () {
  var z = arguments[0];
  var recur = function (z,n) {
    return (z !== 'nil')? recur(PAIR[z][1], n+1) : n;
  };
  return ( ispair(z) )? recur(z,0) : 0;
};
DICT['list.reverse'] = function () {
  var z = arguments[0];
  var recur = function (z,r) {
   return (z === 'nil')? r : recur(PAIR[z][1],
       '{cons ' + PAIR[z][0] + ' ' + r +'}' );
  };
  return (z !== 'nil')? recur(z, 'nil') : 'nil';
};
DICT['list.first'] = function () {
  var z = arguments[0];
  return ( ispair(z) )? PAIR[z][0] : z; 
};
DICT['list.butfirst'] = function () {
  var z = arguments[0];
  return ( ispair(z) )? PAIR[z][1] : z; 
};
DICT['list.last'] = function () {
  var recur = function (z) {
    return (PAIR[z][1] === 'nil')? PAIR[z][0] : recur( PAIR[z][1] );
  };
  var z = arguments[0];
  return ( ispair(z) )? recur( z.split(' ') ) : z;
};
DICT['list.butlast'] = function () {
  var z = arguments[0];
  return ( ispair(z) )? z : z;  // Wait ...
};

//// HTML

  var htmltags = [ 'div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'u', 'center', 'br', 'hr', 'blockquote', 'del', 'sup', 'sub', 'code', 'img', 'pre', 'textarea', 'audio', 'video', 'source', 'select', 'option', 'object', 'canvas', 'svg', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'path', 'text', 'g', 'mpath', 'use', 'textPath', 'pattern', 'image', 'clipPath', 'defs', 'animate', 'set', 'animateMotion', 'animateTransform', 'title', 'desc' ];

DICT['@'] = function() { return '@@' + supertrim( arguments[0] ) + '@@' };

for (var i=0; i< htmltags.length; i++) {
  DICT[htmltags[i]] = function(tag) {
    return function() {
      var args = arguments[0].trim(); // save spaces for pre
      var attr = args.match( /@@[\s\S]*?@@/ ); 
      if (attr == null) {
        return '<'+tag+'>'+args+'</'+tag+'>';
      } else {
        args = args.replace( attr[0], '' ).trim();
        attr = attr[0].replace(/^@@/, '').replace(/@@$/, '');
        return '<'+tag+' '+attr+'>'+args+'</'+tag+'>';
      }
    }
  }(htmltags[i]);      
}

DICT['input'] = function () {
  // {input {@ type="a_type" value="val" onevent=" quote(JS) "}}
  var args = arguments[0]; 
  if (args.match( 'http://' )) // try to prevent cross_scripting
    return 'Sorry, external sources are not authorized in inputs!';
  if (args.match( /type\s*=\s*("|')\s*file\s*("|')/ ))
    return 'Sorry, type="file" is not allowed';
  var attr = args.match( /@@[\s\S]*?@@/ ); // any whitespace or not -> all
  if (attr == null) return 'ooops';
  attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attributes
  return '<input ' + attr + ' />';
};
DICT['iframe'] = function() { // {iframe {@ src=".." height=".." width=".."}}
  var args = arguments[0];
  // comment the two following lines to allow external scripts 
  if (args.match( 'http://' )) // against cross_scripting but not https://
    return 'Sorry, external sources are not authorized in iframes!';
  var attr = args.match( /@@[\s\S]*?@@/ ); 
  if (attr == null)  return 'oops';
  attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attr
  return '<iframe ' + attr + ' ></iframe>';
}; 
DICT['hide'] = function () { // {hide}
  return eval_forms( 'div {@ style="display:none;"}' );
};
DICT['prewrap'] = function () { // {prewrap ...}
  var args = arguments[0];
  return '{pre {@ style="word-wrap: break-word; white-space:pre-wrap;"}' + args + '}'
};

//// END DICTIONARY populated inside LAMBDATALK

  return {
    evaluate: evaluate,
    eval_forms:eval_forms,
    balance:balance,
    form_replace:form_replace,
    catch_form:catch_form,
    DICT:DICT,            // DICT is public -> caution!
    supertrim: supertrim,
    quote:quote,
    unquote:unquote
  };

})(); // end LAMBDATALK

//// DICT is public and can be populated outside LAMBDATALK

//// TURTLE FOR SVG
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

//// BIG NUMBER  https://rosettacode.org/wiki/Long_multiplication#JavaScript

LAMBDATALK.DICT['long_mult'] = function () {
  var args = LAMBDATALK.supertrim(arguments[0]).split(' ');
  var n1 = args[0], n2 = args[1];
  var a1 = n1.split("").reverse();
  var a2 = n2.split("").reverse();
  var a3 = [];
  for ( var i1 = 0; i1 < a1.length; i1++ ) {
    for ( var i2 = 0; i2 < a2.length; i2++ ) {
      var id = i1 + i2;
      var foo = (id >= a3.length)? 0 : a3[id];
      a3[id] = a1[i1] * a2[i2] + foo;
      if ( a3[id] > 9 ) {
        var carry = (id + 1 >= a3.length)? 0 : a3[id + 1];
        a3[id + 1] = Math.floor( a3[id] / 10 ) + carry;
        a3[id] -= Math.floor( a3[id] / 10 ) * 10;
      }
    }
  }
  return a3.reverse().join("");
};

// DRAG is used to move any div via {drag}
// DRAG is also used to move the wiki's page_view and editor_frame 

var DRAG = (function() {
// CAUTION : div parent must have a defined position, top and left
// draging editor, view frames and also divs via {drag}
var beginDrag = function ( elementToDrag, event ) {
  var x, y, ymin = 20;
  if( window.getComputedStyle ) { 
    x = parseInt( window.getComputedStyle(elementToDrag,null).left ); 
    y = parseInt( window.getComputedStyle(elementToDrag,null).top );
  } else if( elementToDrag.currentStyle ) { 
    x = parseInt( elementToDrag.currentStyle.left );
    y = parseInt( elementToDrag.currentStyle.top );
  }  
  var deltaX = event.clientX - x;
  var deltaY = event.clientY - y;
  document.addEventListener( "mousemove", moveHandler, true );
  document.addEventListener( "mouseup", upHandler, true );
  event.stopPropagation();
  event.preventDefault();

  function moveHandler ( event ) {
    x = event.clientX;
    y = event.clientY; if (y < ymin) y = ymin;  // top window < ymin  
    elementToDrag.style.left = (x - deltaX) + "px";
    elementToDrag.style.top  = (y - deltaY) + "px";
    event.stopPropagation();
  }
  function upHandler ( event ) {
    document.removeEventListener( "mouseup", upHandler, true );
    document.removeEventListener( "mousemove", moveHandler, true );
    event.stopPropagation();
  }
};
var drag = function() {    // {drag}
  return '<div style="cursor:move; background:red; width:10px; height:10px; line-height:20px; border:1px solid black;" onmousedown="DRAG.beginDrag( this.parentNode, event );">&nbsp;</div>';
};
return { beginDrag:beginDrag, drag:drag }
})();

LAMBDATALK.DICT['drag'] = function () { return DRAG.drag() };

////////////////////////////////////////////////////////////////////

////  LAMBDATALK can be called in a console
/* 
    Use a simple HTML file must contain these three containers:
1)  <textarea id="page_textarea" onkeyup="display_update()"> </textarea>
2)  <div id="page_infos"></div>
3)  <div id="page_view"></div>
*/

var display_update = function() {
  var t0 = new Date().getTime(),
      code = document.getElementById('page_textarea').value,
      result = LAMBDATALK.evaluate( code ),  // {val,bal}
      time = new Date().getTime() - t0;
  document.getElementById('page_infos').innerHTML = 
    '{' + result.bal.left + ':' + result.bal.right  + '} ' + time + 'ms';           
  if (result.bal.left === result.bal.right)
     document.getElementById('page_content').innerHTML = result.val ;
};

//// LAMBDATALK can be called in a wiki called LAMBDATANK

var LAMBDATANK = (function() {

var TIMEOUT = null, DELAY = 250, LOCK = false;

var update = function( flag ) {
  if (LOCK) return;
  if (flag) {  // from onload called by setTimeout
    do_update();
  } else {     // from keyboard
    clearTimeout( TIMEOUT );
    TIMEOUT = setTimeout( do_update, DELAY );
  }
};
var do_update = function() { 
  var ID = getId('page_textarea');
  if (ID === null)  {
    console.log( 'page_textarea does not exist' );
    return; 
  }
  var code = ID.value;
  if (code === '') {
     var pagename = get_pagename().split('::');
     var wiki = pagename[0], name = pagename[1];
     name = (name !== '_')? name : 'start';
     code = ' {p It\'s a new page of "{b ' + wiki 
          + '}". Please click on "{b ' + name + '}" and edit.} ';
  }
  display_update( code );
};
var display_update = function(code) {
  var t0 = new Date().getTime();
  var result = LAMBDATALK.evaluate( code );  // {val,bal}
  var time = new Date().getTime() - t0;
  getId('page_infos').innerHTML = 
    '{' + result.bal.left + ':' + result.bal.right  + '} ' + time + 'ms';           
  if (result.bal.left === result.bal.right)
     getId('page_content').innerHTML = result.val ;
};

var toggle_lock = function(id) {
   LOCK = !LOCK;
   id.value = (LOCK)? "unlock" : "lock";
   if (!LOCK) do_update();
   return ''
};
var getId = function(id) {
  return document.getElementById(id); 
};
var toggle_display = function ( id ) {
  getId(id).style.display = 
    (getId(id).style.display == "block") ? "none" : "block";
};
var toggle_visibility = function ( id ) {
  var OK = (getId(id).style.visibility == "visible");
  getId(id).style.visibility = (OK)? "hidden" : "visible";
};
var get_pagename = function() {  
  var titre = window.document.title; // LAMBDATALK :: pagename
  return titre.replace(/\s/g,'');    // LAMBDATALK::pagename
};

return {
  update:update,
  display_update:display_update,
  toggle_display:toggle_display,
  toggle_visibility:toggle_visibility,
  getId:getId,
  toggle_lock:toggle_lock
}
})();  // end LAMBDATANK

// setTimeout( LAMBDATANK.update, 10, true );  // or called in body onload
