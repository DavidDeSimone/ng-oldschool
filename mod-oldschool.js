const camelToKebab = (str) => {
    return str.replace(/[A-Z]/g, "-$&").toLowerCase();
};

const methods = [
"chdir",
"chmod",
"chown",
"close",
"connect",
"connectTls",
"copy",
"copyFile",
"create",
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
"open",
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
//"watchFs",
//"write",
//"writeAll",
"writeFile",
"writeTextFile"
];

const genericImpl = (func, firstArg, ...rest) => {
    let callback = null;
    let largs = undefined;
    if (rest.length === 0) {
	callback = firstArg;
    } else {
	callback = rest.pop();
	largs = [firstArg, ...rest];
    }

    Deno[func](...largs)
	.then((returnval) => {
	    if (returnval.rid === 0) {
		returnval = 0;
	    } else {
		returnval = returnval.rid || returnval;
	    }

	    if (callback) {
		lisp.funcall(callback, returnval);
	    }
	})
	.catch(e => {
	    lisp.error(JSON.stringify(e));
	});
};

methods.forEach((func) => {
    const name = camelToKebab(func);
    lisp.defun({
	name: `oldschool-${name}`,
	func: (firstArg, ...rest) => genericImpl(func, firstArg, ...rest),
    });
});

lisp.defun({
    name: "oldschool-read",
    func: (rid, bytes, callback) => {
	const buf = new Uint8Array(bytes);
	Deno.read(rid, buf).then(() => {
	    const text = new TextDecoder().decode(buf);
	    if (callback) {
		lisp.funcall(callback, text);
	    }
	});
    }
});

lisp.defun({
    name: "oldschool-write",
    func: (rid, str, callback) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(str);
	Deno.write(rid, data).then((bytesWritten) => {
	    if (callback) {
		lisp.funcall(callback, bytesWritten);
	    }
	});
    },
});

lisp.defun({
    name: "oldschool-watch-fs",
    func: (filename, callback) => {
	const watcher = Deno.watchFs(filename);
	const process = (event) => {
	    lisp.funcall(callback, lisp.make.plist(event));
	    return watcher.next().then(process);
	};

	watcher.next().then(process);
    },
});
