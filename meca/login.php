<?php
//alphawiki/meca/login.php | 20180725 | copyleft_GPL alainmarty
require "config.php"; // where $users are defined
require "common.php";

function display_login_form( $comment ){
   echo render_template('login_form.html', array(
      'WIKI_NAME' => WIKI_NAME,
      'comment' => $comment
   ));
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
      header("Location: /index.php");
   }
   if (isset($_POST['submit'])) { // form has been submitted
      if (test_user( $_POST['username'], $_POST['password'])) {
         $_SESSION[WIKI_NAME] = Array(
            'username' => $_POST['username'],
            'password' => $_POST['password'],
            'isValidUser' => true
         );
         header("Location: /index.php");
      } else {
         display_login_form( 'Username or password is invalid.' );
      }
   } else
      display_login_form( '' );
}

session_start();
main();