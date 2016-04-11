// LAMBDAWAY | © alain marty | 2016/04/05

var LAMBDATALK = (function() {

// 1) MAIN FUNCTION
var eval = function( str ) {
  var t0 = new Date().getTime();
  str = preprocessing(str);
  var bal = balance( str );
  if (bal.left === bal.right) {
    str = eval_special_forms(str);
    str = eval_forms(str);
    str = postprocessing(str);
  } else 
    str = 'none';
  var t1 = new Date().getTime();
  return {val:str, bal:bal, time:t1-t0};
};

// 2) EVALUATIONS 
var eval_special_forms = function(str) {
    str = eval_apos(str);
    str = eval_quotes(str);
    str = eval_ifs(str);
    str = eval_lets(str);
    str = eval_lambdas(str);
    str = eval_defs(str);
  return str;
};
var eval_forms = function( str ) {  // (public)
  var loop_rex = /\{([^\s{}]*)(?:[\s]*)([^{}]*)\}/g, // regexp window
      index = 0, trace = 'TRACE\n';
  while (str != (str = str.replace( loop_rex, eval_leaf)))
    if (g_debug) trace += index++ + ': ' + str + '\n';
  if (g_debug) console.log( trace );
  return str;
};
var eval_apos = function(str) {
  while ( str !== ( str = apo_replace(str, "'{", eval_apo ))) ;
  return str
};
var eval_quotes = function(str) {
  while ( str !== ( str = form_replace(str, '{quote ', eval_quote ))) ;
  return str
};
var eval_ifs = function(str) {
  while ( str !== ( str = form_replace( str, '{if ', eval_if ))) ;
  return str
};
var eval_lambdas = function(str) {
  while ( str !== ( str = form_replace( str, '{lambda ', eval_lambda ))) ;
  return str
};
var eval_defs = function(str, flag) {
  while ( str !== ( str = form_replace( str, '{def ', eval_def, flag ))) ;
  return str
};
var eval_lets = function(str, flag) {
  while ( str !== ( str = form_replace( str, '{let ', eval_let ))) ;
  return str
};

var eval_leaf = function() {
  var f = arguments[1] || '', r = arguments[2] || '';
  return (dict.hasOwnProperty(f))?
    dict[f].apply(null, [r]) : '('+f+' '+r+')' 
};
var eval_apo = function(s){
  s = eval_apos(s);
  return quote(s);
};
var eval_quote = function(s){
  s = eval_quotes(s);
  return quote(s);
};
var eval_if = function(s){
  s = eval_ifs( s );
  return '{when ' + quote(s) + '}'
};
var eval_lambda = function(s){  // side effect on g_lambda_num
  s = eval_lambdas( s );
  var index = s.indexOf('}'),
      args = supertrim(s.substring(1, index)).split(' '),
      body = s.substring(index+2).trim(),
      name = 'lambda_' + g_lambda_num++; // see HELPER FUNCTIONS
  for (var reg_args=[], i=0; i < args.length; i++)
    reg_args[i] = RegExp( args[i], 'g');
  dict[name] = function() {
    var vals = supertrim(arguments[0]).split(' ');
    return function(bod) {
      if (vals.length < args.length) {
        for (var i=0; i < vals.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
        var _args = args.slice(vals.length).join(' ');
        bod = '{' + _args + '} ' + bod;
        bod = eval_lambda( bod ); // create a lambda
      } else {                    // create a form
        for (var i=0; i < args.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
      }
      return bod;
    }(body);
  };
  return name; 
};
var eval_def = function (s, flag) {
  flag = (flag === undefined)? true : false;
  s = eval_defs( s, false );
  var index = s.indexOf(' '),
      name  = s.substring(0, index).trim(),
      body  = s.substring(index).trim(); 
  //if (dict.hasOwnProperty(body)) {
  if (body.substring(0,7) === 'lambda_') {
    dict[name] = dict[body];
    delete dict[body];
  } else 
    //dict[name] = function() { return body };
    dict[name] = function() { return eval_forms(body) };
  return (flag)? name : '';
};
var eval_let = function (s) {
  s = eval_lets( s );
  s = supertrim( s );
  var varvals = catch_form( '{', s );
  var body = supertrim( s.replace( varvals, '' ) );
  varvals = varvals.substring(1, varvals.length-1);
  var avv = [], i=0;
  while (true) {
    avv[i] = catch_form( '{', varvals );
    if (avv[i] === 'none') break;
    varvals = varvals.replace( avv[i], '' );
    i++;
  } 
  for (var one ='', two='', i=0; i<avv.length-1; i++) {
    var index = avv[i].indexOf( ' ' );
    one += avv[i].substring( 1, index ) + ' ';
	two += avv[i].substring(index+1, avv[i].length-1) + ' ';
  }
  return '{{lambda {'+ one + '} ' + body + '} ' + two + '}';
};

// 3) HELPER FUNCTIONS
var g_debug = false;  // global used by eval_forms()
var dict    = {};  // JS primitives + user functions 
var g_cons  = {};  // an object containing user defined pairs
var g_array = {};  // an object containing user defined arrays
var g_lambda_num = 0; // global number for lambdas
var g_cons_num   = 0; // global number for pair structs
var g_array_num  = 0; // global number for array structs

var balance = function ( str ) {
  var strt    = str.match( /\{/g ), 
      stop    = str.match( /\}/g ), 
      nb_strt = (strt)? strt.length : 0,
      nb_stop = (stop)? stop.length : 0;
  return {left:nb_strt, right:nb_stop}; 
};
var preprocessing = function (str) {
  str = str.trim()
           .replace( /°°°[\s\S]*?°°°/g, '' )     // delete °°° comments °°°
           .replace( /;;(.*?)\n/g, '\n' )        // one line comments
           .replace( /<=/g, '__lte__' )          // prevent "<=" break -> "< ="
           .replace( /<([^<>]*)>/g, '< $1>' )    // breaks HTML < tags>
           .replace( /<\/([^<>]*)>/g, '< /$1>' ) // breaks HTML < /tags>
           .replace( /__lte__/g, '<=' );         // retrieve the "<=" operators
  str = quoteunquote( str, true );      // hide braces between °° .. .. °°
  str += '\n'; // add a CR at the end for "closing" a final alternate form  
  // some sugar form to frequently used standard form {first rest} :
  str = str.replace( /_h([1-6]) (.*?)\n/g, '{h$1 $2}' )    // titles
           .replace( /_p (.*?)\n/g, '{p $1}' )             // paragraphs
           .replace( /_(u|o)l ([^\n]*?)\n/g, '{_$1l $2}' ) // list items
           .replace( /_(u|o)l([0-9]+) ([^\n]*?)\n/g, '{__$1l $2 $3}' )
           .replace( /\[\[([^\[\]]*?)\]\]/g, doWikiLink ); // wiki-links
  return str;
};
var postprocessing = function (str) {
  str = str.replace( /(<\/ol><ol>|<\/ul><ul>)/g,'' ) // clean list items
           .replace( /<(u|o)l>/g, '<$1l>' )
           .replace( /<\/(u|o)l>/g,'</$1l>' );
  str = quoteunquote( str, false ); // show braces escaped by °° .. .. °°
  str = unquote( str );
  delete_lambdas();
  delete_conses();
  delete_arrays();
  str = unquote( str );
  return str;
};
var quote = function(str) {
  return str.replace( /\{/g, '&#123;' ).replace( /\}/g, '&#125;' )
};
var unquote = function(str) {
  return str.replace( /&#123;/g, '{' ).replace( /&#125;/g, '}' ) 
};
var quoteunquote = function ( str, flag ) { // °° some text °°
  // braces are hidden in pre-processing and showed in post-processing
  var tab = str.match( /°°[\s\S]*?°°/g );
  if (tab == null) return str;
  for (var i=0; i< tab.length; i++)
    str = str.replace( tab[i], ((flag)? quote(tab[i]) : unquote(tab[i]) ));
  str = str.replace( /°°/g, '' );
  return str;
};
//
var catch_form = function( symbol, str ) {
  var start = str.indexOf( symbol );
  if (start == -1) return 'none';
  var d0, d1, d2;
  if (symbol === "'{")     { d0 = 1; d1 = 1; d2 = 1; } 
  else if (symbol === "{") { d0 = 0; d1 = 0; d2 = 1; } 
  else         { d0 = 0; d1 = symbol.length; d2 = 0; }
  var nb = 1, index = start+d0;
  while(nb > 0) { index++;
         if ( str.charAt(index) == '{' ) nb++;
    else if ( str.charAt(index) == '}' ) nb--;
  }
  return str.substring( start+d1, index+d2 )
};
var form_replace = function(str, sym, func, flag){
  var s = catch_form( sym, str );
  return (s==='none')? str:str.replace(sym+s+'}',func(s,flag))
};
var apo_replace = function(str, symbol, func){
  var s = catch_form( symbol, str );
  return (s==='none')? str:str.replace("'"+s,func(s))
};
//
var supertrim = function(str) {
  return str.trim().replace(/\s+/g, ' ');
};
var doWikiLink = function ( m, nom ) { 
  // wikilinks alternatives to {a {@ src=""...}}
  if (nom.match( /\|/ )) { // [[nom|URL]]  -> <a href="URL">nom</a>
    var tab = nom.split( '|' );
    return '<a href="' + tab[1] + '">' + tab[0] + '</a>';
  }
  else  // [[nom]]  -> <a href="?view=nom">nom</a>
    return '<a href="?view=' + nom + '">' + nom + '</a>'; 
};
var delete_lambdas = function () {
  g_lambda_num = 0;
  for (var key in dict) {
    if (key.substring(0,7) === 'lambda_') {
      delete dict[key]
    }
  } 
};
var delete_arrays = function () {
  g_array_num = 0;
  for (var key in g_array) {
    if (key.substring(0,6) === 'array_') {
      delete g_array[key]
    }
  } 
};
var delete_conses = function () {
  g_cons_num = 0;
  for (var key in g_cons) {
    if (key.substring(0,5) === 'cons_') {
      delete g_cons[key]
    }
  } 
};

// 4) DICTIONARY populated with primitive Javascript functions

// 4.1) FIRST ONES
dict['debug'] = function() {  // side effect on g_debug
  var args = arguments[0]; // {debug true|false}
  g_debug = (args === 'true')? true : false;
  return ''
};
dict['lib'] = function () { // {lib} -> list the functions in dict
  var str = '', index = 0;
  for (var key in dict) {
    if(dict.hasOwnProperty(key) 
      && !key.match('lambda_') && !key.match( /^_/ ) ) {
      str += key + ', ';
      index++;
    }
  }
  return '<b>dictionary: </b>(' + 
         index + ') [ ' + str.substring(0,str.length-2) + ' ]<br /> ';
};
dict['eval'] = function() {  // {eval '{+ 1 2}}
  var s = arguments[0];
  return eval(unquote(s))
};
dict['apply'] = function() { // {apply + 1 2}
  var s = supertrim(arguments[0]).split(' '),
      first = s.shift(),
      rest = s.join(' ');
  return eval_forms( '{' + first + ' ' + rest + '}' )
};
dict['when'] = function () { // {when {quote bool then one else two}}
  var s = supertrim(arguments[0]);
  var index1 = s.indexOf( 'then' ),
      index2 = s.indexOf( 'else' ),
      bool = s.substring(0,index1).trim(),
      one = s.substring(index1+5,index2).trim(),
      two = s.substring(index2+5).trim();
  return (eval_forms(unquote(bool)) === "true")? 
          eval_forms(unquote(one)) : 
          eval_forms(unquote(two))
};

// 4.2) BOOLEANS
dict['<'] = function() {      // {< one two}
  var s = supertrim(arguments[0]).split(' ');
  return parseFloat(s[0]) < parseFloat(s[1])
};
dict['>'] = function() {      // {> one two}
  var s = supertrim(arguments[0]).split(' ');
  return parseFloat(s[0]) > parseFloat(s[1])
};
dict['<='] = function() { // see pre-processing
  var terms = supertrim(arguments[0]).split(' '); 
  return parseFloat(terms[0]) <= parseFloat(terms[1]) 
};
dict['>='] = function() { // see pre-processing
  var terms = supertrim(arguments[0]).split(' '); 
  return parseFloat(terms[0]) >= parseFloat(terms[1]) 
};
dict['='] = function() {      // {= one two}
  var s = supertrim(arguments[0]).split(' '),
      a = parseFloat(s[0]), b = parseFloat(s[1]); 
  return !(a < b) && !(b < a) 
};
dict['not'] = function () { 
  var term = supertrim(arguments[0]); 
  return (term === 'true') ? 'false' : 'true';
};
dict['or'] = function () {
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret='false', i=0; i< terms.length; i++)
    if (terms[i] == 'true')
      return 'true';
  return ret;
};
dict['and'] = function () { // (and (= 1 1) (= 1 2)) -> false 
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret='true', i=0; i< terms.length; i++)
    if (terms[i] == 'false')
      return 'false';
  return ret;
};

// 4.3) MATHS
dict['+'] = function(){       // {+ 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  return s.reduce(function(x,y){return parseFloat(x)+parseFloat(y)})
};
dict['-'] = function(){       // {- 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  return s.reduce(function(x,y){return x-y })
};
dict['*'] = function(){       // {* 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  return s.reduce(function(x,y){return x*y })
};
dict['/'] = function(){       // {/ 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  return s.reduce(function(x,y){return x/y })
};
dict['%']  = function() { 
  var args = supertrim(arguments[0]).split(' '); 
  return parseFloat(args[0]) % parseFloat(args[1]) 
};

var mathtags = ['abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 'pow', 'log', 'random', 'round', 'sin', 'sqrt', 'tan', 'min', 'max'];
for (var i=0; i< mathtags.length; i++) {
  dict[mathtags[i]] = function(tag) {
    return function() { 
      return tag.apply( null, supertrim(arguments[0]).split(' ') )
    } 
  }(Math[mathtags[i]]);  
} 

dict['PI'] = function () { return Math.PI };
dict['E']  = function () { return Math.E };
dict['date'] = function () { 
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

dict['serie'] = function () { // {serie start end step}
  var args = supertrim(arguments[0]).split(' ');
  var start = parseFloat( args[0] ),
      end = parseFloat( args[1] ),
      step = parseFloat( args[2] || 1 );  
  if (start >= end) { var temp = start; start = end; end = temp; }
  for (var str='', i=start; i<=end; i+= step)
    str += i + ' ';
  return str.substring(0, str.length-1);
};
dict['map'] = function () { // {map func serie}
  var args = supertrim(arguments[0]).split(' ');
  var func = args.shift();
  dict['map_temp'] = dict[func]; // if it's a lambda it's saved in map_temp
  for (var str='', i=0; i< args.length; i++)
    str += dict['map_temp'].call( null, args[i] ) + ' ';
  delete dict['map_temp'];       // clean map_temp
  return str.substring(0, str.length-1);
};
dict['reduce'] = function () { // {reduce *userfunc* serie}
  var args = supertrim(arguments[0]).split(' ');
  var func = args.shift();
  var res = '{{' + func + ' ' + args[0] + '}';
  for (var i=1; i< args.length-1; i++)
    res = '{' + func + ' ' + res + ' ' + args[i] + '}';
  res += ' ' + args[args.length-1] + '}';
  return eval_forms(res);
};

// 4.4) STRINGS equal?, empty?, chars, charAt, substring
//      SENTENCES first, rest, nth, length
dict['equal?'] = function() { // {equal? word1 word2}
  var args = supertrim(arguments[0]).split(' ');
  return args[0] === args[1]; 
};
dict['empty?'] = function() { // {empty? string}
  var args = supertrim(arguments[0]);
  return (args === ''); 
};
dict['chars'] = function() { // {chars some text}
  var args = arguments[0].trim();
  return args.length; 
};
dict['charAt'] = function() { // {charAt i some text}
  var args = supertrim(arguments[0]).split(' '), // ["i","some","text"]
      i = args.shift(),
      s = args.join(' ');
  return s.charAt(parseInt(i)); 
};
dict['substring'] = function() { // {substring i0 i1 some text}
  var args = supertrim(arguments[0]).split(' '), // ["i0","i1","some","text"]
      i0 = parseInt(args.shift()),
      i1 = parseInt(args.shift()),
      s  = args.join(' ');
  return s.substring(i0,i1); 
};
// everything created with def:
dict['length'] = function () { // {length a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args.length;
}
dict['first'] = function () { // {first a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[0];
}
dict['rest'] = function () { // {rest a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args.slice(1).join(' ');
}
dict['last'] = function () { // {last a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[args.length-1];
}
dict['nth'] = function () { // {nth n a b c d}
  var args = supertrim(arguments[0]).split(' '); // [a,b,c,d]
  return args[args.shift()];
}

// 4.5) ARRAYS  new, array?, disp, length, nth, last, push, pop
dict['array.new'] = function () { // {array.new 12 34 56 78} -> array_123
  var args = supertrim(arguments[0]);
  var name = 'array_' + g_array_num++;
  g_array[name] = (args != '')? args.split(' ') : [];
  return name;
};
dict['array?'] = function () { // {array? z}
  var args = arguments[0].trim(); // z
  return Array.isArray(g_array[args]);
};
dict['array.disp'] = function () { // {array.disp z}
  var args = arguments[0].trim(); // z
  return (Array.isArray(g_array[args]))? '['+g_array[args].join(',')+']' : args;
};
dict['array.length'] = function () { // {array.length z}
  var args = arguments[0].trim(); // z
  return (Array.isArray(g_array[args]))? g_array[args].length : 0;
};
dict['array.nth'] = function () { // {array.nth z i}
  var args = supertrim(arguments[0]).split(' '); // [z,i]
  return (Array.isArray(g_array[args[0]]))? g_array[args[0]][args[1]] : args[0];
};
dict['array.first'] = function () { // {array.first z}
  var args = arguments[0].trim(); // z
  return g_array[args][0];
};
dict['array.rest'] = function () { // {array.rest z}
  var args = arguments[0].trim(); // z
  var name = 'array_' + g_array_num++;
  g_array[name] = g_array[args].slice(1);
  return name;
};
dict['array.last'] = function () { // {array.last z}
  var args = arguments[0].trim(); // z
  return g_array[args][g_array[args].length-1];
};

// should create a new array  
dict['array.push'] = function () { // {array.push z val}
  var args = supertrim(arguments[0]).split(' '); // [z,val]
  g_array[args[0]].push( args[1] );
  return args[0];
};
dict['array.pop'] = function () { // {array.pop z}
  var args = arguments[0].trim(); // z
  return g_array[args].pop();
};

// 4.6) CONS CAR CDR cons.disp list.new, list.disp
dict['cons'] = function () { // {cons 12 34} -> cons_123
  var args = supertrim(arguments[0]).split(' ');
  var name = 'cons_' + g_cons_num++;
  g_cons[name] = function(w) { return (w === 'true')? args[0] : args[1] };
  return name;
};
dict['cons?'] = function () { // {cons? z}
  var z = arguments[0];
  return ( z.substring(0,5) === 'cons_' )? 'true' : 'false';
};
dict['car'] = function () { // {car z}
  var z = arguments[0];
  return ( z.substring(0,5) === 'cons_' )? g_cons[z]('true') : z;
};
dict['cdr'] = function () { // {cdr z}
  var z = arguments[0];
  return ( z.substring(0,5) === 'cons_' )? g_cons[z]('false') : z;
};
dict['cons.disp'] = function () { // {cons.disp {cons a b}} 
  var args = supertrim(arguments[0]);
  var r_cons_disp = function (z) {
    if ( z.substring(0,5) === 'cons_' )
      return '(' + r_cons_disp( g_cons[z]('true') ) + ' ' 
                 + r_cons_disp( g_cons[z]('false') ) + ')';
    else
      return z;
  };
  return r_cons_disp( args );
};

dict['list.new'] = function () { // {list.new 12 34 56 78} -> cons_123
  var args = supertrim(arguments[0]).split(' '); // [12,34,56,78]
  var r_list_new = function (arr) {
    if (arr.length === 0)
      return 'nil';
    else
      return '{cons ' + arr.shift() + ' ' + r_list_new( arr ) + '}';
  };
  return r_list_new( args );
};
dict['list.disp'] = function () {  // {list.disp {list.new 12 34 56 78}}
  var r_list_disp = function (z) {
    if (z === 'nil')
      return '';
    else
      return g_cons[z]('true') + ' ' + r_list_disp( g_cons[z]('false') );
  };
  var args = supertrim(arguments[0]);
  if ( args.substring(0,5) !== 'cons_' )
    return args
  else 
    return '(' + supertrim( r_list_disp( args.split(' ') ) ) + ')';
};

dict['list.length'] = function () {
  var args = supertrim(arguments[0]);
  var foo = function (z,n) {
    return (z === 'nil')? n : foo(g_cons[z]('false'), n+1);
  };
  return foo(args,0);
};
// testing user functions replaced by primitives
dict['list.first'] = function () {
  var z = arguments[0]; // cons_123
  return ( z.substring(0,5) === 'cons_' )? g_cons[z]('true') : z;
};
dict['list.butfirst'] = function () {
  var z = arguments[0]; // cons_123
  return ( z.substring(0,5) === 'cons_' )? g_cons[z]('false') : z;
};
dict['list.last'] = function () {
  var r_list_last = function (z) {
    if (g_cons[z]('false') === 'nil')
      return g_cons[z]('true');
    else
      return r_list_last( g_cons[z]('false') );
  };
  var args = arguments[0]; // cons_123
  if ( args.substring(0,5) !== 'cons_' )
    return args
  else 
    return r_list_last( args.split(' ') );
};
dict['list.butlast'] = function () {
  return 'not yet!';
};
dict['list.2array'] = function () {
  var args = arguments[0]; // cons_123
  args = dict['list.disp'](args);
  return args.substring(1,args.length-1).split(' ');
};

// 4.7) HTML
dict['@'] = function() {
  return '@@' + supertrim(arguments[0]) + '@@';
};
var htmltags = [
'div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'u', 'center', 'hr', 'blockquote', 'sup', 'sub', 'del', 'code', 'img', 'pre', 'textarea', 'canvas', 'audio', 'video', 'source', 'select', 'option', 'svg', 'line', 'rect', 'circle', 'polyline', 'path', 'text', 'g', 'animateMotion', 'mpath', 'use', 'textPath', 'pattern', 'image', 'clipPath', 'defs'
];
for (var i=0; i< htmltags.length; i++) {
  dict[htmltags[i]] = function(tag) {
    return function() {
      var args = arguments[0].trim(); // save spaces for pre
      var attr = args.match( /@@[\s\S]*?@@/ ); 
      if (attr == null) return '<'+tag+'>'+args+'</'+tag+'>';
      args = args.replace( attr[0], '' ).trim();
      // attr = attr[0].replace(/@@/g, '');
      attr = attr[0].replace(/^@@/, '').replace(/@@$/, '');
      return '<'+tag+' '+attr+'>'+args+'</'+tag+'>';
    }
  }(htmltags[i]);      
}
dict['br'] = function() { return '<div></div>'; }; // avoid extra space
//
dict['input'] = function () {
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
dict['script'] = function (){ // {script quote(some JS code) } 
  var args = arguments[0];
  if (args.match( 'http://' )) // try to prevent cross_scripting
    return 'Sorry, external sources are not authorized in scripts!';
  var script = unquote(args); 
  var code = (function () {
    var js = document.createElement('script');
    js.innerHTML = script;
    document.head.appendChild( js );
    document.head.removeChild( js );
  })();
  return '';
};
dict['style'] = function (){ // {style  quote(CSS) } 
  var args = arguments[0];
  if (args.match( 'http://' )) // try to prevent cross_scripting
    return 'Sorry, external sources are not authorized in styles!';
  var style = unquote(args); 
  var code = (function () {
    var cs = document.createElement('style');
    cs.innerHTML = style;
    document.head.appendChild( cs );
    // document.head.removeChild( cs ); don't do that !
  })();
  return '';
};
dict['iframe'] = function() { // {iframe {@ src=".." height=".." width=".."}}
  var args = arguments[0];
  // comment the two following lines to allow external scripts 
  if (args.match( 'http://' )) // try to prevent cross_scripting
    return 'Sorry, external sources are not authorized in iframes!';
  var attr = args.match( /@@[\s\S]*?@@/ ); 
  if (attr == null)  return 'oops';
  attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attr
  return '<iframe ' + attr + ' ></iframe>';
}; 
dict['require'] = function() {       // {require lib_name}
  var page = supertrim(arguments[0]), xmlHttp;
  var xmlHttp = (navigator.appName.search('Microsoft')>-1)?
  new ActiveXObject('MSXML2.XMLHTTP') : new XMLHttpRequest(); 
  xmlHttp.open('GET', 'pages/'+page+'.txt', true);
  xmlHttp.send(null);
  xmlHttp.onreadystatechange = function() {	
    if (xmlHttp.readyState == 4) {
      var lib = '{div {@ style=\'display:none\'}' 
                + xmlHttp.responseText + '}';
      var page_code = document.getElementById('page_textarea').value;
      page_code = page_code.replace(/\{require .*?\}/g,'');
      document.getElementById('page_view').innerHTML =
               LAMBDATALK.eval( lib + page_code ).val;
      return '';
    }
  };
  return '';
};

// 4.8) OTHERS
// _ulxx|_olxx are alternatives to {ul {li ...}...} and {ol {li ...}...}
// they are handled in pre-processing and post-processing phases
dict['_ul'] = function () {
  var args = supertrim(arguments[0]).split(' ');
  return '<ul><li>' + args.join(' ') + '</li></ul>';
};
dict['__ul'] = function () {
  var args = supertrim(arguments[0]).split(' ');
  var delta = 'style="margin-left:' +args.shift() + 'px;"';
  return '<ul><li '+ delta + '>' + args.join(' ') + '</li></ul>';
};
// _olxx can't be nested, if you need it use the standard syntax
dict['_ol'] = function () {
  var args = supertrim(arguments[0]).split(' ');
  return '<ol><li>' + args.join(' ') + '</li></ol>';
};
dict['__ol'] = function () {
  var args = supertrim(arguments[0]).split(' ');
  var delta = 'style="margin-left:' +args.shift() + 'px;"';
  return '<ol><li '+ delta + '>' + args.join(' ') + '</li></ol>';
};
dict['mailto'] = function () { // {mailto john•martin_at_free•fr}
  var args = arguments[0];
  var mail = args.replace(/•/g, '.').replace(/_at_/, '@');
  return '<a href="mailto:'+mail+'">'+args+'</a>';
};
dict['back'] = function () { // {back}
  return '<a href="javascript:history.go(-1);">back</a>';
};
dict['hide'] = function () { // {hide}
  return LAMBDATALK.eval_forms( 'div {@ style="display:none;"}' );
};

// 4.9) START OF PRIMITIVES WORKING WITH EXTERNAL FUNCTION UNITS
// LAMBDATANK, DRAG, NOTE, SHOW, LIGHTBOX, MINIBOX, 
// LAMBDALISP, FORUM, SECTIONEDIT, LAMBDASHEET, TURTLE 
dict['drag'] = function () {       // DRAG
  return DRAG.drag();
};
dict['note'] = function () {        // NOTE
  return NOTE.note( arguments[0] );
};
dict['note_start'] = function () {  // NOTE
  return NOTE.note_start( arguments[0] );
};
dict['note_end'] = function () {    // NOTE
  return NOTE.note_end( arguments[0] );
};
dict['show'] = function () {        // SHOW and skins/lightbox.css
  return SHOW.build( supertrim(arguments[0]) );
};
dict['lightbox'] = function () {    // LIGTHBOX and skins/lightbox.css
  return LIGHTBOX.build( supertrim(arguments[0]) )
};
dict['minibox'] = function() {      // MINIBOX
  return MINIBOX.build( supertrim(arguments[0]) )
};
dict['lisp'] = function () {        // LAMBDALISP
  return LAMBDALISP.get_val( supertrim(arguments[0]) );
};
dict['forum'] = function () {       // FORUM
  return FORUM.create( arguments[0] || '#forum#' );
};
dict['editable'] = function () {    // SECTIONEDIT
  return SECTIONEDIT.create( arguments[0] );
};
dict['sheet'] = function () {       // LAMBDASHEET
  return LAMBDASHEET.build( supertrim( arguments[0]) );
};
dict['lc'] = function () {          // LAMBDASHEET
  return LAMBDASHEET.get_val( supertrim( arguments[0]) );
};
dict['turtle'] = function () {      // TURTLE
  return TURTLE.draw( supertrim(arguments[0]) );
};

// END OF PRIMITIVES WORKING WITH EXTERNAL FUNCTION UNITS

// 5) public function
return {
  eval:eval,              // returns {evaluated forms,balance {},time}
  eval_forms:eval_forms,  // returns evaluated forms
  catch_form:catch_form   // used in EXTERNAL UNIT SECTIONEDIT
}
})();  // end of LAMBDATALK

////////////////////////////////////////////////////////////////////////
// LAMBDATALK can be used via a single HTML file, 
// see http://epsilonwiki.free.fr/lambdaway/meca/

////////////////////////////////////////////////////////////////////////
// EXTERNAL FUNCTION UNITS
// LAMBDATANK, TOC, DRAG, NOTE, SHOW, LIGHTBOX, MINIBOX, 
// LAMBDALISP, FORUM, SECTIONEDIT, LAMBDASHEET, TURTLE

var getId = function(id) { return document.getElementById(id) };

//  LAMBDATANK
var LAMBDATANK = (function() {

var getId = function(id) { return document.getElementById(id) };

var myDelayId = null, myDelayValue = 100; // 10, 100, 500, 1000

var do_update = function ( from_onload ) {
  if (from_onload) {         
    do_evaluate();           // don't wait
  } else {                   
    if (myDelayId == null)   // wait only if no one is pending
      myDelayId = window.setTimeout( do_evaluate, myDelayValue );
  }  
};
var do_evaluate = function() {
  if (getId('page_textarea') == null)
    return; // content comes from doList, doSkin, doBack, ...
  var input = getId('page_textarea').value;
  var output = LAMBDATALK.eval( input );    // {val:v, bal:b, time:t}
  if (output.val != 'none')                 // else don't waste time
    getId('page_view').innerHTML = output.val;
  window.clearTimeout( myDelayId );  // end of timeOut
  myDelayId = null;            // no pending update, OK for a new one
  getId('infos').innerHTML = '[' + output.time + 'ms] | ' 
  + '{' + output.bal.left + '|' + output.bal.right + '} | ['
  + input.length + '->' + output.val.length + ']';
};

var toggle_display = function ( id ) {
  var OK = (getId(id).style.display == "block");
  getId(id).style.display = (OK)? "none" : "block";
};
var toggle_visibility = function ( id ) {
  var OK = (getId(id).style.visibility == "visible");
  getId(id).style.visibility = (OK)? "hidden" : "visible";
};
var doSave = function () {
  return confirm( "Save and publish modifs ?" );
};
var doCancel = function () {
  if ( confirm( "Exit editor without saving modifs ?" ) ) {
    document.location.reload(true); // reload saved initial content
    return true;
  } else return false;
};

return {
  getId:getId,
  do_update:do_update,
  toggle_display:toggle_display,
  toggle_visibility:toggle_visibility,
  doSave:doSave,
  doCancel:doCancel
}
})();	// end of LAMBDATANK

//  TOC TABLE OF CONTENT
var TOC = (function() {

var build = function ( id, toc, content ) {
/*
{input {@ type="submit" value="TABLE OF CONTENT" 
          onclick="TOC.build( this, 'TOC', 'CONTENT' )"}}
{div {@ id="TOC"}}
{div {@ id="CONTENT"} ... }
*/
  id.disabled = 'disabled';
  var tocDiv = LAMBDATANK.getId(toc);
  var content = LAMBDATANK.getId(content);
  // A) find the nodes to be added to the TOC
  var tocTargets = new Array();
  var nodes = content.childNodes;
  for (var i = 0; i < nodes.length; i++) {
    var nn = nodes[i].nodeName.toLowerCase();
    if (nn == 'h1' || nn == 'h2' || nn == 'h3' || 
        nn == 'h4' || nn == 'h5' || nn == 'h6') {
      tocTargets.push(nodes[i]); // <hi>
    }
  }
  if (tocTargets.length < 2) { // Remove toc if none or one heading
    tocDiv.parentNode.removeChild(tocDiv);
    return;
  }
  // B) Add the toc contents
  tocDiv.innerHTML= LAMBDATALK.eval_forms('{drag}');
  var tocList = document.createElement('ul');
  tocList.className = 'tocDiv'; // old : tocDiv without quotes
  tocDiv.appendChild(tocList);
  // Insert elements into our table of contents
  for (var i = 0; i < tocTargets.length; i++) { // for all <hi>
    var tocTarget = tocTargets[i];
    if (tocTarget.id == '') tocTarget.id = i; // add id="i" to the <hi>
    var newItem = document.createElement('li');
    newItem.className = tocTarget.nodeName;   // hi
    var newLink = document.createElement('a');
    newLink.href = '#' + tocTarget.id;        // href="#i"
    newLink.innerHTML = tocTarget.innerHTML;
    newItem.appendChild(newLink);
    tocList.appendChild(newItem);
  }  
};

return {build:build}
})();

//  DRAG
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
  return '<div style="cursor:move;background:red; width:10px; height:10px; line-height:20px; border:1px solid black;" onmousedown="DRAG.beginDrag( this.parentNode, event );">&nbsp;</div>';
};

return { drag:drag, beginDrag:beginDrag }
})();

//  NOTE
var NOTE = (function() {

var note_style = 
 'display:none; padding-left:5px; padding-right:20px; border-left:1px solid #ccc;';

var note = function (str) { // {note a_word and any text}
  var args = str.split(' ');
  var note = args.shift();
  var rd = 'note_' + Math.random();
  return '<a href="javascript:LAMBDATANK.toggle_display(\'' 
    + rd + '\');">' + note + '</a>' 
    + '<span style="' + note_style + '" id="' + rd + '" >' 
    + args.join( ' ' ) + '</span>';
};
var note_start = function (str) { // {note_start an_ID any text}
  var args = str.split(' ');
  var note_id = args.shift();
  return '<a href="javascript:LAMBDATANK.toggle_display(\'' 
    + note_id + '\');">' + args.join( ' ') + '</a>';
};
var note_end = function (str) { // {note_end {@ id="ID" style="style"} text}
  var args = str;
  var attr = args.match( /@@[\s\S]*?@@/ ); // any whitespace or not -> all
  if (attr == null) return 'ooops';
  args = args.replace( attr[0], '' ).trim(); // extract attributes
  attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attributes
  return '<div style="' + note_style + '" ' + attr + '>' + args + '</div>';
};

return {note:note, note_start:note_start, note_end:note_end}
})();

//  FORUM
var FORUM = (function() { // call by dict['forum']

var create = function ( nom ) {
  var content = '{div {@ style="padding:0 10px;"}'
  + '{textarea {@ id="blog_' + nom 
  + '" placeHolder="Tell me something" '
  + 'style="width:100%; height:50px; box-shadow:0 0 8px; "}}'
  + '{br}{input {@ id="name_' + nom + '" type="text" '
  + 'placeHolder="Tell me your name" style="width:110px; margin-left:20px;"}}'
  + '{input {@ type="submit" value="... then add your message" '
  + 'onclick="FORUM.add_message(\'' + nom + '\')"}}}';
  return LAMBDATALK.eval_forms( content );
};

var add_message = function ( nom ) { // associated with dict['forum']
  var mess = document.getElementById('blog_' + nom).value;
  if (!mess) return;
  var code = document.getElementById('page_textarea').value;
  var name = document.getElementById('name_' + nom).value || 'anonymous';
  var time = LAMBDATALK.eval_forms('{date}');
  mess = '{br}{b From ' + name + '} [{i ' 
       + time + '}]\n{blockquote ' + mess + '}\n';
  var temp = '{forum ' + nom + '}';
  document.getElementById('page_textarea').value = 
       code.replace( temp, temp + '\n' + mess );
  document.getElementById('save_button').click(); 
};

return {create:create, add_message:add_message}
})();	// end of FORUM

//  SECTIONEDIT
var SECTIONEDIT = (function() {
// associated with "editable" in the LAMBDATALK dict :
// dict['editable'] = function () { // {editable num any text }
//   return SECTIONEDIT.create( arguments[0].split(' ') ) 
// };
// CAUTION : due to a LAMBDATALK.catch_sexpression() limit
// num must be followed by at least one "true" space, not a line return
var code = '', content = '', oldval = '';

var create = function ( args ) {
  args = args.split(' ');
  var num = args.shift();
  var content = args.join(' ').trim();
  return '{input {@ id="' 
  + num + '" class="sectionedit" type="submit" value="edit" '
  + 'style="float:left; margin-left:-45px;"'
  + 'onclick="SECTIONEDIT.section_open(this.id)"}}'
  + '{div {@ style="border:1px dashed #ccc;"}' + content + '}';
};
var section_open = function ( id ) {
  code = document.getElementById('page_textarea').value;
  oldval =  LAMBDATALK.catch_form( 'editable ' + id, code );
  content = document.getElementById(id).nextSibling.innerHTML;
  document.getElementById(id).nextSibling.innerHTML =
    '<div style="opacity:0.5;">' + content + '</div>'
    + '<textarea id="temp_' + id 
    + '" style="width:100%; height:200px;">' + oldval + '</textarea>'
    + '<input type="submit" value="save" onclick="SECTIONEDIT.section_save('
    + id + ')" />'
    + '<input type="submit" value="cancel" onclick="SECTIONEDIT.section_cancel('
    + id + ')" />';
  button_edit_disable( true );
};
var section_save = function ( id ) {
  var newval = document.getElementById('temp_'+id).value;
  document.getElementById('page_textarea').value = code.replace( oldval, newval );
  document.getElementById('save_button').click(); 
};
var section_cancel = function ( id ) {
  document.getElementById(id).nextSibling.innerHTML = content;
  button_edit_disable( false );
};
var button_edit_disable = function ( flag ) {
  var butt = document.getElementsByClassName( 'sectionedit' );
  for (var i=0; i < butt.length; i++)
    butt[i].disabled = flag;
};

return { 
  create:create, 
  section_open:section_open, 
  section_save:section_save,
  section_cancel:section_cancel 
}
}()); // end of SECTIONEDIT

//  SHOW
var SHOW = (function() {

var build = function () {
  var attr = arguments[0].match( /@@[\s\S]*?@@/ );
  if (attr == null) return 'waiting for src, width, height, title';
  h = attr[0].match( /height\s*=\s*"([\d]+)"/ );
  h = (h !== null)? h[1] : 100;
  w = attr[0].match( /width\s*=\s*"([\d]+)"/ );
  w = (w !== null)? w[1] : 300;
  s = attr[0].match( /src\s*=\s*"(.*?)"/ );
  s = (s !== null)? s[1] : 'data/happydog.jpg';
  t = attr[0].match( /title\s*=\s*"(.*?)"/ );
  t = (t !== null)? t[1] : 'OOOPS';

  var img_id = 'show_' + Math.random()*1e9;
  var content = '{img {@ class="showbox" id="' + img_id  
      + '" src="' + s + '" title="' + t + '" height="' + h
      + '" onclick="SHOW.display_open(\'' + img_id + '\', ' + w + ')"}}';
  return LAMBDATALK.eval_forms( content );
};
var display_open = function ( img_id, w ) {
  var pict = document.getElementById( img_id );
  var content = '{div {@ id="grey_background"}}'
      + '{div {@ id="showbox_display" style="width:' 
      + w + 'px; margin-left:-' + (w/2) + 'px;"}'
      + '{img {@ id="light_image" src="' + pict.src + '" width="' + w 
      + '" title="Click to close." onclick="SHOW.display_close()"}}'
      + '{div {@ id="light_text"}' + pict.title + '}}';
  var div = document.createElement('div');
  div.id = 'show_display';
  div.innerHTML = LAMBDATALK.eval_forms( content );
  document.body.appendChild( div );
};
var display_close = function ( ) {
  document.body.removeChild( document.getElementById( 'show_display' ) );
};
return { 
  build:build,
  display_open:display_open,
  display_close:display_close
};
})();	// end SHOW

//  LIGHTBOX
var LIGHTBOX = (function() {

var build = function () {
    var args = arguments[0];
    var attr = args.match( /@@[\s\S]*?@@/ );
    if (attr == null) return 'waiting for width, height, thumb';
    args = args.replace( attr[0], '' ).trim(); // extract attributes
    attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attributes
    h_start = attr.match( /height\s*=\s*"([\d]+)"/ );
    w_end   = attr.match( /width\s*=\s*"([\d]+)"/ );
    h_butt  = attr.match( /thumb\s*=\s*"([\d]+)"/ );
    h_start = (h_start !== null)? h_start[1] : 100; 
    w_end   = (w_end !== null)?   w_end[1]   : 300;
    h_butt  = (h_butt !== null)?  h_butt[1]  : 30;
    var picts = [];
    var m = args.match( /\(([^\)]*?)\)/g ); // [ (adresse un texte) ]
    if (m == null) return 'waiting for some (pict text) ... (pict text) ';
    for (var i=0; i<m.length; i++) { // m[i] = "( adresse un texte )"
      m[i] = m[i].replace( /^\(/, '' ).replace( /\)$/, '' );
      var tab = m[i].split( ' ' );   // tab  = [adresse, un, texte]
      var img = tab.shift().replace( /^\(/, '' ); // adresse
      var txt = tab.join( ' ' ).replace( /\)$/, '' ); // "un texte"
      picts[i] = [img, txt];
    }
    var alea = Math.floor(Math.random()*1000000);
    var light_name = 'light_' + alea;
    var light_image_preview = 'light_image_preview' + alea;
    var n = picts.length;
    for (var thumbs = '', i=0; i<n; i++) {
	  	var img_id = light_name + i; 
	  	thumbs 	+= '<img class="light_content" id="' + img_id 
	  	+ '" src="' + picts[i][0] + '" title="' + picts[i][1]
	  	+ '" onmouseover="LIGHTBOX.flyOnPreview(this, \''
      + light_image_preview + '\')" height="' + h_butt
		  + '" onclick="LIGHTBOX.display_open(\'' + light_name + '\', ' 
      + i + ',' + n + ',' + h_butt + ',' + w_end + ',' + h_start + ')" />';
    }
    var content = '<img id="' + light_image_preview 
	  	+ '" src="' + picts[0][0] + '" title="' + picts[0][1]
	  	+ '" height="' + h_start + '" style="padding-top:2px;" />';	
		return '<span class="lightbox">' + thumbs + '<br />' + content + '</span>';
};
var display_open = function (light_name, index, n, h_butt, w_end, h_start) {
	var img_id = light_name + index;
	for (var thumbs = '', i=0; i<n; i++) {
	  var name = light_name + i;
	  var pict = document.getElementById( name ).src;
	  var txt  = document.getElementById( name ).title;
	  thumbs += '<img class="light_content" src="' + pict + '" title="' + txt 
     + '" onmouseover="LIGHTBOX.flyOnDisplay(this)" height="' + h_butt + '" />';
	}
	var pict = document.getElementById(img_id);
  var content = '<div id="grey_background"></div>'
	  	+ '<div id="lightbox_display" style="text-align:center; width:' 
	  	+ w_end + 'px; margin-left:-' + (w_end/2 + 10) 
        + 'px; background:#444;">'
	  	+ '<div id="lightbox_thumbs">' + thumbs + '</div>'
	  	+ '<img id="light_image" src="' + pict.src + '" height="' + h_start 
	  	+ '" title="Click to close." onclick="LIGHTBOX.display_close()" />'
	  	+ '<div id="light_text" style="color:white;">' + pict.title + '</div>'
	  	+ '</div>';
	var div = document.createElement('div');
	div.id = 'light_display';
	div.innerHTML = content;
	document.body.appendChild( div );
};
var display_close = function ( ) {
  document.body.removeChild( document.getElementById( 'light_display' ) );
};
var flyOnPreview = function  ( obj, light_image_preview ) {
  document.getElementById( light_image_preview ).src = obj.src;
};
var flyOnDisplay = function ( obj ) {
  document.getElementById( 'light_image' ).src = obj.src;
  document.getElementById( 'light_text' ).innerHTML = obj.title;
};
	
return { 
  build:build,
  display_open:display_open,
  display_close:display_close,
  flyOnPreview:flyOnPreview,
  flyOnDisplay:flyOnDisplay
};
})();	// end LIGHTBOX

