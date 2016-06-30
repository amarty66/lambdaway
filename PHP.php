<?php 
  session_start();
  define ( "WEBSITE",  "http://epsilonwiki.free.fr/lambdaway/" );
	define ( "VERSION",  "{&lambda; way} v.20160608" );
	define ( "PAGES",    "pages/" );
	define ( "HISTORY",  "history/" );

	function doHTML() {
		global $g_view, $g_editor, $g_validUser;
		$g_validUser = isValidUser();
		date_timezone();
		if (file_exists('meca/HTML.html') && ($html = file_get_contents('meca/HTML.html')) ) {
			if (isset($_GET['save']) && isset($_POST['content']))
				doSave(); 
			else if (isset($_GET['list']))   doList(); 
			else if (isset($_GET['back']))   doBack();
			else if (isset($_GET['search'])) doSearch();
			else if (isset($_GET['skin']))   doSkin(); 
			else if (isset($_GET['load']))   doLoad(); 
			else {
				doView();
				doEditor();
			}
			$skin = (isset($_COOKIE['skin']))? $_COOKIE['skin'] : SKIN;
			$html = preg_replace('/{WIKI_NAME}/', WIKI_NAME, $html);
			$html = preg_replace('/{SKIN}/', $skin, $html);
			$html = preg_replace('/{VIEW}/', $g_view, $html);
			$html = preg_replace('/{EDITOR}/', $g_editor, $html);
			$html = preg_replace('/{ONLOAD}/', "onload='LAMBDATANK.do_update( true )'", $html);
			echo $html;
		}
	}

	function isValidUser () {
		return (isset($_SESSION[WIKI_NAME]) && $_SESSION[WIKI_NAME]['isValidUser'] == true);
	}
	function sessionUser () {
		return (isValidUser())? $_SESSION[WIKI_NAME]['username'] : '';
	}

	function doView () {
		global $g_page, $g_view, $g_validUser;
		$g_page = (isset($_GET['view']))? doControlName( $_GET['view']) : START;
		doLogs( $g_page );
		$g_view = sessionUser () . ' ';
		$g_view .= "<a href='" . 'javascript:LAMBDATANK.toggle_visibility("pop_menu_view")' . "'>+</a> ";
		$g_view .= "<div id='pop_menu_view' style='display:inline;'>";
		$g_view .= "<form style='display:inline;' method='get' action='index.php'>\n";
		$g_view .= "<input type='text' id='search' name='search' placeHolder='°¿°' title='Look for a word.' onClick='this.select()'/>";
		$g_view .= "</form> ";
		if (!LOCK) {
			$g_view .= " <span style='color:#888;'>".connected(600)."</span> ";
			$g_view .= "| <a href='?skin' title='wiki skins'>skin</a> ";
			if (WITH_PASSWORDS) { // button login or logout
				$g_view .= ($g_validUser)? "| <a href='?list=*' title='wiki pages list'>list</a> " : " ";
				$g_view .= ($g_validUser)? '| <a href="meca/login.php?logout=true" title="user/password logout">logout</a> ' : 
										   '| <a href="meca/login.php"             title="user/password login">login</a> ' ;
				$g_view .= ($g_validUser)? "| <a href='?load' title='load files'>load</a> " : "";
			} else {
				$g_view .= "| <a href='?list=*' title='wiki pages list'>list</a> ";
			}
			$g_view .= "| <a href='" . 'javascript:LAMBDATANK.toggle_display("frame_editor")' . "' title='enter editor'>edit</a>";
		}
		$g_view .= "</div>";
		$g_view .= doTitle( $g_page );
		$g_view .= "\n<div id='page_view'></div>\n";
		$g_view .= doFooter();
	}
	
	function doEditor () {
		global $g_page, $g_editor, $g_validUser;
		if (file_exists(PAGES.$g_page.'.txt'))
			$file_content =  doControlPage( file_get_contents(PAGES.$g_page.'.txt') );
		 else 
			$file_content = "This page is empty, edit it.";
		$g_editor = "<form action='?save=$g_page' method='post' enctype='multipart/form-data'>";
		$g_editor .= "<div id='menu_editor' onmousedown='DRAG.beginDrag( this.parentNode.parentNode, event )'>";
		if (!LOCK) {
			if (WITH_PASSWORDS) { // save button enabled if user is logged
				if ($g_validUser || ($g_page == FORUM) || ($g_page == SANDBOX) ) {
					$g_editor .= "user:".sessionUser()." ";
					$g_editor .= "<input id='save_button' type='submit' value='save' onclick='return LAMBDATANK.doSave();'> ";
				} else { 
					$g_editor .= "user:anonymous ";
          // because disabling a button is not a good protection, the choice is to forget it (20160602)
					// $g_editor .= "<input id='save_button' type='submit' value='save' disabled='disabled'> ";
				}
			} else {
				$g_editor .= "<input id='save_button' type='submit' value='save' onclick='return LAMBDATANK.doSave();'> ";
			}
			$g_editor .= "<input id='cancel_button' type='button' value='cancel' onclick='return LAMBDATANK.doCancel();'> ";
		}
		$g_editor .= "<span id='infos'></span>";
		$g_editor .= "</div>";
		$g_editor .= "<textarea id='page_textarea' name='content' onkeyup='LAMBDATANK.do_update( false )'>\n$file_content\n</textarea>";
		$g_editor .= "</form>";
	}

	function doList() {
		global $g_page, $g_view; // are computed by this function
		$g_page = doControlName( $_GET['list'] );
		if ($g_page == "*") {	// la fonction est appelée par : index.php?list=*
			doLogs( 'liste pages' );
			$g_view = "<a href='javascript:history.back();'>return page</a>";
			$g_view .= doTitle( 'wiki pages' );
			$g_view .= doWiki_pages();
		} else {	// la fonction est appelée par : index.php?list=nom_page
			doLogs( 'history:'.$g_page );
			$g_view = "<a href='javascript:history.back();'>return wiki list</a>";
			$g_view .= doTitle( $g_page );
			$g_view .= doHistory_page($g_page);
		}
		$g_view .= doFooter();	// étudier duplicate ID footer
	}

	function doSkin() {
		global $g_view; // is computed by this function
		doLogs( 'skin' );
		if( isset($_POST['phase']) && ('traitement' == $_POST['phase']) ) {
			$choix = doControlName( $_POST['choix'] );
			if (!empty($choix)) setcookie('skin', $choix);
			header( "location: ?skin" );
		}
		else
			$choix = (isset($_COOKIE['skin']))?  $_COOKIE['skin'] : SKIN;
		$nb = 0;
		if ( is_dir('skins')  && $themes_dir = @opendir('skins') ) {
			while ($dir = readdir($themes_dir) )
				if (is_dir('skins/'.$dir) && !preg_match('/\./', $dir) ) {
					$skin[$nb] = $dir;
					$nb++;
				}
			closedir($themes_dir);
		}
		$string = '<h1>skins</h1>';
		$string .= '<form name="filtre" method="post">';
		$string .= '<input type="hidden" name="phase" value="traitement"><ol>';
		for($i=0;$i<$nb;$i++) {
			$string  .= '<li><input type="radio" name="choix" value="'.$skin[$i] . '" '
			. (($choix==$skin[$i])? 'checked="true"' : '') . ' /> '.$skin[$i].'</li>'; 
		}
		$string .= '</ol><p><input type="submit" value="choisir" title="choisir" /></p>';
		$string .= '</form>';
		$g_view = "<a href='javascript:history.back();'>return page</a>";
		$g_view .= doTitle( 'skins' );
		$g_view .= $string;
		$g_view .= doFooter();
	}
	
	function doBack () {
		global $g_page, $g_view; // are computed by this function
		$g_page = (isset($_GET['back']))? $_GET['back'] : 'oops';
		$g_view = "<a href='javascript:history.back();'>return page history</a> ";
		$g_view .= doTitle( $g_page );
		//if (file_exists($g_page)) { // thanks to joseph abenhaim 20140606
		if (!stristr( $g_page, ".php" ) && file_exists($g_page)) {
			$content = doControlPage( file_get_contents($g_page) );
			$g_view .= "<textarea id='textarea_backpage'>".$content."</textarea>";
		} else 
			$g_view .= 'doBack oops';
		$g_view .= doFooter();
	}

	function doSearch () {
		global $g_view;	// is computed by this function
		$search = doControlName($_GET['search']);
		doLogs( 'search: '.$search );
		$g_view = "<a href='javascript:history.back();'>return page</a>";
		$g_view .= doTitle( $search );
		$g_view .= search_result( $search );
		$g_view .= doFooter();
	}

	function doLoad() {
		global $g_view; // is computed by this function
		doLogs( 'load' );
		$g_view = "<a href='javascript:history.back();'>return page</a>";
		$g_view .= doTitle( "upload" );
		$g_view .= load_file();
		$g_view .= doFooter();		
	}

