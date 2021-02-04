# ng-oldschool
elisp bindings for common Deno functions 

Binds basic functions defined by [Deno](https://doc.deno.land/builtin/stable) for usage in emacs-ng. Converts most async functions defined on Deno into a lisp function with the name oldschool-name-in-kebab-case. I.e. Deno.watchFs becomes `(oldschool-watch-fs "file" 'callback)`.

This library also includes `fetch`, [documented here](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

Example: 

```lisp
(oldschool-make-temp-file
 (lambda (filename)
   (oldschool-write-text-file filename "This is my Data!" (list :append t)
			      (lambda ()
				(oldschool-read-text-file filename 'print)
				(oldschool-lstat filename 'print)
				(oldschool-real-path filename 'print)
				)
			      )
   ))
```

Further examples can be found in examples.el

Include this line in your init.el to start using it:

(eval-js "import 'https://deno.land/x/ng_oldschool@0.3.0/mod-oldschool.js'")

All credit to Deno for their API and examples.
