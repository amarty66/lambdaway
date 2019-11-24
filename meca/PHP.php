<?php
/* lambdaspeech | copyleft_GPL alainmarty 2018 */
// called by index.php
require "common.php";

/////////////////////////////////////////////////////////////////////////////
function doHTML() {
   global $g_validUser;
   $g_validUser = isValidUser();
   date_timezone ();
   
   echo render_template('page.html', array(
      'TITLE' => doTitle(),
      'CONTENT' => doContent()
   ));
}
/////////////////////////////////////////////////////////////////////////////
function doTitle() {
   $chaine = '_';
   if (isset($_GET['view']))
      $chaine = doControlName( $_GET['view'] );
   return WIKI_NAME . " :: " . $chaine;
}
function doContent() {
   if (isset($_GET['save']) &&
      isset($_POST['content']) && !LOCK )   return doSave();
   else if (isset($_GET['list']))           return doList();
   else if (isset($_GET['search']))         return doSearch();
   else if (isset($_GET['back']))           return doBack();
   else if (isset($_GET['load']))           return doLoad();
   else                                     return doView();
}
/////////////////////////////////////////////////////////////////////////////
function doView () {
   global $g_validUser;
   $page = (isset($_GET['view']))? doControlName( $_GET['view']) : START;
   doLogs( $page );
   $file_content = (!LOCK)? "new_page" : "The wiki is locked.";
   $file_content = ""; // "This page is empty."
   if (file_exists(PAGES.$page.'.txt')) {
      $file_content = doControlPage( file_get_contents(PAGES.$page.'.txt') );
   }
   
   return render_template('page_view.html', array(
      'START' => START,
      'TITLE' => WIKI_NAME,
      'PAGE' => $page,
      'CURRENT_USER' => sessionuser(),
      'ACTIVE_USERS' => connected(600),
      'MENU_LIST' => menu_list(),
      'MENU_LOGIN' => menu_log(),
      'MENU_LOAD' => menu_load(),
      'MENU_SEARCH' => menu_search(),
      'MENU_SAVE' => menu_save($page),
      'MENU_LOCK' => menu_lock(),
      'SOURCE' => $file_content
   ));
}

function menu_lock () {
   return "<input type='button' value='lock' title='lock/unlock evaluation' onclick='LAMBDATANK.toggle_lock(this)' />";
}
function menu_load () {
   global $g_validUser;
   return ($g_validUser)? "<a href='?load' title='load files'>load</a>" : "<span style='color:#ccc;'>load</span>";
}
function menu_list () {
   global $g_validUser;
   return ($g_validUser)? "<a href='?list=*'>pages</a>" : "<span style='color:#ccc;'>list</span>";;
}
function menu_log () {
   global $g_validUser;
   return ($g_validUser)?
      '<a href="meca/login.php?logout=true">logout</a>' : '<a href="meca/login.php">login</a>';
}
function menu_search () {
   return render_template('page_search.html', array());
}
function menu_save ( $page ) {
   global $g_validUser;
   if ($g_validUser)
      return "<input type='submit' id='save_button' style='display:inline-block;' value='save'/>" ;
   else
      return "<input type='submit' id='save_button' style='display:none;' value='save'/>" ;
}
/////////////////////////////////////////////////////////////////////////////
function doSave () {
   global $g_validUser;
   $page = doControlName( $_GET['save']);
   doLogs( 'save' );
   $content = doControlPage( $_POST['content'] );
   if (!preg_match('/^(°|;|_|\{|\/|#)/', $content)) {
      header( "location: ?view=$page" );  // go home!
      return;
   }
   if (!$g_validUser) {
      header( "location: ?view=$page" );  // go home!
      return;
   }
   if ($handle = fopen(PAGES.$page.'.txt', 'w')) {
      if (is_writable(PAGES.$page.'.txt'))
         $bytes1 = fwrite($handle, $content);
      fclose($handle);
   }
   $history_page = HISTORY.$page."/";
   if (!is_dir($history_page))
      mkdir($history_page);
   $IP = (preg_match('/^(\d{1,3}\.){3}\d{1,3}$/', $_SERVER['REMOTE_ADDR']))?
      $_SERVER['REMOTE_ADDR'] : ' IP intrusion';
   $mybackup = $history_page . date("Ymd-His", mktime(date("H"))) . ".txt";
   if (($p_mybackup = fopen($mybackup, "a")) && is_writable($mybackup)) {
      $head = "editor : ".sessionUser()." [".$IP."] "
         .date("Y/m/d H:i:s", mktime(date("H")))."\n";
      fwrite($p_mybackup, $head.$content);
      fclose($p_mybackup);
   }
   header( "location: ?view=$page" );
}