///////////////////////

	function doTitle( $name ) {
		if ( preg_match( "/^_/", $name ) ) {
			$name = substr( $name, 1 );
			$name = "(".$name.")";
		}
		return "<div id='title' onmousedown='DRAG.beginDrag( this.parentNode, event );'>"
					 .WIKI_NAME."<a href='?view=".START."'> :: </a>$name</div>";
	}

	function doFooter() {
		return "<div id='footer'><a href='".WEBSITE."'>".VERSION."</a></div>"; 
	}

	function doSave () {
		global $g_validUser; // added 20160602

		$page = doControlName( $_GET['save']);
		doLogs( 'save' );
		$content = doControlPage( $_POST['content'] );
		// update 20160608
		if (!preg_match('/^(°|;|_|\{|\/)/', $content)) {
			header( "location: ?view=$page" );  // go home!
			return;
		}
		if (!$g_validUser && !( $page == FORUM || $page == SANDBOX ) ) {
			header( "location: ?view=$page" );  // go home!
			return;
		}
		// update 20160608
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

	function doWiki_pages() {
		$dir = opendir(getcwd()."/".PAGES);
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
				$chaine .= "/ <a href='?view=".$page."'>".$page."</a></li>";
			}
			$chaine .= "</ol>";
		}
		else
			$chaine = "<p>No page in this wiki.</p>";
		return $chaine;
	}
	
	function doHistory_page($page) {
		$temp = getcwd().'/'.HISTORY.$page;		
		if (is_dir($temp)) {
			$dir = opendir($temp);
			while ($file = readdir($dir)) {
				if (preg_match( "/.txt/", $file))
					$tab[] = $file;
			}
			closedir($dir);
			if (isset($tab) && is_array($tab)) {
				rsort($tab);
				$chaine = "<ol>";
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
				//if (preg_match('/.txt/' , $file)) { // modified on 2014/10/16
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
			$result = ($temp !='')? 
				'<h4>'.$search.' is in pages :'.'</h4><ol>'.$temp.'</ol>' 
				:
				'<h4>'.$search.' is nowhere.'.'</h4>';
		}
		return $result;		
	}

	function load_file() {
		if (LOCK)
			header( "location: index.php" );
		$types = array( 
			"image/jpeg", "image/jpg", "image/gif", "image/png", "application/pdf", 
			"application/zip", "text/html", "application/vnd.oasis.opendocument.text", 
			"application/vnd.oasis.opendocument.spreadsheet");
		$load_extensions = "\.(jpg|jpeg|gif|png|pdf|zip|html|odt|ods)$";
		$load_description = "Types of authorized files : "
				."jp(e)g, gif, png, pdf, zip, html, odt, ods and size &lt; ";
		$size_max = intval(LOAD_MAX)*1024;	// size in bytes
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
				$basenom = basename( $_FILES['le_fichier']['name'] );	// ex image.jpg
				if ($_FILES['le_fichier']['size'] > $size_max)
					$content .= '<br />'."Sorry, the file' size exceeds the authorized size." 
									 .' ('.$_FILES['le_fichier']['size'].'octets)';
				elseif ( !in_array( $_FILES['le_fichier']['type'], $types ) &&	// not in type mime
						 !stristr( $basenom, $load_extensions ))	// has not the good extension
					$content .= '<br />'."Sorry, the file type is not in the authorized types list."; 
				elseif ( stristr( $basenom, "php" ) )					// no php string in the name !!
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

	function date_timezone () { // against PHP5 warning bug in local usage ; called at start
	 	if(function_exists("date_default_timezone_set") and function_exists("date_default_timezone_get"))
			@date_default_timezone_set(@date_default_timezone_get());
	}

	function doControlName( $chaine ) {   // control page names content
		$chaine = trim( $chaine );          // clear spaces before and after
		$chaine = stripslashes( $chaine );  // clear backslashes
		$chaine = strip_tags( $chaine );    // clear all HTML tags
		$chaine = preg_replace("/(\.php)/i", '_php', $chaine ); // filter « .php »
		return $chaine;
	}
	
	function doControlPage( $chaine ) {   // control pages content
		$chaine = trim( $chaine );        // clear spaces before and after
		if (get_magic_quotes_gpc())       // ajouté le 24/06/2015 pour fonctionner sur PHP Version 5.4.38
          $chaine = stripslashes( $chaine );  // clear backslashes
	 	// $chaine = preg_replace( '/<([^ ])/', '< $1', $chaine ); // HTML tags are broken in JS.js
		// preserve backslashes in page : 
		$chaine = preg_replace("/\\\/is", 	'&#92;', $chaine ); 
		// it works after stripslashes(), not before, but I don't know why ??
		return $chaine;
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

	function connected( $time ) {	// called this way : connected(600)
		//	Auteur: Merckel Loïc // Web: http://www.merckel.org/spip
		$ip = get_ip();
		$date = time();	// seconds from 01/01/1970
		$i=0;
		$ii=0;
		$bool=0;
		$filename="meca/_connected.txt";
		if ( file_exists($filename) ) {
			if ($fichier=fopen($filename,"r")) {
				while (!feof($fichier)) {
					$ligne=fgets($fichier,4096);	// 82.255.57.40  |	1313145032
					$tab=explode("|",$ligne);
					if (count($tab) >= 2 && $tab[1]>0) {
						$tab_de_tab[$i][0]=$tab[0];	// IP 	: 82.255.57.40
						$tab_de_tab[$i][1]=$tab[1];	// Date	: 1313145032
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

	function doLogs( $page ) { // log of pages calls
		$referer = (isset($_SERVER['HTTP_REFERER']))? $_SERVER['HTTP_REFERER'] : 'undefined';
		if ($referer != 'undefined') {
			$temp = parse_url($referer);	// hash array host, path, query
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
		$mypage = 'meca/_logs.txt';
		if (($p_mypage = fopen($mypage, 'a+')) && is_writable($mypage)) {
			fwrite($p_mypage, $log);
			fclose($p_mypage);
		}
	}
	
?>
