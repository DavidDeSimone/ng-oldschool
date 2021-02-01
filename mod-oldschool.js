const camelToKebab = (str) => {
    return str.replace(/[A-Z]/g, "-$&").toLowerCase();
};

const methods = [
    { method: "chdir", docString: "(DIR) Changes current directory to DIR" },
    { method: "chmod", docString: "(FILENAME MASK) Changes permissions for FILENAME to MASK"},
    { method: "chown", docString: `(PATH UID GID) Changes file at path to be owned by
given uid or gid` },
    { method: "close", docString: "(RID) Closes a given resource" },
    { method: "connect", docString: `((:port PORT :hostname ?HOSTNAME :transport ?TRANSPORT))
Opens a connection via given connection method to hostname on port.
Transport option can be tcp or udp. Returns Resource ID (RID)` },
    { method: "connectTls", docString: `((:port PORT :hostname ?HOSTNAME :certFile ?CERTFILE))
Opens a connection via a TLS connection to the hostname on a given port.
Accepts a path to a cert file for the connection.` },
    { method: "copyFile", docString: `(SRC DEST) Copies SRC file to DEST` },
    { method: "create", docString: `(FILENAME) Creates FILENAME if it does not 
exist, and returns Resource ID (RID) for file` },
"listenTls",
"lstat",
"makeTempDir",
"makeTempFile",
"metrics",
"mkdir",
"open",
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
"stat",
"truncate",
"writeFile",
"writeTextFile"
];

const genericImpl = (func, firstArg, ...rest) => {
    let callback = null;
    let largs = [];
    if (rest.length === 0) {
	callback = firstArg;
    } else {
	callback = rest.pop();
	rest = rest.map(a => a.json ? a.json() : a);
	largs = [firstArg, ...rest];
    }

    largs = largs.map(a => typeof a.json === 'function' ? a.json() : a);
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
    let name = null;
    let docString = null;
    if (typeof func === 'string') {
	name = camelToKebab(func);
    } else {
	name = camelToKebab(func.method);
	docString = func.docString;
	func = func.method;
    }
    lisp.defun({
	name: `oldschool-${name}`,
	docString,
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

const listeners = {};

lisp.defun({
    name: "oldschool-listen",
    docString: `((:port PORT :hostname ?HOSTNAME)) Listens on
a given port for incoming connections.`,
    func: (argObj, callback) => {
	const listener = Deno.listen(argObj.json());
	const rid = listener.rid;
	listeners[rid] = listener;
	lisp.funcall(callback, rid);
    }
});


lisp.defun({
    name: "oldschool-accept",
    docString: `(RID) Accepts incoming connections for given listener. 
Calls callback once per connection with RID of new connection`,
    func: (rid, callback) => {
	const process = (conn) => {
	    lisp.funcall(callback, conn.rid);
	    if (listeners[rid]) {
		return listeners[rid].next().then(process);
	    } else {
		return Promise.resolve({done: true});
	    }
	};
	
	listeners[rid].next().then(process);
    }
});

// @TODO write custom close to handle nulling out the listener object.
