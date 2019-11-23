<?php
//alphawiki/meca/login.php | 20180725 | copyleft_GPL alainmarty
include "config.php"; // where $users are defined

session_start();
main();

function display_login_form( $comment ){
   echo '<!doctype html><html lang=fr><head><meta charset="utf-8" />'
      . '<title>' . WIKI_NAME . '</title><style>'
      . '#loginFrame {font:normal 14px "courier new";'
      . 'width:400px; margin:auto; padding:10px; background:#ffe;'
      . 'border:1px solid; box-shadow:0 0 8px black; }'
      . 'a {text-decoration:none; color:#888; text-shadow:2 2 2px black;}'
      . 'a:hover {color:#f00;}'
      . '</style></head><body>'
      . '<div id="loginFrame">'
      . '<h1> login : ' . WIKI_NAME . '</h1>'
      . '<form action="login.php" method="post">'
      . 'username <input type="text" name="username"><br>'
      . 'password <input type="password" name="password"><br>'
      . '<input type="submit" name="submit" value="submit">'
      . '</form>'
      . '<p>' . $comment . '</p>'
      . '<a href="index.php">return</a>'
      . '</div></body></html>';
}

function test_user( $user, $pass ) {
   global $users;
   foreach ($users as $key=>$value)
      if ($user == $key && $pass == $value) //if ($user == $key && md5( $pass ) == $value)
         return true;
   return false;
}

function main() {
   global $users;

   //   foreach ($users as &$value)
   //      $value = md5( $value );

   if(isset($_GET['logout'])) { // user logout
      unset($_SESSION[WIKI_NAME]);
      header("Location: index.php");
   }
   if (isset($_POST['submit'])) { // form has been submitted
      if (test_user( $_POST['username'], $_POST['password'])) {
         $_SESSION[WIKI_NAME] = Array(
            'username' => $_POST['username'],
            'password' => $_POST['password'],
            'isValidUser' => true
         );
         header("Location: index.php");
      } else {
         display_login_form( 'Username or password is invalid.' );
      }
   } else
      display_login_form( '' );
}
