<?php

define ( "WIKI_NAME", "my wiki" );      // replace « my wiki » by any name you want
define ( "LOCK", 			false ); 					// false -> the wiki can't be edited
define ( "WITH_PASSWORDS", false );			// true -> a controlled set of editors
define ( "START",			"start" );				// "start", "accueil"
define ( "FORUM",			"forum" );				// "forum" and "sandbox" always editable
define ( "SANDBOX",		"sandbox" );			// name could be "#&§è!çà" for prevent it
define ( "LOAD_MAX", 	"200");						// maximum size of uploadable files
define ( "SKIN", 			"basic" ); 				// choice : basic, newone, A4, ...

//	follow the syntax "username" => "password" to add a controlled set of editors

$users = array(
	"username" => "password",
	"username" => "password",
	"username" => "password"
);

?>