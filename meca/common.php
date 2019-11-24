<?php

function render_template( $page, $bindings ){
   $source = file_get_contents(TEMPLATES . $page);
   if ($source === FALSE) return FALSE;
   
   $source = preg_replace_callback("/{{([\w][\w\d]*)}}/",
      function($matches) use ($bindings){
         return $bindings[$matches[1]];
      },
      $source);
   return $source;
}