//  MINIBOX
var MINIBOX = (function() {

  var url=[], txt=[];

  var build = function(a) {
    var args = a.match( /@@[\s\S]*?@@/ );
    var body = a.replace( args[0], '' );
    args = args[0].replace( /@@/g, '' );
    var h = args.match( /height="([\d]+)"/ );
    var w = args.match( /width="([\d]+)"/ );
    var t = args.match( /thumb="([\d]+)"/ );
    h = (h !== null)? h[1] : 400; 
    w = (w !== null)? w[1] : 600;
    t = (t !== null)? t[1] : 30;
    var thumbs = ''; 
    var rex = /\(([^\s()]*)(?:[\s]*)([^()]*)\)/g;
    var picts = body.match(rex);
    for (var i=0; i< picts.length; i++) {
      var p = picts[i], index = p.indexOf( ' ' );
      url[i] = p.substring(1, index);
      txt[i] = p.substring(index, p.length-1);
      thumbs += '{img {@ height="'+t+'" src="' + url[i] 
             + '" title="' + txt[i] 
             + '" onmouseover="MINIBOX.flyover('+i+')"'
             + '  onclick="MINIBOX.doclick(true)"}}'; 
    }
    var pict = '{img {@ id="pict" height="'+h+'" src="'+url[0]+'" title="Click me to close."}}';
    var caption = '{div {@ id="text"}' + txt[0] + '}';
    var display = '{div {@ id="display_frame" style="display: none; position: relative; top: 0px; left: 50%; text-align: center; padding: 25px; background : #222; color: white; box-shadow: 0 0 500px black; border: 1px solid white; width: ' + w + 'px; margin-left: ' + (-w/2) + 'px;" onclick="MINIBOX.doclick(false)"}' + pict + caption + '}';
    return thumbs + display
  };

  var doclick = function(flag) {
    document.getElementById('display_frame').style.display = 
   (flag)?  'block' : 'none';
  };

  var flyover = function(i) {
    document.getElementById('pict').src = url[i];
    document.getElementById('text').innerHTML = txt[i];
  };

return { 
  build:build, 
  doclick:doclick, 
  flyover:flyover 
}
})(); // end of MINIBOX

