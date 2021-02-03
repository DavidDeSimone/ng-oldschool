;; A list of examples for using oldschool

;; Make a temp file, write some data
;; call lstat and revole it's real path
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

;; Open and write to a file, and then read from it
(oldschool-make-temp-file
 (lambda (filename)
   (oldschool-write-text-file filename "This is my Data!" (list :append t)
			      (lambda ()
				(oldschool-open filename
						(lambda (rid)
						  (oldschool-seek rid 3 :start 'print))
						))
			      )
   ))

;; Set up a filewatcher 
(oldschool-make-temp-dir (lambda (dir)
			   (oldschool-watch-fs dir 'print)
			   (oldschool-make-temp-file (list :dir dir :prefix "foo") 'print)
			   ))

;; Open a local server, and connect to it.
(oldschool-listen '(:port 8085)
		  (lambda (rid)
		    (oldschool-accept rid (lambda (conn-rid)
					    (print "Connected")))))
(oldschool-connect '(:port 8085) (lambda (rid) (print "Hello")))

;; fetch a url - receive JSON data back as a plist
(oldschool-fetch-json "https://api.github.com/users/denoland" '(
							       :method "GET"
							       :redirect "manual"
							       ) 'print)
