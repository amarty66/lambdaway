/*  
  LAMBDAWAY: LAMBDACONSOLE | LAMBDATANK | LAMBDATALK | BUILTIN LIBRARIES

  alain marty | 2018/04/12 | update 2018/05/06 

  This software is subject to, and may be distributed under, the
  GNU General Public License, either Version 2 of the license,
  or (at your option) any later version. The license should have
  accompanied the software or you may obtain a copy of the license
  from the Free Software Foundation at http://www.fsf.org .
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
  See the GNU General Public License for more details.
*/

"use strict";

/*
  LAMBDATALK CAN BE CALLED IN A CONSOLE
  the file "index.html" must contain these three containers:
  <textarea id="page_code" onkeyup="LAMBDACONSOLE.update()">
  </textarea>
  <div id="page_infos"></div>
  <div id="page_view"></div>

  LAMBDACONSOLE.update() calls LAMBDATALK.do_eval()
  libraries can't be added in the console environment
*/

var getId = function(id) { return document.getElementById(id) }; // why not?

var LAMBDACONSOLE = (function() {

var update = function() {  // called in page_code
  var input = getId('page_code').value; 
  if (input == null) return;
  var output = LAMBDATALK.do_eval( input ); // {val:v, bal:b, time:t}
  if (output.val != 'none')                 // else don't waste time
    getId('page_view').innerHTML = output.val;
  getId('page_infos').innerHTML = '[' + output.time + 'ms] | ' 
  + '{' + output.bal.left + '|' + output.bal.right + '} | ['
  + input.length + '->' + output.val.length + ']';
};

return { update:update }
})();
// END OF LAMBDACONSOLE

/*
  LAMBDATALK IS PREFERABLY CALLED FROM LAMBDATANK
  the wiki frame built by the PHP.php file contains these three containers: 
  - <textarea id='page_code' onkeyup='LAMBDATANK.update()'></textarea>
  - <span     id='page_infos'></span>
  - <div      id='page_view'></div>

  LAMBDATANK.update() calls LAMBDATALK.include_libs()
  LAMBDATANL.display_update() calls LAMBDATALK.do_eval()
*/

