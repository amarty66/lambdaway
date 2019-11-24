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

//// LAMBDATALK can be called in the wiki called LAMBDATANK

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

// Extensions to LAMBDATALK for LAMBDATANK

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

/////  4) SECTIONEDIT  (for retro-compatibility, use block_edit instead)
var SECTIONEDIT = (function() {
// CAUTION : due to a LAMBDATALK.catch_form() limit/issue/bug
// num must be followed by at least one "true" space, not a line return
var code = '', content = '', oldval = '';

var create = function ( args ) {
  args = args.split(' ');
  var num = args.shift();
  var content = args.join(' ').trim();
  return '{input {@ id="'
  + num + '" class="sectionedit" type="submit" value="edit"'
  + ' style="float:left; margin-left:-45px;"'
  + ' onclick="SECTIONEDIT.section_open(this.id)"}}'
  + '{div {@ style="border:1px dashed #ccc;"}' + content + '}';
};
var section_open = function ( id ) {
  code = document.getElementById('page_textarea').value;
  oldval =  LAMBDATALK.catch_form( "{editable " + id + " ", code );
  content = document.getElementById(id).nextSibling.innerHTML;
  document.getElementById(id).nextSibling.innerHTML =
    '<div style="opacity:0.5;">' + content + '</div><textarea id="temp_' + id + '" '
    + 'style="width:99%; height:200px;">' + oldval + '</textarea><br/>'
    + '<input type="submit" value="save" onclick="SECTIONEDIT.section_save(' + id + ')" />'
    + '<input type="submit" value="cancel" onclick="SECTIONEDIT.section_cancel(' + id + ')" />';
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

///// added as an interface to the LAMBDATALK DICTionary
LAMBDATALK.DICT['editable'] = function () {
  return SECTIONEDIT.create( arguments[0] );
};