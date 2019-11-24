<?php

/// Edit this file to configure the Wiki to your settings.

/// The name/title of this Wiki
define ( "WIKI_NAME", "lambdaspeech" );

/// Is this Wiki editable? True=>Cannot be edited
define ( "LOCK", false );

/// The home/default page of this Wiki
define ( "START", "start" );

/// Maximum size of uploadable files (in kB)
define ( "LOAD_MAX",  200);

/// Filepath to the pages directory
define ( "PAGES",     __DIR__ . "/../data/pages/" );

/// Filepath to the HTML templates directory
define ( "TEMPLATES", __DIR__ . "/templates/" );

/// Filepath to the history directory
define ( "HISTORY",   __DIR__ . "/../data/history/" );

/// Filepath to the connections directory
define ( "CONNECTION_LOG", "/var/log/lambdaway.connections.log" );

/// List of users and their passwords (!FIXME)
$users = array(
   "one" => "two",
);
