<?php

define ( "WIKI_NAME", "wiki" );         // replace « wiki » by any name you want
define ( "LOCK", 			false ); 					// false -> the wiki can't be edited
define ( "WITH_PASSWORDS", false );			// true -> a controlled set of editors
define ( "START",			"start" );				// "start", "accueil"
define ( "FORUM",			"forum" );				// "forum" and "sandbox" always editable
define ( "SANDBOX",		"sandbox" );			// name could be "#&§è!çà" for prevent it
define ( "LOAD_MAX", 	"500");						// maximum size of uploadable files
define ( "SKIN", 			"newone" ); 			// choice : basic, newone, ...

//	follow the syntax "username" => "password" to add a controlled set of editors

$users = array(
	"username_1" => "password_1",         // password are not crypted
	"username_2" => "password_2"          // 
);

?>