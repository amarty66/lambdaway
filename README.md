# lambdaway

{lambda way} is a project by Alain Marty with two parts:

  - {lambda talk}, and
  - {lambda tank}

{lambda talk} is a markup language finding its roots and inspiration in lambda calculus. This implementation is built on top of HTML/JavaScript. The main advantage compared to languages such as HTML and Markdown is that {lambda talk} is turing complete and allows - in a consistent fashion - mixing data and code (unlike HTML/JavaScript). Because {lambda talk} is built on top of HTML/JavaScript, powerful existing Web Browser API (such as SVG) are available.

{lambda tank} is a dynamic Web site in PHP/HTML/JavaScript which provides a Wiki infrastructure using {lambda talk} as its markup language. The current implementation relies on the filesystem instead of a database, and users are configures in the `meca/config.php` file.

The project files are organised as follows:

  - `.htaccess`: contains the URL redirection logic for pretty URLs
  - `data`: user generated content (pages, history, uploaded assets, …)
  - `meca`: the PHP sources for {lambda tank}
  - `meca/templates`: HTML templates used by PHP to generate the Web pages
  - `static`: publicly accessible CSS and JS files

Much more info and details available at Alain Marty's homepage: http://lambdaway.free.fr/lambdaspeech/
