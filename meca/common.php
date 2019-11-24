<?php

/** @brief Renders templates by substituting minimal mustache-like placeholders.

    Loads a template from the directory `templates` (see configuration
    parameter `TEMPLATES`) and substitutes any `{{BINDING}}` with the value
    associated to `BINDING` in the parameter `$bindings`.

    If a `{{BINDING}}` is found within any matching key-value in the `$bindings`
    parameter, then it is replaced by an empty string. CAUTION: this can be
    considered as failing silently.

    @param $page The name of the HTML source file within the `TEMPLATES` dir.
    @param $bindings An association of key-value for the substitutions.

    @return The text with all subsitutions applied. If the file could not be
            located, then `FALSE` is returned; test with `===`.
*/
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
