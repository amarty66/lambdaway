<?php
// called by index.php

define ( "WIKI_NAME",      "lambdaspeech" );  // replace « lambdaspeech » by any name you want
define ( "LOCK", 			     false ); 					// true -> the wiki can't be edited
define ( "START",			     "start" );				  // "start", "accueil"

// currently non available
define ( "FORUM",			     "agora" );				  // "forum" and "sandbox" always editable
define ( "SANDBOX",		     "sandbox" );			  // name could be "#&§è!çà" for prevent it
define ( "LOAD_MAX", 	     "200");						// maximum size of uploadable files

// don't modify 
define ( "VERSION", "lambdaspeech v.20190318" ); 
define ( "TITLE", WIKI_NAME );
define ( "PAGES", "pages/" ); 
define ( "HISTORY", "history/" );

// currently non available
$users = array(
	  "one" => "two",                           // password are not crypted 
//  "three" => "four",
//  "five" => "six"
);

?>