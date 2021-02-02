# ng-oldschool
elisp bindings for common Deno functions 

Binds basic functions defined by [Deno](https://doc.deno.land/builtin/stable) for usage in emacs-ng. Converts most async functions defined on Deno into a lisp function with the name oldschool-name-in-kebab-case. I.e. Deno.watchFs becomes `(oldschool-watch-fs "file" 'callback)`

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

All credit to Deno for their API and examples.