var LAMBDATANK = (function() {

var timeout = null, delay = 500;

var update = function() {      // called by body onload or by keyup
  clearTimeout( timeout );
  timeout = setTimeout( do_update, delay );
};
var do_update = function() { 
  var ID = getId('page_code');
  if (ID === null)  return; 
  var code = ID.value;
  if (code === '')  return; 
  display_update( code );
};

var display_update = function(input) {
    var output = LAMBDATALK.do_eval( input );      // here is the evaluation!
    getId('page_infos').innerHTML = '[' + output.time + 'ms] | ' 
     + '{' + output.bal.left + '|' + output.bal.right + '} | ['
     + input.length + '->' + output.val.length + ']';
    if (output.val != 'none')
       getId('page_view').innerHTML = output.val;  // refresh the view
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
var getId = function(id) { return document.getElementById(id) };

return {
  update:update,
  display_update:display_update,
  toggle_display:toggle_display,
  toggle_visibility:toggle_visibility,
  doSave:doSave,
  doCancel:doCancel,
  getId:getId
}

})();	
// END OF LAMBDATANK

///// LAMBDATALK
/*
  three containers are supposed to exist in the calling environment:
  <textarea id="page_code"></textarea>
  <div id="page_infos"></div>
  <div id="page_view"></div>

  1) LAMBDATALK can be called by CONSOLE
  <textarea id="page_code" onkeyup="LAMBDACONSOLE.update()"></textarea>
  - LAMBDACONSOLE.update() calls LAMBDATALK.do_eval()

  2) LAMBDATALK can be called by LAMBDATANK 
  <textarea id='page_code' onkeyup='LAMBDATANK.update()'></textarea>
  - LAMBDATANK.update() calls LAMBDATALK.do_eval()
*/

var LAMBDATALK = (function() {

// defining and initializing globals
var DICT = {}, LAMB_num = 0;  // lambdas and defs
var QUOT = {}, QUOT_num = 0;  // quotes
var COND = {}, COND_num = 0;  // conditionals
var ARRA = {}, ARRA_num = 0;  // arrays
var CONS = {}, CONS_num = 0;  // conses, lists, trees
var MACR = {}, MACR_num = 0;  // macros
var DEBG = false, DEBG_index = 0, DEBG_trace = 'TRACE:\n';
var BROWSER_CACHE = true;

// 1) MAIN FUNCTION

var do_eval = function( str ) {
  var t0 = new Date().getTime(), bal;
  str = preprocessing(str);       // comments, blockquotes, builtin_macros
  bal = balance( str );
  if (bal.left === bal.right) {
//    str = eval_require(str);    // -> include libraries // update 2018/05/06
    str = eval_quotes(str);       // -> QUOT[_QUOT_xxx]
    str = eval_apos(str);         // -> QUOT[_QUOT_xxx]
    str = eval_require(str);      // -> include libraries // update 2018/05/06
    str = eval_macros(str);       // -> MACR[_MACR_xxx]
    str = eval_scripts(str);      // -> eval a script in a page
    str = eval_styles(str);       // -> eval a style in a page
    str = eval_lets(str);         // -> translate into lambdas
    str = abstract_lambdas(str);  // -> DICT[_LAMB_xxx]
    str = abstract_defs(str);     // -> DICT[name]
    str = abstract_ifs(str);      // -> COND[_COND_xxx]
    str = eval_forms(str);        // -> words
  } else {
    str = 'none';
  }
  if (DEBG) code_trace( 'OUTPUT: ' + str );
  str = postprocessing(str);      // update 2018/05/06 
  var t1 = new Date().getTime();
  return {val:str, bal:bal, time:t1-t0};
};

// 2) SIMPLE FORMS EVALUATION
 
var eval_forms = function( str ) {
  var loop_rex = /\{([^\s{}]*)(?:[\s]*)([^{}]*)\}/g;
  while (str != (str = str.replace( loop_rex, eval_form))) ;
  return str;
};
var eval_form = function() {
  var f = arguments[1] || '', r = arguments[2] || '';
  if (DEBG) code_trace( 'EVALUATING: {'+f+' '+r+'}' );
  return (DICT.hasOwnProperty(f))?
    // DICT[f].apply(null, [r]) : quote( '{'+f+' '+r+'}' );
    DICT[f].apply(null, [r]) : '('+f+' '+r+')';
};
// END OF SIMPLE FORMS EVALUATION

// 3) SPECIAL FORMS EVALUATION
// LAMBDA, DEF, IF, LET, QUOTE, APO, MACRO, SCRIPT, STYLE, REQUIRE

//// LAMBDA : {lambda {args} expression}

var abstract_lambdas = function(str) {
  while ( str !== ( str = form_replace( str, '{lambda', abstract_lambda ))) ;
  return str
};
var abstract_lambda = function(s){      // "{args} body"
  s = abstract_lambdas( s );            // nested lambdas
  var index = s.indexOf('}'),
      args = supertrim(s.substring(1, index)).split(' '),
      body = s.substring(index+2).trim(),
      name = '_LAMB_' + LAMB_num++;
  for (var reg_args=[], i=0; i < args.length; i++)
    reg_args[i] = RegExp( args[i], 'g');
  body = abstract_ifs( body );          // {if ...} -> COND[]
  DICT[name] = function() {
//  debug
    var vals = supertrim(arguments[0]).split(' ');
    if (vals[0] === '2string')          // display the lambda
      return quote('{lambda {' + args.join(' ') + '} ' + body +'}');
    if (vals[0] === 'args')             // display args
      return quote(args.join(' '));
    if (vals[0] === 'body')             // display body
      return quote(body);
//
    return function(bod) {
      bod = eval_ifs( bod, reg_args, vals ); // COND[] -> {if ...}
      bod = supertrim( bod );
      if (vals.length < args.length) {  // partial application
        for (var i=0; i < vals.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
        var _args_ = args.slice(vals.length).join(' ');
        bod = '{' + _args_ + '} ' + bod;
        bod = abstract_lambda( bod );   // create a lambda
      } else {                          // create a form
        for (var i=0; i < args.length; i++)
          bod = bod.replace( reg_args[i], vals[i] );
      }
      if (DEBG) code_trace( 'LAMBDA  -> ' + bod );
      return eval_forms( bod );  // 20171028 -> much fatser
    }(body);
  };
  return name;                          // return a reference
};

//// DEF : {def name expression}

var abstract_defs = function(str, flag) { 
  while ( str !== ( str = form_replace( str, '{def', abstract_def, flag ))) ;
  return str
};
var abstract_def = function (s, flag) {    // "name body"
  flag = (flag === undefined)? true : false;
  s = abstract_defs( s, false );           // nested defs
  var index = s.search(/\s/),              // match spaces AND cr
      name  = s.substring(0, index).trim(),
      body  = s.substring(index).trim(); 
  if (body.substring(0,6) === '_LAMB_') {  // if it is a lambda
    DICT[name] = DICT[body];
    delete DICT[body];
  } else {
     body = eval_forms(body);
     DICT[name] = function() { return body };
  }
  return (flag)? name : '';                // return a reference
};

//// IF : {if bool then one else two}

var abstract_ifs = function(str) {
  while ( str !== ( str = form_replace( str, '{if', abstract_if ))) ;
  return str
};
var abstract_if = function(s){          // "bool then one else two"
  s = abstract_ifs( s );
  var name = '_COND_' + COND_num++;
  var index1 = s.indexOf( 'then' ),
      index2 = s.indexOf( 'else' ),
      bool   = s.substring(0,index1).trim(),
      one    = s.substring(index1+5,index2).trim(),
      two    = s.substring(index2+5).trim();
  COND[name] = [bool,one,two];
  return name;
};
var eval_ifs = function(bod, reg_args, vals) { 
   // when reg_args and vals are defined 
   // _COND_xxx is evaluated in abstract_lambda()
   // else in post_processing()
   // partial evaluation requires at least an evaluable bool term
   var m = bod.match( /_COND_\d+/ );
   if (m === null) {
     return bod
   } else {  // bod contains one (nested) {if bool then one else two}
     var name = m[0];
     var cond = COND[name]; 
     if (cond === undefined) return bod;
     var bool = cond[0], one  = cond[1], two  = cond[2];
         // if (reg_args !== undefined) {
         if (reg_args !== undefined && vals !== undefined) {
           for (var i=0; i < vals.length; i++) { // and not reg_args.length
             bool = bool.replace( reg_args[i], vals[i] ); 
             one  = one.replace(  reg_args[i], vals[i] ); 
             two  = two.replace(  reg_args[i], vals[i] ); 
           }
         }
     var boolval = (eval_forms(bool) === 'true') ? one : two;
     bod = bod.replace( name, boolval );
     bod = eval_ifs( bod, reg_args, vals );  // ???
     return bod
   }
};

//// LET : {let { {a0 e0} ... {an en} } body} 

var eval_lets = function(str, flag) {
  while ( str !== ( str = form_replace( str, '{let', eval_let ))) ;
  return str
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

//// QUOTE : {quote ...} or '{...} -> _QUOT_xxx

var eval_quotes = function(str) {
  while ( str !== ( str = form_replace(str, '{quote', eval_quote ))) ;
  return str
};
var eval_apos = function(str) {
  while ( str !== ( str = apo_replace(str, "'{", eval_quote ))) ;
  return str
};
var eval_quote = function(s) {
  s = eval_quotes( s ); // {quote ... {quote ...} ...}
  return quote( s );
};

//// MACRO : {macro regexp to lambdatalk expression}

var eval_macros = function(str) {
  while ( str !== ( str = form_replace( str, '{macro', eval_macro ))) ;
  for (var key in MACR)
    str = str.replace( MACR[key].one, MACR[key].two );
  return str;
};
var eval_macro = function(s) {
  // s = eval_macros( s );
  var index = s.indexOf('to'),
      one = supertrim(s.substring(0, index)),
      two = supertrim(s.substring(index+2));
  one = RegExp( one, 'g' );
  two = two.replace( /€/g, '$' ); // because of PHP conflicts with $
  var name = '_MACR_' + MACR_num++;
  MACR[name] = {one:one, two:two };
  return '';
};

//// SCRIPT : {script some JS code}

var eval_scripts = function(str) { 
  while ( str !== ( str = form_replace( str, '{script', eval_script ))) ;
  return str
};
var eval_script = function (s) {    // some JS code
  var js = document.createElement('script');
  js.innerHTML = unquote( s );
  document.head.appendChild( js );
  // document.head.removeChild( js ); // maybe not
  console.log( '[ok script]' );
  return ''
};

//// STYLE : {style some CSS code}

var eval_styles = function(str) { 
  while ( str !== ( str = form_replace( str, '{style', eval_style ))) ;
  return str
};
var eval_style = function (s) {    // some CSS code
  var cs = document.createElement('style');
  cs.innerHTML = unquote( s );
  document.head.appendChild( cs );
  // document.head.removeChild( cs ); // don't do that !
  console.log( '[ok style]' );
  return ''
};

//// REQUIRE : {require lib_xxx lib_yyy ...}
var LIBS_CONTENT = '', CODE = '', libs_count = 0, intervalID = null;

var eval_require = function(str) {
  var libs = catch_form( '{require ', str );
  if (libs === 'none') {
    return str;
  } else {
    CODE = str.replace( '{require ' + libs + '}', '' );
    libs = libs.trim().split(' ')
    libs_count = libs.length;
    for (var i=0; i < libs_count; i++) 
      call_lib( libs[i] );
    intervalID = setTimeout( libs_loaded, 10000 );
  }
  return 'Including libraries...';
};

var call_lib = function ( lib ) {
  var bustCache = (BROWSER_CACHE)? '' : ('?' + new Date().getTime());     
  var ajax = new XMLHttpRequest();
  ajax.open('GET', 'pages/' + lib + '.txt' + bustCache, true);
  ajax.send(null);
  ajax.onreadystatechange = function () {
    if (ajax.readyState == 4) {
      LIBS_CONTENT += decodeHtmlEntity( ajax.responseText );
      libs_count--;
      if (libs_count === 0)
        return libs_loaded();
    }
  };
};

var libs_loaded = function () {
  if (libs_count === 0) {
     clearTimeout( intervalID );
     LIBS_CONTENT = '{div {@ style="display:none"}' + LIBS_CONTENT + '}';
     var newcode = LAMBDATANK.display_update( LIBS_CONTENT + CODE );
     LIBS_CONTENT = '';
     CODE = '';
     return newcode
  } else {
     LIBS_CONTENT = '';
     CODE = '';
     libs_count = 0;
     intervalID = null;
     return 'Call libs failed.'
  }
};

// END OF SPECIAL FORMS EVALUATION

// 4) HELPER FUNCTIONS 
var balance = function ( str ) { // locks the evaluation if unbalanced
  var strt    = str.match( /\{/g ), 
      stop    = str.match( /\}/g ), 
      nb_strt = (strt)? strt.length : 0,
      nb_stop = (stop)? stop.length : 0;
  return {left:nb_strt, right:nb_stop}; 
};

var catch_form = function( symbol, str ) {
  var start = str.indexOf( symbol );
  if (start == -1) return 'none';
  var d0, d1, d2;
  if (symbol === "'{")     { d0 = 1; d1 = 1; d2 = 1; } // '{first rest} 
  else if (symbol === "{") { d0 = 0; d1 = 0; d2 = 1; } // {:x v} in let
  else         { d0 = 0; d1 = symbol.length; d2 = 0; } // {symbol ...}
  var nb = 1, index = start+d0;
  while(nb > 0) { index++;
         if ( str.charAt(index) == '{' ) nb++;
    else if ( str.charAt(index) == '}' ) nb--;
  }
  return str.substring( start+d1, index+d2 )
};
var form_replace = function(str, sym, func, flag){     // special forms
  sym += ' ';
  var s = catch_form( sym, str );
  return (s==='none')? str : str.replace(sym+s+'}',func(s,flag))
};
var apo_replace = function(str, symbol, func){         // '{first rest}
  var s = catch_form( symbol, str );
  return (s==='none')? str:str.replace("'"+s,func(s))
};

var preprocessing = function (str) {
  str = comments( str );          // clear comments
  str = HTML_tags( str );         // could be ignored
  str = block2quote( str );       // quote blocks °° ... °°
  str = HTML_macros( str );       // _h1,..,_h6,_p,_ul,_ol
  return str;
};
var postprocessing = function (str) {
  str = unquote(str);             // _QUOT_xxx -> {first rest} 
  str = cond_display(str);        // _COND_xxx -> bool? one : two
  str = array_display(str);       // _ARRA_xxx -> [[a,b],[c,d]]
  str = cons_display(str);        // _CONS_xxx -> ((a b) (c d))
  str = syntax_highlight(str);
  if (DEBG) console.log( unquote( DEBG_trace ) + counter() );
  // globals reset
  // QUOT = {}; COND = {}; CONS = {}; 
  // ARRA = {}; MACR = {}; 
  LAMB_num = 0; QUOT_num = 0; COND_num = 0; 
  CONS_num = 0; ARRA_num = 0; MACR_num = 0;
  DEBG_index = 0; DEBG_trace = 'TRACE\n';
  return str;
};

var comments = function (str) {
  str = str.trim()
           .replace( /°°°[\s\S]*?°°°/g, '' )  // delete multiline comments
           .replace( /;;(.*?)\n/g, '\n' );    // delete one line comments
  return str;
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
var HTML_tags = function(str) {  // HTML <tags ...> -> [tags ...]
  return str.replace( /{<= /g, '__lte__' )        // save {<= ...}
            .replace( /{< /g, '__lt__' )          // save {< ...}
            .replace( /<([^<>]*?)>/g, '< $1 >' )  // breaks HTML tags
            .replace( /__lte__/g, '{<= ' )        // retrieve {<= ...}
            .replace( /__lt__/g, '{< ' )          // retrieve {< ...}
};
var HTML_macros = function(str) {
  str += '\n'; // add a CR at the end for "closing" a final alternate form  
  str = str.replace( /_h([1-6]) (.*?)\n/g, '{h$1 $2}' )      // titles
           .replace( /_p (.*?)\n/g, '{p $1}' )               // paragraphs
           .replace( /_ul(\w*?) ([^\n]*?)\n/g, do_ul ) // ul
           .replace( /_ol(\w*?) ([^\n]*?)\n/g, do_ol ) // ol
           .replace( /\[\[([^\[\]]*?)\]\]/g, doWikiLink )   // wiki-links
           .replace( /_img (.*?)\n/g, '{img {@ src="$1"  width="100%"}}' );
  return str;
};
var do_ul = function( _, d, t ) {  // ul and ulxxx where xxx = margin-left 
  d = d | 0;
  return '{div {@ style="margin-left:' + (20 + d) + 'px;' +   
         'text-indent:-1em; padding:0px;' + 
         'text-align:justify;"}• ' + t + '}';
};
var do_ol = function( _, d, t ) {  // ul without • add numbers manually
  d = d | 0;
  return '{div {@ style="margin-left:' + (20 + d) + 'px;' +   
         'text-indent:-1em;' + 
         'text-align:justify;"} ' + t + '}';
};
var doWikiLink = function ( _, nom ) { 
  // wikilinks alternatives to {a {@ src=""...}}
  if (nom.match( /\|/ )) { // [[nom|URL]]  -> <a href="URL">nom</a>
    var tab = nom.split( '|' );
    return '{a {@ href="' + tab[1] + '"}' + tab[0] + '}';
  }
  else                     // [[nom]]  -> <a href="?view=nom">nom</a>
    return '{a {@ href="?view=' + nom + '"}' + nom + '}'; 
};
var decodeHtmlEntity = function(str) {
  // https://gist.github.com/CatTail/4174511
  return str.replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  });
};
var supertrim = function(str) { // clean heading, trailing and multi spaces
    return str.trim().replace(/\s+/g, ' ');
};
var quote = function(str){      // {first rest} -> _QUOT_xxx
  var name = '_QUOT_' + QUOT_num++;
  QUOT[name] = str;
  return name;
};
var unquote = function(str) {   // _QUOT_xxx -> {first rest}
  str = str.replace( /_QUOT_\d+/g, function(v) { return QUOT[v] });
  return str;
};
var cond_display = function(str) {  // _COND_xxx -> bool? one : two
  str = str.replace( /_COND_\d+/g,
    function(c) { return eval_forms( eval_ifs( c ) ) });
  return str;
};
var array_display = function(str) { // _ARRA_xxx -> [a,b,c,d]
  str = str.replace( /_ARRA_\d+/g, 
    function(v) { return eval_forms( '{array.disp ' + v + '}' ) });
  return str;
};
var cons_display = function(str) {  // _CONS_xxx -> ((a b) (c d))
  str = str.replace( /_CONS_\d+/g, 
    function(v) { return eval_forms( '{cons.disp ' + v + '}' ) });
  return str;
};
var syntax_highlight = function( str ) { // highlight {} and special forms 
  str = str.replace( /\{(lambda |def |if |let |quote |macro )/g,
            '<span style="color:#f00;">{$1</span>' )
           .replace( /(\{|\})/g, '<span style="color:#888">$1</span>' )
;
  return str;
};
var code_trace = function( str ) {
  return DEBG_trace += DEBG_index++ + ': ' + str + '\n';
};
var counter = function() {
  var str = '\nLengths of:\n' 
          + 'LAMBDAS = ' + LAMB_num + '\n'
          + 'QUOT = ' + QUOT_num + '\n'
          + 'COND = ' + COND_num + '\n'
          + 'ARRA = ' + ARRA_num + '\n'
          + 'CONS = ' + CONS_num + '\n'
          + 'MACR = ' + MACR_num + '\n'
  return str;
};
// END OF HELPER FUNCTIONS

///// 5) DICTIONARY 
// DICT is public and could theoretically be initially empty, 
// a first set of primitives is defined inside LAMBDATALK
// a second set is defined outside in this file
// a third set is defined outside in wiki pages

DICT['debug'] = function() { // {debug true|false}
  var args = arguments[0];
  DEBG = (args === 'true')? true : false;
  return ''
};
DICT['browser_cache'] = function() { // {browser_cache true|false}
  var args = arguments[0]; 
  BROWSER_CACHE = (args === 'true')? true : false;
  return ''
};

DICT['lib'] = function () { // {lib} -> list functions in DICT
  var str = '', index = 0;
  for (var key in DICT) {
    if(DICT.hasOwnProperty(key) && !key.match('_LAMB_')) { 
      str += key + ', '; index++; 
    }
  }
  return '<b>DICTionary: </b>(' + 
         index + ') [ ' + str.substring(0,str.length-2) + ' ]<br /> ';
};
DICT['eval'] = function() { // {eval '{+ 1 2}}
  var s = arguments[0];
  return eval_forms(unquote(s)); // or eval(unquote(s)).val
};
DICT['apply'] = function() { // {apply + 1 2}
  var s = supertrim(arguments[0]).split(' '),
      first = s.shift(),
      rest = s.join(' ');
  return eval_forms( '{' + first + ' ' + rest + '}' )
};

//// BOOLEANS

DICT['<'] = function() {      // {< one two}
  var s = supertrim(arguments[0]).split(' ');
  return parseFloat(s[0]) < parseFloat(s[1])
};
DICT['>'] = function() {      // {< one two}
  var s = supertrim(arguments[0]).split(' ');
  return parseFloat(s[0]) > parseFloat(s[1])
};
DICT['<='] = function() { // see pre-processing
  var terms = supertrim(arguments[0]).split(' '); 
  return parseFloat(terms[0]) <= parseFloat(terms[1]) 
};
DICT['>='] = function() { // see pre-processing
  var terms = supertrim(arguments[0]).split(' '); 
  return parseFloat(terms[0]) >= parseFloat(terms[1]) 
};
DICT['='] = function() {      // {= one two}
  var s = supertrim(arguments[0]).split(' '),
      a = parseFloat(s[0]), b = parseFloat(s[1]); 
  return !(a < b) && !(b < a) 
};
DICT['not'] = function () { 
  var term = supertrim(arguments[0]); 
  return (term === 'true') ? 'false' : 'true';
};
DICT['or'] = function () {
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret='false', i=0; i< terms.length; i++)
    if (terms[i] == 'true')
      return 'true';
  return ret;
};
DICT['and'] = function () { // (and (= 1 1) (= 1 2)) -> false 
  var terms = supertrim(arguments[0]).split(' '); 
  for (var ret='true', i=0; i< terms.length; i++)
    if (terms[i] == 'false')
      return 'false';
  return ret;
};

//// MATHS

DICT['+'] = function(){       // {+ 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  if (s[0] == '') return 0; // {+}
  else if (s.length == 1) return parseFloat(s[0]); // {+ 1}
  else if (s.length == 2) return parseFloat(s[0])+parseFloat(s[1]);
  else return s.reduce(
     function(x,y){return parseFloat(x)+parseFloat(y)})
};
DICT['-'] = function(){       // {- 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  if (s[0] == '') return 0; // {-}
  else if (s.length == 1) return -s[0]; // {- 1}
  else if (s.length == 2) return s[0]-s[1];
  else return s.reduce(function(x,y){return x-y })
};
DICT['*'] = function(){       // {* 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  if (s[0] == '') return 1; // {*}
  else if (s.length == 1) return s[0]; // {* 1}
  else if (s.length == 2) return s[0]*s[1];
  else return s.reduce(function(x,y){return x*y })
};
DICT['/'] = function(){       // {/ 1 2 3 ... n}
  var s = supertrim(arguments[0]).split(' ');
  if (s[0] == '') return 1; // {1}
  else if (s.length == 1) return 1/s[0]; // {/ 2}
  else if (s.length == 2) return s[0]/s[1];
  else return s.reduce(function(x,y){return x/y })
};
DICT['%']  = function() { 
  var args = supertrim(arguments[0]).split(' '); 
  return parseFloat(args[0]) % parseFloat(args[1]) 
};

var mathtags = ['abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 'pow', 'log', 'random', 'round', 'sin', 'sqrt', 'tan', 'min', 'max'];
for (var i=0; i< mathtags.length; i++) {
  DICT[mathtags[i]] = function(tag) {
    return function() { 
      return tag.apply( null, supertrim(arguments[0]).split(' ') )
    } 
  }(Math[mathtags[i]]);  
} 
DICT['PI'] = function () { return Math.PI };
DICT['E']  = function () { return Math.E };
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

//// STRINGS

DICT['equal?'] = function() { // {equal? word1 word2}
  var args = supertrim(arguments[0]).split(' ');
  return args[0] === args[1]; 
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

//// PAIRS & LISTS

DICT['cons'] = function() {  // {cons a b}
  var args = supertrim(arguments[0]).split(' '); // [a,b]
  var name = '_CONS_' + CONS_num++;
  CONS[name] = args;
  return name; 
}; 
var isCons = function (z) { 
  return (z !== undefined)? z.substring(0,6) === '_CONS_' : false
};
DICT['cons?'] = function () {
  var z = arguments[0];
  return ( isCons(z) )? 'true' : 'false';
};
DICT['car'] = function() {
  var z = arguments[0];
  return ( isCons(z) )? CONS[z][0] : z; 
};
DICT['cdr'] = function() {
  var z = arguments[0];
  return ( isCons(z) )? CONS[z][1] : z; 
};
DICT['cons.disp'] = function () { 
// {cons {cons 12 34} {cons 56 78}}            -> ((12 34) (56 78))
// {cons 12 {cons 34 {cons 56 {cons 78 nil}}}} -> (12 (34 (56 (78 nil))))
  var recur = function (z) {
    return ( isCons(z) )?  
       '(' + recur( CONS[z][0] ) + ' ' + recur( CONS[z][1] ) + ')' : z;
  };
  var z = arguments[0];
  return ( isCons(z) )? recur( z ) : z;
};

// lists are special composition of conses
// defined as {cons 12 {cons 34 {cons 56 nil}}}
DICT['list'] = DICT['list.new'] = function () {
  var recur = function (arr) {
    return (arr.length > 0)?
       '{cons ' + arr.shift() + ' ' + recur( arr ) + '}' : 'nil';
  };
  var args = supertrim(arguments[0]);
  if (args === '') return '()';
  return recur( args.split(' ') )
};
DICT['list.disp'] = function () { 
// {list 12 34 56} -> 12 34 56
  var z = arguments[0];
  var recur = function (z) {
    return (z !== 'nil')? CONS[z][0] + ' ' + recur( CONS[z][1] ) : '';
  };
  return ( isCons(z) )? recur( z ) : z;
};
DICT['list.null?'] = function () { // equivalent to {equal? z nil}
  var z = arguments[0];
  return (z === 'nil' || z === '()') ? 'true' : 'false'
};
DICT['list.length'] = function () {
  var z = arguments[0];
  var recur = function (z,n) {
    return (z !== 'nil')? recur(CONS[z][1], n+1) : n;
  };
  return ( isCons(z) )? recur(z,0) : 0;
};
DICT['list.reverse'] = function () {
  var z = arguments[0];
  var recur = function (z,r) {
   return (z === 'nil')? r : recur(CONS[z][1],
       '{cons ' + CONS[z][0] + ' ' + r +'}' );
  };
  return (z !== 'nil')? recur(z, 'nil') : 'nil';
};

DICT['list.first'] = function () {
  var z = arguments[0];
  return ( isCons(z) )? CONS[z][0] : z; 
};
DICT['list.butfirst'] = function () {
  var z = arguments[0];
  return ( isCons(z) )? CONS[z][1] : z; 
};
DICT['list.last'] = function () {
  var recur = function (z) {
    return (CONS[z][1] === 'nil')? CONS[z][0] : recur( CONS[z][1] );
  };
  var z = arguments[0];
  return ( isCons(z) )? recur( z.split(' ') ) : z;
};
DICT['list.butlast'] = function () {
  var z = arguments[0];
  return ( isCons(z) )? z : z;  // Wait ...
};

//// ARRAYS
/*
https://developer.mozilla.org/fr/docs/Web/JavaScript/
        Reference/Objets_globaux/Array
waiting for:
includes indexOf join lastIndexOf toString splice! copyWithin! fill!
*/
DICT['array'] =
DICT['array.new'] = function () { // {array.new 12 34 56} -> [12,34,56]
  var args = supertrim(arguments[0]);
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = (args != '')? args.split(' ') : [];
  return name;
};
var isARRA = function (z) {
  return (z !== '' && z.substring(0,6) === '_ARRA_') 
};

DICT['array.disp'] = function () { // {array.disp z} or {z}
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
DICT['array.array?'] = function () { // {array.array? z}
  var args = arguments[0].trim();
  return (isARRA(args))? 'true' : 'false';
};
DICT['array.null?'] = function () { // {array.null z}
  var args = arguments[0].trim();
  return ARRA[args][0] === undefined;
};
DICT['array.length'] = function () { // {array.length z}
  var args = arguments[0].trim(); // z
  return (isARRA(args))? ARRA[args].length : 0;
};
DICT['array.in?'] = function() { // {array.in? :a :v}
  var args = supertrim(arguments[0]).split(' ');
  return (ARRA[args[0]].lastIndexOf(args[1]) !==-1)? 'true' : 'false'
};
DICT['array.item'] = 
DICT['array.get'] = function () { // {array.item z i}
  var args = supertrim(arguments[0]).split(' '); // [z,i]
  return (isARRA(args[0]))? ARRA[args[0]][args[1]] : args[0];
};
DICT['array.first'] = function () { // {array.first z}
  var args = arguments[0].trim(); // z
  return ARRA[args][0];
};
DICT['array.last'] = function () { // {array.last z}
  var args = arguments[0].trim(); // z
  return ARRA[args][ARRA[args].length-1];
};
DICT['array.rest'] = function () { // {array.rest z}
  var args = arguments[0].trim(); // z
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args].slice(1); // a new one
  return name;
};
DICT['array.slice'] = function () { // {array.slice z i0 i1}
  var args = supertrim(arguments[0]).split(' '); // [z,i0,i1]
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].slice(args[1],args[2]); // a new one
  return name;
};
DICT['array.concat'] = function () { // {array.concat z1 z2}
  var args = supertrim(arguments[0]).split(' '); // [z1,z2]
  var name = '_ARRA_' + ARRA_num++;
  ARRA[name] = ARRA[args[0]].concat(ARRA[args[1]]); // a new one
  return name;
};

///// the input array is modified
DICT['array.set!'] = function () { // {array.set! z i val}
  var args = supertrim(arguments[0]).split(' '); // [z,i,val]
  ARRA[args[0]][args[1]] = args[2];
  return args[0];
};
DICT['array.push!'] = 
DICT['array.addlast!'] = function () { // {array.push! z val}
  var args = supertrim(arguments[0]).split(' '); // [z,val]
  ARRA[args[0]].push( args[1] );
  return args[0];
};
DICT['array.pop!'] = 
DICT['array.sublast!'] = function () { // {array.pop! z}
  var args = arguments[0].trim(); // z
  ARRA[args].pop();
  return args;
};
DICT['array.unshift!'] =
DICT['array.addfirst!'] = function () { // {array.unshift! z val}
  var args = arguments[0].trim().split(' '); // [z,val]
  ARRA[args[0]].unshift( args[1] );
  return args[0];
};
DICT['array.shift!'] =
DICT['array.subfirst!'] = function () { // {array.shift! z}
  var args = supertrim(arguments[0]);
  ARRA[args].shift();
  return args;
};
DICT['array.reverse!'] = function () { // {array.reverse! z}
  var args = supertrim(arguments[0]);
  ARRA[args].reverse();
  return args;
};
DICT['array.sort!'] = function () { // {array.sort! comp z }
  var args = supertrim(arguments[0]).split(' ');
  if (args[0] === '<') 
     ARRA[args[1]].sort( function(a,b) { return a - b } );
  else
     ARRA[args[1]].sort( function(a,b) { return b - a } );
  return args[1];
};

//// HTML/CSS/SVG

DICT['@'] = function() {
  return '@@' + supertrim(arguments[0]) + '@@';
};
var htmltags = [
'div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'u', 'center', 'hr', 'blockquote', 'sup', 'sub', 'del', 'code', 'img', 'pre', 'textarea', 'canvas', 'audio', 'video', 'source', 'select', 'option', 'object', 
'svg', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'path', 'text', 'g', 'mpath', 'use', 'textPath', 'pattern', 'image', 'clipPath', 'defs', 'animate', 'set', 'animateMotion', 'animateTransform', 'title', 'desc'
];
for (var i=0; i< htmltags.length; i++) {
  DICT[htmltags[i]] = function(tag) {
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
DICT['br'] = function() { return '<div></div>'; }; // avoid extra space
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

//// SOME OTHERS

DICT['mailto'] = function () { // {mailto john•martin_at_free•fr}
  var args = arguments[0];
  var mail = args.replace(/•/g, '.').replace(/_at_/, '@');
  return '<a href="mailto:'+mail+'">'+args+'</a>';
};
DICT['back'] = function () { // {back}
  return '<a href="javascript:history.go(-1);">back</a>';
};
DICT['hide'] = function () { // {hide}
  return eval_forms( 'div {@ style="display:none;"}' );
};
// https://rosettacode.org/wiki/Long_multiplication#JavaScript
DICT['long_mult'] = function () {
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

DICT['turtle'] = function () {

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

  return draw( supertrim(arguments[0]) );
};



//// 6) public functions

return {
  do_eval:do_eval,        // -> {evaluated forms,{} balance,time}         
//  include_libs:include_libs,
  eval_forms:eval_forms,  // ..
  DICT:DICT,              // extending DICT -> CAUTION!!!
  catch_form:catch_form,  // needed by SECTIONEDIT
  quote:quote,            // may be useful
  unquote:unquote,        // ..
  supertrim:supertrim     // ..
}

})();
// END OF LAMBDATALK




///// ADDITIONS TO DICT BUILT IN THIS FILE
/*
     functions/modules currently defined:
     DRAG NOTE SHOW LIGHTBOX MINIBOX
     SECTIONEDIT FORUM TOC LAMBDALISP
     (BIGNUMBER SHEET) stored in wiki pages
*/

///// 
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
  return '<div style="cursor:move;background:red; width:10px; height:10px; line-height:20px; border:1px solid black;" onmousedown="DRAG.beginDrag( this.parentNode, event );">&nbsp;</div>';
};
return {  beginDrag:beginDrag, drag:drag }
})();

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['drag'] = function () { return DRAG.drag() };

/////  NOTE
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['note'] = function () {
  return NOTE.note(arguments[0]) 
};
LAMBDATALK.DICT['note_start'] = function () {
  return NOTE.note_start(arguments[0]) 
};
LAMBDATALK.DICT['note_end'] = function () { 
 return NOTE.note_end(arguments[0]) 
};

///// SHOW
var SHOW = (function() {

var build = function () {
  var attr = arguments[0].match( /@@[\s\S]*?@@/ );
  if (attr == null) return 'waiting for src, width, height, title';
  var h = attr[0].match( /height\s*=\s*"([\d]+)"/ );
  var w = attr[0].match( /width\s*=\s*"([\d]+)"/ );
  var s = attr[0].match( /src\s*=\s*"(.*?)"/ );
  var t = attr[0].match( /title\s*=\s*"(.*?)"/ );
  h = (h !== null)? h[1] : 100;
  w = (w !== null)? w[1] : 300;
  s = (s !== null)? s[1] : 'data/happydog.jpg';
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['show'] = function () { 
  return SHOW.build( LAMBDATALK.supertrim(arguments[0]) )
};

///// LIGHTBOX
var LIGHTBOX = (function() {

var build = function () {
    var args = arguments[0];
    var attr = args.match( /@@[\s\S]*?@@/ );
    if (attr == null) return 'waiting for width, height, thumb';
    args = args.replace( attr[0], '' ).trim(); // extract attributes
    var attr = attr[0].replace(/^@@/, '').replace(/@@$/, ''); // clean attributes
    var h_start = attr.match( /height\s*=\s*"([\d]+)"/ );
    var w_end   = attr.match( /width\s*=\s*"([\d]+)"/ );
    var h_butt  = attr.match( /thumb\s*=\s*"([\d]+)"/ );
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['lightbox'] = function () {
  return LIGHTBOX.build( LAMBDATALK.supertrim(arguments[0]) )
};

///// MINIBOX
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['minibox'] = function() {
  return MINIBOX.build( LAMBDATALK.supertrim(arguments[0]) )
};

/////  SECTIONEDIT
var SECTIONEDIT = (function() {
// associated with "editable" in the LAMBDATALK DICT :
// DICT['editable'] = function () { // {editable num any text }
//   return SECTIONEDIT.create( arguments[0].split(' ') ) 
// };
// CAUTION : due to a LAMBDATALK.catch_form() limit/issue/bug
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
  code = document.getElementById('page_code').value;
  oldval =  LAMBDATALK.catch_form( 'editable ' + id, code );
  content = document.getElementById(id).nextSibling.innerHTML;
  document.getElementById(id).nextSibling.innerHTML =
    '<div style="opacity:0.5;">' + content + '</div>'
    + '<textarea id="temp_' + id 
    + '" style="width:100%; height:200px;">' + oldval + '</textarea><br/>'
    + '<input type="submit" value="save" onclick="SECTIONEDIT.section_save('
    + id + ')" />'
    + '<input type="submit" value="cancel" onclick="SECTIONEDIT.section_cancel('
    + id + ')" />';
  button_edit_disable( true );
};
var section_save = function ( id ) {
  var newval = document.getElementById('temp_'+id).value;
  document.getElementById('page_code').value = code.replace( oldval, newval );
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['editable'] = function () { 
  return SECTIONEDIT.create( arguments[0] );
};

///// FORUM
var FORUM = (function() { // call by DICT['forum']

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

var add_message = function ( nom ) { // associated with DICT['forum']
  var mess = document.getElementById('blog_' + nom).value;
  if (!mess) return;
  var code = document.getElementById('page_code').value;
  var name = document.getElementById('name_' + nom).value || 'anonymous';
  var time = LAMBDATALK.eval_forms('{date}');
  mess = '{br}{b From ' + name + '} [{i ' 
       + time + '}]\n{blockquote ' + mess + '}\n';
  var temp = '{forum ' + nom + '}';
  document.getElementById('page_code').value = 
       code.replace( temp, temp + '\n' + mess );
  document.getElementById('save_button').click(); 
};

return {create:create, add_message:add_message}
})();	// end of FORUM

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['forum'] = function () {
  return FORUM.create( arguments[0] || '#forum#' );
};

/////  TOC TABLE OF CONTENT
var TOC = (function() {

var build = function ( id, toc, content ) {
/*
{input {@ type="submit" value="TABLE OF CONTENT" 
          onclick="TOC.build( this, 'TOC', 'CONTENT' )"}}
{div {@ id="TOC"}}
{div {@ id="CONTENT"} ... }
*/
  id.disabled = 'disabled';
  var tocDiv = getId(toc);
  var content = getId(content);
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
///// waiting for an interface to the LAMBDATALK DICTionary

