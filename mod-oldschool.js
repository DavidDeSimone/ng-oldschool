const methods = [
"chdir",
"chmod",
"chown",
//"close",
"connect",
"connectTls",
"copy",
"copyFile",
//"create",
"cwd",
"execPath",
//"exit",
"inspect",
"isatty",
//"iter",
"listen",
"listenTls",
"lstat",
"makeTempDir",
"makeTempFile",
"metrics",
"mkdir",
//"open",
//"read",
//"readAll",
"readDir",
"readFile",
"readLink",
"readTextFile",
"realPath",
"remove",
"rename",
"resources",
"run",
"seek",
//"shutdown",
"stat",
//"test",
//"test",
"truncate",
"watchFs",
//"write",
//"writeAll",
"writeFile",
"writeTextFile"
];


methods.forEach((func) => {
    lisp.defun({
	name: `oldschool-${func}`,
	func: (callback, ...largs) => {
	    Deno[func](...largs).then((...args) => {
		lisp.funcall(callback, ...args);
	    });
	}
    });
});
