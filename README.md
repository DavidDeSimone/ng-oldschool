# ng-oldschool
elisp bindings for common Deno functions 

Binds basic functions defined by [Deno](https://doc.deno.land/builtin/stable) for usage in emacs-ng. Converts most async functions defined on Deno into a lisp function with the name oldschool-name-in-kebab-case. I.e. Deno.watchFs becomes `(oldschool-watch-fs "file" 'callback)`


Example: 

```lisp
(oldschool-open "my-file.json"
		(lambda (rid)
		  (oldschool-read rid 5 'print)
		  ))
```

All credit to Deno for their API and examples.
