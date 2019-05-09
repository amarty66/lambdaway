<?php
// called by index.php

define ( "WIKI_NAME",      "lambdaspeech" );  // replace « lambdaspeech » by any name you want
define ( "LOCK", 			     false ); 					// false -> the wiki can't be edited
// define ( "WITH_PASSWORDS", false );			      // true -> a controlled set of editors
define ( "START",			     "start" );				  // "start", "accueil"

// currently non available
define ( "FORUM",			     "agora" );				  // "forum" and "sandbox" always editable
define ( "SANDBOX",		     "sandbox" );			  // name could be "#&§è!çà" for prevent it
define ( "LOAD_MAX", 	     "200");						// maximum size of uploadable files

// don't modify 
define ( "VERSION", "lambdaspeech v.20190507" ); 
define ( "TITLE", WIKI_NAME );
define ( "PAGES", "pages/" ); 
define ( "HISTORY", "history/" );

// currently non available
$users = array(
	"login1" => "password1",         // password are not crypted 
  "login2" => "password2"
);

?>