function doList() {
   global $g_validUser;
   if (LOCK || !$g_validUser)
      header( "location: index.php" );

   $page = doControlName( $_GET['list'] );
   $title = "<div class='page_menu'>"
      .   "<a href='?view=start' title='goto start'>".WIKI_NAME."</a> :: "
         .   (($page == "*")? "list of pages" : "History of ") . $page
            . "</div>";
   $chaine = "<div id='page_content'>";
   if ($page == "*") { // la fonction est appelée par : index.php?list=*
      $chaine .= doWiki_pages();
   }
   else { // la fonction est appelée par : index.php?list=nom_page
      $chaine .= doHistory_page($page);
   }
   $chaine .= "</div>";
   return $title.$chaine;
}

function doWiki_pages() {
   $dir = opendir(PAGES);
   while ($file = readdir($dir)) {
      if (preg_match( "/.txt/", $file) && !preg_match( "/^_/", $file ) ) {
         $tab[] = filemtime(PAGES.$file)."|".$file;
      }
   }
   closedir($dir);
   if (isset($tab) && is_array($tab)) {
      rsort($tab);
      $chaine = "<ol>";
      for ($i=0; $i<count($tab); $i++) {
         $temp = explode('|', $tab[$i]);
         $page = substr( $temp[1], 0, strlen($temp[1]) - 4 );
         $chaine .= "<li>[<a href='?list=".$page."'>"
            .strftime("%Y/%m/%d %H:%M:%S", $temp[0])
               ."</a>] ";
         $chaine .= "/ <a href='?view=" . $page . "'>" . $page . "</a></li>";
      }
      $chaine .= "</ol>";
   }
   else
      $chaine = "<p>No page in this wiki.</p>";
   return $chaine;
}

function doHistory_page($page) {
   $chaine = "<a href='javascript:history.back();'>return page list</a> ";
   $temp = HISTORY.$page;
   if (is_dir($temp)) {
      $dir = opendir($temp);
      while ($file = readdir($dir)) {
         if (preg_match( "/.txt/", $file))
            $tab[] = $file;
      }
      closedir($dir);

      if (isset($tab) && is_array($tab)) {
         rsort($tab);
         $chaine .= "<ol>";
         for ($i=0; $i<count($tab); $i++) {
            $temp = substr( $tab[$i], 0, strlen($tab[$i]) - 4 );
            $chaine .=  "<li><a href='?back=".HISTORY.$page."/".$tab[$i]."'>".$temp."</a></li>";
         }
         $chaine .= "</ol>";
      }
   }
   else {
      $chaine = "<p>No history for this page.</p>";
   }
   return $chaine;
}

function doBack () {
   $g_page = (isset($_GET['back']))? $_GET['back'] : 'oops';
   $g_view = "<a href='javascript:history.back();'>return page history</a> ";

   $title = "<div class='page_menu'>"
      .   "<a href='?view=start' title='goto start'>".WIKI_NAME."</a> :: "
      .   (($g_page == "*")? "list of pages" : $g_page)
      . "</div>";

   if (!stristr( $g_page, ".php" ) && file_exists($g_page)) {
      $content = doControlPage( file_get_contents($g_page) );
      $g_view .= "<textarea id='page_textarea_backpage'>".$content."</textarea>";
   } else {
      $g_view .= 'doBack oops';
   }
   return $title . $g_view;
}

function doSearch () {
   $search = doControlName($_GET['search']);
   $title = "<div class='page_menu'>"
      .   "<a href='?view=start' title='goto start'>".WIKI_NAME."</a> :: "
         .   "search"
            . "</div>";
   $body = "<a href='javascript:history.back();'>return page</a>"
      . search_result( $search );
   return $title . $body;
}

function search_result ( $search ) {
   if ($search == '') {
      $search = 'Nothing';
      $result = '<h4>Nothing is nowhere.</h4>';
   }
   else if (preg_match('/\[\?\*\]/', $search) ) {
      $result = '<h4>Characters "[,?,*,]" are unauthorized !</h4>';
   } else {
      $dir = opendir(PAGES);
      $temp = '';
      while ($file = readdir($dir)) {
         if ( preg_match('/.txt$/' , $file) && !preg_match('/^_/', $file) ) {
            $p_file = fopen(PAGES.$file, 'r');
            $content = fread($p_file, filesize(PAGES.$file));
            fclose($p_file);
            if (preg_match("/\b$search\b/i", $content) ||
            preg_match("/\b$search\b/i", PAGES.$file)) {
               $file = substr($file, 0, strlen($file) - 4);
               $temp .= '<li><a href="?view='.$file.'">'.$file.'</a></li>';
            }
         }
      }
      $result = ($temp !='') ?
         '<h4>'.$search.' is in pages :'.'</h4><ol>'.$temp.'</ol>'
            :
      '<h4>'.$search.' is nowhere.'.'</h4>';
   }
   return $result;
}

