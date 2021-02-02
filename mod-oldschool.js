const camelToKebab = (str) => {
    return str.replace(/[A-Z]/g, "-$&").toLowerCase();
};

const methods = [
    { method: "chdir", docString: "(DIR) Changes current directory to DIR" },
    { method: "chmod", docString: "(FILENAME MASK) Changes permissions for FILENAME to MASK"},
    { method: "chown", docString: `(PATH UID GID) Changes file at path to be owned by
given uid or gid` },
    { method: "copyFile", docString: `(SRC DEST) Copies SRC file to DEST` },
    { method: "create", docString: `(FILENAME) Creates FILENAME if it does not 
exist, and returns Resource ID (RID) for file` },
    { method: "lstat", docString: `(FILENAME) Returns a data structure for the given file, 
including basic file information. If FILENAME is a symlink, this will return file information 
on the symlink, and not what the symlink points to.` },
    { method: "makeTempDir", docString: `((:dir ?DIR :prefix ?PREFIX :suffix ?SUFFIX)) Makes
a temporary directory. Returns name of directory. 
:dir specifies the temporary directory to create the tempdir in. Defaults to /tmp/ on linux.
:prefix specifies the prefix to the directory
:suffix specifies the suffix to the directory` },
    { method: "makeTempFile", docString: `((:dir ?DIR :prefix ?PREFIX :suffix ?SUFFIX)) Makes
a temporary file. Returns name of file. 
:dir specifies the temporary directory to create the tempfile in. Defaults to /tmp/ on linux.
:prefix specifies the prefix to the directory
:suffix specifies the suffix to the directory` },
    { method: "mkdir", docString: `(DIRECTORY (:recursive ?RECURSIVE :mode ?MODEMASK))
Makes a directory with given name. If :recursive is set to t, it will recursively create
the directory. :mode can be used to set permissions on the directory, i.e. 0x777` },
    { method: "readLink", docString: `(SYMLINK) Resolves the true path of a symlink` },
    { method: "readTextFile", docString: `(FILENAME) Reads the data of a file as a string` },
    { method: "realPath", docString: `(FILENAME) Resolves the normalized filepath of a 
given string` },
    { method: "remove", docString: `(FILENAME (:recursive ?RECURSIVE)) Removes a file or a
directory at a given path. Setting :recursive t will make the operation recursive` },
    { method: "rename", docString: `(OLDPATH NEWPATH) Renames a file` },
    { method: "stat", docString: `(FILENAME) Returns a data structure for the given file, 
including basic file information. If FILENAME is a symlink, this will return file information 
on what the symlink points to.`},
    { method: "truncate", docString: `(FILENAME ?LEN) Truncates FILENAME to given LEN.
If LEN is omitted, it will truncate the entire file` },
    { method: "writeTextFile", docString: `(FILENAME, STRINGDATA, (:append ?APPEND :create ?CREATE :mode ?MODEMASK
Writes STRINGDATA to file at FILENAME. Accepts the following optional parameters:
:append - if set to t, will write the file in append mode
:create - if set to t, will create the file if it does not exist
:mode - the mode mask for file creation, example 0x777`
    },
];

const genericImpl = (func, firstArg, ...rest) => {
    let callback = null;
    let largs = [];
    if (rest.length === 0) {
	callback = firstArg;
    } else {
	callback = rest.pop();
	largs = [firstArg, ...rest];
    }

    largs = largs.map(a => typeof a.json === 'function' ? a.json() : a);
    Deno[func](...largs)
	.then((returnval) => {
	    if (returnval === undefined) {
		returnval = null;
	    } else if (returnval.rid === 0) {
		returnval = 0;
	    } else {
		returnval = returnval.rid || returnval;
	    }

	    if (callback) {
		if (returnval !== null) {
		    lisp.funcall(callback, returnval);
		} else {
		    lisp.funcall(callback);
		}
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
	    lisp.funcall(callback, lisp.make.plist(event.value));
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
    name: "oldschool-listen-tls",
    docString: `((:port PORT :hostname ?HOSTNAME :certFile CERTFILE :keyFile KEYFILE 
:transport ?"tcp")) Listens on a given port for incoming connections using TLS with 
given certfile and keyfile.`,
    func: (argObj, callback) => {
	const listener = Deno.listenTls(argObj.json());
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
	    lisp.funcall(callback, conn.value.rid);
	    if (listeners[rid]) {
		return listeners[rid].next().then(process);
	    } else {
		return Promise.resolve({done: true});
	    }
	};

	listeners[rid].next().then(process);
    }
});

lisp.defun({
    name: "oldschool-close",
    docString: "(RID) Closes a given resource",
    func: (rid, callback) => {
	if (listeners[rid]) {
	    delete listeners[rid];
	}

	Deno.close(rid).then(() => {
	    lisp.funcall(callback);
	});
    },

});

lisp.defun({
    name: "oldschool-connect",
    docString: `((:port PORT :hostname ?HOSTNAME :transport ?TRANSPORT))
Opens a connection via given connection method to hostname on port.
Transport option can be tcp or udp. Returns Resource ID (RID)`,
    func: (argObj, callback) => {
	Deno.connect(argObj.json())
	    .then((conn) => {
		lisp.funcall(callback, conn.rid);
	    });
    },
});

lisp.defun({
    name: "oldschool-connect-tls",
    docString: `((:port PORT :hostname ?HOSTNAME :certFile ?CERTFILE))
Opens a connection via a TLS connection to the hostname on a given port.
Accepts a path to a cert file for the connection.`,
    func: (argObj, callback) => {
	Deno.connectTls(argObj.json())
	    .then((conn) => {
		lisp.funcall(callback, conn.rid);
	    });
    },
});

lisp.defun({
    name: "oldschool-open",
    docString: `(FILENAME (:read ?READ :write ?WRITE :append ?APPEND :truncate ?TRUNCATE :create ?CREATE :createNew ?CREATENEW :mode ?MODEMASK)) 
Opens a file with given name FILENAME. Optional arguments include a list with the following:
:read - set to t if you want this file to allow reads
:write - set to t if you want this file to allow writes
:append - set to t if you want to open the file in append mode
:truncate - set to t if you want to open the file with truncation
:create - set to t if you want to create this file if it does not exist
:createNew - If set to t, no file, directory, or symlink is allowed to exist at the target location. Requires write or append access to be used. When createNew is set to true, create and truncate are ignored.
:mode - the modemask for file creation, example 0x777`,
    func: (filename, argObj, callback) => {
	if (lisp.functionp(argObj)) {
	    Deno.open(filename).then((file) => {
		lisp.funcall(argObj, file.rid);
	    });
	} else {
	    Deno.open(filename, argObj.json()).then((file) => {
		lisp.funcall(callback, file.rid);
	    });
	}
    }
});

lisp.defun({
    name: "oldschool-seek",
    docString: `(RID OFFSET MODE) Seeks a given file to offset. 
Mode can either be :start :current or :end`,
    func: (rid, offset, mode, callback) => {
	let denoMode = null;
	if (lisp.eq(lisp.keywords.start, mode)) {
	    denoMode = Deno.SeekMode.Start;
	} else if (lisp.eq(lisp.keywords.current, mode)) {
	    denoMode = Deno.SeekMode.Current;
	} else if (lisp.eq(lisp.keywords.end, mode)) {
	    denoMode = Deno.SeekMode.End;
	} else {
	    return null;
	}

	Deno.seek(rid, offset, denoMode).then((num) => {
	    lisp.funcall(callback, num)
	});
    }
});