//  TURTLE
var TURTLE = (function() {

var draw = function(str) { // {turtle x0 y0 a0 M100 T90 ...}
  var args = str.split(' ');
  var x0 = parseFloat(args[0]),
      y0 = parseFloat(args[1]),
      a0 = parseFloat(args[2])
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

return {draw:draw}

})();

//  LAMBDASHEET
var LAMBDASHEET = (function () {
// {sheet 12 4}
// {div {@ id="sheet_store"}°°######°°}
var data = [], jN, iN, current_cell_ref; 

var build = function () {
  var args = arguments[0].split(' ');
  var jmax = args[0] || 12;
  var imax = args[1] || 4;
	jN = parseInt(jmax)+1, iN = parseInt(imax)+1;
	var str = '{input {@ id="start" type="submit" value="start lambdasheet" '
  + 'onclick="LAMBDASHEET.start()"}} '
  + '{textarea {@ id="input" type="text" value="" '
  + 'style="display:none;width:99%;height:40px;"onfocus="select()" }} '
  + '{div {@ id="sheet_frame" '
  + 'style="border:1px solid;box-shadow:0 0 8px black;margin:5px 0" '
  + 'onclick="LAMBDASHEET.get_target(event.target);"}} '
  + '{input {@ id="clear" type="submit" value="clear" '
  + 'style="display:none" onclick="LAMBDASHEET.datas_clear()"}} '
  + '{input {@ id="publish" type="submit" value="save and publish" '
  + 'style="display:none" onclick="LAMBDASHEET.datas_publish()"}} ';
  return str;
};
var start = function () {
  display_create();
  document.getElementById('input').style.display = 'block';
  document.getElementById('start').style.display = 'none';
  document.getElementById('clear').style.display = 'inline-block';
  document.getElementById('publish').style.display = 'inline-block';
  datas_get();
  update();
  some_stuff(1,1);
};
var display_create = function() {
  var tbl  = document.createElement('table');
  tbl.style.background='#ffe';
  tbl.style.color = '#fff';
  tbl.style.textAlign = 'center';
  for(var j = 0; j < jN; j++) {
    var tr = tbl.insertRow(-1);
    tr.style.background='#ffe';
    tr.style.color = '#000';
    tr.style.textAlign = 'center';
    for(var i = 0; i < iN; i++) {
      var td = tr.insertCell(-1);
      td.id = j+'|'+i;
      var num = '';
      if (i==0 && j==0) num = '';
      else if (i>0 && j==0) num = i;
      else if (i==0 && j>0) num = j;
      else num = '';
      td.appendChild( document.createTextNode(num));
      if (i == 0 && j == 0) {
        td.style.background = '#fff';
        td.style.color = '#000';
        td.style.width = 30+'px';
      } else if (i != 0 && j == 0) {
        td.style.background = '#888';
        td.style.color = '#fff';
        td.style.width = Math.floor(95/(iN-1))+'%';
      } else if (i == 0 && j != 0) {
        td.style.background = '#888';
        td.style.color = '#fff';
      }
    }
  }
  document.getElementById('sheet_frame').appendChild(tbl);
};
var some_stuff = function ( j, i ) {
  current_cell_ref = j+'|'+i;
  document.getElementById(current_cell_ref).style.background = '#f00';
  document.getElementById(current_cell_ref).innerHTML = data[j][i].val;
  document.getElementById('0|0').innerHTML = j+'/'+i;
  document.getElementById('input').value = data[j][i].sxp;
  document.getElementById('input').focus();
};
var update = function () {
  for (var j = 1; j < jN; j++)
    for (var i = 1; i < iN; i++) {
      data[j][i].val = 
        LAMBDATALK.eval( data[j][i].sxp ).val;
      document.getElementById(j+'|'+i).innerHTML = data[j][i].val;
    }
};
var get_target = function (targ) {
  // called by a cell click
  var ji = targ.id.split('|');
  var jnew = ji[0], inew = ji[1];
  if (inew==0 || jnew==0) {
    document.getElementById(current_cell_ref).style.background = '#ffe';
    var ji = current_cell_ref.split('|');
    data[ji[0]][ji[1]].sxp = document.getElementById('input').value;
    some_stuff( ji[0], ji[1] );
  } else { // save previous and select the next
    document.getElementById(current_cell_ref).style.background = '#ffe';
    var ji = current_cell_ref.split('|');
    data[ji[0]][ji[1]].sxp = document.getElementById('input').value;
    some_stuff( jnew, inew );
  }
  update();
  datas_save();
};
var get_val = function (j,i) {  // called by {lc j i}
  var args = arguments[0].split(' ');
  var i = parseInt(args[0]);
  var j = parseInt(args[1]);
  return data[i][j].val;
};
var datas_get = function () { 
  var datas = document.getElementById('sheet_store').innerHTML;
  if (datas.match('######')) {             
    for (var j = 0; j < jN; j++) {
      for (var temp = [], i = 0; i < iN; i++)
        temp[i] = { sxp:'' , val:'' }; // empty cells
      data[j] = temp;
    }
  } else {
    datas = datas.replace( /#/g, '' ); 
    var arr = JSON.parse( datas ); 
    jN = arr.length;
    iN = arr[0].length;
    for (var j = 0; j < jN; j++) {
      for (var temp = [], i = 0; i < iN; i++)
        temp[i] = { sxp: arr[j][i] , val: '' };
      data[j] = temp;
    }
  }
};
var datas_save = function () {
  for (var arr = [], j = 0; j < jN; j++) {
    for (var temp = [], i = 0; i < iN; i++)
      temp[i] = data[j][i].sxp;
    arr[j] = temp;
  }
  var datas = JSON.stringify( arr );
  document.getElementById('sheet_store').innerHTML = datas;
  sheet_store_update( 'sheet_store', true );
};

var sheet_store_update = function ( sheet_store, flag ) {
  var code = document.getElementById('page_textarea').value; // old content
  var datas = (flag)? document.getElementById(sheet_store).innerHTML : '';
  code = code.replace( /###([\s\S]*)###/, '###'+datas+'###' );
  document.getElementById('page_textarea').value = code;     // new content
};

var datas_clear = function () {
  sheet_store_update ('sheet_store', false);
	document.getElementById('save_button').click();
};
var datas_publish = function () {
  sheet_store_update( 'sheet_store', true );
	document.getElementById('save_button').click();
};

return {
  build:build, 
  start:start,
  get_target:get_target,
  get_val:get_val, 
  datas_clear:datas_clear,
  datas_publish:datas_publish
};
})(); // end of LAMBDASHEET 

//  LAMBDALISP
// 1) inited by Peter Norvig's Python code 
// 2) inspired by the works of Sreedathns or Sainamdar
// 3) adapted by alain marty on 20131121 then 20160404
var LAMBDALISP = ( function () {

// 1) ENVIRONMENTS
// function creating an environment
var create_env = function (pars,args,out) {
  var env = {}, outer = out || {};
  if (0 !== pars.length)
    for (var i=0; i < pars.length; i++)
      env[pars[i]] = args[i];
  env.find = function (op) { 
  	return (env.hasOwnProperty(op))? env : outer.find(op) 
  };
  return env;
}
// create and start populating the primitive global environment
var global_e = create_env([],[]); // create_env( [], [], undefined );

// math operators
global_e['+'] = function () { // (+ 1 2 3 4) -> 1+2+3+4
  for (var r=0, i=0; i<arguments.length; i++) { r += Number( arguments[i] ) }
  return r; 
};
global_e['*'] = function () { // (* 1 2 3 4) -> 1*2*3*4
  for (var r=1, i=0; i<arguments.length; i++) { r *= arguments[i] }
  return r; 
};
global_e['-'] = function () {  // (- 1 2 3 4) -> 1-2-3-4
  var r = arguments[0];
  if (arguments.length == 1)  r = -r; // case (- 1) -> -1
  else for (var i=1; i<arguments.length; i++) { r -= arguments[i] } 
  return r; 
};
global_e['/'] = function () { // (/ 1 2 3 4) -> 1/2/3/4
  var r = arguments[0];
  if (arguments.length == 1)  r = 1/r;     // case (/ 2) -> 1/2
  else for (var i=1; i<arguments.length; i++) { r /= arguments[i] } 
  return r; 
};
global_e['%'] = function () {
  return parseFloat(arguments[0]) % parseFloat(arguments[1]) };
global_e['++'] = function () { return Number(arguments[0]) + 1 };
global_e['--'] = function () { return arguments[0] - 1 };

// math JS functions
var mathfns = ['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 
'floor', 'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan'];
for (var i=0; i< mathfns.length; i++) {global_e[mathfns[i]] = Math[mathfns[i]]}
global_e['PI'] = function() { return Math.PI };
global_e['E']  = function() { return Math.E };

global_e['<']  = function(){
  return parseFloat(arguments[0]) < parseFloat(arguments[1]) };
global_e['>']  = function(){
  return parseFloat(arguments[0]) > parseFloat(arguments[1]) };
global_e['<=']  = function(){
  return parseFloat(arguments[0]) <= parseFloat(arguments[1]) };
global_e['>=']  = function(){
  return parseFloat(arguments[0]) >= parseFloat(arguments[1]) };
global_e['=']  = function () {
  var a = parseFloat(arguments[0]), b = parseFloat(arguments[1]);  
  return !(a < b) && !(b < a) 
};

// booleans
var falsy = function (x) {
  return ( x==false || x==null || x==undefined || x=='' || x==0 || x==NaN ) 
};
global_e['not'] = function () {
	return !arguments[0]
};
global_e['or'] = function () { 
  for (var i=0; i< arguments.length; i++) { if (arguments[i]) return true }
  return false; 
};
global_e['and'] = function () { 
  for (var i=0; i< arguments.length; i++) { if (arguments[i]) return false }
  return true; 
};

// operators on lists 
global_e['car'] = function(x) { return (x.length != 0)? x[0] : null };
global_e['cdr'] = function(x) { return (x.length > 1)? x.slice(1) : null }; 
global_e['cons'] = function() { return [].slice.call(arguments) }; 
global_e['list'] = function() { return [].slice.call(arguments) }; 
global_e['list?'] = function() { return Array.isArray([].slice.call(arguments)) };
global_e['null?'] = function(x) { return falsy(x) };
global_e['equal?'] = function(a, b){ return a === b };

global_e['join'] = function(){ return [].slice.call(arguments).join(' ') };
global_e['display'] = function() {
  console.log(arguments.toSource()); 
  return arguments.toSource() 
};       
// end populating global_e

// 2) EVALUATION
// some useful functions specific to JavaScript primitives
function isNumber(x) { return !isNaN(parseFloat(x)) && isFinite(x) }
function isSymbol(x) { return typeof x === 'string' }
function jsFormat(x) { // because the way Javascript plays with booleans
  if (x == null)        return null;
	else if (isNumber(x)) return x || 0;
	else                  return x || false; 
}

var evaluate = function (x, env) {
  env = env || global_e;
  if ( isNumber(x) ) {
    return x;
  } else if ( isSymbol(x) ) {    
    return env.find(x)[x];
  } else if ( x[0] === 'quote' ) {                      
    return x.slice(1);   //return x.slice(1).join(' ');                  
  } else if ( x[0] === 'if' ) {
   	return evaluate( (evaluate( x[1], env)? x[2] : x[3]), env ); 
  } else if ( x[0] === 'set!' ) {
    env.find(x[1])[x[1]] = evaluate( x[2], env); 
  } else if ( x[0] === 'def' ) {
    env[x[1]] = evaluate( x[2], env );  
    return x[1]; // return '[' + x[1] + ']';
  } else if ( x[0] === 'lambda' ) {
   	return function () { 
   	 	var new_env = create_env( x[1], arguments, env );
   	 	return evaluate( x[2], new_env ); 
   	}  
  } else if ( x[0] === 'begin' ) {
   	for (var xx = '', i=1; i<x.length; i++)
   	  xx = evaluate( x[i], env );
   	return xx;
  } else {
   	for (var xx = [], i=0; i<x.length; i++)
   	  xx[i] = evaluate( x[i], env ); 
   	var proc = xx.shift();
    var val = proc.apply(null, xx);
    return jsFormat( val );
   }
}; // evaluate

//  3) PARSE : from an s-expression to a nested array

var balance = function ( str ) { // test balanced parens
  var acc_open = str.match( /\(/g );
  var acc_close = str.match( /\)/g );
  var nb_acc_open = (acc_open)?  acc_open.length : 0;
  var nb_acc_close = (acc_close)? acc_close.length : 0;
  return [nb_acc_open , nb_acc_close]; 
};  // balance

var catch_expr = function ( str ) { // return a balanced s-expression
  var start = str.indexOf( '(' );
  if (start == -1) // no symbol
    return 'none';
  var foo = '', nb = 1, index = start;
  while( nb>0) { 
  	if (index > 100000) { return 'none' }  // overloop security !
  	index++;
    if ( str.charAt(index) == '(' )  nb++;
    else if ( str.charAt(index) == ')' )  nb--;
  }
  foo = str.substring( start, index+1 );
  return foo;
}; // catch_expr

var tokenize = function ( s ) {  // return an array of tokens 
  return s.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);         
}; // tokenize

var build_tree = function (tokens) { // from flat array to nested array
	var token = tokens.shift();
	if (token !== '(') 
	  return token;
	var arr = [];
	while (tokens[0] !== ')')
		arr.push( build_tree(tokens) );
	tokens.shift();
	return arr;
}; // build_tree

var parser = function ( str ) {
  var  t0 = new Date().getTime();
  var bal = balance( str );
  var expr1 = 'none';
  while ( true ) {
    expr1 = catch_expr( str );
    if (expr1 == 'none') break;
    var expr2 = evaluate(build_tree(tokenize(expr1)));
    str = str.replace( expr1, expr2 );
  }
  str = str.replace (/\\n*/g, '\n');
  var  t1 = new Date().getTime();
  return { val:str, infos:[bal[0], bal[1], t1-t0] };
}; // parser

var get_val = function(str) { return parser(str).val; };

return {
  console:parser,    // LAMBDALISP.console( code );  val+infos
  get_val:get_val    // dict['lisp'] -> val only
}
}()); // END LAMBDALISP MODULUS
