<?php
// called by index.php

define ( "WIKI_NAME", "lambdaspeech" ); // name your wiki
define ( "LOCK",      false ); // true -> the wiki can't be edited
define ( "START",     "start" ); // homepage: "start", "accueil"

// currently non available
define ( "FORUM",     "agora" ); // "forum" and "sandbox" always editable
define ( "SANDBOX",   "sandbox" ); // name could be "#&§è!çà" for prevent it
define ( "LOAD_MAX",  "200"); // maximum size of uploadable files

// don't modify
define ( "VERSION",   "lambdaspeech v.20190318" );
define ( "TITLE",     WIKI_NAME );
define ( "PAGES",     __DIR__ . "/../pages/" );
define ( "TEMPLATES", __DIR__ . "/templates/" );
define ( "HISTORY",   __DIR__ . "/../history/" );

// password are not crypted
$users = array(
   "one" => "two",
   //  "three" => "four",
   //  "five" => "six"
);