function doLoad() {
   global $g_validUser;
   if (LOCK || !$g_validUser)
      header( "location: index.php" );

   global $g_view; // is computed by this function
   doLogs( 'load' );
   $g_view = "<a href='javascript:history.back();'>return page</a>";

   $title = "<div class='page_menu'>"
      . "<a href='?view=start' title='goto start'>".WIKI_NAME."</a> :: "
      . "upload"
      . "</div>";

   $g_view .= load_file();

   return $title . $g_view;
}

function load_file() {
   $types = array(
      "image/jpeg", "image/jpg", "image/gif", "image/png", "application/pdf",
      "application/zip", "text/html", "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet");
   $load_extensions = "\.(jpg|jpeg|gif|png|pdf|zip|html|odt|ods)$";
   $load_description = "Types of authorized files : "
      ."jp(e)g, gif, png, pdf, zip, html, odt, ods and size &lt; ";
   $size_max = intval(LOAD_MAX)*1024; // size in bytes
   $content = '<h3>Uploading files</h3>'
      .'<p>'.$load_description.LOAD_MAX.' kb.</p><p></p>'
      .'<form enctype="multipart/form-data" action="" method="post">'
      .'<input type="hidden" name="taille_max" value="'.($size_max*1024).'" />'
      .'<input type="hidden" name="phase" value="traitement" />'
      .'<div style="text-align:center; background-color:#fff; border:1px solid;">'
      .'<input type="file" name="le_fichier" size="35" maxlength="100" title="'
      ."Find your file in your hard disc ...".'" /></div>'
      .'<p><input type="submit" accesskey="s" value="Upload..." title="'
      ."Uploading to wiki data folder ...".'" /></p></form>';
   if ( isset($_POST['phase']) && ('traitement' == $_POST['phase']) ) {
      if (is_uploaded_file($_FILES['le_fichier']['tmp_name'])) {
         $basenom = basename( $_FILES['le_fichier']['name'] ); // ex image.jpg
         if ($_FILES['le_fichier']['size'] > $size_max)
            $content .= '<br />'."Sorry, the file' size exceeds the authorized size."
               .' ('.$_FILES['le_fichier']['size'].'octets)';
         elseif ( !in_array( $_FILES['le_fichier']['type'], $types ) && // not in type mime
            !stristr( $basenom, $load_extensions )) // has not the good extension
               $content .= '<br />'."Sorry, the file type is not in the authorized types list.";
         elseif ( stristr( $basenom, "php" ) ) // no php string in the name !!
            $content .= '<br />'."No php file, please.";
         elseif( !move_uploaded_file( $_FILES['le_fichier']['tmp_name'], "data/".$basenom))
            $content .= '<br />Transfert error. Do it again !';
         else
            $content .= '<br />'."The file has been uploaded width the name : data/"
               .$basenom.' ('.$_FILES['le_fichier']['size'].'octets)';
      }
      else
         $content .= '<br />There is a problem with : '.$_FILES['le_fichier']['name'];
   }
   $content .= '<h6>In case of problem, you might consider using :</h6>';
   $content .= "<ul><li><a href='http://www.flickr.com/'>Flickr</a></li>";
   $content .= "<li><a href='picasaweb.google.com'>Picasa</a></li>";
   $content .= "<li>or your own web account.</li></ul>";
   return $content;
}

/////////////////////////////////////////////////////////////////////////////
function isValidUser () {
   session_start();
   return (isset($_SESSION[WIKI_NAME]) && $_SESSION[WIKI_NAME]['isValidUser'] == true);
}
function sessionUser () {
   session_start();
   return (isValidUser())? $_SESSION[WIKI_NAME]['username'] : '';
}
function doControlName( $chaine ) { // des noms des pages
   // traitement des slashes et des espaces avant et apres
   $chaine = trim( stripslashes( $chaine ) );
   // supprime toutes les balises html
   $chaine = strip_tags( $chaine );
   // filtre « .php » dans le nom de la page
   $chaine = preg_replace("/(\.php)/i", '_php', $chaine );
   // filtre « /.:;!?"'(){}[] »
   $chaine = preg_replace("/([\/\.:;!\?\"\'\(\)\[\]\{\}])/i", '_', $chaine );
   return $chaine;
}

function doControlPage( $chaine ) {
   $chaine = trim( $chaine );        // clear spaces before and after
   if (get_magic_quotes_gpc())       // ajouté pour  PHP Version 5.4.38
      $chaine = stripslashes( $chaine );  // clear backslashes

   $chaine = preg_replace("/(<iframe)/is",    'NO_iframe', $chaine );
   $chaine = preg_replace("/(<script)/is",    'NO_script', $chaine );
   $chaine = preg_replace("/(<form)/is",       'NO_form', $chaine );
   $chaine = preg_replace("/(<\?(php)*)/is", 'NO_php', $chaine );

   // preserve backslashes in page :
   $chaine = preg_replace("/\\\/is",    '&#92;', $chaine );
   // it works after stripslashes(), not before, but I don't know why ??
   return $chaine;
}
function date_timezone () { // against PHP5 warning bug in local usage ; called at start
   if(function_exists("date_default_timezone_set") and
      function_exists("date_default_timezone_get"))
         @date_default_timezone_set(@date_default_timezone_get());
}
function get_ip() {
   if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
      $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
   elseif (isset($_SERVER['HTTP_CLIENT_IP']))
      $ip = $_SERVER['HTTP_CLIENT_IP'];
   else
      $ip = $_SERVER['REMOTE_ADDR'];
   return $ip;
}
function doLogs( $page ) { // log of pages calls
   $referer = (isset($_SERVER['HTTP_REFERER']))? $_SERVER['HTTP_REFERER'] : 'undefined';
   if ($referer != 'undefined') {
      $temp = parse_url($referer); // hash array host, path, query
      $from_host = $temp['host'];
      $from_path = $temp['path'];
      $from_query = (!empty($temp['query']))? $temp['query'] : 'NO_QUERY';
   }
   $phpself = $_SERVER['PHP_SELF'];
   $IP = get_ip();
   $date = date("Y/m/d H:i:s", mktime(date("H")));
   if ($referer != 'undefined')
      $log = "$date | IP: $IP | from : $from_host$from_path?$from_query to : $page \n";
   else
      $log = "$date | IP: $IP | from : $referer to $page \n";
   $mypage = '/var/log/lambdaway.log';
   if (($p_mypage = fopen($mypage, 'a+')) && is_writable($mypage)) {
      fwrite($p_mypage, $log);
      fclose($p_mypage);
   }
}

function connected( $time ) { // called this way : connected(600)
   //   Auteur: Merckel Loïc // Web: http://www.merckel.org/spip
   $ip = get_ip();
   $date = time(); // seconds from 01/01/1970
   $i=0;
   $ii=0;
   $bool=0;
   $filename=CONNECTION_LOG;
   if ( file_exists($filename) ) {
      if ($fichier=fopen($filename,"r")) {
         while (!feof($fichier)) {
            $ligne=fgets($fichier,4096); // 82.255.57.40  |   1313145032
            $tab=explode("|",$ligne);
            if (count($tab) >= 2 && $tab[1]>0) {
               $tab_de_tab[$i][0]=$tab[0]; // IP    : 82.255.57.40
               $tab_de_tab[$i][1]=$tab[1]; // Date   : 1313145032
               $i++;
            }
         }
         fclose($fichier);
      }
   }
   for ($j=0;$j<$i;$j++) {
      if ( ( $date-chop($tab_de_tab[$j][1]) ) > $time ) {
         // do nothing
      } else {
         $tab_de_tab_actualise[$ii][0]=$tab_de_tab[$j][0];
         $tab_de_tab_actualise[$ii][1]=chop($tab_de_tab[$j][1]);
         $ii++;
      }
   }
   for ($j=0;$j<$ii;$j++) {
      if ($tab_de_tab_actualise[$j][0]==$ip) {
         $bool=1;
      }
   }
   if ($bool==0) {
      $tab_de_tab_actualise[$ii][0]=$ip;
      $tab_de_tab_actualise[$ii][1]=$date;
      $ii++;
   }
   if ( $fichier=fopen($filename,"w") ) {
      for ($j=0;$j<$ii;$j++) {
         fputs($fichier,chop($tab_de_tab_actualise[$j][0]));
         fputs($fichier,"|");
         fputs($fichier,chop($tab_de_tab_actualise[$j][1]));
         fputs($fichier,"\n");
      }
      fclose($fichier);
   }
   return $ii;
}
