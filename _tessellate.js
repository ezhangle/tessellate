// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
try {
  this['Module'] = Module;
} catch(e) {
  this['Module'] = Module = {};
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function(filename) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename).toString();
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename).toString();
    }
    return ret;
  };

  Module['load'] = function(f) {
    globalEval(read(f));
  };

  if (!Module['arguments']) {
    Module['arguments'] = process['argv'].slice(2);
  }
}

if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  // Polyfill over SpiderMonkey/V8 differences
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function(f) { snarf(f) };
  }

  if (!Module['arguments']) {
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}

if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  if (!Module['print']) {
    Module['print'] = function(x) {
      console.log(x);
    };
  }

  if (!Module['printErr']) {
    Module['printErr'] = function(x) {
      console.log(x);
    };
  }
}

if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (!Module['arguments']) {
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}

if (ENVIRONMENT_IS_WORKER) {
  // We can do very little here...
  var TRY_USE_DUMP = false;
  if (!Module['print']) {
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  Module['load'] = importScripts;
}

if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
if (!Module['preRun']) Module['preRun'] = [];
if (!Module['postRun']) Module['postRun'] = [];

  
// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return '((((' +target + ')+' + (quantum-1) + ')>>' + logg + ')<<' + logg + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (/^\[\d+\ x\ (.*)\]/.test(type)) return true; // [15 x ?] blocks. Like structs
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  BITSHIFT64_SHL: 0,
  BITSHIFT64_ASHR: 1,
  BITSHIFT64_LSHR: 2,
  bitshift64: function (low, high, op, bits) {
    var ret;
    var ander = Math.pow(2, bits)-1;
    if (bits < 32) {
      switch (op) {
        case Runtime.BITSHIFT64_SHL:
          ret = [low << bits, (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits))];
          break;
        case Runtime.BITSHIFT64_ASHR:
          ret = [(((low >>> bits ) | ((high&ander) << (32 - bits))) >> 0) >>> 0, (high >> bits) >>> 0];
          break;
        case Runtime.BITSHIFT64_LSHR:
          ret = [((low >>> bits) | ((high&ander) << (32 - bits))) >>> 0, high >>> bits];
          break;
      }
    } else if (bits == 32) {
      switch (op) {
        case Runtime.BITSHIFT64_SHL:
          ret = [0, low];
          break;
        case Runtime.BITSHIFT64_ASHR:
          ret = [high, (high|0) < 0 ? ander : 0];
          break;
        case Runtime.BITSHIFT64_LSHR:
          ret = [high, 0];
          break;
      }
    } else { // bits > 32
      switch (op) {
        case Runtime.BITSHIFT64_SHL:
          ret = [0, low << (bits - 32)];
          break;
        case Runtime.BITSHIFT64_ASHR:
          ret = [(high >> (bits - 32)) >>> 0, (high|0) < 0 ? ander : 0];
          break;
        case Runtime.BITSHIFT64_LSHR:
          ret = [high >>>  (bits - 32) , 0];
          break;
      }
    }
    HEAP32[tempDoublePtr>>2] = ret[0]; // cannot use utility functions since we are in runtime itself
    HEAP32[tempDoublePtr+4>>2] = ret[1];
  },
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      '%i1': 1,
      '%i8': 1,
      '%i16': 2,
      '%i32': 4,
      '%i64': 8,
      "%float": 4,
      "%double": 8
    }['%'+type]; // add '%' since float and double confuse Closure compiler as keys, and also spidermonkey as a compiler will remove 's from '_i8' etc
    if (!size) {
      if (type.charAt(type.length-1) == '*') {
        size = Runtime.QUANTUM_SIZE; // A pointer
      } else if (type[0] == 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits/8;
      }
    }
    return size;
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map(function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = size;
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Types.types[field].alignSize;
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        throw 'Unclear type in struct: ' + field + ', in ' + type.name_ + ' :: ' + dump(Types.types[type.name_]);
      }
      alignSize = type.packed ? 1 : Math.min(alignSize, Runtime.QUANTUM_SIZE);
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return FUNCTION_TABLE[ptr].apply(null, args);
    } else {
      return FUNCTION_TABLE[ptr]();
    }
  },
  addFunction: function (func, sig) {
    //assert(sig); // TODO: support asm
    var table = FUNCTION_TABLE; // TODO: support asm
    var ret = table.length;
    table.push(func);
    table.push(0);
    return ret;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xff;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return '';
      }
      if (needed > 0) return '';
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      } else {
        ret = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function stackAlloc(size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = ((((STACKTOP)+3)>>2)<<2); return ret; },
  staticAlloc: function staticAlloc(size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = ((((STATICTOP)+3)>>2)<<2); if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function alignMemory(size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 4))*(quantum ? quantum : 4); return ret; },
  makeBigInt: function makeBigInt(low,high,unsigned) { var ret = (unsigned ? (((low)>>>0)+(((high)>>>0)*4294967296)) : (((low)>>>0)+(((high)|0)*4294967296))); return ret; },
  QUANTUM_SIZE: 4,
  __dummy__: 0
}







//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.
var setjmpId = 1; // Used in setjmp/longjmp
var setjmpLabels = {};

var ABORT = false;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function abort(text) {
  Module.print(text + ':\n' + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = eval('_' + ident);
  } catch(e) {
    try {
      func = globalScope['Module']['_' + ident]; // closure exported function
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length+1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,Math.min(Math.floor((value)/4294967296), 4294967295)>>>0],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': (HEAPF64[(tempDoublePtr)>>3]=value,HEAP32[((ptr)>>2)]=HEAP32[((tempDoublePtr)>>2)],HEAP32[(((ptr)+(4))>>2)]=HEAP32[(((tempDoublePtr)+(4))>>2)]); break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return (HEAP32[((tempDoublePtr)>>2)]=HEAP32[((ptr)>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((ptr)+(4))>>2)],HEAPF64[(tempDoublePtr)>>3]);
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_NONE = 3; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// Simple unoptimized memset - necessary during startup
var _memset = function(ptr, value, num) {
  var stop = ptr + num;
  while (ptr < stop) {
    HEAP8[((ptr++)|0)]=value;
  }
}

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    _memset(ret, 0, size);
    return ret;
  }

  if (singleType === 'i8') {
    HEAPU8.set(new Uint8Array(slab), ret);
    return ret;
  }

  var i = 0, type;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);
    i += Runtime.getNativeTypeSize(type);
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  var utf8 = new Runtime.UTF8Processor();
  var nullTerminated = typeof(length) == "undefined";
  var ret = "";
  var i = 0;
  var t;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (nullTerminated && t == 0) break;
    ret += utf8.processCChar(t);
    i += 1;
    if (!nullTerminated && i == length) break;
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function Array_stringify(array) {
  var ret = "";
  for (var i = 0; i < array.length; i++) {
    ret += String.fromCharCode(array[i]);
  }
  return ret;
}
Module['Array_stringify'] = Array_stringify;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return ((x+4095)>>12)<<12;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;
function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value, (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

STACK_ROOT = STACKTOP = Runtime.alignMemory(1);
STACK_MAX = TOTAL_STACK; // we lose a little stack here, but TOTAL_STACK is nice and round so use that as the max

var tempDoublePtr = Runtime.alignMemory(allocate(12, 'i8', ALLOC_STACK), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}

STATICTOP = STACK_MAX;
assert(STATICTOP < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY

var nullString = allocate(intArrayFromString('(null)'), 'i8', ALLOC_STACK);

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATINIT__ = []; // functions called during startup
var __ATMAIN__ = []; // functions called when main() is to be run
var __ATEXIT__ = []; // functions called during shutdown

function initRuntime() {
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

if (!Math.imul) Math.imul = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var calledRun = false;
var runDependencyWatcher = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 6000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    } 
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun && shouldRunNow) run();
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data

// === Body ===



assert(STATICTOP == STACK_MAX); assert(STACK_MAX == TOTAL_STACK);

STATICTOP += 2648;

assert(STATICTOP < TOTAL_MEMORY);

var _stderr;

























































































allocate(24, "i8", ALLOC_NONE, 5242880);
allocate([69,100,103,101,83,105,103,110,40,32,100,115,116,85,112,44,32,116,101,115,115,45,62,101,118,101,110,116,44,32,111,114,103,85,112,32,41,32,60,61,32,48,0] /* EdgeSign( dstUp, tes */, "i8", ALLOC_NONE, 5242904);
allocate([101,45,62,79,114,103,32,61,61,32,118,0] /* e-_Org == v\00 */, "i8", ALLOC_NONE, 5242948);
allocate([33,32,86,101,114,116,69,113,40,32,100,115,116,76,111,44,32,100,115,116,85,112,32,41,0] /* ! VertEq( dstLo, dst */, "i8", ALLOC_NONE, 5242960);
allocate([99,104,105,108,100,32,60,61,32,112,113,45,62,109,97,120,0] /* child _= pq-_max\00 */, "i8", ALLOC_NONE, 5242988);
allocate([118,45,62,112,114,101,118,32,61,61,32,118,80,114,101,118,0] /* v-_prev == vPrev\00 */, "i8", ALLOC_NONE, 5243008);
allocate([69,82,82,79,82,44,32,99,97,110,39,116,32,104,97,110,100,108,101,32,37,100,10,0] /* ERROR, can't handle  */, "i8", ALLOC_NONE, 5243028);
allocate([114,101,103,80,114,101,118,45,62,119,105,110,100,105,110,103,78,117,109,98,101,114,32,45,32,101,45,62,119,105,110,100,105,110,103,32,61,61,32,114,101,103,45,62,119,105,110,100,105,110,103,78,117,109,98,101,114,0] /* regPrev-_windingNumb */, "i8", ALLOC_NONE, 5243052);
allocate([99,117,114,114,32,60,32,112,113,45,62,109,97,120,32,38,38,32,112,113,45,62,107,101,121,115,91,99,117,114,114,93,32,33,61,32,78,85,76,76,0] /* curr _ pq-_max && pq */, "i8", ALLOC_NONE, 5243112);
allocate([116,101,115,115,109,111,110,111,46,99,0] /* tessmono.c\00 */, "i8", ALLOC_NONE, 5243156);
allocate([102,45,62,112,114,101,118,32,61,61,32,102,80,114,101,118,32,38,38,32,102,45,62,97,110,69,100,103,101,32,61,61,32,78,85,76,76,32,38,38,32,102,45,62,100,97,116,97,32,61,61,32,78,85,76,76,0] /* f-_prev == fPrev &&  */, "i8", ALLOC_NONE, 5243168);
allocate([86,101,114,116,76,101,113,40,32,101,45,62,79,114,103,44,32,101,45,62,68,115,116,32,41,0] /* VertLeq( e-_Org, e-_ */, "i8", ALLOC_NONE, 5243228);
allocate([99,117,114,114,32,33,61,32,76,79,78,71,95,77,65,88,0] /* curr != LONG_MAX\00 */, "i8", ALLOC_NONE, 5243256);
allocate([101,45,62,76,102,97,99,101,32,61,61,32,102,0] /* e-_Lface == f\00 */, "i8", ALLOC_NONE, 5243276);
allocate([114,101,103,45,62,101,85,112,45,62,119,105,110,100,105,110,103,32,61,61,32,48,0] /* reg-_eUp-_winding == */, "i8", ALLOC_NONE, 5243292);
allocate([76,69,81,40,32,42,42,40,105,43,49,41,44,32,42,42,105,32,41,0] /* LEQ( __(i+1), __i )\ */, "i8", ALLOC_NONE, 5243316);
allocate([115,119,101,101,112,46,99,0] /* sweep.c\00 */, "i8", ALLOC_NONE, 5243336);
allocate([101,45,62,79,110,101,120,116,45,62,83,121,109,45,62,76,110,101,120,116,32,61,61,32,101,0] /* e-_Onext-_Sym-_Lnext */, "i8", ALLOC_NONE, 5243344);
allocate([114,101,103,45,62,119,105,110,100,105,110,103,78,117,109,98,101,114,32,61,61,32,48,0] /* reg-_windingNumber = */, "i8", ALLOC_NONE, 5243372);
allocate([112,113,32,33,61,32,78,85,76,76,0] /* pq != NULL\00 */, "i8", ALLOC_NONE, 5243396);
allocate([46,47,112,114,105,111,114,105,116,121,113,45,104,101,97,112,46,99,0] /* ./priorityq-heap.c\0 */, "i8", ALLOC_NONE, 5243408);
allocate([101,45,62,76,110,101,120,116,45,62,79,110,101,120,116,45,62,83,121,109,32,61,61,32,101,0] /* e-_Lnext-_Onext-_Sym */, "i8", ALLOC_NONE, 5243428);
allocate([43,43,102,105,120,101,100,69,100,103,101,115,32,61,61,32,49,0] /* ++fixedEdges == 1\00 */, "i8", ALLOC_NONE, 5243456);
allocate([112,114,105,111,114,105,116,121,113,46,99,0] /* priorityq.c\00 */, "i8", ALLOC_NONE, 5243476);
allocate([103,101,111,109,46,99,0] /* geom.c\00 */, "i8", ALLOC_NONE, 5243488);
allocate([115,105,122,101,32,61,61,32,49,0] /* size == 1\00 */, "i8", ALLOC_NONE, 5243496);
allocate([101,45,62,83,121,109,45,62,83,121,109,32,61,61,32,101,0] /* e-_Sym-_Sym == e\00 */, "i8", ALLOC_NONE, 5243508);
allocate([108,111,45,62,76,110,101,120,116,32,33,61,32,117,112,0] /* lo-_Lnext != up\00 */, "i8", ALLOC_NONE, 5243528);
allocate([114,101,103,45,62,102,105,120,85,112,112,101,114,69,100,103,101,0] /* reg-_fixUpperEdge\00 */, "i8", ALLOC_NONE, 5243544);
allocate([104,67,117,114,114,32,62,61,32,49,32,38,38,32,104,67,117,114,114,32,60,61,32,112,113,45,62,109,97,120,32,38,38,32,104,91,104,67,117,114,114,93,46,107,101,121,32,33,61,32,78,85,76,76,0] /* hCurr _= 1 && hCurr  */, "i8", ALLOC_NONE, 5243564);
allocate([84,114,97,110,115,76,101,113,40,32,117,44,32,118,32,41,32,38,38,32,84,114,97,110,115,76,101,113,40,32,118,44,32,119,32,41,0] /* TransLeq( u, v ) &&  */, "i8", ALLOC_NONE, 5243620);
allocate([115,105,122,101,32,61,61,32,48,0] /* size == 0\00 */, "i8", ALLOC_NONE, 5243660);
allocate([101,84,111,112,76,101,102,116,32,33,61,32,101,84,111,112,82,105,103,104,116,0] /* eTopLeft != eTopRigh */, "i8", ALLOC_NONE, 5243672);
allocate([101,45,62,83,121,109,32,33,61,32,101,0] /* e-_Sym != e\00 */, "i8", ALLOC_NONE, 5243696);
allocate([84,79,76,69,82,65,78,67,69,95,78,79,78,90,69,82,79,0] /* TOLERANCE_NONZERO\00 */, "i8", ALLOC_NONE, 5243708);
allocate([70,65,76,83,69,0] /* FALSE\00 */, "i8", ALLOC_NONE, 5243728);
allocate([33,32,86,101,114,116,69,113,40,32,101,85,112,45,62,68,115,116,44,32,101,76,111,45,62,68,115,116,32,41,0] /* ! VertEq( eUp-_Dst,  */, "i8", ALLOC_NONE, 5243736);
allocate([117,112,45,62,76,110,101,120,116,32,33,61,32,117,112,32,38,38,32,117,112,45,62,76,110,101,120,116,45,62,76,110,101,120,116,32,33,61,32,117,112,0] /* up-_Lnext != up && u */, "i8", ALLOC_NONE, 5243768);
allocate([114,101,110,100,101,114,46,99,0] /* render.c\00 */, "i8", ALLOC_NONE, 5243812);
allocate([105,115,101,99,116,46,115,32,60,61,32,77,65,88,40,32,111,114,103,76,111,45,62,115,44,32,111,114,103,85,112,45,62,115,32,41,0] /* isect.s _= MAX( orgL */, "i8", ALLOC_NONE, 5243824);
allocate([118,78,101,119,32,33,61,32,78,85,76,76,0] /* vNew != NULL\00 */, "i8", ALLOC_NONE, 5243864);
allocate([77,73,78,40,32,100,115,116,76,111,45,62,115,44,32,100,115,116,85,112,45,62,115,32,41,32,60,61,32,105,115,101,99,116,46,115,0] /* MIN( dstLo-_s, dstUp */, "i8", ALLOC_NONE, 5243880);
allocate([101,45,62,76,110,101,120,116,32,33,61,32,101,0] /* e-_Lnext != e\00 */, "i8", ALLOC_NONE, 5243920);
allocate([102,78,101,119,32,33,61,32,78,85,76,76,0] /* fNew != NULL\00 */, "i8", ALLOC_NONE, 5243936);
allocate([105,115,101,99,116,46,116,32,60,61,32,77,65,88,40,32,111,114,103,76,111,45,62,116,44,32,100,115,116,76,111,45,62,116,32,41,0] /* isect.t _= MAX( orgL */, "i8", ALLOC_NONE, 5243952);
allocate([102,114,101,101,95,104,97,110,100,108,101,32,33,61,32,76,79,78,71,95,77,65,88,0] /* free_handle != LONG_ */, "i8", ALLOC_NONE, 5243992);
allocate([101,45,62,83,121,109,45,62,110,101,120,116,32,61,61,32,101,80,114,101,118,45,62,83,121,109,32,38,38,32,101,45,62,83,121,109,32,61,61,32,38,109,101,115,104,45,62,101,72,101,97,100,83,121,109,32,38,38,32,101,45,62,83,121,109,45,62,83,121,109,32,61,61,32,101,32,38,38,32,101,45,62,79,114,103,32,61,61,32,78,85,76,76,32,38,38,32,101,45,62,68,115,116,32,61,61,32,78,85,76,76,32,38,38,32,101,45,62,76,102,97,99,101,32,61,61,32,78,85,76,76,32,38,38,32,101,45,62,82,102,97,99,101,32,61,61,32,78,85,76,76,0] /* e-_Sym-_next == ePre */, "i8", ALLOC_NONE, 5244016);
allocate([77,73,78,40,32,111,114,103,85,112,45,62,116,44,32,100,115,116,85,112,45,62,116,32,41,32,60,61,32,105,115,101,99,116,46,116,0] /* MIN( orgUp-_t, dstUp */, "i8", ALLOC_NONE, 5244168);
allocate([86,101,114,116,76,101,113,40,32,117,44,32,118,32,41,32,38,38,32,86,101,114,116,76,101,113,40,32,118,44,32,119,32,41,0] /* VertLeq( u, v ) && V */, "i8", ALLOC_NONE, 5244208);
allocate([101,45,62,68,115,116,32,33,61,32,78,85,76,76,0] /* e-_Dst != NULL\00 */, "i8", ALLOC_NONE, 5244244);
allocate([33,32,114,101,103,85,112,45,62,102,105,120,85,112,112,101,114,69,100,103,101,32,38,38,32,33,32,114,101,103,76,111,45,62,102,105,120,85,112,112,101,114,69,100,103,101,0] /* ! regUp-_fixUpperEdg */, "i8", ALLOC_NONE, 5244260);
allocate([101,45,62,79,114,103,32,33,61,32,78,85,76,76,0] /* e-_Org != NULL\00 */, "i8", ALLOC_NONE, 5244308);
allocate([102,45,62,109,97,114,107,101,100,0] /* f-_marked\00 */, "i8", ALLOC_NONE, 5244324);
allocate([111,114,103,85,112,32,33,61,32,116,101,115,115,45,62,101,118,101,110,116,32,38,38,32,111,114,103,76,111,32,33,61,32,116,101,115,115,45,62,101,118,101,110,116,0] /* orgUp != tess-_event */, "i8", ALLOC_NONE, 5244336);
allocate([101,45,62,83,121,109,45,62,110,101,120,116,32,61,61,32,101,80,114,101,118,45,62,83,121,109,0] /* e-_Sym-_next == ePre */, "i8", ALLOC_NONE, 5244384);
allocate([69,100,103,101,83,105,103,110,40,32,100,115,116,76,111,44,32,116,101,115,115,45,62,101,118,101,110,116,44,32,111,114,103,76,111,32,41,32,62,61,32,48,0] /* EdgeSign( dstLo, tes */, "i8", ALLOC_NONE, 5244412);
allocate([118,45,62,112,114,101,118,32,61,61,32,118,80,114,101,118,32,38,38,32,118,45,62,97,110,69,100,103,101,32,61,61,32,78,85,76,76,32,38,38,32,118,45,62,100,97,116,97,32,61,61,32,78,85,76,76,0] /* v-_prev == vPrev &&  */, "i8", ALLOC_NONE, 5244456);
allocate([102,45,62,112,114,101,118,32,61,61,32,102,80,114,101,118,0] /* f-_prev == fPrev\00 */, "i8", ALLOC_NONE, 5244516);
allocate([109,101,115,104,46,99,0] /* mesh.c\00 */, "i8", ALLOC_NONE, 5244536);
allocate(468, "i8", ALLOC_NONE, 5244544);
allocate([95,95,103,108,95,116,114,97,110,115,83,105,103,110,0] /* __gl_transSign\00 */, "i8", ALLOC_NONE, 5245012);
allocate([95,95,103,108,95,116,114,97,110,115,69,118,97,108,0] /* __gl_transEval\00 */, "i8", ALLOC_NONE, 5245028);
allocate([95,95,103,108,95,114,101,110,100,101,114,77,101,115,104,0] /* __gl_renderMesh\00 */, "i8", ALLOC_NONE, 5245044);
allocate([95,95,103,108,95,112,113,83,111,114,116,73,110,115,101,114,116,0] /* __gl_pqSortInsert\00 */, "i8", ALLOC_NONE, 5245060);
allocate([95,95,103,108,95,112,113,83,111,114,116,73,110,105,116,0] /* __gl_pqSortInit\00 */, "i8", ALLOC_NONE, 5245080);
allocate([95,95,103,108,95,112,113,83,111,114,116,68,101,108,101,116,101,80,114,105,111,114,105,116,121,81,0] /* __gl_pqSortDeletePri */, "i8", ALLOC_NONE, 5245096);
allocate([95,95,103,108,95,112,113,83,111,114,116,68,101,108,101,116,101,0] /* __gl_pqSortDelete\00 */, "i8", ALLOC_NONE, 5245124);
allocate([95,95,103,108,95,112,113,72,101,97,112,73,110,115,101,114,116,0] /* __gl_pqHeapInsert\00 */, "i8", ALLOC_NONE, 5245144);
allocate([95,95,103,108,95,112,113,72,101,97,112,68,101,108,101,116,101,0] /* __gl_pqHeapDelete\00 */, "i8", ALLOC_NONE, 5245164);
allocate([95,95,103,108,95,109,101,115,104,84,101,115,115,101,108,108,97,116,101,77,111,110,111,82,101,103,105,111,110,0] /* __gl_meshTessellateM */, "i8", ALLOC_NONE, 5245184);
allocate([95,95,103,108,95,109,101,115,104,67,104,101,99,107,77,101,115,104,0] /* __gl_meshCheckMesh\0 */, "i8", ALLOC_NONE, 5245216);
allocate([95,95,103,108,95,101,100,103,101,83,105,103,110,0] /* __gl_edgeSign\00 */, "i8", ALLOC_NONE, 5245236);
allocate([95,95,103,108,95,101,100,103,101,69,118,97,108,0] /* __gl_edgeEval\00 */, "i8", ALLOC_NONE, 5245252);
allocate([82,101,110,100,101,114,84,114,105,97,110,103,108,101,0] /* RenderTriangle\00 */, "i8", ALLOC_NONE, 5245268);
allocate([82,101,110,100,101,114,83,116,114,105,112,0] /* RenderStrip\00 */, "i8", ALLOC_NONE, 5245284);
allocate([82,101,110,100,101,114,70,97,110,0] /* RenderFan\00 */, "i8", ALLOC_NONE, 5245296);
allocate([82,101,109,111,118,101,68,101,103,101,110,101,114,97,116,101,70,97,99,101,115,0] /* RemoveDegenerateFace */, "i8", ALLOC_NONE, 5245308);
allocate([77,97,107,101,86,101,114,116,101,120,0] /* MakeVertex\00 */, "i8", ALLOC_NONE, 5245332);
allocate([77,97,107,101,70,97,99,101,0] /* MakeFace\00 */, "i8", ALLOC_NONE, 5245344);
allocate([73,115,87,105,110,100,105,110,103,73,110,115,105,100,101,0] /* IsWindingInside\00 */, "i8", ALLOC_NONE, 5245356);
allocate([70,108,111,97,116,68,111,119,110,0] /* FloatDown\00 */, "i8", ALLOC_NONE, 5245372);
allocate([70,105,120,85,112,112,101,114,69,100,103,101,0] /* FixUpperEdge\00 */, "i8", ALLOC_NONE, 5245384);
allocate([68,111,110,101,69,100,103,101,68,105,99,116,0] /* DoneEdgeDict\00 */, "i8", ALLOC_NONE, 5245400);
allocate([68,101,108,101,116,101,82,101,103,105,111,110,0] /* DeleteRegion\00 */, "i8", ALLOC_NONE, 5245416);
allocate([67,111,110,110,101,99,116,76,101,102,116,68,101,103,101,110,101,114,97,116,101,0] /* ConnectLeftDegenerat */, "i8", ALLOC_NONE, 5245432);
allocate([67,104,101,99,107,70,111,114,76,101,102,116,83,112,108,105,99,101,0] /* CheckForLeftSplice\0 */, "i8", ALLOC_NONE, 5245456);
allocate([67,104,101,99,107,70,111,114,73,110,116,101,114,115,101,99,116,0] /* CheckForIntersect\00 */, "i8", ALLOC_NONE, 5245476);
allocate([65,100,100,82,105,103,104,116,69,100,103,101,115,0] /* AddRightEdges\00 */, "i8", ALLOC_NONE, 5245496);
allocate([0,0,0,63,0,0,0,63,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5245512);

  function ___assert_func(filename, line, func, condition) {
      throw 'Assertion failed: ' + (condition ? Pointer_stringify(condition) : 'unknown condition') + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + new Error().stack;
    }

  
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      ret = dest|0;
      if ((dest&3) == (src&3)) {
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[(dest)]=HEAP8[(src)];
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        while ((num|0) >= 4) {
          HEAP32[((dest)>>2)]=HEAP32[((src)>>2)];
          dest = (dest+4)|0;
          src = (src+4)|0;
          num = (num-4)|0;
        }
      }
      while ((num|0) > 0) {
        HEAP8[(dest)]=HEAP8[(src)];
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      return ret|0;
    }var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
var _setjmp; // stub for _setjmp

  function _longjmp(env, value) {
      throw { longjmp: true, id: HEAP32[((env)>>2)], value: value || 1 };
    }

  
  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
      stop = (ptr + num)|0;
      if (num|0 >= 20) {
        // This is unaligned, but quite large, so work hard to get to aligned settings
        unaligned = ptr & 3;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
        stop4 = stop & ~3;
        if (unaligned) {
          unaligned = (ptr + 4 - unaligned)|0;
          while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
            HEAP8[(ptr)]=value;
            ptr = (ptr+1)|0;
          }
        }
        while ((ptr|0) < (stop4|0)) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      while ((ptr|0) < (stop|0)) {
        HEAP8[(ptr)]=value;
        ptr = (ptr+1)|0;
      }
    }var _llvm_memset_p0i8_i32=_memset;

  
  
  
  var ERRNO_CODES={E2BIG:7,EACCES:13,EADDRINUSE:98,EADDRNOTAVAIL:99,EAFNOSUPPORT:97,EAGAIN:11,EALREADY:114,EBADF:9,EBADMSG:74,EBUSY:16,ECANCELED:125,ECHILD:10,ECONNABORTED:103,ECONNREFUSED:111,ECONNRESET:104,EDEADLK:35,EDESTADDRREQ:89,EDOM:33,EDQUOT:122,EEXIST:17,EFAULT:14,EFBIG:27,EHOSTUNREACH:113,EIDRM:43,EILSEQ:84,EINPROGRESS:115,EINTR:4,EINVAL:22,EIO:5,EISCONN:106,EISDIR:21,ELOOP:40,EMFILE:24,EMLINK:31,EMSGSIZE:90,EMULTIHOP:72,ENAMETOOLONG:36,ENETDOWN:100,ENETRESET:102,ENETUNREACH:101,ENFILE:23,ENOBUFS:105,ENODATA:61,ENODEV:19,ENOENT:2,ENOEXEC:8,ENOLCK:37,ENOLINK:67,ENOMEM:12,ENOMSG:42,ENOPROTOOPT:92,ENOSPC:28,ENOSR:63,ENOSTR:60,ENOSYS:38,ENOTCONN:107,ENOTDIR:20,ENOTEMPTY:39,ENOTRECOVERABLE:131,ENOTSOCK:88,ENOTSUP:95,ENOTTY:25,ENXIO:6,EOVERFLOW:75,EOWNERDEAD:130,EPERM:1,EPIPE:32,EPROTO:71,EPROTONOSUPPORT:93,EPROTOTYPE:91,ERANGE:34,EROFS:30,ESPIPE:29,ESRCH:3,ESTALE:116,ETIME:62,ETIMEDOUT:110,ETXTBSY:26,EWOULDBLOCK:11,EXDEV:18};
  
  function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      if (!___setErrNo.ret) ___setErrNo.ret = allocate([0], 'i32', ALLOC_STATIC);
      HEAP32[((___setErrNo.ret)>>2)]=value
      return value;
    }
  
  var _stdin=allocate(1, "i32*", ALLOC_STACK);
  
  var _stdout=allocate(1, "i32*", ALLOC_STACK);
  
  var _stderr=allocate(1, "i32*", ALLOC_STACK);
  
  var __impure_ptr=allocate(1, "i32*", ALLOC_STACK);var FS={currentPath:"/",nextInode:2,streams:[null],ignorePermissions:true,joinPath:function (parts, forceRelative) {
        var ret = parts[0];
        for (var i = 1; i < parts.length; i++) {
          if (ret[ret.length-1] != '/') ret += '/';
          ret += parts[i];
        }
        if (forceRelative && ret[0] == '/') ret = ret.substr(1);
        return ret;
      },absolutePath:function (relative, base) {
        if (typeof relative !== 'string') return null;
        if (base === undefined) base = FS.currentPath;
        if (relative && relative[0] == '/') base = '';
        var full = base + '/' + relative;
        var parts = full.split('/').reverse();
        var absolute = [''];
        while (parts.length) {
          var part = parts.pop();
          if (part == '' || part == '.') {
            // Nothing.
          } else if (part == '..') {
            if (absolute.length > 1) absolute.pop();
          } else {
            absolute.push(part);
          }
        }
        return absolute.length == 1 ? '/' : absolute.join('/');
      },analyzePath:function (path, dontResolveLastLink, linksVisited) {
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        path = FS.absolutePath(path);
        if (path == '/') {
          ret.isRoot = true;
          ret.exists = ret.parentExists = true;
          ret.name = '/';
          ret.path = ret.parentPath = '/';
          ret.object = ret.parentObject = FS.root;
        } else if (path !== null) {
          linksVisited = linksVisited || 0;
          path = path.slice(1).split('/');
          var current = FS.root;
          var traversed = [''];
          while (path.length) {
            if (path.length == 1 && current.isFolder) {
              ret.parentExists = true;
              ret.parentPath = traversed.length == 1 ? '/' : traversed.join('/');
              ret.parentObject = current;
              ret.name = path[0];
            }
            var target = path.shift();
            if (!current.isFolder) {
              ret.error = ERRNO_CODES.ENOTDIR;
              break;
            } else if (!current.read) {
              ret.error = ERRNO_CODES.EACCES;
              break;
            } else if (!current.contents.hasOwnProperty(target)) {
              ret.error = ERRNO_CODES.ENOENT;
              break;
            }
            current = current.contents[target];
            if (current.link && !(dontResolveLastLink && path.length == 0)) {
              if (linksVisited > 40) { // Usual Linux SYMLOOP_MAX.
                ret.error = ERRNO_CODES.ELOOP;
                break;
              }
              var link = FS.absolutePath(current.link, traversed.join('/'));
              ret = FS.analyzePath([link].concat(path).join('/'),
                                   dontResolveLastLink, linksVisited + 1);
              return ret;
            }
            traversed.push(target);
            if (path.length == 0) {
              ret.exists = true;
              ret.path = traversed.join('/');
              ret.object = current;
            }
          }
        }
        return ret;
      },findObject:function (path, dontResolveLastLink) {
        FS.ensureRoot();
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },createObject:function (parent, name, properties, canRead, canWrite) {
        if (!parent) parent = '/';
        if (typeof parent === 'string') parent = FS.findObject(parent);
  
        if (!parent) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent path must exist.');
        }
        if (!parent.isFolder) {
          ___setErrNo(ERRNO_CODES.ENOTDIR);
          throw new Error('Parent must be a folder.');
        }
        if (!parent.write && !FS.ignorePermissions) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent folder must be writeable.');
        }
        if (!name || name == '.' || name == '..') {
          ___setErrNo(ERRNO_CODES.ENOENT);
          throw new Error('Name must not be empty.');
        }
        if (parent.contents.hasOwnProperty(name)) {
          ___setErrNo(ERRNO_CODES.EEXIST);
          throw new Error("Can't overwrite object.");
        }
  
        parent.contents[name] = {
          read: canRead === undefined ? true : canRead,
          write: canWrite === undefined ? false : canWrite,
          timestamp: Date.now(),
          inodeNumber: FS.nextInode++
        };
        for (var key in properties) {
          if (properties.hasOwnProperty(key)) {
            parent.contents[name][key] = properties[key];
          }
        }
  
        return parent.contents[name];
      },createFolder:function (parent, name, canRead, canWrite) {
        var properties = {isFolder: true, isDevice: false, contents: {}};
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createPath:function (parent, path, canRead, canWrite) {
        var current = FS.findObject(parent);
        if (current === null) throw new Error('Invalid parent.');
        path = path.split('/').reverse();
        while (path.length) {
          var part = path.pop();
          if (!part) continue;
          if (!current.contents.hasOwnProperty(part)) {
            FS.createFolder(current, part, canRead, canWrite);
          }
          current = current.contents[part];
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        properties.isFolder = false;
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createDataFile:function (parent, name, data, canRead, canWrite) {
        if (typeof data === 'string') {
          var dataArray = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) dataArray[i] = data.charCodeAt(i);
          data = dataArray;
        }
        var properties = {
          isDevice: false,
          contents: data.subarray ? data.subarray(0) : data // as an optimization, create a new array wrapper (not buffer) here, to help JS engines understand this object
        };
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
  
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function(chunkSize, length) {
            this.length = length;
            this.chunkSize = chunkSize;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % chunkSize;
            var chunkNum = Math.floor(idx / chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
    
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
          if (!hasByteServing) chunkSize = datalength;
    
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
    
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
    
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
    
          var lazyArray = new LazyUint8Array(chunkSize, datalength);
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * lazyArray.chunkSize;
            var end = (chunkNum+1) * lazyArray.chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile) {
        Browser.ensureObjects();
        var fullname = FS.joinPath([parent, name], true);
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },createLink:function (parent, name, target, canRead, canWrite) {
        var properties = {isDevice: false, link: target};
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createDevice:function (parent, name, input, output) {
        if (!(input || output)) {
          throw new Error('A device must have at least one callback defined.');
        }
        var ops = {isDevice: true, input: input, output: output};
        return FS.createFile(parent, name, ops, Boolean(input), Boolean(output));
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },ensureRoot:function () {
        if (FS.root) return;
        // The main file system tree. All the contents are inside this.
        FS.root = {
          read: true,
          write: true,
          isFolder: true,
          isDevice: false,
          timestamp: Date.now(),
          inodeNumber: 1,
          contents: {}
        };
      },init:function (input, output, error) {
        // Make sure we initialize only once.
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureRoot();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input = input || Module['stdin'];
        output = output || Module['stdout'];
        error = error || Module['stderr'];
  
        // Default handlers.
        var stdinOverridden = true, stdoutOverridden = true, stderrOverridden = true;
        if (!input) {
          stdinOverridden = false;
          input = function() {
            if (!input.cache || !input.cache.length) {
              var result;
              if (typeof window != 'undefined' &&
                  typeof window.prompt == 'function') {
                // Browser.
                result = window.prompt('Input: ');
                if (result === null) result = String.fromCharCode(0); // cancel ==> EOF
              } else if (typeof readline == 'function') {
                // Command line.
                result = readline();
              }
              if (!result) result = '';
              input.cache = intArrayFromString(result + '\n', true);
            }
            return input.cache.shift();
          };
        }
        var utf8 = new Runtime.UTF8Processor();
        function simpleOutput(val) {
          if (val === null || val === '\n'.charCodeAt(0)) {
            output.printer(output.buffer.join(''));
            output.buffer = [];
          } else {
            output.buffer.push(utf8.processCChar(val));
          }
        }
        if (!output) {
          stdoutOverridden = false;
          output = simpleOutput;
        }
        if (!output.printer) output.printer = Module['print'];
        if (!output.buffer) output.buffer = [];
        if (!error) {
          stderrOverridden = false;
          error = simpleOutput;
        }
        if (!error.printer) error.printer = Module['print'];
        if (!error.buffer) error.buffer = [];
  
        // Create the temporary folder, if not already created
        try {
          FS.createFolder('/', 'tmp', true, true);
        } catch(e) {}
  
        // Create the I/O devices.
        var devFolder = FS.createFolder('/', 'dev', true, true);
        var stdin = FS.createDevice(devFolder, 'stdin', input);
        var stdout = FS.createDevice(devFolder, 'stdout', null, output);
        var stderr = FS.createDevice(devFolder, 'stderr', null, error);
        FS.createDevice(devFolder, 'tty', input, output);
  
        // Create default streams.
        FS.streams[1] = {
          path: '/dev/stdin',
          object: stdin,
          position: 0,
          isRead: true,
          isWrite: false,
          isAppend: false,
          isTerminal: !stdinOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[2] = {
          path: '/dev/stdout',
          object: stdout,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stdoutOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[3] = {
          path: '/dev/stderr',
          object: stderr,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stderrOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        assert(Math.max(_stdin, _stdout, _stderr) < 128); // make sure these are low, we flatten arrays with these
        HEAP32[((_stdin)>>2)]=1;
        HEAP32[((_stdout)>>2)]=2;
        HEAP32[((_stderr)>>2)]=3;
  
        // Other system paths
        FS.createPath('/', 'dev/shm/tmp', true, true); // temp files
  
        // Newlib initialization
        for (var i = FS.streams.length; i < Math.max(_stdin, _stdout, _stderr) + 4; i++) {
          FS.streams[i] = null; // Make sure to keep FS.streams dense
        }
        FS.streams[_stdin] = FS.streams[1];
        FS.streams[_stdout] = FS.streams[2];
        FS.streams[_stderr] = FS.streams[3];
        allocate([ allocate(
          [0, 0, 0, 0, _stdin, 0, 0, 0, _stdout, 0, 0, 0, _stderr, 0, 0, 0],
          'void*', ALLOC_STATIC) ], 'void*', ALLOC_NONE, __impure_ptr);
      },quit:function () {
        if (!FS.init.initialized) return;
        // Flush any partially-printed lines in stdout and stderr. Careful, they may have been closed
        if (FS.streams[2] && FS.streams[2].object.output.buffer.length > 0) FS.streams[2].object.output('\n'.charCodeAt(0));
        if (FS.streams[3] && FS.streams[3].object.output.buffer.length > 0) FS.streams[3].object.output('\n'.charCodeAt(0));
      },standardizePath:function (path) {
        if (path.substr(0, 2) == './') path = path.substr(2);
        return path;
      },deleteFile:function (path) {
        path = FS.analyzePath(path);
        if (!path.parentExists || !path.exists) {
          throw 'Invalid path ' + path;
        }
        delete path.parentObject.contents[path.name];
      }};
  
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var contents = stream.object.contents;
        while (contents.length < offset) contents.push(0);
        for (var i = 0; i < nbyte; i++) {
          contents[offset + i] = HEAPU8[(((buf)+(i))|0)];
        }
        stream.object.timestamp = Date.now();
        return i;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        if (stream.object.isDevice) {
          if (stream.object.output) {
            for (var i = 0; i < nbyte; i++) {
              try {
                stream.object.output(HEAP8[(((buf)+(i))|0)]);
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
            }
            stream.object.timestamp = Date.now();
            return i;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          var bytesWritten = _pwrite(fildes, buf, nbyte, stream.position);
          if (bytesWritten != -1) stream.position += bytesWritten;
          return bytesWritten;
        }
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        if (FS.streams[stream]) FS.streams[stream].error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  
  
  function _strlen(ptr) {
      ptr = ptr|0;
      var curr = 0;
      curr = ptr;
      while (HEAP8[(curr)]|0 != 0) {
        curr = (curr + 1)|0;
      }
      return (curr - ptr)|0;
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],HEAPF64[(tempDoublePtr)>>3]);
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == '%'.charCodeAt(0)) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          flagsLoop: while (1) {
            switch (next) {
              case '+'.charCodeAt(0):
                flagAlwaysSigned = true;
                break;
              case '-'.charCodeAt(0):
                flagLeftAlign = true;
                break;
              case '#'.charCodeAt(0):
                flagAlternative = true;
                break;
              case '0'.charCodeAt(0):
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == '*'.charCodeAt(0)) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= '0'.charCodeAt(0) && next <= '9'.charCodeAt(0)) {
              width = width * 10 + (next - '0'.charCodeAt(0));
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false;
          if (next == '.'.charCodeAt(0)) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == '*'.charCodeAt(0)) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < '0'.charCodeAt(0) ||
                    precisionChr > '9'.charCodeAt(0)) break;
                precision = precision * 10 + (precisionChr - '0'.charCodeAt(0));
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 'h'.charCodeAt(0)) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 'l'.charCodeAt(0)) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
  
          // Handle type specifier.
          if (['d', 'i', 'u', 'o', 'x', 'X', 'p'].indexOf(String.fromCharCode(next)) != -1) {
            // Integer.
            var signed = next == 'd'.charCodeAt(0) || next == 'i'.charCodeAt(0);
            argSize = argSize || 4;
            var currArg = getNextArg('i' + (argSize * 8));
            var origArg = currArg;
            var argText;
            // Flatten i64-1 [low, high] into a (slightly rounded) double
            if (argSize == 8) {
              currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 'u'.charCodeAt(0));
            }
            // Truncate to requested size.
            if (argSize <= 4) {
              var limit = Math.pow(256, argSize) - 1;
              currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
            }
            // Format the number.
            var currAbsArg = Math.abs(currArg);
            var prefix = '';
            if (next == 'd'.charCodeAt(0) || next == 'i'.charCodeAt(0)) {
              if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
              argText = reSign(currArg, 8 * argSize, 1).toString(10);
            } else if (next == 'u'.charCodeAt(0)) {
              if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
              argText = unSign(currArg, 8 * argSize, 1).toString(10);
              currArg = Math.abs(currArg);
            } else if (next == 'o'.charCodeAt(0)) {
              argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
            } else if (next == 'x'.charCodeAt(0) || next == 'X'.charCodeAt(0)) {
              prefix = flagAlternative ? '0x' : '';
              if (argSize == 8 && i64Math) argText = (origArg[1]>>>0).toString(16) + (origArg[0]>>>0).toString(16); else
              if (currArg < 0) {
                // Represent negative numbers in hex as 2's complement.
                currArg = -currArg;
                argText = (currAbsArg - 1).toString(16);
                var buffer = [];
                for (var i = 0; i < argText.length; i++) {
                  buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                }
                argText = buffer.join('');
                while (argText.length < argSize * 2) argText = 'f' + argText;
              } else {
                argText = currAbsArg.toString(16);
              }
              if (next == 'X'.charCodeAt(0)) {
                prefix = prefix.toUpperCase();
                argText = argText.toUpperCase();
              }
            } else if (next == 'p'.charCodeAt(0)) {
              if (currAbsArg === 0) {
                argText = '(nil)';
              } else {
                prefix = '0x';
                argText = currAbsArg.toString(16);
              }
            }
            if (precisionSet) {
              while (argText.length < precision) {
                argText = '0' + argText;
              }
            }
  
            // Add sign if needed
            if (flagAlwaysSigned) {
              if (currArg < 0) {
                prefix = '-' + prefix;
              } else {
                prefix = '+' + prefix;
              }
            }
  
            // Add padding.
            while (prefix.length + argText.length < width) {
              if (flagLeftAlign) {
                argText += ' ';
              } else {
                if (flagZeroPad) {
                  argText = '0' + argText;
                } else {
                  prefix = ' ' + prefix;
                }
              }
            }
  
            // Insert the result into the buffer.
            argText = prefix + argText;
            argText.split('').forEach(function(chr) {
              ret.push(chr.charCodeAt(0));
            });
          } else if (['f', 'F', 'e', 'E', 'g', 'G'].indexOf(String.fromCharCode(next)) != -1) {
            // Float.
            var currArg = getNextArg('double');
            var argText;
  
            if (isNaN(currArg)) {
              argText = 'nan';
              flagZeroPad = false;
            } else if (!isFinite(currArg)) {
              argText = (currArg < 0 ? '-' : '') + 'inf';
              flagZeroPad = false;
            } else {
              var isGeneral = false;
              var effectivePrecision = Math.min(precision, 20);
  
              // Convert g/G to f/F or e/E, as per:
              // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
              if (next == 'g'.charCodeAt(0) || next == 'G'.charCodeAt(0)) {
                isGeneral = true;
                precision = precision || 1;
                var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                if (precision > exponent && exponent >= -4) {
                  next = ((next == 'g'.charCodeAt(0)) ? 'f' : 'F').charCodeAt(0);
                  precision -= exponent + 1;
                } else {
                  next = ((next == 'g'.charCodeAt(0)) ? 'e' : 'E').charCodeAt(0);
                  precision--;
                }
                effectivePrecision = Math.min(precision, 20);
              }
  
              if (next == 'e'.charCodeAt(0) || next == 'E'.charCodeAt(0)) {
                argText = currArg.toExponential(effectivePrecision);
                // Make sure the exponent has at least 2 digits.
                if (/[eE][-+]\d$/.test(argText)) {
                  argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                }
              } else if (next == 'f'.charCodeAt(0) || next == 'F'.charCodeAt(0)) {
                argText = currArg.toFixed(effectivePrecision);
              }
  
              var parts = argText.split('e');
              if (isGeneral && !flagAlternative) {
                // Discard trailing zeros and periods.
                while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                       (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                  parts[0] = parts[0].slice(0, -1);
                }
              } else {
                // Make sure we have a period in alternative mode.
                if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                // Zero pad until required precision.
                while (precision > effectivePrecision++) parts[0] += '0';
              }
              argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
              // Capitalize 'E' if needed.
              if (next == 'E'.charCodeAt(0)) argText = argText.toUpperCase();
  
              // Add sign.
              if (flagAlwaysSigned && currArg >= 0) {
                argText = '+' + argText;
              }
            }
  
            // Add padding.
            while (argText.length < width) {
              if (flagLeftAlign) {
                argText += ' ';
              } else {
                if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                  argText = argText[0] + '0' + argText.slice(1);
                } else {
                  argText = (flagZeroPad ? '0' : ' ') + argText;
                }
              }
            }
  
            // Adjust case.
            if (next < 'a'.charCodeAt(0)) argText = argText.toUpperCase();
  
            // Insert the result into the buffer.
            argText.split('').forEach(function(chr) {
              ret.push(chr.charCodeAt(0));
            });
          } else if (next == 's'.charCodeAt(0)) {
            // String.
            var arg = getNextArg('i8*') || nullString;
            var argLength = _strlen(arg);
            if (precisionSet) argLength = Math.min(argLength, precision);
            if (!flagLeftAlign) {
              while (argLength < width--) {
                ret.push(' '.charCodeAt(0));
              }
            }
            for (var i = 0; i < argLength; i++) {
              ret.push(HEAPU8[((arg++)|0)]);
            }
            if (flagLeftAlign) {
              while (argLength < width--) {
                ret.push(' '.charCodeAt(0));
              }
            }
          } else if (next == 'c'.charCodeAt(0)) {
            // Character.
            if (flagLeftAlign) ret.push(getNextArg('i8'));
            while (--width > 0) {
              ret.push(' '.charCodeAt(0));
            }
            if (!flagLeftAlign) ret.push(getNextArg('i8'));
          } else if (next == 'n'.charCodeAt(0)) {
            // Write the length written so far to the next parameter.
            var ptr = getNextArg('i32*');
            HEAP32[((ptr)>>2)]=ret.length
          } else if (next == '%'.charCodeAt(0)) {
            // Literal percent sign.
            ret.push(curr);
          } else {
            // Unknown specifiers remain untouched.
            for (var i = startTextIndex; i < textIndex + 2; i++) {
              ret.push(HEAP8[(i)]);
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }

  function _abort() {
      ABORT = true;
      throw 'abort() at ' + (new Error().stack);
    }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 8: return PAGE_SIZE;
        case 54:
        case 56:
        case 21:
        case 61:
        case 63:
        case 22:
        case 67:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 69:
        case 28:
        case 101:
        case 70:
        case 71:
        case 29:
        case 30:
        case 199:
        case 75:
        case 76:
        case 32:
        case 43:
        case 44:
        case 80:
        case 46:
        case 47:
        case 45:
        case 48:
        case 49:
        case 42:
        case 82:
        case 33:
        case 7:
        case 108:
        case 109:
        case 107:
        case 112:
        case 119:
        case 121:
          return 200809;
        case 13:
        case 104:
        case 94:
        case 95:
        case 34:
        case 35:
        case 77:
        case 81:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 94:
        case 95:
        case 110:
        case 111:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 120:
        case 40:
        case 16:
        case 79:
        case 19:
          return -1;
        case 92:
        case 93:
        case 5:
        case 72:
        case 6:
        case 74:
        case 92:
        case 93:
        case 96:
        case 97:
        case 98:
        case 99:
        case 102:
        case 103:
        case 105:
          return 1;
        case 38:
        case 66:
        case 50:
        case 51:
        case 4:
          return 1024;
        case 15:
        case 64:
        case 41:
          return 32;
        case 55:
        case 37:
        case 17:
          return 2147483647;
        case 18:
        case 1:
          return 47839;
        case 59:
        case 57:
          return 99;
        case 68:
        case 58:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 14: return 32768;
        case 73: return 32767;
        case 39: return 16384;
        case 60: return 1000;
        case 106: return 700;
        case 52: return 256;
        case 62: return 255;
        case 2: return 100;
        case 65: return 64;
        case 36: return 20;
        case 100: return 16;
        case 20: return 6;
        case 53: return 4;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }

  
  function ___errno_location() {
      return ___setErrNo.ret;
    }var ___errno=___errno_location;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
  
      // We need to make sure no one else allocates unfreeable memory!
      // We must control this entirely. So we don't even need to do
      // unfreeable allocations - the HEAP is ours, from STATICTOP up.
      // TODO: We could in theory slice off the top of the HEAP when
      //       sbrk gets a negative increment in |bytes|...
      var self = _sbrk;
      if (!self.called) {
        STATICTOP = alignMemoryPage(STATICTOP); // make sure we start out aligned
        self.called = true;
        _sbrk.DYNAMIC_START = STATICTOP;
      }
      var ret = STATICTOP;
      if (bytes != 0) Runtime.staticAlloc(bytes);
      return ret;  // Previous break location.
    }

  var _llvm_memset_p0i8_i64=_memset;





  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],ensureObjects:function () {
        if (Browser.ensured) return;
        Browser.ensured = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : console.log("warning: cannot create object URLs");
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        function getMimetype(name) {
          return {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'bmp': 'image/bmp',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg'
          }[name.substr(-3)];
          return ret;
        }
  
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/.exec(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            setTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
      },createContext:function (canvas, useWebGL, setInModule) {
        var ctx;
        try {
          if (useWebGL) {
            ctx = canvas.getContext('experimental-webgl', {
              alpha: false,
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},requestFullScreen:function () {
        var canvas = Module['canvas'];
        function fullScreenChange() {
          var isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                        canvas['mozRequestPointerLock'] ||
                                        canvas['webkitRequestPointerLock'];
            canvas.requestPointerLock();
            isFullScreen = true;
          }
          if (Module['onFullScreen']) Module['onFullScreen'](isFullScreen);
        }
  
        document.addEventListener('fullscreenchange', fullScreenChange, false);
        document.addEventListener('mozfullscreenchange', fullScreenChange, false);
        document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
  
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen(); 
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200) {
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      }};
__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___setErrNo(0);
Module["requestFullScreen"] = function() { Browser.requestFullScreen() };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
  


var FUNCTION_TABLE = [0,0,_begin,0,_noCombine,0,___gl_noVertexData,0,_skip_vertex,0,___gl_noEndData,0,_RenderFan,0,_RenderTriangle,0,_triangle_vertex,0,_EdgeLeq,0,_fan_vertex,0,___gl_noErrorData,0,_noMesh,0,___gl_vertLeq,0,_noBegin,0,_strip_vertex,0,_combine,0,___gl_noEdgeFlagData,0,_noEdgeFlag,0,_vertex,0,_noEnd,0,_noError,0,_RenderStrip,0,_noVertex,0,___gl_noBeginData,0,___gl_noCombineData,0];

function _Splice(r1, r2) {
  var r3, r4, r5, r6;
  r3 = r1 + 8 | 0;
  r4 = HEAP32[r3 >> 2];
  r5 = r2 + 8 | 0;
  r6 = HEAP32[r5 >> 2];
  HEAP32[HEAP32[r4 + 4 >> 2] + 12 >> 2] = r2;
  HEAP32[HEAP32[r6 + 4 >> 2] + 12 >> 2] = r1;
  HEAP32[r3 >> 2] = r6;
  HEAP32[r5 >> 2] = r4;
  return;
}
function ___gl_dictListNewDict(r1) {
  var r2, r3, r4, r5;
  r2 = _malloc(20), r3 = r2 >> 2;
  if ((r2 | 0) == 0) {
    r4 = 0;
    return r4;
  }
  r5 = r2;
  HEAP32[r3] = 0;
  HEAP32[r3 + 1] = r5;
  HEAP32[r3 + 2] = r5;
  HEAP32[r3 + 3] = r1;
  HEAP32[r3 + 4] = 18;
  r4 = r2;
  return r4;
}
function ___gl_dictListDeleteDict(r1) {
  var r2, r3, r4, r5;
  r2 = r1 | 0;
  r3 = HEAP32[r1 + 4 >> 2];
  if ((r3 | 0) == (r2 | 0)) {
    r4 = r1;
    _free(r4);
    return;
  } else {
    r5 = r3;
  }
  while (1) {
    r3 = HEAP32[r5 + 4 >> 2];
    _free(r5);
    if ((r3 | 0) == (r2 | 0)) {
      break;
    } else {
      r5 = r3;
    }
  }
  r4 = r1;
  _free(r4);
  return;
}
function ___gl_dictListInsertBefore(r1, r2, r3) {
  var r4, r5, r6, r7;
  r4 = r1 + 16 | 0;
  r5 = r1 + 12 | 0;
  r1 = r2;
  while (1) {
    r6 = HEAP32[r1 + 8 >> 2];
    r2 = HEAP32[r6 >> 2];
    if ((r2 | 0) == 0) {
      break;
    }
    if ((FUNCTION_TABLE[HEAP32[r4 >> 2]](HEAP32[r5 >> 2], r2, r3) | 0) == 0) {
      r1 = r6;
    } else {
      break;
    }
  }
  r1 = _malloc(12), r5 = r1 >> 2;
  r4 = r1;
  if ((r1 | 0) == 0) {
    r7 = 0;
    return r7;
  }
  HEAP32[r5] = r3;
  r3 = (r6 + 4 | 0) >> 2;
  HEAP32[r5 + 1] = HEAP32[r3];
  HEAP32[HEAP32[r3] + 8 >> 2] = r4;
  HEAP32[r5 + 2] = r6;
  HEAP32[r3] = r4;
  r7 = r4;
  return r7;
}
function ___gl_dictListDelete(r1) {
  var r2, r3;
  r2 = r1 + 8 | 0;
  r3 = r1 + 4 | 0;
  HEAP32[HEAP32[r3 >> 2] + 8 >> 2] = HEAP32[r2 >> 2];
  HEAP32[HEAP32[r2 >> 2] + 4 >> 2] = HEAP32[r3 >> 2];
  _free(r1);
  return;
}
function ___gl_dictListSearch(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = 0;
  r4 = r1 + 16 | 0;
  r5 = r1 + 12 | 0;
  r6 = r1 | 0;
  while (1) {
    r7 = HEAP32[r6 + 4 >> 2];
    r1 = HEAP32[r7 >> 2];
    if ((r1 | 0) == 0) {
      r3 = 26;
      break;
    }
    if ((FUNCTION_TABLE[HEAP32[r4 >> 2]](HEAP32[r5 >> 2], r2, r1) | 0) == 0) {
      r6 = r7;
    } else {
      r3 = 25;
      break;
    }
  }
  if (r3 == 26) {
    return r7;
  } else if (r3 == 25) {
    return r7;
  }
}
function ___gl_meshMakeEdge(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10;
  r2 = _allocVertex();
  r3 = _allocVertex();
  r4 = _allocFace();
  r5 = (r2 | 0) == 0;
  r6 = (r3 | 0) == 0;
  r7 = (r4 | 0) == 0;
  if (!(r5 | r6 | r7)) {
    r8 = _MakeEdge(r1 + 88 | 0);
    if ((r8 | 0) == 0) {
      _free(r2);
      _free(r3);
      _free(r4);
      r9 = 0;
      return r9;
    } else {
      r10 = r1 | 0;
      _MakeVertex(r2, r8, r10);
      _MakeVertex(r3, HEAP32[r8 + 4 >> 2], r10);
      _MakeFace(r4, r8, r1 + 60 | 0);
      r9 = r8;
      return r9;
    }
  }
  if (!r5) {
    _free(r2);
  }
  if (!r6) {
    _free(r3);
  }
  if (r7) {
    r9 = 0;
    return r9;
  }
  _free(r4);
  r9 = 0;
  return r9;
}
function _MakeEdge(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = _malloc(64), r3 = r2 >> 2;
  if ((r2 | 0) == 0) {
    r4 = 0;
    return r4;
  }
  r5 = r2;
  r6 = r2 + 32 | 0;
  r7 = r6;
  r8 = HEAP32[r1 + 4 >> 2];
  r9 = r8 >>> 0 < r1 >>> 0 ? r8 : r1;
  r1 = r9 + 4 | 0;
  r8 = HEAP32[HEAP32[r1 >> 2] >> 2];
  HEAP32[r6 >> 2] = r8;
  HEAP32[HEAP32[r8 + 4 >> 2] >> 2] = r5;
  HEAP32[r3] = r9;
  HEAP32[HEAP32[r1 >> 2] >> 2] = r7;
  HEAP32[r3 + 1] = r7;
  HEAP32[r3 + 2] = r5;
  HEAP32[r3 + 3] = r7;
  r1 = (r2 + 16 | 0) >> 2;
  HEAP32[r1] = 0;
  HEAP32[r1 + 1] = 0;
  HEAP32[r1 + 2] = 0;
  HEAP32[r1 + 3] = 0;
  HEAP32[r3 + 9] = r5;
  HEAP32[r3 + 10] = r7;
  HEAP32[r3 + 11] = r5;
  r3 = (r2 + 48 | 0) >> 2;
  HEAP32[r3] = 0;
  HEAP32[r3 + 1] = 0;
  HEAP32[r3 + 2] = 0;
  HEAP32[r3 + 3] = 0;
  r4 = r5;
  return r4;
}
_MakeEdge["X"] = 1;
function _MakeVertex(r1, r2, r3) {
  var r4, r5;
  if ((r1 | 0) == 0) {
    ___assert_func(5244536, 141, 5245332, 5243864);
  }
  r4 = r3 + 4 | 0;
  r5 = HEAP32[r4 >> 2];
  HEAP32[r1 + 4 >> 2] = r5;
  HEAP32[r5 >> 2] = r1;
  HEAP32[r1 >> 2] = r3;
  HEAP32[r4 >> 2] = r1;
  HEAP32[r1 + 8 >> 2] = r2;
  HEAP32[r1 + 12 >> 2] = 0;
  r4 = r2;
  while (1) {
    HEAP32[r4 + 16 >> 2] = r1;
    r3 = HEAP32[r4 + 8 >> 2];
    if ((r3 | 0) == (r2 | 0)) {
      break;
    } else {
      r4 = r3;
    }
  }
  return;
}
function _MakeFace(r1, r2, r3) {
  var r4, r5, r6;
  r4 = r1 >> 2;
  if ((r1 | 0) == 0) {
    ___assert_func(5244536, 174, 5245344, 5243936);
  }
  r5 = r3 + 4 | 0;
  r6 = HEAP32[r5 >> 2];
  HEAP32[r4 + 1] = r6;
  HEAP32[r6 >> 2] = r1;
  HEAP32[r4] = r3;
  HEAP32[r5 >> 2] = r1;
  HEAP32[r4 + 2] = r2;
  HEAP32[r4 + 3] = 0;
  HEAP32[r4 + 4] = 0;
  HEAP32[r4 + 5] = 0;
  HEAP32[r4 + 6] = HEAP32[r3 + 24 >> 2];
  r3 = r2;
  while (1) {
    HEAP32[r3 + 20 >> 2] = r1;
    r4 = HEAP32[r3 + 12 >> 2];
    if ((r4 | 0) == (r2 | 0)) {
      break;
    } else {
      r3 = r4;
    }
  }
  return;
}
function ___gl_meshSplice(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9;
  if ((r1 | 0) == (r2 | 0)) {
    r3 = 1;
    return r3;
  }
  r4 = HEAP32[r2 + 16 >> 2];
  r5 = (r1 + 16 | 0) >> 2;
  r6 = HEAP32[r5];
  if ((r4 | 0) == (r6 | 0)) {
    r7 = 0;
  } else {
    _KillVertex(r4, r6);
    r7 = 1;
  }
  r6 = HEAP32[r2 + 20 >> 2];
  r4 = (r1 + 20 | 0) >> 2;
  r8 = HEAP32[r4];
  if ((r6 | 0) == (r8 | 0)) {
    r9 = 0;
  } else {
    _KillFace(r6, r8);
    r9 = 1;
  }
  _Splice(r2, r1);
  do {
    if ((r7 | 0) == 0) {
      r8 = _allocVertex();
      if ((r8 | 0) == 0) {
        r3 = 0;
        return r3;
      } else {
        _MakeVertex(r8, r2, HEAP32[r5]);
        HEAP32[HEAP32[r5] + 8 >> 2] = r1;
        break;
      }
    }
  } while (0);
  if ((r9 | 0) != 0) {
    r3 = 1;
    return r3;
  }
  r9 = _allocFace();
  if ((r9 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  _MakeFace(r9, r2, HEAP32[r4]);
  HEAP32[HEAP32[r4] + 8 >> 2] = r1;
  r3 = 1;
  return r3;
}
function _KillVertex(r1, r2) {
  var r3, r4, r5;
  r3 = HEAP32[r1 + 8 >> 2];
  r4 = r3;
  while (1) {
    HEAP32[r4 + 16 >> 2] = r2;
    r5 = HEAP32[r4 + 8 >> 2];
    if ((r5 | 0) == (r3 | 0)) {
      break;
    } else {
      r4 = r5;
    }
  }
  r4 = HEAP32[r1 + 4 >> 2];
  r3 = HEAP32[r1 >> 2];
  HEAP32[r3 + 4 >> 2] = r4;
  HEAP32[r4 >> 2] = r3;
  _free(r1);
  return;
}
function _KillFace(r1, r2) {
  var r3, r4, r5;
  r3 = HEAP32[r1 + 8 >> 2];
  r4 = r3;
  while (1) {
    HEAP32[r4 + 20 >> 2] = r2;
    r5 = HEAP32[r4 + 12 >> 2];
    if ((r5 | 0) == (r3 | 0)) {
      break;
    } else {
      r4 = r5;
    }
  }
  r4 = HEAP32[r1 + 4 >> 2];
  r3 = HEAP32[r1 >> 2];
  HEAP32[r3 + 4 >> 2] = r4;
  HEAP32[r4 >> 2] = r3;
  _free(r1);
  return;
}
function ___gl_meshDelete(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = (r1 + 4 | 0) >> 2;
  r3 = HEAP32[r2];
  r4 = (r1 + 20 | 0) >> 2;
  r5 = HEAP32[r4];
  r6 = r3 + 20 | 0;
  r7 = HEAP32[r6 >> 2];
  if ((r5 | 0) == (r7 | 0)) {
    r8 = 0;
  } else {
    _KillFace(r5, r7);
    r8 = 1;
  }
  r7 = r1 + 8 | 0;
  do {
    if ((HEAP32[r7 >> 2] | 0) == (r1 | 0)) {
      _KillVertex(HEAP32[r1 + 16 >> 2], 0);
    } else {
      r5 = HEAP32[r2];
      HEAP32[HEAP32[r5 + 20 >> 2] + 8 >> 2] = HEAP32[r5 + 12 >> 2];
      HEAP32[HEAP32[r1 + 16 >> 2] + 8 >> 2] = HEAP32[r7 >> 2];
      _Splice(r1, HEAP32[HEAP32[r2] + 12 >> 2]);
      if ((r8 | 0) != 0) {
        break;
      }
      r5 = _allocFace();
      if ((r5 | 0) == 0) {
        r9 = 0;
        return r9;
      } else {
        _MakeFace(r5, r1, HEAP32[r4]);
        break;
      }
    }
  } while (0);
  r8 = r3 + 8 | 0;
  if ((HEAP32[r8 >> 2] | 0) == (r3 | 0)) {
    _KillVertex(HEAP32[r3 + 16 >> 2], 0);
    _KillFace(HEAP32[r6 >> 2], 0);
  } else {
    r6 = r3 + 4 | 0;
    HEAP32[HEAP32[r4] + 8 >> 2] = HEAP32[HEAP32[r6 >> 2] + 12 >> 2];
    HEAP32[HEAP32[r3 + 16 >> 2] + 8 >> 2] = HEAP32[r8 >> 2];
    _Splice(r3, HEAP32[HEAP32[r6 >> 2] + 12 >> 2]);
  }
  _KillEdge(r1);
  r9 = 1;
  return r9;
}
___gl_meshDelete["X"] = 1;
function _KillEdge(r1) {
  var r2, r3;
  r2 = HEAP32[r1 + 4 >> 2];
  r3 = r2 >>> 0 < r1 >>> 0 ? r2 : r1;
  r1 = HEAP32[r3 >> 2];
  r2 = HEAP32[HEAP32[r3 + 4 >> 2] >> 2];
  HEAP32[HEAP32[r1 + 4 >> 2] >> 2] = r2;
  HEAP32[HEAP32[r2 + 4 >> 2] >> 2] = r1;
  _free(r3);
  return;
}
function ___gl_meshAddEdgeVertex(r1) {
  var r2, r3, r4, r5, r6;
  r2 = _MakeEdge(r1);
  if ((r2 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r4 = HEAP32[r2 + 4 >> 2];
  _Splice(r2, HEAP32[r1 + 12 >> 2]);
  r5 = r2 + 16 | 0;
  HEAP32[r5 >> 2] = HEAP32[HEAP32[r1 + 4 >> 2] + 16 >> 2];
  r6 = _allocVertex();
  if ((r6 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  _MakeVertex(r6, r4, HEAP32[r5 >> 2]);
  r5 = HEAP32[r1 + 20 >> 2];
  HEAP32[r4 + 20 >> 2] = r5;
  HEAP32[r2 + 20 >> 2] = r5;
  r3 = r2;
  return r3;
}
function ___gl_meshSplitEdge(r1) {
  var r2, r3, r4, r5, r6;
  r2 = ___gl_meshAddEdgeVertex(r1);
  if ((r2 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r4 = HEAP32[r2 + 4 >> 2];
  r2 = (r1 + 4 | 0) >> 2;
  r5 = HEAP32[r2];
  _Splice(r5, HEAP32[HEAP32[r5 + 4 >> 2] + 12 >> 2]);
  _Splice(HEAP32[r2], r4);
  HEAP32[HEAP32[r2] + 16 >> 2] = HEAP32[r4 + 16 >> 2];
  r5 = (r4 + 4 | 0) >> 2;
  r6 = HEAP32[r5];
  HEAP32[HEAP32[r6 + 16 >> 2] + 8 >> 2] = r6;
  HEAP32[HEAP32[r5] + 20 >> 2] = HEAP32[HEAP32[r2] + 20 >> 2];
  HEAP32[r4 + 28 >> 2] = HEAP32[r1 + 28 >> 2];
  HEAP32[HEAP32[r5] + 28 >> 2] = HEAP32[HEAP32[r2] + 28 >> 2];
  r3 = r4;
  return r3;
}
function ___gl_meshConnect(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10;
  r3 = _MakeEdge(r1), r4 = r3 >> 2;
  if ((r3 | 0) == 0) {
    r5 = 0;
    return r5;
  }
  r6 = HEAP32[r4 + 1];
  r7 = HEAP32[r2 + 20 >> 2];
  r8 = (r1 + 20 | 0) >> 2;
  r9 = HEAP32[r8];
  if ((r7 | 0) == (r9 | 0)) {
    r10 = 0;
  } else {
    _KillFace(r7, r9);
    r10 = 1;
  }
  _Splice(r3, HEAP32[r1 + 12 >> 2]);
  _Splice(r6, r2);
  HEAP32[r4 + 4] = HEAP32[HEAP32[r1 + 4 >> 2] + 16 >> 2];
  HEAP32[r6 + 16 >> 2] = HEAP32[r2 + 16 >> 2];
  r2 = HEAP32[r8];
  HEAP32[r6 + 20 >> 2] = r2;
  HEAP32[r4 + 5] = r2;
  HEAP32[HEAP32[r8] + 8 >> 2] = r6;
  if (r10) {
    r5 = r3;
    return r5;
  }
  r10 = _allocFace();
  if ((r10 | 0) == 0) {
    r5 = 0;
    return r5;
  }
  _MakeFace(r10, r3, HEAP32[r8]);
  r5 = r3;
  return r5;
}
function ___gl_meshZapFace(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = HEAP32[r1 + 8 >> 2];
  r3 = HEAP32[r2 + 12 >> 2], r4 = r3 >> 2;
  while (1) {
    r5 = HEAP32[r4 + 3];
    HEAP32[r4 + 5] = 0;
    r6 = (r3 + 4 | 0) >> 2;
    if ((HEAP32[HEAP32[r6] + 20 >> 2] | 0) == 0) {
      r7 = HEAP32[r4 + 2];
      r8 = HEAP32[r4 + 4];
      if ((r7 | 0) == (r3 | 0)) {
        _KillVertex(r8, 0);
      } else {
        HEAP32[r8 + 8 >> 2] = r7;
        _Splice(r3, HEAP32[HEAP32[r6] + 12 >> 2]);
      }
      r7 = HEAP32[r6], r6 = r7 >> 2;
      r8 = HEAP32[r6 + 2];
      r9 = HEAP32[r6 + 4];
      if ((r8 | 0) == (r7 | 0)) {
        _KillVertex(r9, 0);
      } else {
        HEAP32[r9 + 8 >> 2] = r8;
        _Splice(r7, HEAP32[HEAP32[r6 + 1] + 12 >> 2]);
      }
      _KillEdge(r3);
    }
    if ((r3 | 0) == (r2 | 0)) {
      break;
    } else {
      r3 = r5, r4 = r3 >> 2;
    }
  }
  r3 = HEAP32[r1 + 4 >> 2];
  r4 = HEAP32[r1 >> 2];
  HEAP32[r4 + 4 >> 2] = r3;
  HEAP32[r3 >> 2] = r4;
  _free(r1);
  return;
}
___gl_meshZapFace["X"] = 1;
function ___gl_meshNewMesh() {
  var r1, r2, r3, r4, r5, r6, r7, r8, r9, r10;
  r1 = _malloc(152), r2 = r1 >> 2;
  if ((r1 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r4 = r1;
  r5 = r1 + 60 | 0;
  r6 = r5;
  r7 = r1 + 88 | 0;
  r8 = r7;
  r9 = r1 + 120 | 0;
  r10 = r9;
  HEAP32[r2 + 1] = r4;
  HEAP32[r2] = r4;
  HEAP32[r2 + 2] = 0;
  HEAP32[r2 + 3] = 0;
  HEAP32[r2 + 16] = r6;
  HEAP32[r5 >> 2] = r6;
  r6 = (r1 + 68 | 0) >> 2;
  HEAP32[r6] = 0;
  HEAP32[r6 + 1] = 0;
  HEAP32[r6 + 2] = 0;
  HEAP32[r6 + 3] = 0;
  HEAP32[r6 + 4] = 0;
  HEAP32[r7 >> 2] = r8;
  HEAP32[r2 + 23] = r10;
  r7 = (r1 + 96 | 0) >> 2;
  HEAP32[r7] = 0;
  HEAP32[r7 + 1] = 0;
  HEAP32[r7 + 2] = 0;
  HEAP32[r7 + 3] = 0;
  HEAP32[r7 + 4] = 0;
  HEAP32[r7 + 5] = 0;
  HEAP32[r9 >> 2] = r10;
  HEAP32[r2 + 31] = r8;
  r8 = (r1 + 128 | 0) >> 2;
  HEAP32[r8] = 0;
  HEAP32[r8 + 1] = 0;
  HEAP32[r8 + 2] = 0;
  HEAP32[r8 + 3] = 0;
  HEAP32[r8 + 4] = 0;
  HEAP32[r8 + 5] = 0;
  r3 = r1;
  return r3;
}
function ___gl_meshDeleteMesh(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = r1 + 60 | 0;
  r3 = HEAP32[r2 >> 2];
  L164 : do {
    if ((r3 | 0) != (r2 | 0)) {
      r4 = r3;
      while (1) {
        r5 = HEAP32[r4 >> 2];
        _free(r4);
        if ((r5 | 0) == (r2 | 0)) {
          break L164;
        } else {
          r4 = r5;
        }
      }
    }
  } while (0);
  r2 = r1 | 0;
  r3 = HEAP32[r1 >> 2];
  L168 : do {
    if ((r3 | 0) != (r2 | 0)) {
      r4 = r3;
      while (1) {
        r5 = HEAP32[r4 >> 2];
        _free(r4);
        if ((r5 | 0) == (r2 | 0)) {
          break L168;
        } else {
          r4 = r5;
        }
      }
    }
  } while (0);
  r2 = r1 + 88 | 0;
  r3 = HEAP32[r2 >> 2];
  if ((r3 | 0) == (r2 | 0)) {
    r6 = r1;
    _free(r6);
    return;
  } else {
    r7 = r3;
  }
  while (1) {
    r3 = HEAP32[r7 >> 2];
    _free(r7);
    if ((r3 | 0) == (r2 | 0)) {
      break;
    } else {
      r7 = r3;
    }
  }
  r6 = r1;
  _free(r6);
  return;
}
function ___gl_meshCheckMesh(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23;
  r2 = r1 >> 2;
  r3 = 0;
  r4 = r1 + 60 | 0;
  r5 = r1 | 0;
  r6 = r1 + 88 | 0;
  r7 = HEAP32[r4 >> 2];
  r8 = (HEAP32[r7 + 4 >> 2] | 0) == (r4 | 0);
  L178 : do {
    if ((r7 | 0) == (r4 | 0)) {
      r9 = r8;
    } else {
      r10 = r7;
      r11 = r8;
      while (1) {
        if (!r11) {
          ___assert_func(5244536, 753, 5245216, 5244516);
        }
        r12 = r10 + 8 | 0;
        r13 = HEAP32[r12 >> 2];
        while (1) {
          r14 = r13 + 4 | 0;
          r15 = HEAP32[r14 >> 2];
          if ((r15 | 0) == (r13 | 0)) {
            ___assert_func(5244536, 756, 5245216, 5243696);
            r16 = HEAP32[r14 >> 2];
          } else {
            r16 = r15;
          }
          if ((HEAP32[r16 + 4 >> 2] | 0) != (r13 | 0)) {
            ___assert_func(5244536, 757, 5245216, 5243508);
          }
          r15 = r13 + 12 | 0;
          if ((HEAP32[HEAP32[HEAP32[r15 >> 2] + 8 >> 2] + 4 >> 2] | 0) != (r13 | 0)) {
            ___assert_func(5244536, 758, 5245216, 5243428);
          }
          if ((HEAP32[HEAP32[HEAP32[r13 + 8 >> 2] + 4 >> 2] + 12 >> 2] | 0) != (r13 | 0)) {
            ___assert_func(5244536, 759, 5245216, 5243344);
          }
          if ((HEAP32[r13 + 20 >> 2] | 0) != (r10 | 0)) {
            ___assert_func(5244536, 760, 5245216, 5243276);
          }
          r14 = HEAP32[r15 >> 2];
          if ((r14 | 0) == (HEAP32[r12 >> 2] | 0)) {
            break;
          } else {
            r13 = r14;
          }
        }
        r13 = HEAP32[r10 >> 2];
        r12 = (HEAP32[r13 + 4 >> 2] | 0) == (r10 | 0);
        if ((r13 | 0) == (r4 | 0)) {
          r9 = r12;
          break L178;
        } else {
          r10 = r13;
          r11 = r12;
        }
      }
    }
  } while (0);
  do {
    if (r9) {
      if ((HEAP32[r2 + 17] | 0) != 0) {
        r3 = 162;
        break;
      }
      if ((HEAP32[r2 + 18] | 0) == 0) {
        break;
      } else {
        r3 = 162;
        break;
      }
    } else {
      r3 = 162;
    }
  } while (0);
  if (r3 == 162) {
    ___assert_func(5244536, 764, 5245216, 5243168);
  }
  r9 = HEAP32[r2];
  r4 = (HEAP32[r9 + 4 >> 2] | 0) == (r5 | 0);
  L209 : do {
    if ((r9 | 0) == (r5 | 0)) {
      r17 = r4;
    } else {
      r16 = r9;
      r8 = r4;
      while (1) {
        if (!r8) {
          ___assert_func(5244536, 768, 5245216, 5243008);
        }
        r7 = r16 + 8 | 0;
        r11 = HEAP32[r7 >> 2];
        while (1) {
          r10 = r11 + 4 | 0;
          r12 = HEAP32[r10 >> 2];
          if ((r12 | 0) == (r11 | 0)) {
            ___assert_func(5244536, 771, 5245216, 5243696);
            r18 = HEAP32[r10 >> 2];
          } else {
            r18 = r12;
          }
          if ((HEAP32[r18 + 4 >> 2] | 0) != (r11 | 0)) {
            ___assert_func(5244536, 772, 5245216, 5243508);
          }
          if ((HEAP32[HEAP32[HEAP32[r11 + 12 >> 2] + 8 >> 2] + 4 >> 2] | 0) != (r11 | 0)) {
            ___assert_func(5244536, 773, 5245216, 5243428);
          }
          r12 = r11 + 8 | 0;
          if ((HEAP32[HEAP32[HEAP32[r12 >> 2] + 4 >> 2] + 12 >> 2] | 0) != (r11 | 0)) {
            ___assert_func(5244536, 774, 5245216, 5243344);
          }
          if ((HEAP32[r11 + 16 >> 2] | 0) != (r16 | 0)) {
            ___assert_func(5244536, 775, 5245216, 5242948);
          }
          r10 = HEAP32[r12 >> 2];
          if ((r10 | 0) == (HEAP32[r7 >> 2] | 0)) {
            break;
          } else {
            r11 = r10;
          }
        }
        r11 = HEAP32[r16 >> 2];
        r7 = (HEAP32[r11 + 4 >> 2] | 0) == (r16 | 0);
        if ((r11 | 0) == (r5 | 0)) {
          r17 = r7;
          break L209;
        } else {
          r16 = r11;
          r8 = r7;
        }
      }
    }
  } while (0);
  do {
    if (r17) {
      if ((HEAP32[r2 + 2] | 0) != 0) {
        r3 = 182;
        break;
      }
      if ((HEAP32[r2 + 3] | 0) == 0) {
        break;
      } else {
        r3 = 182;
        break;
      }
    } else {
      r3 = 182;
    }
  } while (0);
  if (r3 == 182) {
    ___assert_func(5244536, 779, 5245216, 5244456);
  }
  r3 = HEAP32[r6 >> 2];
  r17 = r3 + 4 | 0;
  r5 = HEAP32[r17 >> 2];
  r18 = (HEAP32[r5 >> 2] | 0) == (HEAP32[r2 + 23] | 0);
  L240 : do {
    if ((r3 | 0) == (r6 | 0)) {
      r19 = r5, r20 = r19 >> 2;
      r21 = r18;
    } else {
      r4 = r3, r9 = r4 >> 2;
      r8 = r17, r16 = r8 >> 2;
      r7 = r18;
      r11 = r5;
      while (1) {
        if (r7) {
          r22 = r11;
        } else {
          ___assert_func(5244536, 783, 5245216, 5244384);
          r22 = HEAP32[r16];
        }
        if ((r22 | 0) == (r4 | 0)) {
          ___assert_func(5244536, 784, 5245216, 5243696);
          r23 = HEAP32[r16];
        } else {
          r23 = r22;
        }
        if ((HEAP32[r23 + 4 >> 2] | 0) != (r4 | 0)) {
          ___assert_func(5244536, 785, 5245216, 5243508);
        }
        if ((HEAP32[r9 + 4] | 0) == 0) {
          ___assert_func(5244536, 786, 5245216, 5244308);
        }
        if ((HEAP32[HEAP32[r16] + 16 >> 2] | 0) == 0) {
          ___assert_func(5244536, 787, 5245216, 5244244);
        }
        if ((HEAP32[HEAP32[HEAP32[r9 + 3] + 8 >> 2] + 4 >> 2] | 0) != (r4 | 0)) {
          ___assert_func(5244536, 788, 5245216, 5243428);
        }
        if ((HEAP32[HEAP32[HEAP32[r9 + 2] + 4 >> 2] + 12 >> 2] | 0) != (r4 | 0)) {
          ___assert_func(5244536, 789, 5245216, 5243344);
        }
        r10 = HEAP32[r9];
        r12 = r10 + 4 | 0;
        r13 = HEAP32[r12 >> 2];
        r14 = (HEAP32[r13 >> 2] | 0) == (HEAP32[r9 + 1] | 0);
        if ((r10 | 0) == (r6 | 0)) {
          r19 = r13, r20 = r19 >> 2;
          r21 = r14;
          break L240;
        } else {
          r4 = r10, r9 = r4 >> 2;
          r8 = r12, r16 = r8 >> 2;
          r7 = r14;
          r11 = r13;
        }
      }
    }
  } while (0);
  do {
    if (r21) {
      if ((r19 | 0) != (r1 + 120 | 0)) {
        break;
      }
      if ((HEAP32[r20 + 1] | 0) != (r6 | 0)) {
        break;
      }
      if ((HEAP32[r2 + 26] | 0) != 0) {
        break;
      }
      if ((HEAP32[r20 + 4] | 0) != 0) {
        break;
      }
      if ((HEAP32[r2 + 27] | 0) != 0) {
        break;
      }
      if ((HEAP32[r20 + 5] | 0) != 0) {
        break;
      }
      return;
    }
  } while (0);
  ___assert_func(5244536, 795, 5245216, 5244016);
  return;
}
___gl_meshCheckMesh["X"] = 1;
function _allocFace() {
  return _malloc(28);
}
function _allocVertex() {
  return _malloc(60);
}
function ___gl_renderMesh(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = (r1 + 128 | 0) >> 2;
  HEAP32[r3] = 0;
  r4 = r2 + 60 | 0;
  r2 = r4 | 0;
  r5 = HEAP32[r2 >> 2];
  if ((r5 | 0) == (r4 | 0)) {
    return;
  } else {
    r6 = r5;
  }
  while (1) {
    HEAP32[r6 + 20 >> 2] = 0;
    r5 = HEAP32[r6 >> 2];
    if ((r5 | 0) == (r4 | 0)) {
      break;
    } else {
      r6 = r5;
    }
  }
  r6 = HEAP32[r2 >> 2];
  L283 : do {
    if ((r6 | 0) != (r4 | 0)) {
      r2 = r6, r5 = r2 >> 2;
      while (1) {
        do {
          if ((HEAP32[r5 + 6] | 0) != 0) {
            r7 = r2 + 20 | 0;
            if ((HEAP32[r7 >> 2] | 0) != 0) {
              break;
            }
            _RenderMaximumFaceGroup(r1, HEAP32[r5 + 2]);
            if ((HEAP32[r7 >> 2] | 0) != 0) {
              break;
            }
            ___assert_func(5243812, 100, 5245044, 5244324);
          }
        } while (0);
        r7 = HEAP32[r5];
        if ((r7 | 0) == (r4 | 0)) {
          break L283;
        } else {
          r2 = r7, r5 = r2 >> 2;
        }
      }
    }
  } while (0);
  r4 = HEAP32[r3];
  if ((r4 | 0) == 0) {
    return;
  }
  _RenderLonelyTriangles(r1, r4);
  HEAP32[r3] = 0;
  return;
}
function _RenderMaximumFaceGroup(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 72 | 0;
  r4 = r3, r5 = r4 >> 2;
  r6 = r3 + 12, r7 = r6 >> 2;
  r8 = r3 + 24, r9 = r8 >> 2;
  r10 = r3 + 36, r11 = r10 >> 2;
  r12 = r3 + 48, r13 = r12 >> 2;
  r14 = r3 + 60, r15 = r14 >> 2;
  if ((HEAP32[r1 + 120 >> 2] | 0) != 0) {
    r16 = 1;
    r17 = r2;
    r18 = 14;
    FUNCTION_TABLE[r18](r1, r17, r16);
    STACKTOP = r3;
    return;
  }
  _MaximumFan(r4, r2);
  r4 = HEAP32[r5];
  if ((r4 | 0) > 1) {
    r19 = r4;
    r20 = HEAP32[r5 + 1];
    r21 = HEAP32[r5 + 2];
  } else {
    r19 = 1;
    r20 = r2;
    r21 = 14;
  }
  r5 = r2 + 12 | 0;
  _MaximumFan(r6, HEAP32[r5 >> 2]);
  r6 = HEAP32[r7];
  if ((r6 | 0) > (r19 | 0)) {
    r22 = r6;
    r23 = HEAP32[r7 + 1];
    r24 = HEAP32[r7 + 2];
  } else {
    r22 = r19;
    r23 = r20;
    r24 = r21;
  }
  r21 = r2 + 8 | 0;
  _MaximumFan(r8, HEAP32[HEAP32[r21 >> 2] + 4 >> 2]);
  r8 = HEAP32[r9];
  if ((r8 | 0) > (r22 | 0)) {
    r25 = r8;
    r26 = HEAP32[r9 + 1];
    r27 = HEAP32[r9 + 2];
  } else {
    r25 = r22;
    r26 = r23;
    r27 = r24;
  }
  _MaximumStrip(r10, r2);
  r2 = HEAP32[r11];
  if ((r2 | 0) > (r25 | 0)) {
    r28 = r2;
    r29 = HEAP32[r11 + 1];
    r30 = HEAP32[r11 + 2];
  } else {
    r28 = r25;
    r29 = r26;
    r30 = r27;
  }
  _MaximumStrip(r12, HEAP32[r5 >> 2]);
  r5 = HEAP32[r13];
  if ((r5 | 0) > (r28 | 0)) {
    r31 = r5;
    r32 = HEAP32[r13 + 1];
    r33 = HEAP32[r13 + 2];
  } else {
    r31 = r28;
    r32 = r29;
    r33 = r30;
  }
  _MaximumStrip(r14, HEAP32[HEAP32[r21 >> 2] + 4 >> 2]);
  r21 = HEAP32[r15];
  if ((r21 | 0) <= (r31 | 0)) {
    r16 = r31;
    r17 = r32;
    r18 = r33;
    FUNCTION_TABLE[r18](r1, r17, r16);
    STACKTOP = r3;
    return;
  }
  r16 = r21;
  r17 = HEAP32[r15 + 1];
  r18 = HEAP32[r15 + 2];
  FUNCTION_TABLE[r18](r1, r17, r16);
  STACKTOP = r3;
  return;
}
_RenderMaximumFaceGroup["X"] = 1;
function _RenderLonelyTriangles(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18;
  r3 = r1 >> 2;
  r4 = HEAP32[r3 + 740];
  if ((r4 | 0) == 48) {
    FUNCTION_TABLE[HEAP32[r3 + 33]](4);
  } else {
    FUNCTION_TABLE[r4](4, HEAP32[r3 + 756]);
  }
  L324 : do {
    if ((r2 | 0) != 0) {
      r4 = r1 + 120 | 0;
      r5 = r1 + 2968 | 0;
      r6 = r1 + 140 | 0;
      r7 = r1 + 3024 | 0;
      r8 = r1 + 2964 | 0;
      r9 = r1 + 136 | 0;
      r10 = r2;
      r11 = -1;
      while (1) {
        r12 = r10 + 8 | 0;
        r13 = r11;
        r14 = HEAP32[r12 >> 2], r15 = r14 >> 2;
        while (1) {
          do {
            if ((HEAP32[r4 >> 2] | 0) == 0) {
              r16 = r13;
            } else {
              r17 = (HEAP32[HEAP32[HEAP32[r15 + 1] + 20 >> 2] + 24 >> 2] | 0) == 0 & 1;
              if ((r13 | 0) == (r17 | 0)) {
                r16 = r13;
                break;
              }
              r18 = HEAP32[r8 >> 2];
              if ((r18 | 0) == 34) {
                FUNCTION_TABLE[HEAP32[r9 >> 2]](r17);
                r16 = r17;
                break;
              } else {
                FUNCTION_TABLE[r18](r17, HEAP32[r7 >> 2]);
                r16 = r17;
                break;
              }
            }
          } while (0);
          r17 = HEAP32[r5 >> 2];
          if ((r17 | 0) == 6) {
            FUNCTION_TABLE[HEAP32[r6 >> 2]](HEAP32[HEAP32[r15 + 4] + 12 >> 2]);
          } else {
            FUNCTION_TABLE[r17](HEAP32[HEAP32[r15 + 4] + 12 >> 2], HEAP32[r7 >> 2]);
          }
          r17 = HEAP32[r15 + 3];
          if ((r17 | 0) == (HEAP32[r12 >> 2] | 0)) {
            break;
          } else {
            r13 = r16;
            r14 = r17, r15 = r14 >> 2;
          }
        }
        r14 = HEAP32[r10 + 16 >> 2];
        if ((r14 | 0) == 0) {
          break L324;
        } else {
          r10 = r14;
          r11 = r16;
        }
      }
    }
  } while (0);
  r16 = HEAP32[r3 + 743];
  if ((r16 | 0) == 10) {
    FUNCTION_TABLE[HEAP32[r3 + 36]]();
    return;
  } else {
    FUNCTION_TABLE[r16](HEAP32[r3 + 756]);
    return;
  }
}
_RenderLonelyTriangles["X"] = 1;
function ___gl_renderBoundary(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13;
  r3 = r2 + 60 | 0;
  r2 = HEAP32[r3 >> 2];
  if ((r2 | 0) == (r3 | 0)) {
    return;
  }
  r4 = r1 + 2960 | 0;
  r5 = r1 + 132 | 0;
  r6 = r1 + 2968 | 0;
  r7 = r1 + 140 | 0;
  r8 = (r1 + 3024 | 0) >> 2;
  r9 = r1 + 2972 | 0;
  r10 = r1 + 144 | 0;
  r1 = r2;
  while (1) {
    do {
      if ((HEAP32[r1 + 24 >> 2] | 0) != 0) {
        r2 = HEAP32[r4 >> 2];
        if ((r2 | 0) == 48) {
          FUNCTION_TABLE[HEAP32[r5 >> 2]](2);
        } else {
          FUNCTION_TABLE[r2](2, HEAP32[r8]);
        }
        r2 = r1 + 8 | 0;
        r11 = HEAP32[r2 >> 2], r12 = r11 >> 2;
        while (1) {
          r13 = HEAP32[r6 >> 2];
          if ((r13 | 0) == 6) {
            FUNCTION_TABLE[HEAP32[r7 >> 2]](HEAP32[HEAP32[r12 + 4] + 12 >> 2]);
          } else {
            FUNCTION_TABLE[r13](HEAP32[HEAP32[r12 + 4] + 12 >> 2], HEAP32[r8]);
          }
          r13 = HEAP32[r12 + 3];
          if ((r13 | 0) == (HEAP32[r2 >> 2] | 0)) {
            break;
          } else {
            r11 = r13, r12 = r11 >> 2;
          }
        }
        r11 = HEAP32[r9 >> 2];
        if ((r11 | 0) == 10) {
          FUNCTION_TABLE[HEAP32[r10 >> 2]]();
          break;
        } else {
          FUNCTION_TABLE[r11](HEAP32[r8]);
          break;
        }
      }
    } while (0);
    r11 = HEAP32[r1 >> 2];
    if ((r11 | 0) == (r3 | 0)) {
      break;
    } else {
      r1 = r11;
    }
  }
  return;
}
___gl_renderBoundary["X"] = 1;
function _MaximumFan(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23;
  r3 = r2 + 20 | 0;
  r4 = HEAP32[r3 >> 2];
  L373 : do {
    if ((HEAP32[r4 + 24 >> 2] | 0) == 0) {
      r5 = 0;
      r6 = 0;
    } else {
      r7 = 0;
      r8 = 0;
      r9 = r2;
      r10 = r3;
      r11 = r4;
      while (1) {
        if ((HEAP32[r11 + 20 >> 2] | 0) != 0) {
          r5 = r7;
          r6 = r8;
          break L373;
        }
        HEAP32[r11 + 16 >> 2] = r8;
        r12 = HEAP32[r10 >> 2];
        HEAP32[r12 + 20 >> 2] = 1;
        r13 = r7 + 1 | 0;
        r14 = HEAP32[r9 + 8 >> 2];
        r15 = r14 + 20 | 0;
        r16 = HEAP32[r15 >> 2];
        if ((HEAP32[r16 + 24 >> 2] | 0) == 0) {
          r5 = r13;
          r6 = r12;
          break L373;
        } else {
          r7 = r13;
          r8 = r12;
          r9 = r14;
          r10 = r15;
          r11 = r16;
        }
      }
    }
  } while (0);
  r4 = r2 + 4 | 0;
  r3 = HEAP32[HEAP32[r4 >> 2] + 20 >> 2];
  L378 : do {
    if ((HEAP32[r3 + 24 >> 2] | 0) == 0) {
      r17 = r5;
      r18 = r6;
      r19 = r2;
    } else {
      r11 = r5;
      r10 = r6;
      r9 = r2;
      r8 = r4;
      r7 = r3;
      while (1) {
        if ((HEAP32[r7 + 20 >> 2] | 0) != 0) {
          r17 = r11;
          r18 = r10;
          r19 = r9;
          break L378;
        }
        HEAP32[r7 + 16 >> 2] = r10;
        r16 = HEAP32[HEAP32[r8 >> 2] + 20 >> 2];
        HEAP32[r16 + 20 >> 2] = 1;
        r15 = r11 + 1 | 0;
        r14 = HEAP32[HEAP32[r8 >> 2] + 12 >> 2];
        r12 = r14 + 4 | 0;
        r13 = HEAP32[HEAP32[r12 >> 2] + 20 >> 2];
        if ((HEAP32[r13 + 24 >> 2] | 0) == 0) {
          r17 = r15;
          r18 = r16;
          r19 = r14;
          break L378;
        } else {
          r11 = r15;
          r10 = r16;
          r9 = r14;
          r8 = r12;
          r7 = r13;
        }
      }
    }
  } while (0);
  if ((r18 | 0) == 0) {
    r20 = r1 | 0;
    HEAP32[r20 >> 2] = r17;
    r21 = r1 + 4 | 0;
    HEAP32[r21 >> 2] = r19;
    r22 = r1 + 8 | 0;
    HEAP32[r22 >> 2] = 12;
    return;
  } else {
    r23 = r18;
  }
  while (1) {
    HEAP32[r23 + 20 >> 2] = 0;
    r18 = HEAP32[r23 + 16 >> 2];
    if ((r18 | 0) == 0) {
      break;
    } else {
      r23 = r18;
    }
  }
  r20 = r1 | 0;
  HEAP32[r20 >> 2] = r17;
  r21 = r1 + 4 | 0;
  HEAP32[r21 >> 2] = r19;
  r22 = r1 + 8 | 0;
  HEAP32[r22 >> 2] = 12;
  return;
}
_MaximumFan["X"] = 1;
function _MaximumStrip(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26;
  r3 = r2 + 20 | 0;
  r4 = HEAP32[r3 >> 2];
  L389 : do {
    if ((HEAP32[r4 + 24 >> 2] | 0) == 0) {
      r5 = r2;
      r6 = 0;
      r7 = 0;
    } else {
      r8 = 0;
      r9 = 0;
      r10 = r2;
      r11 = r3;
      r12 = r4;
      while (1) {
        if ((HEAP32[r12 + 20 >> 2] | 0) != 0) {
          r5 = r10;
          r6 = r9;
          r7 = r8;
          break L389;
        }
        HEAP32[r12 + 16 >> 2] = r9;
        r13 = HEAP32[r11 >> 2];
        HEAP32[r13 + 20 >> 2] = 1;
        r14 = r8 | 1;
        r15 = HEAP32[HEAP32[r10 + 12 >> 2] + 4 >> 2];
        r16 = r15 + 20 | 0;
        r17 = HEAP32[r16 >> 2] >> 2;
        if ((HEAP32[r17 + 6] | 0) == 0) {
          r5 = r15;
          r6 = r13;
          r7 = r14;
          break L389;
        }
        if ((HEAP32[r17 + 5] | 0) != 0) {
          r5 = r15;
          r6 = r13;
          r7 = r14;
          break L389;
        }
        HEAP32[r17 + 4] = r13;
        r13 = HEAP32[r16 >> 2];
        HEAP32[r13 + 20 >> 2] = 1;
        r16 = r8 + 2 | 0;
        r17 = HEAP32[r15 + 8 >> 2];
        r15 = r17 + 20 | 0;
        r14 = HEAP32[r15 >> 2];
        if ((HEAP32[r14 + 24 >> 2] | 0) == 0) {
          r5 = r17;
          r6 = r13;
          r7 = r16;
          break L389;
        } else {
          r8 = r16;
          r9 = r13;
          r10 = r17;
          r11 = r15;
          r12 = r14;
        }
      }
    }
  } while (0);
  r4 = r2 + 4 | 0;
  r3 = HEAP32[HEAP32[r4 >> 2] + 20 >> 2];
  L396 : do {
    if ((HEAP32[r3 + 24 >> 2] | 0) == 0) {
      r18 = r2;
      r19 = r6;
      r20 = 0;
    } else {
      r12 = 0;
      r11 = r6;
      r10 = r2;
      r9 = r4;
      r8 = r3;
      while (1) {
        if ((HEAP32[r8 + 20 >> 2] | 0) != 0) {
          r18 = r10;
          r19 = r11;
          r20 = r12;
          break L396;
        }
        HEAP32[r8 + 16 >> 2] = r11;
        r14 = HEAP32[HEAP32[r9 >> 2] + 20 >> 2];
        HEAP32[r14 + 20 >> 2] = 1;
        r15 = r12 | 1;
        r17 = HEAP32[HEAP32[r9 >> 2] + 12 >> 2];
        r13 = (r17 + 4 | 0) >> 2;
        r16 = HEAP32[HEAP32[r13] + 20 >> 2] >> 2;
        if ((HEAP32[r16 + 6] | 0) == 0) {
          r18 = r17;
          r19 = r14;
          r20 = r15;
          break L396;
        }
        if ((HEAP32[r16 + 5] | 0) != 0) {
          r18 = r17;
          r19 = r14;
          r20 = r15;
          break L396;
        }
        HEAP32[r16 + 4] = r14;
        r14 = HEAP32[HEAP32[r13] + 20 >> 2];
        HEAP32[r14 + 20 >> 2] = 1;
        r16 = r12 + 2 | 0;
        r15 = HEAP32[HEAP32[HEAP32[r13] + 8 >> 2] + 4 >> 2];
        r13 = r15 + 4 | 0;
        r17 = HEAP32[HEAP32[r13 >> 2] + 20 >> 2];
        if ((HEAP32[r17 + 24 >> 2] | 0) == 0) {
          r18 = r15;
          r19 = r14;
          r20 = r16;
          break L396;
        } else {
          r12 = r16;
          r11 = r14;
          r10 = r15;
          r9 = r13;
          r8 = r17;
        }
      }
    }
  } while (0);
  r3 = r20 + r7 | 0;
  do {
    if ((r7 & 1 | 0) == 0) {
      r21 = HEAP32[r5 + 4 >> 2];
      r22 = r3;
    } else {
      if ((r20 & 1 | 0) == 0) {
        r21 = r18;
        r22 = r3;
        break;
      }
      r21 = HEAP32[r18 + 8 >> 2];
      r22 = r3 - 1 | 0;
    }
  } while (0);
  if ((r19 | 0) == 0) {
    r23 = r1 | 0;
    HEAP32[r23 >> 2] = r22;
    r24 = r1 + 4 | 0;
    HEAP32[r24 >> 2] = r21;
    r25 = r1 + 8 | 0;
    HEAP32[r25 >> 2] = 44;
    return;
  } else {
    r26 = r19;
  }
  while (1) {
    HEAP32[r26 + 20 >> 2] = 0;
    r19 = HEAP32[r26 + 16 >> 2];
    if ((r19 | 0) == 0) {
      break;
    } else {
      r26 = r19;
    }
  }
  r23 = r1 | 0;
  HEAP32[r23 >> 2] = r22;
  r24 = r1 + 4 | 0;
  HEAP32[r24 >> 2] = r21;
  r25 = r1 + 8 | 0;
  HEAP32[r25 >> 2] = 44;
  return;
}
_MaximumStrip["X"] = 1;
function ___gl_renderCache(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r2 = r1 >> 2;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r4 = r3;
  r5 = r1 + 160 | 0;
  r6 = (r1 + 156 | 0) >> 2;
  r7 = HEAP32[r6];
  r8 = r1 + (r7 * 28 & -1) + 160 | 0;
  if ((r7 | 0) < 3) {
    r9 = 1;
    STACKTOP = r3;
    return r9;
  }
  r10 = r1 + 16 | 0;
  r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r10 = r4 | 0;
  HEAPF64[tempDoublePtr >> 3] = r11, HEAP32[r10 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r10 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = r1 + 24 | 0;
  r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r12 = r4 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r13, HEAP32[r12 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = r1 + 32 | 0;
  r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r12 = r4 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r14, HEAP32[r12 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  do {
    if (r11 == 0) {
      if (!(r13 == 0 & r14 == 0)) {
        break;
      }
      _ComputeNormal(r1, r10, 0);
    }
  } while (0);
  r14 = _ComputeNormal(r1, r10, 1);
  if ((r14 | 0) == 0) {
    r9 = 1;
    STACKTOP = r3;
    return r9;
  } else if ((r14 | 0) == 2) {
    r9 = 0;
    STACKTOP = r3;
    return r9;
  } else {
    r10 = HEAP32[r2 + 24];
    do {
      if ((r10 | 0) == 100132) {
        if ((r14 | 0) < 0) {
          r9 = 1;
        } else {
          break;
        }
        STACKTOP = r3;
        return r9;
      } else if ((r10 | 0) == 100133) {
        if ((r14 | 0) > 0) {
          r9 = 1;
        } else {
          break;
        }
        STACKTOP = r3;
        return r9;
      } else if ((r10 | 0) == 100134) {
        r9 = 1;
        STACKTOP = r3;
        return r9;
      }
    } while (0);
    r10 = HEAP32[r2 + 740];
    if ((r10 | 0) == 48) {
      if ((HEAP32[r2 + 31] | 0) == 0) {
        r15 = (HEAP32[r6] | 0) > 3 ? 6 : 4;
      } else {
        r15 = 2;
      }
      FUNCTION_TABLE[HEAP32[r2 + 33]](r15);
    } else {
      if ((HEAP32[r2 + 31] | 0) == 0) {
        r16 = (HEAP32[r6] | 0) > 3 ? 6 : 4;
      } else {
        r16 = 2;
      }
      FUNCTION_TABLE[r10](r16, HEAP32[r2 + 756]);
    }
    r16 = (r1 + 2968 | 0) >> 2;
    r10 = HEAP32[r16];
    if ((r10 | 0) == 6) {
      FUNCTION_TABLE[HEAP32[r2 + 35]](HEAP32[r2 + 46]);
    } else {
      FUNCTION_TABLE[r10](HEAP32[r2 + 46], HEAP32[r2 + 756]);
    }
    L446 : do {
      if ((r14 | 0) > 0) {
        if ((r7 | 0) <= 1) {
          break;
        }
        r10 = r1 + 140 | 0;
        r6 = r1 + 3024 | 0;
        r15 = r1 + 188 | 0;
        while (1) {
          r13 = HEAP32[r16];
          if ((r13 | 0) == 6) {
            FUNCTION_TABLE[HEAP32[r10 >> 2]](HEAP32[r15 + 24 >> 2]);
          } else {
            FUNCTION_TABLE[r13](HEAP32[r15 + 24 >> 2], HEAP32[r6 >> 2]);
          }
          r13 = r15 + 28 | 0;
          if (r13 >>> 0 < r8 >>> 0) {
            r15 = r13;
          } else {
            break L446;
          }
        }
      } else {
        r15 = r7 - 1 | 0;
        if ((r15 | 0) <= 0) {
          break;
        }
        r6 = r1 + 140 | 0;
        r10 = r1 + 3024 | 0;
        r13 = r1 + (r15 * 28 & -1) + 160 | 0;
        while (1) {
          r15 = HEAP32[r16];
          if ((r15 | 0) == 6) {
            FUNCTION_TABLE[HEAP32[r6 >> 2]](HEAP32[r13 + 24 >> 2]);
          } else {
            FUNCTION_TABLE[r15](HEAP32[r13 + 24 >> 2], HEAP32[r10 >> 2]);
          }
          r15 = r13 - 28 | 0;
          if (r15 >>> 0 > r5 >>> 0) {
            r13 = r15;
          } else {
            break L446;
          }
        }
      }
    } while (0);
    r5 = HEAP32[r2 + 743];
    if ((r5 | 0) == 10) {
      FUNCTION_TABLE[HEAP32[r2 + 36]]();
      r9 = 1;
      STACKTOP = r3;
      return r9;
    } else {
      FUNCTION_TABLE[r5](HEAP32[r2 + 756]);
      r9 = 1;
      STACKTOP = r3;
      return r9;
    }
  }
}
___gl_renderCache["X"] = 1;
function _ComputeNormal(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47;
  r4 = r2 >> 2;
  r5 = 0;
  r6 = HEAP32[r1 + 156 >> 2];
  r7 = r1 + (r6 * 28 & -1) + 160 | 0;
  r8 = (r3 | 0) != 0;
  if (!r8) {
    r3 = r2 >> 2;
    HEAP32[r3] = 0;
    HEAP32[r3 + 1] = 0;
    HEAP32[r3 + 2] = 0;
    HEAP32[r3 + 3] = 0;
    HEAP32[r3 + 4] = 0;
    HEAP32[r3 + 5] = 0;
  }
  r3 = r1 + 188 | 0;
  r9 = (r1 + 160 | 0) >> 2;
  r10 = (r1 + 168 | 0) >> 2;
  r11 = (r1 + 176 | 0) >> 2;
  if ((r6 | 0) <= 2) {
    r12 = 0;
    return r12;
  }
  r6 = r1 + 204 | 0;
  r13 = r1 + 196 | 0;
  r14 = r3 | 0;
  r15 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
  r16 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 1], HEAPF64[tempDoublePtr >> 3]);
  r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 1], HEAPF64[tempDoublePtr >> 3]);
  r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r13;
  r14 = (r2 + 8 | 0) >> 2;
  r19 = (r2 + 16 | 0) >> 2;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r4], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 1], HEAPF64[tempDoublePtr >> 3]);
  r20 = r16 - r15;
  r16 = r17 - r6;
  r17 = r18;
  r18 = r3;
  r3 = 0;
  r21 = r1 + 216 | 0;
  L477 : while (1) {
    r1 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r14], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 1], HEAPF64[tempDoublePtr >> 3]);
    r22 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]);
    if (r8) {
      r23 = r20;
      r24 = r16;
      r25 = r17;
      r26 = r18;
      r27 = r21;
    } else {
      r28 = r20;
      r29 = r16;
      r30 = r17;
      r31 = r18;
      r32 = r21;
      r33 = r2;
      r34 = r13;
      r35 = r6;
      r36 = r15;
      r37 = r1;
      r38 = r22;
      r5 = 364;
      break;
    }
    while (1) {
      r39 = r27 | 0;
      r40 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r39 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r39 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r13;
      r39 = r26 + 36 | 0;
      r41 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r39 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r39 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r6;
      r39 = r26 + 44 | 0;
      r42 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r39 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r39 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r15;
      r43 = (r25 * r41 - r24 * r40) * r22 + r2 * (r24 * r42 - r23 * r41) + r1 * (r23 * r40 - r25 * r42);
      if (r43 != 0) {
        break;
      }
      r39 = r27 + 28 | 0;
      if (r39 >>> 0 < r7 >>> 0) {
        r23 = r42;
        r24 = r41;
        r25 = r40;
        r26 = r27;
        r27 = r39;
      } else {
        r12 = r3;
        r5 = 374;
        break L477;
      }
    }
    if (r43 > 0) {
      if ((r3 | 0) < 0) {
        r12 = 2;
        r5 = 377;
        break;
      } else {
        r44 = 1;
      }
    } else {
      if ((r3 | 0) > 0) {
        r12 = 2;
        r5 = 379;
        break;
      } else {
        r44 = -1;
      }
    }
    r1 = r27 + 28 | 0;
    if (r1 >>> 0 < r7 >>> 0) {
      r20 = r42;
      r16 = r41;
      r17 = r40;
      r18 = r27;
      r3 = r44;
      r21 = r1;
    } else {
      r12 = r44;
      r5 = 378;
      break;
    }
  }
  if (r5 == 378) {
    return r12;
  } else if (r5 == 374) {
    return r12;
  } else if (r5 == 364) {
    while (1) {
      r5 = 0;
      r44 = r32 | 0;
      r21 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r44 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r44 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r34;
      r44 = r31 + 36 | 0;
      r27 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r44 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r44 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r35;
      r44 = r31 + 44 | 0;
      r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r44 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r44 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r36;
      r44 = r29 * r18 - r28 * r27;
      r40 = r28 * r21 - r30 * r18;
      r17 = r30 * r27 - r29 * r21;
      if (r17 * r38 + r33 * r44 + r37 * r40 < 0) {
        r41 = r33 - r44;
        HEAPF64[tempDoublePtr >> 3] = r41, HEAP32[r4] = HEAP32[tempDoublePtr >> 2], HEAP32[r4 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
        r16 = r37 - r40;
        HEAPF64[tempDoublePtr >> 3] = r16, HEAP32[r14] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
        r45 = r41;
        r46 = r38 - r17;
        r47 = r16;
      } else {
        r16 = r33 + r44;
        HEAPF64[tempDoublePtr >> 3] = r16, HEAP32[r4] = HEAP32[tempDoublePtr >> 2], HEAP32[r4 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
        r44 = r40 + r37;
        HEAPF64[tempDoublePtr >> 3] = r44, HEAP32[r14] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
        r45 = r16;
        r46 = r17 + r38;
        r47 = r44;
      }
      HEAPF64[tempDoublePtr >> 3] = r46, HEAP32[r19] = HEAP32[tempDoublePtr >> 2], HEAP32[r19 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
      r44 = r32 + 28 | 0;
      if (r44 >>> 0 >= r7 >>> 0) {
        r12 = r3;
        break;
      }
      r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 1], HEAPF64[tempDoublePtr >> 3]);
      r28 = r18;
      r29 = r27;
      r30 = r21;
      r31 = r32;
      r32 = r44;
      r33 = r45;
      r34 = r17;
      r35 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 1], HEAPF64[tempDoublePtr >> 3]);
      r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
      r37 = r47;
      r38 = r46;
    }
    return r12;
  } else if (r5 == 379) {
    return r12;
  } else if (r5 == 377) {
    return r12;
  }
}
_ComputeNormal["X"] = 1;
function _RenderTriangle(r1, r2, r3) {
  if ((r3 | 0) != 1) {
    ___assert_func(5243812, 243, 5245268, 5243496);
  }
  r3 = r1 + 128 | 0;
  r1 = (r2 + 20 | 0) >> 2;
  HEAP32[HEAP32[r1] + 16 >> 2] = HEAP32[r3 >> 2];
  HEAP32[r3 >> 2] = HEAP32[r1];
  HEAP32[HEAP32[r1] + 20 >> 2] = 1;
  return;
}
function _RenderStrip(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r4 = r2 >> 2;
  r5 = r1 >> 2;
  r6 = HEAP32[r5 + 740];
  if ((r6 | 0) == 48) {
    FUNCTION_TABLE[HEAP32[r5 + 33]](5);
  } else {
    FUNCTION_TABLE[r6](5, HEAP32[r5 + 756]);
  }
  r6 = (r1 + 2968 | 0) >> 2;
  r7 = HEAP32[r6];
  if ((r7 | 0) == 6) {
    FUNCTION_TABLE[HEAP32[r5 + 35]](HEAP32[HEAP32[r4 + 4] + 12 >> 2]);
  } else {
    FUNCTION_TABLE[r7](HEAP32[HEAP32[r4 + 4] + 12 >> 2], HEAP32[r5 + 756]);
  }
  r7 = HEAP32[r6];
  if ((r7 | 0) == 6) {
    FUNCTION_TABLE[HEAP32[r5 + 35]](HEAP32[HEAP32[HEAP32[r4 + 1] + 16 >> 2] + 12 >> 2]);
  } else {
    FUNCTION_TABLE[r7](HEAP32[HEAP32[HEAP32[r4 + 1] + 16 >> 2] + 12 >> 2], HEAP32[r5 + 756]);
  }
  r7 = HEAP32[r4 + 5];
  L517 : do {
    if ((HEAP32[r7 + 24 >> 2] | 0) == 0) {
      r8 = r3;
    } else {
      r4 = r1 + 140 | 0;
      r9 = r1 + 3024 | 0;
      r10 = r2;
      r11 = r3;
      r12 = r7;
      while (1) {
        r13 = r12 + 20 | 0;
        if ((HEAP32[r13 >> 2] | 0) != 0) {
          r8 = r11;
          break L517;
        }
        HEAP32[r13 >> 2] = 1;
        r13 = r11 - 1 | 0;
        r14 = HEAP32[HEAP32[r10 + 12 >> 2] + 4 >> 2] >> 2;
        r15 = HEAP32[r6];
        if ((r15 | 0) == 6) {
          FUNCTION_TABLE[HEAP32[r4 >> 2]](HEAP32[HEAP32[r14 + 4] + 12 >> 2]);
        } else {
          FUNCTION_TABLE[r15](HEAP32[HEAP32[r14 + 4] + 12 >> 2], HEAP32[r9 >> 2]);
        }
        r15 = HEAP32[r14 + 5];
        if ((HEAP32[r15 + 24 >> 2] | 0) == 0) {
          r8 = r13;
          break L517;
        }
        r16 = r15 + 20 | 0;
        if ((HEAP32[r16 >> 2] | 0) != 0) {
          r8 = r13;
          break L517;
        }
        HEAP32[r16 >> 2] = 1;
        r16 = r11 - 2 | 0;
        r13 = HEAP32[r14 + 2], r14 = r13 >> 2;
        r15 = HEAP32[r6];
        if ((r15 | 0) == 6) {
          FUNCTION_TABLE[HEAP32[r4 >> 2]](HEAP32[HEAP32[HEAP32[r14 + 1] + 16 >> 2] + 12 >> 2]);
        } else {
          FUNCTION_TABLE[r15](HEAP32[HEAP32[HEAP32[r14 + 1] + 16 >> 2] + 12 >> 2], HEAP32[r9 >> 2]);
        }
        r15 = HEAP32[r14 + 5];
        if ((HEAP32[r15 + 24 >> 2] | 0) == 0) {
          r8 = r16;
          break L517;
        } else {
          r10 = r13;
          r11 = r16;
          r12 = r15;
        }
      }
    }
  } while (0);
  if ((r8 | 0) != 0) {
    ___assert_func(5243812, 328, 5245284, 5243660);
  }
  r8 = HEAP32[r5 + 743];
  if ((r8 | 0) == 10) {
    FUNCTION_TABLE[HEAP32[r5 + 36]]();
    return;
  } else {
    FUNCTION_TABLE[r8](HEAP32[r5 + 756]);
    return;
  }
}
_RenderStrip["X"] = 1;
function ___gl_noBeginData(r1, r2) {
  return;
}
function ___gl_noEdgeFlagData(r1, r2) {
  return;
}
function ___gl_noVertexData(r1, r2) {
  return;
}
function ___gl_noEndData(r1) {
  return;
}
function ___gl_noErrorData(r1, r2) {
  return;
}
function ___gl_noCombineData(r1, r2, r3, r4, r5) {
  return;
}
function _noBegin(r1) {
  return;
}
function _noEdgeFlag(r1) {
  return;
}
function _noVertex(r1) {
  return;
}
function _noEnd() {
  return;
}
function _noError(r1) {
  return;
}
function _noCombine(r1, r2, r3, r4) {
  return;
}
function _noMesh(r1) {
  return;
}
function _gluTessProperty(r1) {
  HEAP32[r1 + 96 >> 2] = 100131;
  return;
}
function _CacheVertex(r1, r2, r3) {
  var r4, r5, r6;
  r4 = (r1 + 156 | 0) >> 2;
  r5 = HEAP32[r4];
  HEAP32[r1 + (r5 * 28 & -1) + 184 >> 2] = r3;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r2 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r2 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r6 = r1 + (r5 * 28 & -1) + 160 | 0;
  HEAPF64[tempDoublePtr >> 3] = r3, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r6 = r2 + 8 | 0;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r6 = r1 + (r5 * 28 & -1) + 168 | 0;
  HEAPF64[tempDoublePtr >> 3] = r3, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r6 = r2 + 16 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r6 = r1 + (r5 * 28 & -1) + 176 | 0;
  HEAPF64[tempDoublePtr >> 3] = r2, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  HEAP32[r4] = HEAP32[r4] + 1 | 0;
  return;
}
function _RenderFan(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r4 = r2 >> 2;
  r5 = r1 >> 2;
  r6 = HEAP32[r5 + 740];
  if ((r6 | 0) == 48) {
    FUNCTION_TABLE[HEAP32[r5 + 33]](6);
  } else {
    FUNCTION_TABLE[r6](6, HEAP32[r5 + 756]);
  }
  r6 = (r1 + 2968 | 0) >> 2;
  r7 = HEAP32[r6];
  if ((r7 | 0) == 6) {
    FUNCTION_TABLE[HEAP32[r5 + 35]](HEAP32[HEAP32[r4 + 4] + 12 >> 2]);
  } else {
    FUNCTION_TABLE[r7](HEAP32[HEAP32[r4 + 4] + 12 >> 2], HEAP32[r5 + 756]);
  }
  r7 = HEAP32[r6];
  if ((r7 | 0) == 6) {
    FUNCTION_TABLE[HEAP32[r5 + 35]](HEAP32[HEAP32[HEAP32[r4 + 1] + 16 >> 2] + 12 >> 2]);
  } else {
    FUNCTION_TABLE[r7](HEAP32[HEAP32[HEAP32[r4 + 1] + 16 >> 2] + 12 >> 2], HEAP32[r5 + 756]);
  }
  r7 = HEAP32[r4 + 5];
  L569 : do {
    if ((HEAP32[r7 + 24 >> 2] | 0) == 0) {
      r8 = r3;
    } else {
      r4 = r1 + 140 | 0;
      r9 = r1 + 3024 | 0;
      r10 = r2;
      r11 = r3;
      r12 = r7;
      while (1) {
        r13 = r12 + 20 | 0;
        if ((HEAP32[r13 >> 2] | 0) != 0) {
          r8 = r11;
          break L569;
        }
        HEAP32[r13 >> 2] = 1;
        r13 = r11 - 1 | 0;
        r14 = HEAP32[r10 + 8 >> 2], r15 = r14 >> 2;
        r16 = HEAP32[r6];
        if ((r16 | 0) == 6) {
          FUNCTION_TABLE[HEAP32[r4 >> 2]](HEAP32[HEAP32[HEAP32[r15 + 1] + 16 >> 2] + 12 >> 2]);
        } else {
          FUNCTION_TABLE[r16](HEAP32[HEAP32[HEAP32[r15 + 1] + 16 >> 2] + 12 >> 2], HEAP32[r9 >> 2]);
        }
        r16 = HEAP32[r15 + 5];
        if ((HEAP32[r16 + 24 >> 2] | 0) == 0) {
          r8 = r13;
          break L569;
        } else {
          r10 = r14;
          r11 = r13;
          r12 = r16;
        }
      }
    }
  } while (0);
  if ((r8 | 0) != 0) {
    ___assert_func(5243812, 300, 5245296, 5243660);
  }
  r8 = HEAP32[r5 + 743];
  if ((r8 | 0) == 10) {
    FUNCTION_TABLE[HEAP32[r5 + 36]]();
    return;
  } else {
    FUNCTION_TABLE[r8](HEAP32[r5 + 756]);
    return;
  }
}
_RenderFan["X"] = 1;
function _gluNewTess() {
  var r1, r2, r3, r4, r5, r6;
  r1 = _malloc(3028), r2 = r1 >> 2;
  if ((r1 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r4 = r1;
  HEAP32[r2] = 0;
  r5 = (r1 + 16 | 0) >> 2;
  r6 = r1 + 88 | 0;
  HEAPF64[tempDoublePtr >> 3] = 0, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  HEAP32[r5] = 0;
  HEAP32[r5 + 1] = 0;
  HEAP32[r5 + 2] = 0;
  HEAP32[r5 + 3] = 0;
  HEAP32[r5 + 4] = 0;
  HEAP32[r5 + 5] = 0;
  HEAP32[r2 + 24] = 100130;
  HEAP32[r2 + 30] = 0;
  HEAP32[r2 + 31] = 0;
  HEAP32[r2 + 33] = 28;
  HEAP32[r2 + 34] = 36;
  HEAP32[r2 + 35] = 46;
  HEAP32[r2 + 36] = 40;
  HEAP32[r2 + 3] = 42;
  HEAP32[r2 + 29] = 4;
  HEAP32[r2 + 37] = 24;
  HEAP32[r2 + 740] = 48;
  HEAP32[r2 + 741] = 34;
  HEAP32[r2 + 742] = 6;
  HEAP32[r2 + 743] = 10;
  HEAP32[r2 + 744] = 22;
  HEAP32[r2 + 745] = 50;
  HEAP32[r2 + 756] = 0;
  r3 = r4;
  return r3;
}
_gluNewTess["X"] = 1;
function _gluDeleteTess(r1) {
  if ((HEAP32[r1 >> 2] | 0) != 0) {
    _GotoState(r1, 0);
  }
  _free(r1);
  return;
}
function _GotoState(r1, r2) {
  var r3, r4, r5, r6, r7, r8;
  r3 = r1 | 0;
  r4 = HEAP32[r3 >> 2];
  if ((r4 | 0) == (r2 | 0)) {
    return;
  }
  r5 = (r1 + 2976 | 0) >> 2;
  r6 = (r1 + 12 | 0) >> 2;
  r7 = (r1 + 3024 | 0) >> 2;
  r8 = r4;
  while (1) {
    do {
      if (r8 >>> 0 < r2 >>> 0) {
        if ((r8 | 0) == 0) {
          r4 = HEAP32[r5];
          if ((r4 | 0) == 22) {
            FUNCTION_TABLE[HEAP32[r6]](100151);
          } else {
            FUNCTION_TABLE[r4](100151, HEAP32[r7]);
          }
          _gluTessBeginPolygon(r1, 0);
          break;
        } else if ((r8 | 0) == 1) {
          r4 = HEAP32[r5];
          if ((r4 | 0) == 22) {
            FUNCTION_TABLE[HEAP32[r6]](100152);
          } else {
            FUNCTION_TABLE[r4](100152, HEAP32[r7]);
          }
          _gluTessBeginContour(r1);
          break;
        } else {
          break;
        }
      } else {
        if ((r8 | 0) == 1) {
          r4 = HEAP32[r5];
          if ((r4 | 0) == 22) {
            FUNCTION_TABLE[HEAP32[r6]](100153);
          } else {
            FUNCTION_TABLE[r4](100153, HEAP32[r7]);
          }
          _MakeDormant(r1);
          break;
        } else if ((r8 | 0) == 2) {
          r4 = HEAP32[r5];
          if ((r4 | 0) == 22) {
            FUNCTION_TABLE[HEAP32[r6]](100154);
          } else {
            FUNCTION_TABLE[r4](100154, HEAP32[r7]);
          }
          _gluTessEndContour(r1);
          break;
        } else {
          break;
        }
      }
    } while (0);
    r4 = HEAP32[r3 >> 2];
    if ((r4 | 0) == (r2 | 0)) {
      break;
    } else {
      r8 = r4;
    }
  }
  return;
}
_GotoState["X"] = 1;
function _gluTessCallback(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r4 = r1 >> 2;
  if ((r2 | 0) == 100104) {
    if ((r3 | 0) == 0) {
      r5 = 36;
    } else {
      r5 = r3;
    }
    HEAP32[r4 + 34] = r5;
    HEAP32[r4 + 30] = (r3 | 0) != 0 & 1;
    return;
  } else if ((r2 | 0) == 100106) {
    if ((r3 | 0) == 0) {
      r6 = 48;
    } else {
      r6 = r3;
    }
    HEAP32[r4 + 740] = r6;
    return;
  } else if ((r2 | 0) == 100100) {
    if ((r3 | 0) == 0) {
      r7 = 28;
    } else {
      r7 = r3;
    }
    HEAP32[r4 + 33] = r7;
    return;
  } else if ((r2 | 0) == 100109) {
    if ((r3 | 0) == 0) {
      r8 = 22;
    } else {
      r8 = r3;
    }
    HEAP32[r4 + 744] = r8;
    return;
  } else if ((r2 | 0) == 100110) {
    if ((r3 | 0) == 0) {
      r9 = 34;
    } else {
      r9 = r3;
    }
    HEAP32[r4 + 741] = r9;
    HEAP32[r4 + 30] = (r3 | 0) != 0 & 1;
    return;
  } else if ((r2 | 0) == 100101) {
    if ((r3 | 0) == 0) {
      r10 = 46;
    } else {
      r10 = r3;
    }
    HEAP32[r4 + 35] = r10;
    return;
  } else if ((r2 | 0) == 100107) {
    if ((r3 | 0) == 0) {
      r11 = 6;
    } else {
      r11 = r3;
    }
    HEAP32[r4 + 742] = r11;
    return;
  } else if ((r2 | 0) == 100102) {
    HEAP32[r4 + 36] = (r3 | 0) == 0 ? 40 : r3;
    return;
  } else if ((r2 | 0) == 100108) {
    if ((r3 | 0) == 0) {
      r12 = 10;
    } else {
      r12 = r3;
    }
    HEAP32[r4 + 743] = r12;
    return;
  } else if ((r2 | 0) == 100105) {
    if ((r3 | 0) == 0) {
      r13 = 4;
    } else {
      r13 = r3;
    }
    HEAP32[r4 + 29] = r13;
    return;
  } else if ((r2 | 0) == 100111) {
    if ((r3 | 0) == 0) {
      r14 = 50;
    } else {
      r14 = r3;
    }
    HEAP32[r4 + 745] = r14;
    return;
  } else if ((r2 | 0) == 100103) {
    if ((r3 | 0) == 0) {
      r15 = 42;
    } else {
      r15 = r3;
    }
    HEAP32[r4 + 3] = r15;
    return;
  } else if ((r2 | 0) == 100112) {
    if ((r3 | 0) == 0) {
      r16 = 24;
    } else {
      r16 = r3;
    }
    HEAP32[r4 + 37] = r16;
    return;
  } else {
    r16 = HEAP32[r4 + 744];
    if ((r16 | 0) == 22) {
      FUNCTION_TABLE[HEAP32[r4 + 3]](100900);
      return;
    } else {
      FUNCTION_TABLE[r16](100900, HEAP32[r4 + 756]);
      return;
    }
  }
}
_gluTessCallback["X"] = 1;
function _gluTessVertex(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14;
  r4 = r1 >> 2;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r6 = r5;
  if ((HEAP32[r4] | 0) != 2) {
    _GotoState(r1, 2);
  }
  do {
    if ((HEAP32[r4 + 38] | 0) != 0) {
      if ((_EmptyCache(r1) | 0) != 0) {
        HEAP32[r4 + 1] = 0;
        break;
      }
      r7 = HEAP32[r4 + 744];
      if ((r7 | 0) == 22) {
        FUNCTION_TABLE[HEAP32[r4 + 3]](100902);
        STACKTOP = r5;
        return;
      } else {
        FUNCTION_TABLE[r7](100902, HEAP32[r4 + 756]);
        STACKTOP = r5;
        return;
      }
    }
  } while (0);
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r2 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r2 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r8 = r7 < -1e+150;
  r9 = r8 ? -1e+150 : r7;
  r7 = r9 > 1e+150;
  r10 = r7 ? 1e+150 : r9;
  r9 = r6 | 0;
  HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r9 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r9 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r10 = r2 + 8 | 0;
  r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r10 = r11 < -1e+150;
  r12 = r10 ? -1e+150 : r11;
  r11 = r12 > 1e+150;
  r13 = r11 ? 1e+150 : r12;
  r12 = r6 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r13, HEAP32[r12 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = r2 + 16 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r12 = r2 < -1e+150;
  r13 = r12 ? -1e+150 : r2;
  r2 = r13 > 1e+150;
  r14 = r2 ? 1e+150 : r13;
  r13 = r6 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r14, HEAP32[r13 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r13 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  do {
    if (r8 | r7 | r10 | r11 | r12 | r2) {
      r13 = HEAP32[r4 + 744];
      if ((r13 | 0) == 22) {
        FUNCTION_TABLE[HEAP32[r4 + 3]](100155);
        break;
      } else {
        FUNCTION_TABLE[r13](100155, HEAP32[r4 + 756]);
        break;
      }
    }
  } while (0);
  do {
    if ((HEAP32[r4 + 2] | 0) == 0) {
      if ((HEAP32[r4 + 39] | 0) < 100) {
        _CacheVertex(r1, r9, r3);
        STACKTOP = r5;
        return;
      }
      if ((_EmptyCache(r1) | 0) != 0) {
        break;
      }
      r2 = HEAP32[r4 + 744];
      if ((r2 | 0) == 22) {
        FUNCTION_TABLE[HEAP32[r4 + 3]](100902);
        STACKTOP = r5;
        return;
      } else {
        FUNCTION_TABLE[r2](100902, HEAP32[r4 + 756]);
        STACKTOP = r5;
        return;
      }
    }
  } while (0);
  if ((_AddVertex(r1, r9, r3) | 0) != 0) {
    STACKTOP = r5;
    return;
  }
  r3 = HEAP32[r4 + 744];
  if ((r3 | 0) == 22) {
    FUNCTION_TABLE[HEAP32[r4 + 3]](100902);
    STACKTOP = r5;
    return;
  } else {
    FUNCTION_TABLE[r3](100902, HEAP32[r4 + 756]);
    STACKTOP = r5;
    return;
  }
}
_gluTessVertex["X"] = 1;
function _EmptyCache(r1) {
  var r2, r3, r4, r5, r6;
  r2 = 0;
  r3 = ___gl_meshNewMesh();
  HEAP32[r1 + 8 >> 2] = r3;
  if ((r3 | 0) == 0) {
    r4 = 0;
    return r4;
  }
  r3 = r1 + 156 | 0;
  r5 = r1 + (HEAP32[r3 >> 2] * 28 & -1) + 160 | 0;
  r6 = r1 + 160 | 0;
  while (1) {
    if (r6 >>> 0 >= r5 >>> 0) {
      break;
    }
    if ((_AddVertex(r1, r6 | 0, HEAP32[r6 + 24 >> 2]) | 0) == 0) {
      r4 = 0;
      r2 = 579;
      break;
    } else {
      r6 = r6 + 28 | 0;
    }
  }
  if (r2 == 579) {
    return r4;
  }
  HEAP32[r3 >> 2] = 0;
  HEAP32[r1 + 152 >> 2] = 0;
  r4 = 1;
  return r4;
}
function _AddVertex(r1, r2, r3) {
  var r4, r5, r6, r7, r8;
  r4 = r1 + 4 | 0;
  r5 = HEAP32[r4 >> 2];
  do {
    if ((r5 | 0) == 0) {
      r6 = ___gl_meshMakeEdge(HEAP32[r1 + 8 >> 2]);
      if ((r6 | 0) == 0) {
        r7 = 0;
        return r7;
      }
      if ((___gl_meshSplice(r6, HEAP32[r6 + 4 >> 2]) | 0) == 0) {
        r7 = 0;
      } else {
        r8 = r6;
        break;
      }
      return r7;
    } else {
      if ((___gl_meshSplitEdge(r5) | 0) == 0) {
        r7 = 0;
        return r7;
      } else {
        r8 = HEAP32[r5 + 12 >> 2];
        break;
      }
    }
  } while (0);
  r5 = (r8 + 16 | 0) >> 2;
  HEAP32[HEAP32[r5] + 12 >> 2] = r3;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r2 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r2 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r1 = HEAP32[r5] + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r3, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r1 = r2 + 8 | 0;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r1 = HEAP32[r5] + 24 | 0;
  HEAPF64[tempDoublePtr >> 3] = r3, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r1 = r2 + 16 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r1 = HEAP32[r5] + 32 | 0;
  HEAPF64[tempDoublePtr >> 3] = r2, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  HEAP32[r8 + 28 >> 2] = 1;
  HEAP32[HEAP32[r8 + 4 >> 2] + 28 >> 2] = -1;
  HEAP32[r4 >> 2] = r8;
  r7 = 1;
  return r7;
}
function _gluTessBeginPolygon(r1, r2) {
  var r3;
  r3 = r1 | 0;
  if ((HEAP32[r3 >> 2] | 0) != 0) {
    _GotoState(r1, 0);
  }
  HEAP32[r3 >> 2] = 1;
  HEAP32[r1 + 156 >> 2] = 0;
  HEAP32[r1 + 152 >> 2] = 0;
  HEAP32[r1 + 8 >> 2] = 0;
  HEAP32[r1 + 3024 >> 2] = r2;
  return;
}
function _gluTessBeginContour(r1) {
  var r2;
  r2 = r1 | 0;
  if ((HEAP32[r2 >> 2] | 0) != 1) {
    _GotoState(r1, 1);
  }
  HEAP32[r2 >> 2] = 2;
  HEAP32[r1 + 4 >> 2] = 0;
  if ((HEAP32[r1 + 156 >> 2] | 0) <= 0) {
    return;
  }
  HEAP32[r1 + 152 >> 2] = 1;
  return;
}
function _gluTessEndContour(r1) {
  var r2;
  r2 = r1 | 0;
  if ((HEAP32[r2 >> 2] | 0) != 2) {
    _GotoState(r1, 2);
  }
  HEAP32[r2 >> 2] = 1;
  return;
}
function ___gl_vertLeq(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = r1 + 40 | 0;
  r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r3 = r2 + 40 | 0;
  r5 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r4 < r5) {
    r6 = 1;
    r7 = r6 & 1;
    return r7;
  }
  if (r4 != r5) {
    r6 = 0;
    r7 = r6 & 1;
    return r7;
  }
  r5 = r1 + 48 | 0;
  r1 = r2 + 48 | 0;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r7 = r6 & 1;
  return r7;
}
function _MakeDormant(r1) {
  var r2, r3;
  r2 = r1 + 8 | 0;
  r3 = HEAP32[r2 >> 2];
  if ((r3 | 0) != 0) {
    ___gl_meshDeleteMesh(r3);
  }
  HEAP32[r1 >> 2] = 0;
  HEAP32[r1 + 4 >> 2] = 0;
  HEAP32[r2 >> 2] = 0;
  return;
}
function ___gl_edgeEval(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = 0;
  r5 = (r1 + 40 | 0) >> 2;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
  r7 = (r2 + 40 | 0) >> 2;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r6 < r8) {
      r4 = 619;
    } else {
      if (r6 != r8) {
        r4 = 622;
        break;
      }
      r9 = r1 + 48 | 0;
      r10 = r2 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 622;
        break;
      } else {
        r4 = 619;
        break;
      }
    }
  } while (0);
  do {
    if (r4 == 619) {
      r10 = r3 + 40 | 0;
      r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r8 < r9) {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
      if (r8 != r9) {
        r4 = 622;
        break;
      }
      r10 = r2 + 48 | 0;
      r14 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 622;
        break;
      } else {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
    }
  } while (0);
  if (r4 == 622) {
    ___assert_func(5243488, 61, 5245252, 5244208);
    r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
    r7 = r3 + 40 | 0;
    r11 = r4;
    r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
    r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  }
  r7 = r11 - r12;
  r12 = r13 - r11;
  r11 = r7 + r12;
  if (r11 <= 0) {
    r15 = 0;
    return r15;
  }
  r13 = r2 + 48 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r7 < r12) {
    r13 = r1 + 48 | 0;
    r5 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r13 = r3 + 48 | 0;
    r15 = r2 - r5 + (r5 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) * (r7 / r11);
    return r15;
  } else {
    r7 = r3 + 48 | 0;
    r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r7 = r1 + 48 | 0;
    r15 = r2 - r3 + (r3 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) * (r12 / r11);
    return r15;
  }
}
___gl_edgeEval["X"] = 1;
function ___gl_edgeSign(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = 0;
  r5 = (r1 + 40 | 0) >> 2;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
  r7 = (r2 + 40 | 0) >> 2;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r6 < r8) {
      r4 = 634;
    } else {
      if (r6 != r8) {
        r4 = 637;
        break;
      }
      r9 = r1 + 48 | 0;
      r10 = r2 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 637;
        break;
      } else {
        r4 = 634;
        break;
      }
    }
  } while (0);
  do {
    if (r4 == 634) {
      r10 = r3 + 40 | 0;
      r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r8 < r9) {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
      if (r8 != r9) {
        r4 = 637;
        break;
      }
      r10 = r2 + 48 | 0;
      r14 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 637;
        break;
      } else {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
    }
  } while (0);
  if (r4 == 637) {
    ___assert_func(5243488, 85, 5245236, 5244208);
    r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
    r7 = r3 + 40 | 0;
    r11 = r4;
    r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
    r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  }
  r7 = r11 - r12;
  r12 = r13 - r11;
  if (r7 + r12 <= 0) {
    r15 = 0;
    return r15;
  }
  r11 = r2 + 48 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r11 = r3 + 48 | 0;
  r3 = r1 + 48 | 0;
  r15 = r7 * (r2 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) + r12 * (r2 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]));
  return r15;
}
___gl_edgeSign["X"] = 1;
function ___gl_transEval(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = 0;
  r5 = (r1 + 48 | 0) >> 2;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
  r7 = (r2 + 48 | 0) >> 2;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r6 < r8) {
      r4 = 646;
    } else {
      if (r6 != r8) {
        r4 = 649;
        break;
      }
      r9 = r1 + 40 | 0;
      r10 = r2 + 40 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 649;
        break;
      } else {
        r4 = 646;
        break;
      }
    }
  } while (0);
  do {
    if (r4 == 646) {
      r10 = r3 + 48 | 0;
      r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r8 < r9) {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
      if (r8 != r9) {
        r4 = 649;
        break;
      }
      r10 = r2 + 40 | 0;
      r14 = r3 + 40 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 649;
        break;
      } else {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
    }
  } while (0);
  if (r4 == 649) {
    ___assert_func(5243488, 116, 5245028, 5243620);
    r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
    r7 = r3 + 48 | 0;
    r11 = r4;
    r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
    r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  }
  r7 = r11 - r12;
  r12 = r13 - r11;
  r11 = r7 + r12;
  if (r11 <= 0) {
    r15 = 0;
    return r15;
  }
  r13 = r2 + 40 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r7 < r12) {
    r13 = r1 + 40 | 0;
    r5 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r13 = r3 + 40 | 0;
    r15 = r2 - r5 + (r5 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) * (r7 / r11);
    return r15;
  } else {
    r7 = r3 + 40 | 0;
    r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r7 = r1 + 40 | 0;
    r15 = r2 - r3 + (r3 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) * (r12 / r11);
    return r15;
  }
}
___gl_transEval["X"] = 1;
function ___gl_transSign(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = 0;
  r5 = (r1 + 48 | 0) >> 2;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
  r7 = (r2 + 48 | 0) >> 2;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r6 < r8) {
      r4 = 661;
    } else {
      if (r6 != r8) {
        r4 = 664;
        break;
      }
      r9 = r1 + 40 | 0;
      r10 = r2 + 40 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 664;
        break;
      } else {
        r4 = 661;
        break;
      }
    }
  } while (0);
  do {
    if (r4 == 661) {
      r10 = r3 + 48 | 0;
      r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r8 < r9) {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
      if (r8 != r9) {
        r4 = 664;
        break;
      }
      r10 = r2 + 40 | 0;
      r14 = r3 + 40 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 664;
        break;
      } else {
        r11 = r8;
        r12 = r6;
        r13 = r9;
        break;
      }
    }
  } while (0);
  if (r4 == 664) {
    ___assert_func(5243488, 140, 5245012, 5243620);
    r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 1], HEAPF64[tempDoublePtr >> 3]);
    r7 = r3 + 48 | 0;
    r11 = r4;
    r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 1], HEAPF64[tempDoublePtr >> 3]);
    r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  }
  r7 = r11 - r12;
  r12 = r13 - r11;
  if (r7 + r12 <= 0) {
    r15 = 0;
    return r15;
  }
  r11 = r2 + 40 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r11 = r3 + 40 | 0;
  r3 = r1 + 40 | 0;
  r15 = r7 * (r2 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) + r12 * (r2 - (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]));
  return r15;
}
___gl_transSign["X"] = 1;
function _gluTessEndPolygon(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54, r55, r56, r57, r58, r59, r60, r61, r62, r63, r64, r65, r66, r67, r68, r69, r70, r71, r72, r73, r74, r75, r76;
  r2 = 0;
  r2 = 2;
  r3 = {};
  r4 = {
    "2": (function(value) {
      r2 = 38;
      r5 = value;
    }),
    dummy: 0
  };
  while (1) try {
    switch (r2) {
     case 2:
      r6 = r1 + 2984 | 0;
      r5 = (tempInt = setjmpId++, r3[tempInt] = 1, setjmpLabels[tempInt] = r2, HEAP32[r6 >> 2] = tempInt, 0);
      r2 = 38;
      break;
     case 38:
      r7 = (r5 | 0) == 0;
      if (r7) {
        r2 = 6;
        break;
      } else {
        r2 = 3;
        break;
      }
     case 3:
      r8 = r1 + 2976 | 0;
      r9 = HEAP32[r8 >> 2];
      r10 = (r9 | 0) == 22;
      if (r10) {
        r2 = 5;
        break;
      } else {
        r2 = 4;
        break;
      }
     case 4:
      r11 = r1 + 3024 | 0;
      r12 = HEAP32[r11 >> 2];
      FUNCTION_TABLE[r9](100902, r12);
      r2 = 37;
      break;
     case 5:
      r13 = r1 + 12 | 0;
      r14 = HEAP32[r13 >> 2];
      FUNCTION_TABLE[r14](100902);
      r2 = 37;
      break;
     case 6:
      r15 = r1 | 0;
      r16 = HEAP32[r15 >> 2];
      r17 = (r16 | 0) == 1;
      if (r17) {
        r2 = 8;
        break;
      } else {
        r2 = 7;
        break;
      }
     case 7:
      _GotoState(r1, 1);
      r2 = 8;
      break;
     case 8:
      HEAP32[r15 >> 2] = 0;
      r18 = r1 + 8 | 0;
      r19 = HEAP32[r18 >> 2];
      r20 = (r19 | 0) == 0;
      if (r20) {
        r2 = 9;
        break;
      } else {
        r2 = 15;
        break;
      }
     case 9:
      r21 = r1 + 120 | 0;
      r22 = HEAP32[r21 >> 2];
      r23 = (r22 | 0) == 0;
      if (r23) {
        r2 = 10;
        break;
      } else {
        r2 = 13;
        break;
      }
     case 10:
      r24 = r1 + 148 | 0;
      r25 = HEAP32[r24 >> 2];
      r26 = (r25 | 0) == 24;
      if (r26) {
        r2 = 11;
        break;
      } else {
        r2 = 13;
        break;
      }
     case 11:
      r27 = ___gl_renderCache(r1);
      r28 = (r27 | 0) == 0;
      if (r28) {
        r2 = 13;
        break;
      } else {
        r2 = 12;
        break;
      }
     case 12:
      r29 = r1 + 3024 | 0;
      HEAP32[r29 >> 2] = 0;
      r2 = 37;
      break;
     case 13:
      r30 = _EmptyCache(r1);
      r31 = (r30 | 0) == 0;
      if (r31) {
        r2 = 14;
        break;
      } else {
        r2 = 15;
        break;
      }
     case 14:
      _longjmp(r6, 1);
     case 15:
      ___gl_projectPolygon(r1);
      r32 = ___gl_computeInterior(r1);
      r33 = (r32 | 0) == 0;
      if (r33) {
        r2 = 16;
        break;
      } else {
        r2 = 17;
        break;
      }
     case 16:
      _longjmp(r6, 1);
     case 17:
      r34 = HEAP32[r18 >> 2];
      r35 = r1 + 100 | 0;
      r36 = HEAP32[r35 >> 2];
      r37 = (r36 | 0) == 0;
      if (r37) {
        r2 = 18;
        break;
      } else {
        r2 = 36;
        break;
      }
     case 18:
      r38 = r1 + 124 | 0;
      r39 = HEAP32[r38 >> 2];
      r40 = (r39 | 0) == 0;
      if (r40) {
        r2 = 20;
        break;
      } else {
        r2 = 19;
        break;
      }
     case 19:
      r41 = ___gl_meshSetWindingNumber(r34);
      r42 = r41;
      r2 = 21;
      break;
     case 20:
      r43 = ___gl_meshTessellateInterior(r34);
      r42 = r43;
      r2 = 21;
      break;
     case 21:
      r44 = (r42 | 0) == 0;
      if (r44) {
        r2 = 22;
        break;
      } else {
        r2 = 23;
        break;
      }
     case 22:
      _longjmp(r6, 1);
     case 23:
      ___gl_meshCheckMesh(r34);
      r45 = r1 + 132 | 0;
      r46 = HEAP32[r45 >> 2];
      r47 = (r46 | 0) == 28;
      if (r47) {
        r2 = 24;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 24:
      r48 = r1 + 144 | 0;
      r49 = HEAP32[r48 >> 2];
      r50 = (r49 | 0) == 40;
      if (r50) {
        r2 = 25;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 25:
      r51 = r1 + 140 | 0;
      r52 = HEAP32[r51 >> 2];
      r53 = (r52 | 0) == 46;
      if (r53) {
        r2 = 26;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 26:
      r54 = r1 + 136 | 0;
      r55 = HEAP32[r54 >> 2];
      r56 = (r55 | 0) == 36;
      if (r56) {
        r2 = 27;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 27:
      r57 = r1 + 2960 | 0;
      r58 = HEAP32[r57 >> 2];
      r59 = (r58 | 0) == 48;
      if (r59) {
        r2 = 28;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 28:
      r60 = r1 + 2972 | 0;
      r61 = HEAP32[r60 >> 2];
      r62 = (r61 | 0) == 10;
      if (r62) {
        r2 = 29;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 29:
      r63 = r1 + 2968 | 0;
      r64 = HEAP32[r63 >> 2];
      r65 = (r64 | 0) == 6;
      if (r65) {
        r2 = 30;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 30:
      r66 = r1 + 2964 | 0;
      r67 = HEAP32[r66 >> 2];
      r68 = (r67 | 0) == 34;
      if (r68) {
        r2 = 34;
        break;
      } else {
        r2 = 31;
        break;
      }
     case 31:
      r69 = HEAP32[r38 >> 2];
      r70 = (r69 | 0) == 0;
      if (r70) {
        r2 = 33;
        break;
      } else {
        r2 = 32;
        break;
      }
     case 32:
      ___gl_renderBoundary(r1, r34);
      r2 = 34;
      break;
     case 33:
      ___gl_renderMesh(r1, r34);
      r2 = 34;
      break;
     case 34:
      r71 = r1 + 148 | 0;
      r72 = HEAP32[r71 >> 2];
      r73 = (r72 | 0) == 24;
      if (r73) {
        r2 = 36;
        break;
      } else {
        r2 = 35;
        break;
      }
     case 35:
      ___gl_meshDiscardExterior(r34);
      r74 = HEAP32[r71 >> 2];
      FUNCTION_TABLE[r74](r34);
      HEAP32[r18 >> 2] = 0;
      r75 = r1 + 3024 | 0;
      HEAP32[r75 >> 2] = 0;
      r2 = 37;
      break;
     case 36:
      ___gl_meshDeleteMesh(r34);
      r76 = r1 + 3024 | 0;
      HEAP32[r76 >> 2] = 0;
      HEAP32[r18 >> 2] = 0;
      r2 = 37;
      break;
     case 37:
      return;
    }
  } catch (e) {
    if (!e.longjmp || !(e.id in r3)) throw e;
    r4[setjmpLabels[e.id]](e.value);
  }
}
_gluTessEndPolygon["X"] = 1;
function _LongAxis(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = r1 + 8 | 0;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r2 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r2 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r3 < 0) {
    r4 = -r3;
  } else {
    r4 = r3;
  }
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r3 < 0) {
    r5 = -r3;
  } else {
    r5 = r3;
  }
  r3 = r4 > r5 & 1;
  r5 = r1 + 16 | 0;
  r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r4 < 0) {
    r6 = -r4;
  } else {
    r6 = r4;
  }
  r4 = (r3 << 3) + r1 | 0;
  r1 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  if (r1 >= 0) {
    r7 = r1;
    r8 = r6 > r7;
    r9 = r8 ? 2 : r3;
    return r9;
  }
  r7 = -r1;
  r8 = r6 > r7;
  r9 = r8 ? 2 : r3;
  return r9;
}
function _CheckOrientation(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r2 = HEAP32[r1 + 8 >> 2];
  r3 = r2 + 60 | 0;
  r4 = 0;
  r5 = r3;
  L876 : while (1) {
    r6 = r5;
    while (1) {
      r7 = HEAP32[r6 >> 2];
      if ((r7 | 0) == (r3 | 0)) {
        break L876;
      }
      r8 = HEAP32[r7 + 8 >> 2];
      if ((HEAP32[r8 + 28 >> 2] | 0) < 1) {
        r6 = r7;
      } else {
        r9 = r8, r10 = r9 >> 2;
        r11 = r4;
        break;
      }
    }
    while (1) {
      r6 = HEAP32[r10 + 4];
      r12 = r6 + 40 | 0;
      r13 = HEAP32[HEAP32[r10 + 1] + 16 >> 2];
      r14 = r13 + 40 | 0;
      r15 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r14 = r6 + 48 | 0;
      r6 = r13 + 48 | 0;
      r13 = r11 + r15 * ((HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]));
      r6 = HEAP32[r10 + 3];
      if ((r6 | 0) == (r8 | 0)) {
        r4 = r13;
        r5 = r7;
        continue L876;
      } else {
        r9 = r6, r10 = r9 >> 2;
        r11 = r13;
      }
    }
  }
  r11 = r2 | 0;
  if (r4 >= 0) {
    return;
  }
  r4 = HEAP32[r2 >> 2];
  L887 : do {
    if ((r4 | 0) != (r11 | 0)) {
      r2 = r4;
      while (1) {
        r9 = (r2 + 48 | 0) >> 2;
        r10 = -(HEAP32[tempDoublePtr >> 2] = HEAP32[r9], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 1], HEAPF64[tempDoublePtr >> 3]);
        HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r9] = HEAP32[tempDoublePtr >> 2], HEAP32[r9 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
        r9 = HEAP32[r2 >> 2];
        if ((r9 | 0) == (r11 | 0)) {
          break L887;
        } else {
          r2 = r9;
        }
      }
    }
  } while (0);
  r11 = (r1 + 64 | 0) >> 2;
  r4 = -(HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r4, HEAP32[r11] = HEAP32[tempDoublePtr >> 2], HEAP32[r11 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r11 = (r1 + 72 | 0) >> 2;
  r4 = -(HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r4, HEAP32[r11] = HEAP32[tempDoublePtr >> 2], HEAP32[r11 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r11 = (r1 + 80 | 0) >> 2;
  r1 = -(HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r1, HEAP32[r11] = HEAP32[tempDoublePtr >> 2], HEAP32[r11 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  return;
}
_CheckOrientation["X"] = 1;
function ___gl_edgeIntersect(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41;
  r6 = 0;
  r7 = r1 + 40 | 0;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r7 = r2 + 40 | 0;
  r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r8 < r9) {
      r10 = r1;
      r11 = r2;
    } else {
      if (r8 == r9) {
        r7 = r1 + 48 | 0;
        r12 = r2 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r10 = r1;
          r11 = r2;
          break;
        }
      }
      r10 = r2;
      r11 = r1;
    }
  } while (0);
  r1 = r3 + 40 | 0;
  r2 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r1 = r4 + 40 | 0;
  r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r2 < r9) {
      r13 = r3;
      r14 = r4;
      r15 = r2;
    } else {
      if (r2 == r9) {
        r1 = r3 + 48 | 0;
        r8 = r4 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r13 = r3;
          r14 = r4;
          r15 = r2;
          break;
        }
      }
      r13 = r4;
      r14 = r3;
      r15 = r9;
    }
  } while (0);
  r9 = r10 + 40 | 0;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r3 < r15) {
      r16 = r10;
      r17 = r11;
      r18 = r13;
      r19 = r14;
      r20 = r15;
    } else {
      if (r3 == r15) {
        r9 = r10 + 48 | 0;
        r4 = r13 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r16 = r10;
          r17 = r11;
          r18 = r13;
          r19 = r14;
          r20 = r15;
          break;
        }
      }
      r16 = r13;
      r17 = r14;
      r18 = r10;
      r19 = r11;
      r20 = r3;
    }
  } while (0);
  r3 = (r18 + 40 | 0) >> 2;
  r11 = (r17 + 40 | 0) >> 2;
  r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r20 < r10) {
      r6 = 709;
    } else {
      if (r20 == r10) {
        r14 = r18 + 48 | 0;
        r13 = r17 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r6 = 709;
          break;
        }
      }
      r13 = (r20 + r10) * .5;
      r14 = r5 + 40 | 0;
      HEAPF64[tempDoublePtr >> 3] = r13, HEAP32[r14 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
      break;
    }
  } while (0);
  L916 : do {
    if (r6 == 709) {
      r20 = (r19 + 40 | 0) >> 2;
      r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
      do {
        if (r10 >= r14) {
          if (r10 == r14) {
            r13 = r17 + 48 | 0;
            r15 = r19 + 48 | 0;
            if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
              break;
            }
          }
          r15 = ___gl_edgeSign(r16, r18, r17);
          r13 = ___gl_edgeSign(r16, r19, r17);
          if (r15 - r13 < 0) {
            r21 = -r15;
            r22 = r13;
          } else {
            r21 = r15;
            r22 = -r13;
          }
          r13 = r21 < 0 ? 0 : r21;
          r15 = r22 < 0 ? 0 : r22;
          do {
            if (r13 > r15) {
              r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
              r23 = r4 + ((HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]) - r4) * (r15 / (r15 + r13));
            } else {
              r4 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]);
              r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
              if (r15 == 0) {
                r23 = (r4 + r9) * .5;
                break;
              } else {
                r23 = r4 + (r9 - r4) * (r13 / (r15 + r13));
                break;
              }
            }
          } while (0);
          r13 = r5 + 40 | 0;
          HEAPF64[tempDoublePtr >> 3] = r23, HEAP32[r13 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r13 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          break L916;
        }
      } while (0);
      r20 = ___gl_edgeEval(r16, r18, r17);
      r14 = ___gl_edgeEval(r18, r17, r19);
      if (r20 + r14 < 0) {
        r24 = -r20;
        r25 = -r14;
      } else {
        r24 = r20;
        r25 = r14;
      }
      r14 = r24 < 0 ? 0 : r24;
      r20 = r25 < 0 ? 0 : r25;
      do {
        if (r14 > r20) {
          r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
          r26 = r13 + ((HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]) - r13) * (r20 / (r20 + r14));
        } else {
          r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]);
          r15 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3]);
          if (r20 == 0) {
            r26 = (r13 + r15) * .5;
            break;
          } else {
            r26 = r13 + (r15 - r13) * (r14 / (r20 + r14));
            break;
          }
        }
      } while (0);
      r14 = r5 + 40 | 0;
      HEAPF64[tempDoublePtr >> 3] = r26, HEAP32[r14 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
    }
  } while (0);
  r26 = r16 + 48 | 0;
  r25 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r26 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r26 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r26 = r17 + 48 | 0;
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r26 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r26 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r25 < r24) {
      r27 = r16;
      r28 = r17;
    } else {
      if (r25 == r24) {
        r26 = r16 + 40 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r26 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r26 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r11], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 1], HEAPF64[tempDoublePtr >> 3])) {
          r27 = r16;
          r28 = r17;
          break;
        }
      }
      r27 = r17;
      r28 = r16;
    }
  } while (0);
  r16 = r18 + 48 | 0;
  r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r16 = r19 + 48 | 0;
  r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r17 < r11) {
      r29 = r18;
      r30 = r19;
      r31 = r17;
    } else {
      if (r17 == r11) {
        r16 = r19 + 40 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r29 = r18;
          r30 = r19;
          r31 = r17;
          break;
        }
      }
      r29 = r19;
      r30 = r18;
      r31 = r11;
    }
  } while (0);
  r11 = r27 + 48 | 0;
  r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r18 < r31) {
      r32 = r27;
      r33 = r28;
      r34 = r29;
      r35 = r30;
    } else {
      if (r18 == r31) {
        r11 = r27 + 40 | 0;
        r19 = r29 + 40 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r32 = r27;
          r33 = r28;
          r34 = r29;
          r35 = r30;
          break;
        }
      }
      r32 = r29;
      r33 = r30;
      r34 = r27;
      r35 = r28;
    }
  } while (0);
  r28 = (r34 + 48 | 0) >> 2;
  r27 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r28], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r28 + 1], HEAPF64[tempDoublePtr >> 3]);
  r30 = (r33 + 48 | 0) >> 2;
  r29 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r27 >= r29) {
      if (r27 == r29) {
        r31 = r34 + 40 | 0;
        r18 = r33 + 40 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r31 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r18 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      r18 = (r27 + r29) * .5;
      r31 = r5 + 48 | 0;
      HEAPF64[tempDoublePtr >> 3] = r18, HEAP32[r31 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r31 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
      return;
    }
  } while (0);
  r27 = (r35 + 48 | 0) >> 2;
  r31 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r29 >= r31) {
      if (r29 == r31) {
        r18 = r33 + 40 | 0;
        r19 = r35 + 40 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r18 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      r19 = ___gl_transSign(r32, r34, r33);
      r18 = ___gl_transSign(r32, r35, r33);
      if (r19 - r18 < 0) {
        r36 = -r19;
        r37 = r18;
      } else {
        r36 = r19;
        r37 = -r18;
      }
      r18 = r36 < 0 ? 0 : r36;
      r19 = r37 < 0 ? 0 : r37;
      do {
        if (r18 > r19) {
          r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3]);
          r38 = r11 + ((HEAP32[tempDoublePtr >> 2] = HEAP32[r28], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r28 + 1], HEAPF64[tempDoublePtr >> 3]) - r11) * (r19 / (r19 + r18));
        } else {
          r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r28], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r28 + 1], HEAPF64[tempDoublePtr >> 3]);
          r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3]);
          if (r19 == 0) {
            r38 = (r11 + r17) * .5;
            break;
          } else {
            r38 = r11 + (r17 - r11) * (r18 / (r19 + r18));
            break;
          }
        }
      } while (0);
      r18 = r5 + 48 | 0;
      HEAPF64[tempDoublePtr >> 3] = r38, HEAP32[r18 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r18 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
      return;
    }
  } while (0);
  r38 = ___gl_transEval(r32, r34, r33);
  r32 = ___gl_transEval(r34, r33, r35);
  if (r38 + r32 < 0) {
    r39 = -r38;
    r40 = -r32;
  } else {
    r39 = r38;
    r40 = r32;
  }
  r32 = r39 < 0 ? 0 : r39;
  r39 = r40 < 0 ? 0 : r40;
  do {
    if (r32 > r39) {
      r40 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
      r41 = r40 + ((HEAP32[tempDoublePtr >> 2] = HEAP32[r28], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r28 + 1], HEAPF64[tempDoublePtr >> 3]) - r40) * (r39 / (r39 + r32));
    } else {
      r40 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r28], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r28 + 1], HEAPF64[tempDoublePtr >> 3]);
      r38 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
      if (r39 == 0) {
        r41 = (r40 + r38) * .5;
        break;
      } else {
        r41 = r40 + (r38 - r40) * (r32 / (r39 + r32));
        break;
      }
    }
  } while (0);
  r32 = r5 + 48 | 0;
  HEAPF64[tempDoublePtr >> 3] = r41, HEAP32[r32 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r32 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  return;
}
___gl_edgeIntersect["X"] = 1;
function ___gl_projectPolygon(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r3 = r2;
  r4 = HEAP32[r1 + 8 >> 2];
  r5 = r4 | 0;
  r6 = r1 + 16 | 0;
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r6 = r3 | 0;
  HEAPF64[tempDoublePtr >> 3] = r7, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r8 = r1 + 24 | 0;
  r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r8 = r3 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r9, HEAP32[r8 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r8 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r8 = r1 + 32 | 0;
  r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r8 = r3 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r8 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r8 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  do {
    if (r7 == 0) {
      if (!(r9 == 0 & r10 == 0)) {
        r11 = 0;
        break;
      }
      _ComputeNormal40(r4, r6);
      r11 = 1;
    } else {
      r11 = 0;
    }
  } while (0);
  r10 = r1 + 40 | 0;
  r9 = r1 + 64 | 0;
  r7 = _LongAxis(r6);
  r6 = (r7 << 3) + r1 + 40 | 0;
  HEAPF64[tempDoublePtr >> 3] = 0, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r6 = (r7 + 1 | 0) % 3;
  r8 = (r6 << 3) + r1 + 40 | 0;
  HEAPF64[tempDoublePtr >> 3] = 1, HEAP32[r8 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r8 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r8 = (r7 + 2 | 0) % 3;
  r12 = (r8 << 3) + r1 + 40 | 0;
  HEAPF64[tempDoublePtr >> 3] = 0, HEAP32[r12 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = (r7 << 3) + r1 + 64 | 0;
  HEAPF64[tempDoublePtr >> 3] = 0, HEAP32[r12 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = (r7 << 3) + r3 | 0;
  r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > 0;
  r12 = r3 ? 0 : 0;
  r7 = (r6 << 3) + r1 + 64 | 0;
  HEAPF64[tempDoublePtr >> 3] = r12, HEAP32[r7 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r7 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r7 = r3 ? 1 : -1;
  r3 = (r8 << 3) + r1 + 64 | 0;
  HEAPF64[tempDoublePtr >> 3] = r7, HEAP32[r3 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r3 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r3 = HEAP32[r4 >> 2];
  L1003 : do {
    if ((r3 | 0) != (r5 | 0)) {
      r4 = r1 + 48 | 0;
      r7 = r1 + 56 | 0;
      r8 = r1 + 72 | 0;
      r12 = r1 + 80 | 0;
      r6 = r3;
      while (1) {
        r13 = r6 + 16 | 0;
        r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r13 = r14 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r15 = r6 + 24 | 0;
        r16 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r15 = r13 + r16 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r13 = r6 + 32 | 0;
        r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r13 = r15 + r17 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r15 = r6 + 40 | 0;
        HEAPF64[tempDoublePtr >> 3] = r13, HEAP32[r15 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r15 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
        r15 = r14 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + r16 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + r17 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r17 = r6 + 48 | 0;
        HEAPF64[tempDoublePtr >> 3] = r15, HEAP32[r17 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r17 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
        r17 = HEAP32[r6 >> 2];
        if ((r17 | 0) == (r5 | 0)) {
          break L1003;
        } else {
          r6 = r17;
        }
      }
    }
  } while (0);
  if ((r11 | 0) == 0) {
    STACKTOP = r2;
    return;
  }
  _CheckOrientation(r1);
  STACKTOP = r2;
  return;
}
___gl_projectPolygon["X"] = 1;
function _ComputeNormal40(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 96 | 0;
  r4 = r3;
  r5 = r3 + 24;
  r6 = r3 + 48;
  r7 = r3 + 72;
  r8 = r3 + 84;
  r9 = r1 | 0;
  r10 = (r4 + 16 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = -2e+150, HEAP32[r10] = HEAP32[tempDoublePtr >> 2], HEAP32[r10 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r11 = (r4 + 8 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = -2e+150, HEAP32[r11] = HEAP32[tempDoublePtr >> 2], HEAP32[r11 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r12 = (r4 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = -2e+150, HEAP32[r12] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r13 = (r5 + 16 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = 2e+150, HEAP32[r13] = HEAP32[tempDoublePtr >> 2], HEAP32[r13 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r14 = (r5 + 8 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = 2e+150, HEAP32[r14] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r15 = (r5 | 0) >> 2;
  HEAPF64[tempDoublePtr >> 3] = 2e+150, HEAP32[r15] = HEAP32[tempDoublePtr >> 2], HEAP32[r15 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r16 = HEAP32[r1 >> 2];
  r1 = (r16 | 0) == (r9 | 0);
  L1013 : do {
    if (r1) {
      r17 = -2e+150;
      r18 = 2e+150;
      r19 = -2e+150;
      r20 = 2e+150;
      r21 = -2e+150;
      r22 = 2e+150;
    } else {
      r23 = r8 | 0;
      r24 = r7 | 0;
      r25 = r8 + 4 | 0;
      r26 = r7 + 4 | 0;
      r27 = r8 + 8 | 0;
      r28 = r7 + 8 | 0;
      r29 = r16;
      r30 = 2e+150;
      r31 = -2e+150;
      r32 = 2e+150;
      r33 = -2e+150;
      r34 = 2e+150;
      r35 = -2e+150;
      while (1) {
        r36 = r29 + 16 | 0;
        r37 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        if (r37 < r30) {
          HEAPF64[tempDoublePtr >> 3] = r37, HEAP32[r15] = HEAP32[tempDoublePtr >> 2], HEAP32[r15 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r23 >> 2] = r29;
          r38 = r37;
        } else {
          r38 = r30;
        }
        if (r37 > r31) {
          HEAPF64[tempDoublePtr >> 3] = r37, HEAP32[r12] = HEAP32[tempDoublePtr >> 2], HEAP32[r12 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r24 >> 2] = r29;
          r39 = r37;
        } else {
          r39 = r31;
        }
        r37 = r29 + 24 | 0;
        r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r37 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r37 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        if (r36 < r32) {
          HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r14] = HEAP32[tempDoublePtr >> 2], HEAP32[r14 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r25 >> 2] = r29;
          r40 = r36;
        } else {
          r40 = r32;
        }
        if (r36 > r33) {
          HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r11] = HEAP32[tempDoublePtr >> 2], HEAP32[r11 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r26 >> 2] = r29;
          r41 = r36;
        } else {
          r41 = r33;
        }
        r36 = r29 + 32 | 0;
        r37 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        if (r37 < r34) {
          HEAPF64[tempDoublePtr >> 3] = r37, HEAP32[r13] = HEAP32[tempDoublePtr >> 2], HEAP32[r13 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r27 >> 2] = r29;
          r42 = r37;
        } else {
          r42 = r34;
        }
        if (r37 > r35) {
          HEAPF64[tempDoublePtr >> 3] = r37, HEAP32[r10] = HEAP32[tempDoublePtr >> 2], HEAP32[r10 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAP32[r28 >> 2] = r29;
          r43 = r37;
        } else {
          r43 = r35;
        }
        r37 = HEAP32[r29 >> 2];
        if ((r37 | 0) == (r9 | 0)) {
          r17 = r41;
          r18 = r40;
          r19 = r39;
          r20 = r38;
          r21 = r43;
          r22 = r42;
          break L1013;
        } else {
          r29 = r37;
          r30 = r38;
          r31 = r39;
          r32 = r40;
          r33 = r41;
          r34 = r42;
          r35 = r43;
        }
      }
    }
  } while (0);
  r43 = r17 - r18 > r19 - r20 & 1;
  r20 = (r43 << 3) + r4 | 0;
  r19 = (r43 << 3) + r5 | 0;
  r18 = r21 - r22 > (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) ? 2 : r43;
  r43 = (r18 << 3) + r5 | 0;
  r5 = (r18 << 3) + r4 | 0;
  if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r43 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r43 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) >= (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
    r5 = r2 + 16 | 0;
    r43 = r2 >> 2;
    HEAP32[r43] = 0;
    HEAP32[r43 + 1] = 0;
    HEAP32[r43 + 2] = 0;
    HEAP32[r43 + 3] = 0;
    HEAPF64[tempDoublePtr >> 3] = 1, HEAP32[r5 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r5 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
    STACKTOP = r3;
    return;
  }
  r5 = HEAP32[r8 + (r18 << 2) >> 2];
  r8 = HEAP32[r7 + (r18 << 2) >> 2];
  r18 = r5 + 16 | 0;
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r18 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r18 = (r8 + 16 | 0) >> 2;
  r43 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r18], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 1], HEAPF64[tempDoublePtr >> 3]);
  r4 = r7 - r43;
  r7 = r6 | 0;
  HEAPF64[tempDoublePtr >> 3] = r4, HEAP32[r7 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r7 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r19 = r5 + 24 | 0;
  r20 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r19 = (r8 + 24 | 0) >> 2;
  r22 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]);
  r21 = r20 - r22;
  r20 = r6 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r21, HEAP32[r20 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r20 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r20 = r5 + 32 | 0;
  r5 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r20 = (r8 + 32 | 0) >> 2;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
  r17 = r5 - r8;
  r5 = r6 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r17, HEAP32[r5 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r5 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  do {
    if (!r1) {
      r5 = r2 + 8 | 0;
      r6 = r2 + 16 | 0;
      r42 = 0;
      r41 = r16;
      r40 = r43;
      r39 = r22;
      r38 = r8;
      while (1) {
        r10 = r41 + 16 | 0;
        r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r40;
        r10 = r41 + 24 | 0;
        r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r39;
        r10 = r41 + 32 | 0;
        r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r38;
        r10 = r21 * r14 - r11 * r17;
        r12 = r13 * r17 - r14 * r4;
        r14 = r11 * r4 - r13 * r21;
        r13 = r14 * r14 + r10 * r10 + r12 * r12;
        if (r13 > r42) {
          HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r2 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r2 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAPF64[tempDoublePtr >> 3] = r12, HEAP32[r5 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r5 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          HEAPF64[tempDoublePtr >> 3] = r14, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          r44 = r13;
        } else {
          r44 = r42;
        }
        r13 = HEAP32[r41 >> 2];
        if ((r13 | 0) == (r9 | 0)) {
          break;
        }
        r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r18], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 1], HEAPF64[tempDoublePtr >> 3]);
        r42 = r44;
        r41 = r13;
        r40 = r14;
        r39 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]);
        r38 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
      }
      if (r44 <= 0) {
        break;
      }
      STACKTOP = r3;
      return;
    }
  } while (0);
  r44 = r2 >> 2;
  HEAP32[r44] = 0;
  HEAP32[r44 + 1] = 0;
  HEAP32[r44 + 2] = 0;
  HEAP32[r44 + 3] = 0;
  HEAP32[r44 + 4] = 0;
  HEAP32[r44 + 5] = 0;
  r44 = (_LongAxis(r7) << 3) + r2 | 0;
  HEAPF64[tempDoublePtr >> 3] = 1, HEAP32[r44 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r44 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  STACKTOP = r3;
  return;
}
_ComputeNormal40["X"] = 1;
function _FloatUp(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = HEAP32[r1 + (r3 << 2) >> 2];
  r5 = r3 >> 1;
  L1053 : do {
    if ((r5 | 0) == 0) {
      r6 = r3;
    } else {
      r7 = (r4 << 3) + r2 | 0;
      r8 = r3;
      r9 = r5;
      while (1) {
        r10 = HEAP32[r1 + (r9 << 2) >> 2];
        r11 = HEAP32[r2 + (r10 << 3) >> 2];
        r12 = r11 + 40 | 0;
        r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r12 = HEAP32[r7 >> 2];
        r14 = r12 + 40 | 0;
        r15 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        if (r13 < r15) {
          r6 = r8;
          break L1053;
        }
        if (r13 == r15) {
          r15 = r11 + 48 | 0;
          r11 = r12 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            r6 = r8;
            break L1053;
          }
        }
        HEAP32[r1 + (r8 << 2) >> 2] = r10;
        HEAP32[r2 + (r10 << 3) + 4 >> 2] = r8;
        r10 = r9 >> 1;
        if ((r10 | 0) == 0) {
          r6 = r9;
          break L1053;
        } else {
          r8 = r9;
          r9 = r10;
        }
      }
    }
  } while (0);
  HEAP32[r1 + (r6 << 2) >> 2] = r4;
  HEAP32[r2 + (r4 << 3) + 4 >> 2] = r6;
  return;
}
function ___gl_pqHeapNewPriorityQ() {
  var r1, r2, r3, r4, r5, r6;
  r1 = _malloc(28), r2 = r1 >> 2;
  if ((r1 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  HEAP32[r2 + 2] = 0;
  HEAP32[r2 + 3] = 32;
  r4 = _malloc(132);
  r5 = r1 >> 2;
  HEAP32[r5] = r4;
  if ((r4 | 0) == 0) {
    _free(r1);
    r3 = 0;
    return r3;
  }
  r4 = _malloc(264);
  r6 = r1 + 4 | 0;
  HEAP32[r6 >> 2] = r4;
  if ((r4 | 0) == 0) {
    _free(HEAP32[r5]);
    _free(r1);
    r3 = 0;
    return r3;
  } else {
    HEAP32[r2 + 5] = 0;
    HEAP32[r2 + 4] = 0;
    HEAP32[r2 + 6] = 26;
    HEAP32[HEAP32[r5] + 4 >> 2] = 1;
    HEAP32[HEAP32[r6 >> 2] + 8 >> 2] = 0;
    r3 = r1;
    return r3;
  }
}
function ___gl_pqHeapDeletePriorityQ(r1) {
  _free(HEAP32[r1 + 4 >> 2]);
  _free(HEAP32[r1 >> 2]);
  _free(r1);
  return;
}
function ___gl_pqHeapInit(r1) {
  var r2, r3, r4;
  r2 = HEAP32[r1 + 8 >> 2];
  L1077 : do {
    if ((r2 | 0) > 0) {
      r3 = r2;
      while (1) {
        _FloatDown(r1, r3);
        r4 = r3 - 1 | 0;
        if ((r4 | 0) > 0) {
          r3 = r4;
        } else {
          break L1077;
        }
      }
    }
  } while (0);
  HEAP32[r1 + 20 >> 2] = 1;
  return;
}
function _FloatDown(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20;
  r3 = 0;
  r4 = HEAP32[r1 >> 2], r5 = r4 >> 2;
  r6 = HEAP32[r1 + 4 >> 2], r7 = r6 >> 2;
  r8 = HEAP32[(r2 << 2 >> 2) + r5];
  r9 = (r8 << 3) + r6 | 0;
  r10 = r1 + 8 | 0;
  r11 = r1 + 12 | 0;
  r1 = r2;
  while (1) {
    r2 = r1 << 1;
    r12 = HEAP32[r10 >> 2];
    do {
      if ((r2 | 0) < (r12 | 0)) {
        r13 = r2 | 1;
        r14 = HEAP32[(HEAP32[(r13 << 2 >> 2) + r5] << 3 >> 2) + r7];
        r15 = r14 + 40 | 0;
        r16 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r15 = HEAP32[(HEAP32[(r2 << 2 >> 2) + r5] << 3 >> 2) + r7];
        r17 = r15 + 40 | 0;
        r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r17 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r17 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        if (r16 >= r18) {
          if (r16 != r18) {
            r19 = r2;
            break;
          }
          r18 = r14 + 48 | 0;
          r14 = r15 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r18 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            r19 = r2;
            break;
          }
        }
        r19 = r13;
      } else {
        r19 = r2;
      }
    } while (0);
    if ((r19 | 0) > (HEAP32[r11 >> 2] | 0)) {
      ___assert_func(5243408, 112, 5245372, 5242988);
      r20 = HEAP32[r10 >> 2];
    } else {
      r20 = r12;
    }
    r2 = HEAP32[(r19 << 2 >> 2) + r5];
    if ((r19 | 0) > (r20 | 0)) {
      r3 = 843;
      break;
    }
    r13 = HEAP32[r9 >> 2];
    r14 = r13 + 40 | 0;
    r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r14 = HEAP32[(r2 << 3 >> 2) + r7];
    r15 = r14 + 40 | 0;
    r16 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    if (r18 < r16) {
      r3 = 844;
      break;
    }
    if (r18 == r16) {
      r16 = r13 + 48 | 0;
      r13 = r14 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r3 = 845;
        break;
      }
    }
    HEAP32[(r1 << 2 >> 2) + r5] = r2;
    HEAP32[((r2 << 3) + 4 >> 2) + r7] = r1;
    r1 = r19;
  }
  if (r3 == 844) {
    r19 = (r1 << 2) + r4 | 0, r7 = r19 >> 2;
    HEAP32[r7] = r8;
    r5 = (r8 << 3) + r6 + 4 | 0, r9 = r5 >> 2;
    HEAP32[r9] = r1;
    return;
  } else if (r3 == 845) {
    r19 = (r1 << 2) + r4 | 0, r7 = r19 >> 2;
    HEAP32[r7] = r8;
    r5 = (r8 << 3) + r6 + 4 | 0, r9 = r5 >> 2;
    HEAP32[r9] = r1;
    return;
  } else if (r3 == 843) {
    r19 = (r1 << 2) + r4 | 0, r7 = r19 >> 2;
    HEAP32[r7] = r8;
    r5 = (r8 << 3) + r6 + 4 | 0, r9 = r5 >> 2;
    HEAP32[r9] = r1;
    return;
  }
}
_FloatDown["X"] = 1;
function ___gl_pqHeapInsert(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r3 = r1 + 8 | 0;
  r4 = HEAP32[r3 >> 2] + 1 | 0;
  HEAP32[r3 >> 2] = r4;
  r3 = (r1 + 12 | 0) >> 2;
  r5 = HEAP32[r3];
  do {
    if ((r4 << 1 | 0) > (r5 | 0)) {
      r6 = (r1 | 0) >> 2;
      r7 = HEAP32[r6];
      r8 = r1 + 4 | 0, r9 = r8 >> 2;
      r10 = HEAP32[r9];
      HEAP32[r3] = r5 << 1;
      r11 = _realloc(r7, r5 << 3 | 4);
      HEAP32[r6] = r11;
      if ((r11 | 0) == 0) {
        HEAP32[r6] = r7;
        r12 = 2147483647;
        return r12;
      }
      r7 = _realloc(HEAP32[r9], (HEAP32[r3] << 3) + 8 | 0);
      HEAP32[r9] = r7;
      if ((r7 | 0) != 0) {
        r13 = r8, r14 = r13 >> 2;
        break;
      }
      HEAP32[r9] = r10;
      r12 = 2147483647;
      return r12;
    } else {
      r13 = r1 + 4 | 0, r14 = r13 >> 2;
    }
  } while (0);
  r13 = r1 + 16 | 0;
  r3 = HEAP32[r13 >> 2];
  if ((r3 | 0) == 0) {
    r15 = r4;
  } else {
    HEAP32[r13 >> 2] = HEAP32[HEAP32[r14] + (r3 << 3) + 4 >> 2];
    r15 = r3;
  }
  r3 = r1 | 0;
  HEAP32[HEAP32[r3 >> 2] + (r4 << 2) >> 2] = r15;
  HEAP32[HEAP32[r14] + (r15 << 3) + 4 >> 2] = r4;
  HEAP32[HEAP32[r14] + (r15 << 3) >> 2] = r2;
  if ((HEAP32[r1 + 20 >> 2] | 0) != 0) {
    _FloatUp(HEAP32[r3 >> 2], HEAP32[r14], r4);
  }
  if ((r15 | 0) != 2147483647) {
    r12 = r15;
    return r12;
  }
  ___assert_func(5243408, 207, 5245144, 5243992);
  r12 = 2147483647;
  return r12;
}
___gl_pqHeapInsert["X"] = 1;
function ___gl_pqHeapExtractMin(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10;
  r2 = HEAP32[r1 >> 2];
  r3 = HEAP32[r1 + 4 >> 2];
  r4 = r2 + 4 | 0;
  r5 = HEAP32[r4 >> 2];
  r6 = (r5 << 3) + r3 | 0;
  r7 = HEAP32[r6 >> 2];
  r8 = (r1 + 8 | 0) >> 2;
  r9 = HEAP32[r8];
  if ((r9 | 0) <= 0) {
    return r7;
  }
  r10 = HEAP32[r2 + (r9 << 2) >> 2];
  HEAP32[r4 >> 2] = r10;
  HEAP32[r3 + (r10 << 3) + 4 >> 2] = 1;
  HEAP32[r6 >> 2] = 0;
  r6 = r1 + 16 | 0;
  HEAP32[r3 + (r5 << 3) + 4 >> 2] = HEAP32[r6 >> 2];
  HEAP32[r6 >> 2] = r5;
  r5 = HEAP32[r8] - 1 | 0;
  HEAP32[r8] = r5;
  if ((r5 | 0) <= 0) {
    return r7;
  }
  _FloatDown(r1, 1);
  return r7;
}
function ___gl_pqHeapDelete(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20;
  r3 = 0;
  r4 = r1 | 0;
  r5 = HEAP32[r4 >> 2];
  r6 = r1 + 4 | 0;
  r7 = HEAP32[r6 >> 2], r8 = r7 >> 2;
  do {
    if ((r2 | 0) > 0) {
      if ((HEAP32[r1 + 12 >> 2] | 0) < (r2 | 0)) {
        r3 = 873;
        break;
      }
      if ((HEAP32[(r2 << 3 >> 2) + r8] | 0) == 0) {
        r3 = 873;
        break;
      } else {
        break;
      }
    } else {
      r3 = 873;
    }
  } while (0);
  if (r3 == 873) {
    ___assert_func(5243408, 241, 5245164, 5243564);
  }
  r3 = ((r2 << 3) + r7 + 4 | 0) >> 2;
  r9 = HEAP32[r3];
  r10 = (r1 + 8 | 0) >> 2;
  r11 = HEAP32[r5 + (HEAP32[r10] << 2) >> 2];
  r12 = (r9 << 2) + r5 | 0;
  HEAP32[r12 >> 2] = r11;
  HEAP32[((r11 << 3) + 4 >> 2) + r8] = r9;
  r11 = HEAP32[r10] - 1 | 0;
  HEAP32[r10] = r11;
  if ((r9 | 0) > (r11 | 0)) {
    r13 = (r2 << 3) + r7 | 0, r14 = r13 >> 2;
    HEAP32[r14] = 0;
    r15 = r1 + 16 | 0, r16 = r15 >> 2;
    r17 = HEAP32[r16];
    HEAP32[r3] = r17;
    HEAP32[r16] = r2;
    return;
  }
  do {
    if ((r9 | 0) >= 2) {
      r11 = HEAP32[(HEAP32[r5 + (r9 >> 1 << 2) >> 2] << 3 >> 2) + r8];
      r10 = r11 + 40 | 0;
      r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r10 = HEAP32[(HEAP32[r12 >> 2] << 3 >> 2) + r8];
      r19 = r10 + 40 | 0;
      r20 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r18 < r20) {
        break;
      }
      if (r18 == r20) {
        r20 = r11 + 48 | 0;
        r11 = r10 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      _FloatUp(HEAP32[r4 >> 2], HEAP32[r6 >> 2], r9);
      r13 = (r2 << 3) + r7 | 0, r14 = r13 >> 2;
      HEAP32[r14] = 0;
      r15 = r1 + 16 | 0, r16 = r15 >> 2;
      r17 = HEAP32[r16];
      HEAP32[r3] = r17;
      HEAP32[r16] = r2;
      return;
    }
  } while (0);
  _FloatDown(r1, r9);
  r13 = (r2 << 3) + r7 | 0, r14 = r13 >> 2;
  HEAP32[r14] = 0;
  r15 = r1 + 16 | 0, r16 = r15 >> 2;
  r17 = HEAP32[r16];
  HEAP32[r3] = r17;
  HEAP32[r16] = r2;
  return;
}
___gl_pqHeapDelete["X"] = 1;
function ___gl_pqSortNewPriorityQ() {
  var r1, r2, r3, r4, r5;
  r1 = _malloc(28), r2 = r1 >> 2;
  if ((r1 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r4 = ___gl_pqHeapNewPriorityQ();
  r5 = r1;
  HEAP32[r5 >> 2] = r4;
  if ((r4 | 0) == 0) {
    _free(r1);
    r3 = 0;
    return r3;
  }
  r4 = _malloc(128);
  HEAP32[r2 + 1] = r4;
  if ((r4 | 0) == 0) {
    ___gl_pqHeapDeletePriorityQ(HEAP32[r5 >> 2]);
    _free(r1);
    r3 = 0;
    return r3;
  } else {
    HEAP32[r2 + 3] = 0;
    HEAP32[r2 + 4] = 32;
    HEAP32[r2 + 5] = 0;
    HEAP32[r2 + 6] = 26;
    r3 = r1;
    return r3;
  }
}
function ___gl_pqSortDeletePriorityQ(r1) {
  var r2, r3;
  if ((r1 | 0) == 0) {
    ___assert_func(5243476, 78, 5245096, 5243396);
  }
  r2 = HEAP32[r1 >> 2];
  if ((r2 | 0) != 0) {
    ___gl_pqHeapDeletePriorityQ(r2);
  }
  r2 = HEAP32[r1 + 8 >> 2];
  if ((r2 | 0) != 0) {
    _free(r2);
  }
  r2 = HEAP32[r1 + 4 >> 2];
  if ((r2 | 0) == 0) {
    r3 = r1;
    _free(r3);
    return;
  }
  _free(r2);
  r3 = r1;
  _free(r3);
  return;
}
function ___gl_pqSortInit(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54, r55, r56;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 400 | 0;
  r3 = r2;
  r4 = r3 | 0;
  r5 = (r1 + 12 | 0) >> 2;
  r6 = _malloc((HEAP32[r5] << 2) + 4 | 0);
  r7 = r6;
  r8 = r1 + 8 | 0;
  HEAP32[r8 >> 2] = r7;
  if ((r6 | 0) == 0) {
    r9 = 0;
    STACKTOP = r2;
    return r9;
  }
  r6 = (HEAP32[r5] - 1 << 2) + r7 | 0;
  L1182 : do {
    if (r7 >>> 0 <= r6 >>> 0) {
      r10 = r7;
      r11 = HEAP32[r1 + 4 >> 2];
      while (1) {
        HEAP32[r10 >> 2] = r11;
        r12 = r10 + 4 | 0;
        if (r12 >>> 0 > r6 >>> 0) {
          break L1182;
        } else {
          r10 = r12;
          r11 = r11 + 4 | 0;
        }
      }
    }
  } while (0);
  HEAP32[r3 >> 2] = r7;
  HEAP32[r3 + 4 >> 2] = r6;
  r6 = r3 + 8 | 0;
  r3 = 2016473283;
  r7 = r4;
  while (1) {
    r11 = HEAP32[r7 >> 2];
    r10 = HEAP32[r6 - 8 + 4 >> 2];
    L1189 : do {
      if (r10 >>> 0 > (r11 + 40 | 0) >>> 0) {
        r12 = r10;
        r13 = r7;
        r14 = r3;
        r15 = r11;
        while (1) {
          r16 = r12;
          r17 = r12 + 4 | 0;
          r18 = r13;
          r19 = r14;
          r20 = r15;
          while (1) {
            r21 = Math.imul(r19, 1539415821) + 1 | 0;
            r22 = r20;
            r23 = ((r21 >>> 0) % ((r16 - r22 + 4 >> 2 | 0) >>> 0) << 2) + r20 | 0;
            r24 = HEAP32[r23 >> 2];
            HEAP32[r23 >> 2] = HEAP32[r20 >> 2];
            HEAP32[r20 >> 2] = r24;
            r23 = r17;
            r25 = r20 - 4 | 0;
            while (1) {
              r26 = r25 + 4 | 0;
              r27 = HEAP32[r26 >> 2];
              r28 = HEAP32[r27 >> 2];
              r29 = r28 + 40 | 0;
              r30 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r29 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r29 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
              r29 = HEAP32[r24 >> 2];
              r31 = r29 + 40 | 0;
              r32 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
              L1196 : do {
                if (r30 < r32) {
                  r33 = r25;
                  r34 = r26, r35 = r34 >> 2;
                  r36 = r27;
                } else {
                  r31 = r29 + 48 | 0;
                  r37 = r25;
                  r38 = r26;
                  r39 = r28;
                  r40 = r30;
                  r41 = r27;
                  while (1) {
                    if (r40 == r32) {
                      r42 = r39 + 48 | 0;
                      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r42 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r42 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r31 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                        r33 = r37;
                        r34 = r38, r35 = r34 >> 2;
                        r36 = r41;
                        break L1196;
                      }
                    }
                    r42 = r38 + 4 | 0;
                    r43 = HEAP32[r42 >> 2];
                    r44 = HEAP32[r43 >> 2];
                    r45 = r44 + 40 | 0;
                    r46 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r45 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r45 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                    if (r46 < r32) {
                      r33 = r38;
                      r34 = r42, r35 = r34 >> 2;
                      r36 = r43;
                      break L1196;
                    } else {
                      r37 = r38;
                      r38 = r42;
                      r39 = r44;
                      r40 = r46;
                      r41 = r43;
                    }
                  }
                }
              } while (0);
              r27 = r23 - 4 | 0;
              r30 = HEAP32[r27 >> 2];
              r28 = HEAP32[r30 >> 2];
              r26 = r28 + 40 | 0;
              r41 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r26 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r26 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
              L1204 : do {
                if (r32 < r41) {
                  r47 = r23;
                  r48 = r27;
                  r49 = r30;
                } else {
                  r26 = r29 + 48 | 0;
                  r40 = r23;
                  r39 = r27;
                  r38 = r28;
                  r37 = r41;
                  r31 = r30;
                  while (1) {
                    if (r32 == r37) {
                      r43 = r38 + 48 | 0;
                      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r26 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r26 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r43 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r43 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                        r47 = r40;
                        r48 = r39;
                        r49 = r31;
                        break L1204;
                      }
                    }
                    r43 = r39 - 4 | 0;
                    r46 = HEAP32[r43 >> 2];
                    r44 = HEAP32[r46 >> 2];
                    r42 = r44 + 40 | 0;
                    r45 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r42 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r42 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                    if (r32 < r45) {
                      r47 = r39;
                      r48 = r43;
                      r49 = r46;
                      break L1204;
                    } else {
                      r40 = r39;
                      r39 = r43;
                      r38 = r44;
                      r37 = r45;
                      r31 = r46;
                    }
                  }
                }
              } while (0);
              HEAP32[r35] = r49;
              HEAP32[r48 >> 2] = r36;
              if (r34 >>> 0 < r48 >>> 0) {
                r23 = r48;
                r25 = r34;
              } else {
                break;
              }
            }
            r25 = HEAP32[r35];
            HEAP32[r35] = r36;
            HEAP32[r48 >> 2] = r25;
            r50 = r18 | 0;
            if ((r34 - r22 | 0) < (r16 - r48 | 0)) {
              break;
            }
            HEAP32[r50 >> 2] = r20;
            HEAP32[r18 + 4 >> 2] = r33;
            r25 = r18 + 8 | 0;
            if (r12 >>> 0 > (r47 + 40 | 0) >>> 0) {
              r18 = r25;
              r19 = r21;
              r20 = r47;
            } else {
              r51 = r25;
              r52 = r21;
              r53 = r47;
              r54 = r12;
              break L1189;
            }
          }
          HEAP32[r50 >> 2] = r47;
          HEAP32[r18 + 4 >> 2] = r12;
          r19 = r18 + 8 | 0;
          if (r33 >>> 0 > (r20 + 40 | 0) >>> 0) {
            r12 = r33;
            r13 = r19;
            r14 = r21;
            r15 = r20;
          } else {
            r51 = r19;
            r52 = r21;
            r53 = r20;
            r54 = r33;
            break L1189;
          }
        }
      } else {
        r51 = r7;
        r52 = r3;
        r53 = r11;
        r54 = r10;
      }
    } while (0);
    r10 = r53 + 4 | 0;
    L1216 : do {
      if (r10 >>> 0 <= r54 >>> 0) {
        r11 = r10;
        while (1) {
          r15 = HEAP32[r11 >> 2];
          L1219 : do {
            if (r11 >>> 0 > r53 >>> 0) {
              r14 = r11;
              while (1) {
                r13 = HEAP32[r15 >> 2];
                r12 = r13 + 40 | 0;
                r19 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                r12 = r14 - 4 | 0;
                r16 = HEAP32[r12 >> 2];
                r17 = HEAP32[r16 >> 2];
                r25 = r17 + 40 | 0;
                r23 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r25 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r25 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                if (r19 < r23) {
                  r55 = r14;
                  break L1219;
                }
                if (r19 == r23) {
                  r23 = r13 + 48 | 0;
                  r13 = r17 + 48 | 0;
                  if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r23 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r23 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                    r55 = r14;
                    break L1219;
                  }
                }
                HEAP32[r14 >> 2] = r16;
                if (r12 >>> 0 > r53 >>> 0) {
                  r14 = r12;
                } else {
                  r55 = r12;
                  break L1219;
                }
              }
            } else {
              r55 = r11;
            }
          } while (0);
          HEAP32[r55 >> 2] = r15;
          r20 = r11 + 4 | 0;
          if (r20 >>> 0 > r54 >>> 0) {
            break L1216;
          } else {
            r11 = r20;
          }
        }
      }
    } while (0);
    r10 = r51 - 8 | 0;
    if (r10 >>> 0 < r4 >>> 0) {
      break;
    } else {
      r6 = r51;
      r3 = r52;
      r7 = r10;
    }
  }
  HEAP32[r1 + 16 >> 2] = HEAP32[r5];
  HEAP32[r1 + 20 >> 2] = 1;
  ___gl_pqHeapInit(HEAP32[r1 >> 2]);
  r1 = HEAP32[r8 >> 2];
  r8 = HEAP32[r5] - 1 | 0;
  r5 = (r8 << 2) + r1 | 0;
  if ((r8 | 0) > 0) {
    r56 = r1;
  } else {
    r9 = 1;
    STACKTOP = r2;
    return r9;
  }
  while (1) {
    r1 = r56 + 4 | 0;
    r8 = HEAP32[HEAP32[r1 >> 2] >> 2];
    r7 = r8 + 40 | 0;
    r52 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r7 = HEAP32[HEAP32[r56 >> 2] >> 2];
    r3 = r7 + 40 | 0;
    r51 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    do {
      if (r52 >= r51) {
        if (r52 == r51) {
          r3 = r8 + 48 | 0;
          r6 = r7 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            break;
          }
        }
        ___assert_func(5243476, 164, 5245080, 5243316);
      }
    } while (0);
    if (r1 >>> 0 < r5 >>> 0) {
      r56 = r1;
    } else {
      r9 = 1;
      break;
    }
  }
  STACKTOP = r2;
  return r9;
}
___gl_pqSortInit["X"] = 1;
function ___gl_pqSortInsert(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10;
  if ((HEAP32[r1 + 20 >> 2] | 0) != 0) {
    r3 = ___gl_pqHeapInsert(HEAP32[r1 >> 2], r2);
    return r3;
  }
  r4 = r1 + 12 | 0;
  r5 = HEAP32[r4 >> 2];
  r6 = r5 + 1 | 0;
  HEAP32[r4 >> 2] = r6;
  r4 = r1 + 16 | 0;
  r7 = HEAP32[r4 >> 2];
  do {
    if ((r6 | 0) >= (r7 | 0)) {
      r8 = (r1 + 4 | 0) >> 2;
      r9 = HEAP32[r8];
      HEAP32[r4 >> 2] = r7 << 1;
      r10 = _realloc(r9, r7 << 3);
      HEAP32[r8] = r10;
      if ((r10 | 0) != 0) {
        break;
      }
      HEAP32[r8] = r9;
      r3 = 2147483647;
      return r3;
    }
  } while (0);
  if ((r5 | 0) == 2147483647) {
    ___assert_func(5243476, 194, 5245060, 5243256);
  }
  HEAP32[HEAP32[r1 + 4 >> 2] + (r5 << 2) >> 2] = r2;
  r3 = r5 ^ -1;
  return r3;
}
function ___gl_pqSortMinimum(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = HEAP32[r1 + 12 >> 2];
  if ((r2 | 0) == 0) {
    r3 = HEAP32[r1 >> 2];
    r4 = HEAP32[HEAP32[r3 + 4 >> 2] + (HEAP32[HEAP32[r3 >> 2] + 4 >> 2] << 3) >> 2];
    return r4;
  }
  r3 = HEAP32[HEAP32[HEAP32[r1 + 8 >> 2] + (r2 - 1 << 2) >> 2] >> 2];
  r2 = HEAP32[r1 >> 2] >> 2;
  do {
    if ((HEAP32[r2 + 2] | 0) != 0) {
      r1 = HEAP32[HEAP32[r2 + 1] + (HEAP32[HEAP32[r2] + 4 >> 2] << 3) >> 2];
      r5 = r1 + 40 | 0;
      r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r5 = r3 + 40 | 0;
      r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r6 < r7) {
        r4 = r1;
        return r4;
      }
      if (r6 != r7) {
        break;
      }
      r7 = r1 + 48 | 0;
      r6 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      } else {
        r4 = r1;
      }
      return r4;
    }
  } while (0);
  r4 = r3;
  return r4;
}
___gl_pqSortMinimum["X"] = 1;
function ___gl_pqSortExtractMin(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13;
  r2 = 0;
  r3 = r1 + 12 | 0;
  r4 = HEAP32[r3 >> 2];
  if ((r4 | 0) == 0) {
    r5 = ___gl_pqHeapExtractMin(HEAP32[r1 >> 2]);
    return r5;
  }
  r6 = HEAP32[r1 + 8 >> 2];
  r7 = HEAP32[HEAP32[r6 + (r4 - 1 << 2) >> 2] >> 2];
  r8 = HEAP32[r1 >> 2], r1 = r8 >> 2;
  do {
    if ((HEAP32[r1 + 2] | 0) == 0) {
      r9 = r4;
    } else {
      r10 = HEAP32[HEAP32[r1 + 1] + (HEAP32[HEAP32[r1] + 4 >> 2] << 3) >> 2];
      r11 = r10 + 40 | 0;
      r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r11 = r7 + 40 | 0;
      r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r12 >= r13) {
        if (r12 != r13) {
          r9 = r4;
          break;
        }
        r13 = r10 + 48 | 0;
        r10 = r7 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r9 = r4;
          break;
        }
      }
      r5 = ___gl_pqHeapExtractMin(r8);
      return r5;
    }
  } while (0);
  while (1) {
    r8 = r9 - 1 | 0;
    HEAP32[r3 >> 2] = r8;
    if ((r8 | 0) <= 0) {
      r5 = r7;
      r2 = 984;
      break;
    }
    if ((HEAP32[HEAP32[r6 + (r9 - 2 << 2) >> 2] >> 2] | 0) == 0) {
      r9 = r8;
    } else {
      r5 = r7;
      r2 = 982;
      break;
    }
  }
  if (r2 == 982) {
    return r5;
  } else if (r2 == 984) {
    return r5;
  }
}
___gl_pqSortExtractMin["X"] = 1;
function ___gl_pqSortDelete(r1, r2) {
  var r3, r4, r5, r6;
  r3 = 0;
  if ((r2 | 0) > -1) {
    ___gl_pqHeapDelete(HEAP32[r1 >> 2], r2);
    return;
  }
  r4 = r2 ^ -1;
  r2 = r1 + 4 | 0;
  do {
    if ((HEAP32[r1 + 16 >> 2] | 0) > (r4 | 0)) {
      r5 = HEAP32[r2 >> 2];
      if ((HEAP32[r5 + (r4 << 2) >> 2] | 0) == 0) {
        r3 = 989;
        break;
      } else {
        r6 = r5;
        break;
      }
    } else {
      r3 = 989;
    }
  } while (0);
  if (r3 == 989) {
    ___assert_func(5243476, 254, 5245124, 5243112);
    r6 = HEAP32[r2 >> 2];
  }
  HEAP32[r6 + (r4 << 2) >> 2] = 0;
  r4 = r1 + 12 | 0;
  r6 = HEAP32[r4 >> 2];
  if ((r6 | 0) <= 0) {
    return;
  }
  r2 = HEAP32[r1 + 8 >> 2];
  r1 = r6;
  while (1) {
    r6 = r1 - 1 | 0;
    if ((HEAP32[HEAP32[r2 + (r6 << 2) >> 2] >> 2] | 0) != 0) {
      r3 = 996;
      break;
    }
    HEAP32[r4 >> 2] = r6;
    if ((r6 | 0) > 0) {
      r1 = r6;
    } else {
      r3 = 998;
      break;
    }
  }
  if (r3 == 998) {
    return;
  } else if (r3 == 996) {
    return;
  }
}
function ___gl_computeInterior(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  HEAP32[r1 + 100 >> 2] = 0;
  _RemoveDegenerateEdges(r1);
  if ((_InitPriorityQ(r1) | 0) == 0) {
    r2 = 0;
    return r2;
  }
  _InitEdgeDict(r1);
  r3 = (r1 + 108 | 0) >> 2;
  r4 = ___gl_pqSortExtractMin(HEAP32[r3]);
  L1309 : do {
    if ((r4 | 0) != 0) {
      r5 = r4;
      while (1) {
        r6 = r5;
        r7 = HEAP32[r3];
        r8 = ___gl_pqSortMinimum(r7);
        L1312 : do {
          if ((r8 | 0) != 0) {
            r9 = r5 + 40 | 0;
            r10 = r5 + 48 | 0;
            r11 = r5 + 8 | 0;
            r12 = r7;
            r13 = r8;
            while (1) {
              r14 = r13 + 40 | 0;
              if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                break L1312;
              }
              r14 = r13 + 48 | 0;
              if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                break L1312;
              }
              r14 = ___gl_pqSortExtractMin(r12);
              _SpliceMergeVertices(r1, HEAP32[r11 >> 2], HEAP32[r14 + 8 >> 2]);
              r14 = HEAP32[r3];
              r15 = ___gl_pqSortMinimum(r14);
              if ((r15 | 0) == 0) {
                break L1312;
              } else {
                r12 = r14;
                r13 = r15;
              }
            }
          }
        } while (0);
        _SweepEvent(r1, r6);
        r8 = ___gl_pqSortExtractMin(HEAP32[r3]);
        if ((r8 | 0) == 0) {
          break L1309;
        } else {
          r5 = r8;
        }
      }
    }
  } while (0);
  HEAP32[r1 + 112 >> 2] = HEAP32[HEAP32[HEAP32[HEAP32[HEAP32[r1 + 104 >> 2] + 4 >> 2] >> 2] >> 2] + 16 >> 2];
  _DoneEdgeDict(r1);
  _DonePriorityQ(HEAP32[r3]);
  r3 = r1 + 8 | 0;
  if ((_RemoveDegenerateFaces(HEAP32[r3 >> 2]) | 0) == 0) {
    r2 = 0;
    return r2;
  }
  ___gl_meshCheckMesh(HEAP32[r3 >> 2]);
  r2 = 1;
  return r2;
}
___gl_computeInterior["X"] = 1;
function _InitPriorityQ(r1) {
  var r2, r3, r4, r5, r6, r7, r8;
  r2 = 0;
  r3 = ___gl_pqSortNewPriorityQ();
  r4 = (r1 + 108 | 0) >> 2;
  HEAP32[r4] = r3;
  if ((r3 | 0) == 0) {
    r5 = 0;
    return r5;
  }
  r6 = HEAP32[r1 + 8 >> 2];
  r1 = r6 | 0;
  r7 = r6 | 0;
  while (1) {
    r6 = HEAP32[r7 >> 2];
    if ((r6 | 0) == (r1 | 0)) {
      r2 = 1017;
      break;
    }
    r8 = ___gl_pqSortInsert(r3, r6);
    HEAP32[r6 + 56 >> 2] = r8;
    if ((r8 | 0) == 2147483647) {
      break;
    } else {
      r7 = r6 | 0;
    }
  }
  do {
    if (r2 == 1017) {
      if ((___gl_pqSortInit(r3) | 0) == 0) {
        break;
      } else {
        r5 = 1;
      }
      return r5;
    }
  } while (0);
  ___gl_pqSortDeletePriorityQ(HEAP32[r4]);
  HEAP32[r4] = 0;
  r5 = 0;
  return r5;
}
function _DoneEdgeDict(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = r1 + 104 | 0;
  r1 = HEAP32[r2 >> 2];
  r3 = HEAP32[HEAP32[r1 + 4 >> 2] >> 2];
  if ((r3 | 0) == 0) {
    r4 = r1;
    ___gl_dictListDeleteDict(r4);
    return;
  } else {
    r5 = 0;
    r6 = r3, r7 = r6 >> 2;
  }
  while (1) {
    r3 = r6;
    do {
      if ((HEAP32[r7 + 4] | 0) == 0) {
        if ((HEAP32[r7 + 6] | 0) == 0) {
          ___assert_func(5243336, 1188, 5245400, 5243544);
        }
        r1 = r5 + 1 | 0;
        if ((r5 | 0) == 0) {
          r8 = r1;
          break;
        }
        ___assert_func(5243336, 1189, 5245400, 5243456);
        r8 = r1;
      } else {
        r8 = r5;
      }
    } while (0);
    if ((HEAP32[r7 + 2] | 0) != 0) {
      ___assert_func(5243336, 1191, 5245400, 5243372);
    }
    _DeleteRegion(r3);
    r1 = HEAP32[r2 >> 2];
    r9 = HEAP32[HEAP32[r1 + 4 >> 2] >> 2];
    if ((r9 | 0) == 0) {
      r4 = r1;
      break;
    } else {
      r5 = r8;
      r6 = r9, r7 = r6 >> 2;
    }
  }
  ___gl_dictListDeleteDict(r4);
  return;
}
function _DonePriorityQ(r1) {
  ___gl_pqSortDeletePriorityQ(r1);
  return;
}
function _RemoveDegenerateFaces(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9;
  r2 = 0;
  r3 = r1 + 60 | 0;
  r1 = HEAP32[r3 >> 2];
  if ((r1 | 0) == (r3 | 0)) {
    r4 = 1;
    return r4;
  } else {
    r5 = r1;
  }
  while (1) {
    r1 = HEAP32[r5 >> 2];
    r6 = HEAP32[r5 + 8 >> 2];
    r7 = r6 + 12 | 0;
    r8 = HEAP32[r7 >> 2];
    if ((r8 | 0) == (r6 | 0)) {
      ___assert_func(5243336, 1290, 5245308, 5243920);
      r9 = HEAP32[r7 >> 2];
    } else {
      r9 = r8;
    }
    if ((HEAP32[r9 + 12 >> 2] | 0) == (r6 | 0)) {
      r8 = r6 + 8 | 0;
      r7 = HEAP32[r8 >> 2] + 28 | 0;
      HEAP32[r7 >> 2] = HEAP32[r7 >> 2] + HEAP32[r6 + 28 >> 2] | 0;
      r7 = HEAP32[HEAP32[r8 >> 2] + 4 >> 2] + 28 | 0;
      HEAP32[r7 >> 2] = HEAP32[r7 >> 2] + HEAP32[HEAP32[r6 + 4 >> 2] + 28 >> 2] | 0;
      if ((___gl_meshDelete(r6) | 0) == 0) {
        r4 = 0;
        r2 = 1045;
        break;
      }
    }
    if ((r1 | 0) == (r3 | 0)) {
      r4 = 1;
      r2 = 1044;
      break;
    } else {
      r5 = r1;
    }
  }
  if (r2 == 1045) {
    return r4;
  } else if (r2 == 1044) {
    return r4;
  }
}
function _DeleteRegion(r1) {
  var r2;
  r2 = r1 | 0;
  do {
    if ((HEAP32[r1 + 24 >> 2] | 0) != 0) {
      if ((HEAP32[HEAP32[r2 >> 2] + 28 >> 2] | 0) == 0) {
        break;
      }
      ___assert_func(5243336, 158, 5245416, 5243292);
    }
  } while (0);
  HEAP32[HEAP32[r2 >> 2] + 24 >> 2] = 0;
  ___gl_dictListDelete(HEAP32[r1 + 4 >> 2]);
  _free(r1);
  return;
}
function _TopLeftRegion(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = HEAP32[HEAP32[r1 >> 2] + 16 >> 2];
  r3 = r1;
  while (1) {
    r4 = HEAP32[HEAP32[HEAP32[r3 + 4 >> 2] + 4 >> 2] >> 2];
    r5 = r4;
    r6 = HEAP32[r4 >> 2];
    if ((HEAP32[r6 + 16 >> 2] | 0) == (r2 | 0)) {
      r3 = r5;
    } else {
      break;
    }
  }
  if ((HEAP32[r4 + 24 >> 2] | 0) == 0) {
    r7 = r5;
    return r7;
  }
  r3 = r4 + 4 | 0;
  r4 = ___gl_meshConnect(HEAP32[HEAP32[HEAP32[HEAP32[HEAP32[r3 >> 2] + 8 >> 2] >> 2] >> 2] + 4 >> 2], HEAP32[r6 + 12 >> 2]);
  if ((r4 | 0) == 0) {
    r7 = 0;
    return r7;
  }
  if ((_FixUpperEdge(r5, r4) | 0) == 0) {
    r7 = 0;
    return r7;
  }
  r7 = HEAP32[HEAP32[HEAP32[r3 >> 2] + 4 >> 2] >> 2];
  return r7;
}
_TopLeftRegion["X"] = 1;
function _RemoveDegenerateEdges(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19;
  r2 = 0;
  r3 = HEAP32[r1 + 8 >> 2] + 88 | 0;
  r4 = HEAP32[r3 >> 2];
  if ((r4 | 0) == (r3 | 0)) {
    return;
  } else {
    r5 = r4, r6 = r5 >> 2;
  }
  L1389 : while (1) {
    r4 = HEAP32[r6];
    r7 = HEAP32[r6 + 3];
    r8 = HEAP32[r6 + 4];
    r9 = r8 + 40 | 0;
    r10 = HEAP32[HEAP32[r6 + 1] + 16 >> 2];
    r11 = r10 + 40 | 0;
    do {
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) == (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r12 = r8 + 48 | 0;
        r13 = r10 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r14 = r5;
          r15 = r7;
          break;
        }
        r13 = r7 + 12 | 0;
        if ((HEAP32[r13 >> 2] | 0) == (r5 | 0)) {
          r14 = r5;
          r15 = r7;
          break;
        }
        _SpliceMergeVertices(r1, r7, r5);
        if ((___gl_meshDelete(r5) | 0) == 0) {
          r2 = 1066;
          break L1389;
        }
        r14 = r7;
        r15 = HEAP32[r13 >> 2];
      } else {
        r14 = r5;
        r15 = r7;
      }
    } while (0);
    if ((HEAP32[r15 + 12 >> 2] | 0) == (r14 | 0)) {
      if ((r15 | 0) == (r14 | 0)) {
        r16 = r4;
      } else {
        do {
          if ((r15 | 0) == (r4 | 0)) {
            r2 = 1072;
          } else {
            if ((r15 | 0) == (HEAP32[r4 + 4 >> 2] | 0)) {
              r2 = 1072;
              break;
            } else {
              r17 = r4;
              break;
            }
          }
        } while (0);
        if (r2 == 1072) {
          r2 = 0;
          r17 = HEAP32[r4 >> 2];
        }
        if ((___gl_meshDelete(r15) | 0) == 0) {
          r2 = 1074;
          break;
        } else {
          r16 = r17;
        }
      }
      do {
        if ((r14 | 0) == (r16 | 0)) {
          r2 = 1077;
        } else {
          if ((r14 | 0) == (HEAP32[r16 + 4 >> 2] | 0)) {
            r2 = 1077;
            break;
          } else {
            r18 = r16;
            break;
          }
        }
      } while (0);
      if (r2 == 1077) {
        r2 = 0;
        r18 = HEAP32[r16 >> 2];
      }
      if ((___gl_meshDelete(r14) | 0) == 0) {
        r2 = 1080;
        break;
      } else {
        r19 = r18;
      }
    } else {
      r19 = r4;
    }
    if ((r19 | 0) == (r3 | 0)) {
      r2 = 1083;
      break;
    } else {
      r5 = r19, r6 = r5 >> 2;
    }
  }
  if (r2 == 1083) {
    return;
  } else if (r2 == 1074) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r2 == 1080) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r2 == 1066) {
    _longjmp(r1 + 2984 | 0, 1);
  }
}
_RemoveDegenerateEdges["X"] = 1;
function _InitEdgeDict(r1) {
  var r2;
  r2 = ___gl_dictListNewDict(r1);
  HEAP32[r1 + 104 >> 2] = r2;
  if ((r2 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  } else {
    _AddSentinel(r1, -4e+150);
    _AddSentinel(r1, 4e+150);
    return;
  }
}
function _SpliceMergeVertices(r1, r2, r3) {
  var r4, r5, r6, r7, r8;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 32 | 0;
  r5 = r4;
  r6 = r4 + 16;
  r7 = r5 >> 2;
  HEAP32[r7] = 0;
  HEAP32[r7 + 1] = 0;
  HEAP32[r7 + 2] = 0;
  HEAP32[r7 + 3] = 0;
  r7 = r6 >> 2;
  HEAP32[r7] = HEAP32[1311378];
  HEAP32[r7 + 1] = HEAP32[1311379];
  HEAP32[r7 + 2] = HEAP32[1311380];
  HEAP32[r7 + 3] = HEAP32[1311381];
  r7 = HEAP32[r2 + 16 >> 2];
  r8 = r5 | 0;
  HEAP32[r8 >> 2] = HEAP32[r7 + 12 >> 2];
  HEAP32[r5 + 4 >> 2] = HEAP32[HEAP32[r3 + 16 >> 2] + 12 >> 2];
  _CallCombine(r1, r7, r8, r6 | 0, 0);
  if ((___gl_meshSplice(r2, r3) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  } else {
    STACKTOP = r4;
    return;
  }
}
function _SweepEvent(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = 0;
  HEAP32[r1 + 112 >> 2] = r2;
  r4 = HEAP32[r2 + 8 >> 2];
  r5 = r4;
  while (1) {
    r6 = HEAP32[r5 + 24 >> 2];
    if ((r6 | 0) != 0) {
      break;
    }
    r7 = HEAP32[r5 + 8 >> 2];
    if ((r7 | 0) == (r4 | 0)) {
      r3 = 1093;
      break;
    } else {
      r5 = r7;
    }
  }
  if (r3 == 1093) {
    _ConnectLeftVertex(r1, r2);
    return;
  }
  r2 = _TopLeftRegion(r6);
  if ((r2 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  r6 = HEAP32[HEAP32[HEAP32[r2 + 4 >> 2] + 8 >> 2] >> 2];
  r3 = HEAP32[r6 >> 2];
  r5 = _FinishLeftRegions(r1, r6, 0);
  r6 = HEAP32[r5 + 8 >> 2];
  if ((r6 | 0) == (r3 | 0)) {
    _ConnectRightVertex(r1, r2, r5);
    return;
  } else {
    _AddRightEdges(r1, r2, r6, r3, r3, 1);
    return;
  }
}
function _ConnectLeftVertex(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 28 | 0;
  r4 = r3;
  r5 = (r2 + 8 | 0) >> 2;
  HEAP32[r4 >> 2] = HEAP32[HEAP32[r5] + 4 >> 2];
  r6 = HEAP32[___gl_dictListSearch(HEAP32[r1 + 104 >> 2], r4) >> 2], r4 = r6 >> 2;
  r7 = r6;
  r6 = HEAP32[HEAP32[HEAP32[r4 + 1] + 8 >> 2] >> 2];
  r8 = r6;
  r9 = HEAP32[r4];
  r10 = HEAP32[r6 >> 2];
  r6 = r9 + 4 | 0;
  if (___gl_edgeSign(HEAP32[HEAP32[r6 >> 2] + 16 >> 2], r2, HEAP32[r9 + 16 >> 2]) == 0) {
    _ConnectLeftDegenerate(r1, r7, r2);
    STACKTOP = r3;
    return;
  }
  r11 = HEAP32[r10 + 4 >> 2];
  r10 = HEAP32[r11 + 16 >> 2];
  r12 = r10 + 40 | 0;
  r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r12 = HEAP32[HEAP32[r6 >> 2] + 16 >> 2];
  r6 = r12 + 40 | 0;
  r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r13 < r14) {
      r15 = r7;
    } else {
      if (r13 == r14) {
        r6 = r10 + 48 | 0;
        r16 = r12 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          r15 = r7;
          break;
        }
      }
      r15 = r8;
    }
  } while (0);
  do {
    if ((HEAP32[r4 + 3] | 0) == 0) {
      if ((HEAP32[r15 + 24 >> 2] | 0) != 0) {
        break;
      }
      r8 = HEAP32[r5];
      _AddRightEdges(r1, r7, r8, r8, 0, 1);
      STACKTOP = r3;
      return;
    }
  } while (0);
  do {
    if ((r15 | 0) == (r7 | 0)) {
      r4 = ___gl_meshConnect(HEAP32[HEAP32[r5] + 4 >> 2], HEAP32[r9 + 12 >> 2]);
      if ((r4 | 0) != 0) {
        r17 = r4;
        break;
      }
      _longjmp(r1 + 2984 | 0, 1);
    } else {
      r4 = ___gl_meshConnect(HEAP32[HEAP32[r11 + 8 >> 2] + 4 >> 2], HEAP32[r5]);
      if ((r4 | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      } else {
        r17 = HEAP32[r4 + 4 >> 2];
        break;
      }
    }
  } while (0);
  do {
    if ((HEAP32[r15 + 24 >> 2] | 0) == 0) {
      _ComputeWinding(r1, _AddRegionBelow(r1, r7, r17));
    } else {
      if ((_FixUpperEdge(r15, r17) | 0) != 0) {
        break;
      }
      _longjmp(r1 + 2984 | 0, 1);
    }
  } while (0);
  _SweepEvent(r1, r2);
  STACKTOP = r3;
  return;
}
_ConnectLeftVertex["X"] = 1;
function _IsWindingInside(r1, r2) {
  var r3;
  if ((r1 | 0) == 100132) {
    r3 = (r2 | 0) > 0 & 1;
  } else if ((r1 | 0) == 100131) {
    r3 = (r2 | 0) != 0 & 1;
  } else if ((r1 | 0) == 100134) {
    r3 = (r2 + 1 | 0) >>> 0 > 2 & 1;
  } else if ((r1 | 0) == 100130) {
    r3 = r2 & 1;
  } else if ((r1 | 0) == 100133) {
    r3 = r2 >>> 31;
  } else {
    ___assert_func(5243336, 253, 5245356, 5243728);
    r3 = 0;
  }
  return r3;
}
function _FinishLeftRegions(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13;
  r4 = 0;
  r5 = HEAP32[r2 >> 2];
  if ((r2 | 0) == (r3 | 0)) {
    r6 = r5;
    return r6;
  } else {
    r7 = r2;
    r8 = r5;
  }
  while (1) {
    HEAP32[r7 + 24 >> 2] = 0;
    r5 = HEAP32[HEAP32[HEAP32[r7 + 4 >> 2] + 8 >> 2] >> 2];
    r2 = r5;
    r9 = r5;
    r10 = HEAP32[r9 >> 2];
    if ((HEAP32[r10 + 16 >> 2] | 0) == (HEAP32[r8 + 16 >> 2] | 0)) {
      r11 = r10;
      r12 = r8 + 8 | 0;
    } else {
      if ((HEAP32[r5 + 24 >> 2] | 0) == 0) {
        r4 = 1139;
        break;
      }
      r5 = r8 + 8 | 0;
      r13 = ___gl_meshConnect(HEAP32[HEAP32[r5 >> 2] + 4 >> 2], HEAP32[r10 + 4 >> 2]);
      if ((r13 | 0) == 0) {
        r4 = 1141;
        break;
      }
      if ((_FixUpperEdge(r2, r13) | 0) == 0) {
        r4 = 1143;
        break;
      } else {
        r11 = r13;
        r12 = r5;
      }
    }
    if ((HEAP32[r12 >> 2] | 0) != (r11 | 0)) {
      if ((___gl_meshSplice(HEAP32[HEAP32[r11 + 4 >> 2] + 12 >> 2], r11) | 0) == 0) {
        r4 = 1146;
        break;
      }
      if ((___gl_meshSplice(r8, r11) | 0) == 0) {
        r4 = 1148;
        break;
      }
    }
    _FinishRegion(r7);
    r5 = HEAP32[r9 >> 2];
    if ((r2 | 0) == (r3 | 0)) {
      r6 = r5;
      r4 = 1152;
      break;
    } else {
      r7 = r2;
      r8 = r5;
    }
  }
  if (r4 == 1141) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r4 == 1148) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r4 == 1139) {
    _FinishRegion(r7);
    r6 = r8;
    return r6;
  } else if (r4 == 1143) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r4 == 1152) {
    return r6;
  } else if (r4 == 1146) {
    _longjmp(r1 + 2984 | 0, 1);
  }
}
_FinishLeftRegions["X"] = 1;
function _ConnectRightVertex(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27;
  r4 = 0;
  r5 = r3 + 8 | 0;
  r6 = HEAP32[r5 >> 2];
  r7 = HEAP32[HEAP32[HEAP32[r2 + 4 >> 2] + 8 >> 2] >> 2];
  r8 = r7;
  r9 = HEAP32[r2 >> 2];
  r10 = HEAP32[r7 >> 2];
  r7 = (r10 + 4 | 0) >> 2;
  if ((HEAP32[HEAP32[r9 + 4 >> 2] + 16 >> 2] | 0) != (HEAP32[HEAP32[r7] + 16 >> 2] | 0)) {
    _CheckForIntersect(r1, r2);
  }
  r11 = r9 + 16 | 0;
  r12 = HEAP32[r11 >> 2];
  r13 = r12 + 40 | 0;
  r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r13 = r1 + 112 | 0;
  r15 = HEAP32[r13 >> 2];
  r16 = r15 + 40 | 0;
  r17 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r14 == r17) {
      r16 = r12 + 48 | 0;
      r18 = r15 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r18 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r18 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r19 = 0;
        r20 = r2;
        r21 = r6;
        r22 = r15;
        r23 = r17;
        break;
      }
      if ((___gl_meshSplice(HEAP32[HEAP32[r6 + 4 >> 2] + 12 >> 2], r9) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      r18 = _TopLeftRegion(r2);
      if ((r18 | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      } else {
        r16 = HEAP32[HEAP32[HEAP32[r18 + 4 >> 2] + 8 >> 2] >> 2];
        r24 = HEAP32[r16 >> 2];
        _FinishLeftRegions(r1, r16, r8);
        r16 = HEAP32[r13 >> 2];
        r25 = r16 + 40 | 0;
        r19 = 1;
        r20 = r18;
        r21 = r24;
        r22 = r16;
        r23 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r25 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r25 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        break;
      }
    } else {
      r19 = 0;
      r20 = r2;
      r21 = r6;
      r22 = r15;
      r23 = r17;
    }
  } while (0);
  r17 = HEAP32[r10 + 16 >> 2];
  r10 = r17 + 40 | 0;
  r15 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r15 == r23) {
      r10 = r17 + 48 | 0;
      r6 = r22 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r4 = 1168;
        break;
      }
      if ((___gl_meshSplice(r3, HEAP32[HEAP32[r7] + 12 >> 2]) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      } else {
        r26 = _FinishLeftRegions(r1, r8, 0);
        break;
      }
    } else {
      r4 = 1168;
    }
  } while (0);
  do {
    if (r4 == 1168) {
      if ((r19 | 0) != 0) {
        r26 = r3;
        break;
      }
      r8 = HEAP32[r11 >> 2];
      r22 = r8 + 40 | 0;
      r23 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r22 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r22 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      do {
        if (r15 < r23) {
          r4 = 1173;
        } else {
          if (r15 != r23) {
            r27 = r9;
            break;
          }
          r22 = r17 + 48 | 0;
          r6 = r8 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r22 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r22 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            r27 = r9;
            break;
          } else {
            r4 = 1173;
            break;
          }
        }
      } while (0);
      if (r4 == 1173) {
        r27 = HEAP32[HEAP32[r7] + 12 >> 2];
      }
      r8 = ___gl_meshConnect(HEAP32[HEAP32[r5 >> 2] + 4 >> 2], r27);
      if ((r8 | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      r23 = HEAP32[r8 + 8 >> 2];
      _AddRightEdges(r1, r20, r8, r23, r23, 0);
      HEAP32[HEAP32[HEAP32[r8 + 4 >> 2] + 24 >> 2] + 24 >> 2] = 1;
      _WalkDirtyRegions(r1, r20);
      return;
    }
  } while (0);
  _AddRightEdges(r1, r20, HEAP32[r26 + 8 >> 2], r21, r21, 1);
  return;
}
_ConnectRightVertex["X"] = 1;
function _AddRightEdges(r1, r2, r3, r4, r5, r6) {
  var r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22;
  r7 = 0;
  r8 = r3;
  while (1) {
    r3 = HEAP32[r8 + 16 >> 2];
    r9 = r3 + 40 | 0;
    r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r9 = r8 + 4 | 0;
    r11 = HEAP32[r9 >> 2];
    r12 = HEAP32[r11 + 16 >> 2];
    r13 = r12 + 40 | 0;
    r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    do {
      if (r10 < r14) {
        r15 = r11;
      } else {
        if (r10 == r14) {
          r13 = r3 + 48 | 0;
          r16 = r12 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r16 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r16 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            r15 = r11;
            break;
          }
        }
        ___assert_func(5243336, 361, 5245496, 5243228);
        r15 = HEAP32[r9 >> 2];
      }
    } while (0);
    _AddRegionBelow(r1, r2, r15);
    r9 = HEAP32[r8 + 8 >> 2];
    if ((r9 | 0) == (r4 | 0)) {
      break;
    } else {
      r8 = r9;
    }
  }
  r8 = HEAP32[HEAP32[HEAP32[r2 + 4 >> 2] + 8 >> 2] >> 2];
  r4 = HEAP32[HEAP32[r8 >> 2] + 4 >> 2];
  if ((r5 | 0) == 0) {
    r17 = HEAP32[r4 + 8 >> 2];
  } else {
    r17 = r5;
  }
  L1552 : do {
    if ((HEAP32[r4 + 16 >> 2] | 0) == (HEAP32[r17 + 16 >> 2] | 0)) {
      r5 = r1 + 96 | 0;
      r15 = r2;
      r9 = r17, r11 = r9 >> 2;
      r12 = 1;
      r3 = r8, r14 = r3 >> 2;
      r10 = r4, r16 = r10 >> 2;
      L1554 : while (1) {
        r13 = r3;
        if ((HEAP32[r16 + 2] | 0) != (r9 | 0)) {
          if ((___gl_meshSplice(HEAP32[HEAP32[r16 + 1] + 12 >> 2], r10) | 0) == 0) {
            r7 = 1192;
            break;
          }
          if ((___gl_meshSplice(HEAP32[HEAP32[r11 + 1] + 12 >> 2], r10) | 0) == 0) {
            r7 = 1194;
            break;
          }
        }
        r18 = (r10 + 28 | 0) >> 2;
        r19 = HEAP32[r15 + 8 >> 2] - HEAP32[r18] | 0;
        HEAP32[r14 + 2] = r19;
        HEAP32[r14 + 3] = _IsWindingInside(HEAP32[r5 >> 2], r19);
        HEAP32[r15 + 20 >> 2] = 1;
        do {
          if ((r12 | 0) == 0) {
            if ((_CheckForRightSplice(r1, r15) | 0) == 0) {
              break;
            }
            HEAP32[r18] = HEAP32[r18] + HEAP32[r11 + 7] | 0;
            r19 = HEAP32[r16 + 1] + 28 | 0;
            HEAP32[r19 >> 2] = HEAP32[r19 >> 2] + HEAP32[HEAP32[r11 + 1] + 28 >> 2] | 0;
            _DeleteRegion(r15);
            if ((___gl_meshDelete(r9) | 0) == 0) {
              r7 = 1199;
              break L1554;
            }
          }
        } while (0);
        r18 = HEAP32[HEAP32[HEAP32[r14 + 1] + 8 >> 2] >> 2];
        r19 = HEAP32[HEAP32[r18 >> 2] + 4 >> 2];
        if ((HEAP32[r19 + 16 >> 2] | 0) == (HEAP32[r16 + 4] | 0)) {
          r15 = r13;
          r9 = r10, r11 = r9 >> 2;
          r12 = 0;
          r3 = r18, r14 = r3 >> 2;
          r10 = r19, r16 = r10 >> 2;
        } else {
          r20 = r13;
          r21 = r18;
          r22 = r19;
          break L1552;
        }
      }
      if (r7 == 1192) {
        _longjmp(r1 + 2984 | 0, 1);
      } else if (r7 == 1194) {
        _longjmp(r1 + 2984 | 0, 1);
      } else if (r7 == 1199) {
        _longjmp(r1 + 2984 | 0, 1);
      }
    } else {
      r20 = r2;
      r21 = r8;
      r22 = r4;
    }
  } while (0);
  HEAP32[r20 + 20 >> 2] = 1;
  if ((HEAP32[r20 + 8 >> 2] - HEAP32[r22 + 28 >> 2] | 0) != (HEAP32[r21 + 8 >> 2] | 0)) {
    ___assert_func(5243336, 403, 5245496, 5243052);
  }
  if ((r6 | 0) == 0) {
    return;
  }
  _WalkDirtyRegions(r1, r20);
  return;
}
_AddRightEdges["X"] = 1;
function _AddRegionBelow(r1, r2, r3) {
  var r4, r5, r6, r7;
  r4 = _malloc(28), r5 = r4 >> 2;
  r6 = r4;
  if ((r4 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  HEAP32[r5] = r3;
  r7 = ___gl_dictListInsertBefore(HEAP32[r1 + 104 >> 2], HEAP32[r2 + 4 >> 2], r4);
  HEAP32[r5 + 1] = r7;
  if ((r7 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  } else {
    HEAP32[r5 + 6] = 0;
    HEAP32[r5 + 4] = 0;
    HEAP32[r5 + 5] = 0;
    HEAP32[r3 + 24 >> 2] = r6;
    return r6;
  }
}
function _CheckForRightSplice(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r3 = r2 + 4 | 0;
  r4 = HEAP32[HEAP32[HEAP32[r3 >> 2] + 8 >> 2] >> 2];
  r5 = HEAP32[r2 >> 2];
  r6 = HEAP32[r4 >> 2];
  r7 = r5 + 16 | 0;
  r8 = HEAP32[r7 >> 2];
  r9 = r8 + 40 | 0;
  r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r9 = r6 + 16 | 0;
  r11 = HEAP32[r9 >> 2];
  r12 = r11 + 40 | 0;
  r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r10 >= r13) {
      if (r10 == r13) {
        r12 = r8 + 48 | 0;
        r14 = r11 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      r14 = r5 + 4 | 0;
      if (___gl_edgeSign(HEAP32[HEAP32[r14 >> 2] + 16 >> 2], r11, r8) < 0) {
        r15 = 0;
        return r15;
      }
      HEAP32[r2 + 20 >> 2] = 1;
      HEAP32[HEAP32[HEAP32[HEAP32[r3 >> 2] + 4 >> 2] >> 2] + 20 >> 2] = 1;
      if ((___gl_meshSplitEdge(HEAP32[r14 >> 2]) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      if ((___gl_meshSplice(HEAP32[HEAP32[r6 + 4 >> 2] + 12 >> 2], r5) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      } else {
        r15 = 1;
        return r15;
      }
    }
  } while (0);
  r3 = (r6 + 4 | 0) >> 2;
  if (___gl_edgeSign(HEAP32[HEAP32[r3] + 16 >> 2], r8, r11) > 0) {
    r15 = 0;
    return r15;
  }
  r11 = HEAP32[r7 >> 2];
  r7 = r11 + 40 | 0;
  r8 = HEAP32[r9 >> 2];
  r9 = r8 + 40 | 0;
  do {
    if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) == (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
      r6 = r11 + 48 | 0;
      r13 = r8 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      }
      if ((r11 | 0) == (r8 | 0)) {
        r15 = 1;
        return r15;
      }
      ___gl_pqSortDelete(HEAP32[r1 + 108 >> 2], HEAP32[r11 + 56 >> 2]);
      _SpliceMergeVertices(r1, HEAP32[HEAP32[r3] + 12 >> 2], r5);
      r15 = 1;
      return r15;
    }
  } while (0);
  if ((___gl_meshSplitEdge(HEAP32[r3]) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  if ((___gl_meshSplice(r5, HEAP32[HEAP32[r3] + 12 >> 2]) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  HEAP32[r4 + 20 >> 2] = 1;
  HEAP32[r2 + 20 >> 2] = 1;
  r15 = 1;
  return r15;
}
_CheckForRightSplice["X"] = 1;
function _WalkDirtyRegions(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18;
  r3 = 0;
  r4 = r1 + 112 | 0;
  r5 = HEAP32[HEAP32[HEAP32[r2 + 4 >> 2] + 8 >> 2] >> 2];
  r6 = r2;
  L1618 : while (1) {
    if ((HEAP32[r5 + 20 >> 2] | 0) != 0) {
      r6 = r5;
      r5 = HEAP32[HEAP32[HEAP32[r5 + 4 >> 2] + 8 >> 2] >> 2];
      continue;
    }
    if ((HEAP32[r6 + 20 >> 2] | 0) == 0) {
      r2 = HEAP32[HEAP32[HEAP32[r6 + 4 >> 2] + 4 >> 2] >> 2];
      if ((r2 | 0) == 0) {
        r3 = 1266;
        break;
      }
      if ((HEAP32[r2 + 20 >> 2] | 0) == 0) {
        r3 = 1267;
        break;
      } else {
        r7 = r6, r8 = r7 >> 2;
        r9 = r2, r10 = r9 >> 2;
      }
    } else {
      r7 = r5, r8 = r7 >> 2;
      r9 = r6, r10 = r9 >> 2;
    }
    HEAP32[r10 + 5] = 0;
    r2 = HEAP32[r10];
    r11 = HEAP32[r8];
    do {
      if ((HEAP32[HEAP32[r2 + 4 >> 2] + 16 >> 2] | 0) == (HEAP32[HEAP32[r11 + 4 >> 2] + 16 >> 2] | 0)) {
        r12 = r11;
        r13 = r2;
        r14 = r7;
        r15 = r9;
      } else {
        if ((_CheckForLeftSplice(r1, r9) | 0) == 0) {
          r12 = r11;
          r13 = r2;
          r14 = r7;
          r15 = r9;
          break;
        }
        if ((HEAP32[r8 + 6] | 0) != 0) {
          _DeleteRegion(r7);
          if ((___gl_meshDelete(r11) | 0) == 0) {
            r3 = 1247;
            break L1618;
          }
          r16 = HEAP32[HEAP32[HEAP32[r10 + 1] + 8 >> 2] >> 2];
          r12 = HEAP32[r16 >> 2];
          r13 = r2;
          r14 = r16;
          r15 = r9;
          break;
        }
        if ((HEAP32[r10 + 6] | 0) == 0) {
          r12 = r11;
          r13 = r2;
          r14 = r7;
          r15 = r9;
          break;
        }
        _DeleteRegion(r9);
        if ((___gl_meshDelete(r2) | 0) == 0) {
          r3 = 1251;
          break L1618;
        }
        r16 = HEAP32[HEAP32[HEAP32[r8 + 1] + 4 >> 2] >> 2];
        r12 = r11;
        r13 = HEAP32[r16 >> 2];
        r14 = r7;
        r15 = r16;
      }
    } while (0);
    r11 = r13 + 16 | 0;
    r2 = r12 + 16 | 0;
    L1637 : do {
      if ((HEAP32[r11 >> 2] | 0) != (HEAP32[r2 >> 2] | 0)) {
        r16 = HEAP32[HEAP32[r13 + 4 >> 2] + 16 >> 2];
        r17 = HEAP32[HEAP32[r12 + 4 >> 2] + 16 >> 2];
        do {
          if ((r16 | 0) != (r17 | 0)) {
            if ((HEAP32[r15 + 24 >> 2] | 0) != 0) {
              break;
            }
            if ((HEAP32[r14 + 24 >> 2] | 0) != 0) {
              break;
            }
            r18 = HEAP32[r4 >> 2];
            if (!((r16 | 0) == (r18 | 0) | (r17 | 0) == (r18 | 0))) {
              break;
            }
            if ((_CheckForIntersect(r1, r15) | 0) == 0) {
              break L1637;
            } else {
              r3 = 1268;
              break L1618;
            }
          }
        } while (0);
        _CheckForRightSplice(r1, r15);
      }
    } while (0);
    if ((HEAP32[r11 >> 2] | 0) != (HEAP32[r2 >> 2] | 0)) {
      r5 = r14;
      r6 = r15;
      continue;
    }
    r17 = r13 + 4 | 0;
    r16 = HEAP32[r12 + 4 >> 2];
    if ((HEAP32[HEAP32[r17 >> 2] + 16 >> 2] | 0) != (HEAP32[r16 + 16 >> 2] | 0)) {
      r5 = r14;
      r6 = r15;
      continue;
    }
    r18 = r12 + 28 | 0;
    HEAP32[r18 >> 2] = HEAP32[r18 >> 2] + HEAP32[r13 + 28 >> 2] | 0;
    r18 = r16 + 28 | 0;
    HEAP32[r18 >> 2] = HEAP32[r18 >> 2] + HEAP32[HEAP32[r17 >> 2] + 28 >> 2] | 0;
    _DeleteRegion(r15);
    if ((___gl_meshDelete(r13) | 0) == 0) {
      r3 = 1263;
      break;
    }
    r5 = r14;
    r6 = HEAP32[HEAP32[HEAP32[r14 + 4 >> 2] + 4 >> 2] >> 2];
  }
  if (r3 == 1266) {
    return;
  } else if (r3 == 1267) {
    return;
  } else if (r3 == 1268) {
    return;
  } else if (r3 == 1251) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r3 == 1247) {
    _longjmp(r1 + 2984 | 0, 1);
  } else if (r3 == 1263) {
    _longjmp(r1 + 2984 | 0, 1);
  }
}
_WalkDirtyRegions["X"] = 1;
function _CheckForLeftSplice(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21;
  r3 = r2 >> 2;
  r4 = r2 + 4 | 0;
  r2 = HEAP32[HEAP32[HEAP32[r4 >> 2] + 8 >> 2] >> 2];
  r5 = HEAP32[r3];
  r6 = HEAP32[r2 >> 2];
  r7 = r5 + 4 | 0;
  r8 = HEAP32[HEAP32[r7 >> 2] + 16 >> 2];
  r9 = r8 + 40 | 0;
  r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r9 = (r6 + 4 | 0) >> 2;
  r11 = HEAP32[HEAP32[r9] + 16 >> 2];
  r12 = r11 + 40 | 0;
  r13 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r10 == r13) {
      r12 = r8 + 48 | 0;
      r14 = r11 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r14 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r14 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r15 = r8;
        r16 = r10;
        r17 = r11;
        r18 = r13;
        break;
      }
      ___assert_func(5243336, 581, 5245456, 5243736);
      r14 = HEAP32[HEAP32[r7 >> 2] + 16 >> 2];
      r12 = r14 + 40 | 0;
      r19 = HEAP32[HEAP32[r9] + 16 >> 2];
      r20 = r19 + 40 | 0;
      r15 = r14;
      r16 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r17 = r19;
      r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    } else {
      r15 = r8;
      r16 = r10;
      r17 = r11;
      r18 = r13;
    }
  } while (0);
  do {
    if (r16 >= r18) {
      if (r16 == r18) {
        r13 = r15 + 48 | 0;
        r11 = r17 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      if (___gl_edgeSign(r17, r15, HEAP32[r6 + 16 >> 2]) > 0) {
        r21 = 0;
        return r21;
      }
      HEAP32[r2 + 20 >> 2] = 1;
      HEAP32[r3 + 5] = 1;
      r11 = ___gl_meshSplitEdge(r6);
      if ((r11 | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      if ((___gl_meshSplice(HEAP32[r5 + 12 >> 2], HEAP32[r9]) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      HEAP32[HEAP32[HEAP32[r11 + 4 >> 2] + 20 >> 2] + 24 >> 2] = HEAP32[r3 + 3];
      r21 = 1;
      return r21;
    }
  } while (0);
  if (___gl_edgeSign(r15, r17, HEAP32[r5 + 16 >> 2]) < 0) {
    r21 = 0;
    return r21;
  }
  HEAP32[r3 + 5] = 1;
  HEAP32[HEAP32[HEAP32[HEAP32[r4 >> 2] + 4 >> 2] >> 2] + 20 >> 2] = 1;
  r4 = ___gl_meshSplitEdge(r5);
  if ((r4 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  if ((___gl_meshSplice(HEAP32[r9], r4) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  HEAP32[HEAP32[r4 + 20 >> 2] + 24 >> 2] = HEAP32[r3 + 3];
  r21 = 1;
  return r21;
}
_CheckForLeftSplice["X"] = 1;
function _TopRightRegion(r1) {
  var r2, r3, r4;
  r2 = HEAP32[HEAP32[HEAP32[r1 >> 2] + 4 >> 2] + 16 >> 2];
  r3 = r1;
  while (1) {
    r1 = HEAP32[HEAP32[HEAP32[r3 + 4 >> 2] + 4 >> 2] >> 2];
    r4 = r1;
    if ((HEAP32[HEAP32[HEAP32[r1 >> 2] + 4 >> 2] + 16 >> 2] | 0) == (r2 | 0)) {
      r3 = r4;
    } else {
      break;
    }
  }
  return r4;
}
function _VertexWeights(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12;
  r5 = r2 + 40 | 0;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r5 = r1 + 40 | 0;
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r5 = r6 - r7;
  if (r5 < 0) {
    r8 = -r5;
  } else {
    r8 = r5;
  }
  r5 = r2 + 48 | 0;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r5 = r1 + 48 | 0;
  r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r5 = r6 - r9;
  if (r5 < 0) {
    r10 = -r5;
  } else {
    r10 = r5;
  }
  r5 = r8 + r10;
  r10 = r3 + 40 | 0;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r7;
  if (r8 < 0) {
    r11 = -r8;
  } else {
    r11 = r8;
  }
  r8 = r3 + 48 | 0;
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) - r9;
  if (r7 < 0) {
    r12 = -r7;
  } else {
    r12 = r7;
  }
  r7 = r11 + r12;
  r12 = r5 + r7;
  r11 = r7 * .5 / r12;
  HEAPF32[r4 >> 2] = r11;
  r7 = r5 * .5 / r12;
  r12 = (r4 + 4 | 0) >> 2;
  HEAPF32[r12] = r7;
  r5 = r2 + 16 | 0;
  r9 = r3 + 16 | 0;
  r8 = (r1 + 16 | 0) >> 2;
  r10 = r11 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + r7 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + (HEAP32[tempDoublePtr >> 2] = HEAP32[r8], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r8] = HEAP32[tempDoublePtr >> 2], HEAP32[r8 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r8 = r2 + 24 | 0;
  r10 = r3 + 24 | 0;
  r9 = (r1 + 24 | 0) >> 2;
  r7 = HEAPF32[r4 >> 2] * (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + HEAPF32[r12] * (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + (HEAP32[tempDoublePtr >> 2] = HEAP32[r9], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r7, HEAP32[r9] = HEAP32[tempDoublePtr >> 2], HEAP32[r9 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  r9 = r2 + 32 | 0;
  r2 = r3 + 32 | 0;
  r3 = (r1 + 32 | 0) >> 2;
  r1 = HEAPF32[r4 >> 2] * (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + HEAPF32[r12] * (HEAP32[tempDoublePtr >> 2] = HEAP32[r2 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r2 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) + (HEAP32[tempDoublePtr >> 2] = HEAP32[r3], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 1], HEAPF64[tempDoublePtr >> 3]);
  HEAPF64[tempDoublePtr >> 3] = r1, HEAP32[r3] = HEAP32[tempDoublePtr >> 2], HEAP32[r3 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
  return;
}
_VertexWeights["X"] = 1;
function _GetIntersectData(r1, r2, r3, r4, r5, r6) {
  var r7, r8, r9, r10, r11;
  r7 = STACKTOP;
  STACKTOP = STACKTOP + 32 | 0;
  r8 = r7, r9 = r8 >> 2;
  r10 = r7 + 16;
  r11 = r8 | 0;
  HEAP32[r11 >> 2] = HEAP32[r3 + 12 >> 2];
  HEAP32[r9 + 1] = HEAP32[r4 + 12 >> 2];
  HEAP32[r9 + 2] = HEAP32[r5 + 12 >> 2];
  HEAP32[r9 + 3] = HEAP32[r6 + 12 >> 2];
  r9 = r10 | 0;
  r8 = (r2 + 16 | 0) >> 2;
  HEAP32[r8] = 0;
  HEAP32[r8 + 1] = 0;
  HEAP32[r8 + 2] = 0;
  HEAP32[r8 + 3] = 0;
  HEAP32[r8 + 4] = 0;
  HEAP32[r8 + 5] = 0;
  _VertexWeights(r2, r3, r4, r9);
  _VertexWeights(r2, r5, r6, r10 + 8 | 0);
  _CallCombine(r1, r2, r11, r9, 1);
  STACKTOP = r7;
  return;
}
function _CallCombine(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11;
  r6 = r1 >> 2;
  r7 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r8 = r7;
  r9 = r2 + 16 | 0;
  r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r9 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r9 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r9 = r8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r9 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r9 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r10 = r2 + 24 | 0;
  r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r10 = r8 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r11, HEAP32[r10 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r10 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r10 = r2 + 32 | 0;
  r11 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r10 = r8 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = r11, HEAP32[r10 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r10 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r10 = r2 + 12 | 0, r2 = r10 >> 2;
  HEAP32[r2] = 0;
  r11 = HEAP32[r6 + 745];
  if ((r11 | 0) == 50) {
    FUNCTION_TABLE[HEAP32[r6 + 29]](r9, r3, r4, r10);
  } else {
    FUNCTION_TABLE[r11](r9, r3, r4, r10, HEAP32[r6 + 756]);
  }
  if ((HEAP32[r2] | 0) != 0) {
    STACKTOP = r7;
    return;
  }
  if ((r5 | 0) == 0) {
    HEAP32[r2] = HEAP32[r3 >> 2];
    STACKTOP = r7;
    return;
  }
  r3 = r1 + 100 | 0;
  if ((HEAP32[r3 >> 2] | 0) != 0) {
    STACKTOP = r7;
    return;
  }
  r1 = HEAP32[r6 + 744];
  if ((r1 | 0) == 22) {
    FUNCTION_TABLE[HEAP32[r6 + 3]](100156);
  } else {
    FUNCTION_TABLE[r1](100156, HEAP32[r6 + 756]);
  }
  HEAP32[r3 >> 2] = 1;
  STACKTOP = r7;
  return;
}
_CallCombine["X"] = 1;
function _FinishRegion(r1) {
  var r2, r3;
  r2 = HEAP32[r1 >> 2];
  r3 = HEAP32[r2 + 20 >> 2];
  HEAP32[r3 + 24 >> 2] = HEAP32[r1 + 12 >> 2];
  HEAP32[r3 + 8 >> 2] = r2;
  _DeleteRegion(r1);
  return;
}
function _FixUpperEdge(r1, r2) {
  var r3, r4, r5;
  r3 = r1 + 24 | 0;
  if ((HEAP32[r3 >> 2] | 0) == 0) {
    ___assert_func(5243336, 171, 5245384, 5243544);
  }
  r4 = r1 | 0;
  if ((___gl_meshDelete(HEAP32[r4 >> 2]) | 0) == 0) {
    r5 = 0;
    return r5;
  }
  HEAP32[r3 >> 2] = 0;
  HEAP32[r4 >> 2] = r2;
  HEAP32[r2 + 24 >> 2] = r1;
  r5 = 1;
  return r5;
}
function _CheckForIntersect(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46;
  r3 = 0;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 60 | 0;
  r5 = r4;
  r6 = (r2 + 4 | 0) >> 2;
  r7 = HEAP32[HEAP32[HEAP32[r6] + 8 >> 2] >> 2], r8 = r7 >> 2;
  r9 = r7;
  r7 = r2 | 0;
  r10 = HEAP32[r7 >> 2];
  r11 = HEAP32[r8];
  r12 = (r10 + 16 | 0) >> 2;
  r13 = HEAP32[r12];
  r14 = (r11 + 16 | 0) >> 2;
  r15 = HEAP32[r14];
  r16 = (r10 + 4 | 0) >> 2;
  r17 = HEAP32[HEAP32[r16] + 16 >> 2];
  r18 = (r11 + 4 | 0) >> 2;
  r11 = HEAP32[HEAP32[r18] + 16 >> 2];
  r19 = (r11 + 40 | 0) >> 2;
  r20 = (r17 + 40 | 0) >> 2;
  do {
    if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]) == (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3])) {
      r21 = r11 + 48 | 0;
      r22 = r17 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r21 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r22 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r22 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      }
      ___assert_func(5243336, 628, 5245476, 5242960);
    }
  } while (0);
  r22 = (r1 + 112 | 0) >> 2;
  if (___gl_edgeSign(r17, HEAP32[r22], r13) > 0) {
    ___assert_func(5243336, 629, 5245476, 5242904);
  }
  if (___gl_edgeSign(r11, HEAP32[r22], r15) < 0) {
    ___assert_func(5243336, 630, 5245476, 5244412);
  }
  r21 = HEAP32[r22];
  if ((r13 | 0) == (r21 | 0) | (r15 | 0) == (r21 | 0)) {
    ___assert_func(5243336, 631, 5245476, 5244336);
  }
  do {
    if ((HEAP32[r2 + 24 >> 2] | 0) == 0) {
      if ((HEAP32[r8 + 6] | 0) == 0) {
        break;
      } else {
        r3 = 1340;
        break;
      }
    } else {
      r3 = 1340;
    }
  } while (0);
  if (r3 == 1340) {
    ___assert_func(5243336, 632, 5245476, 5244260);
  }
  if ((r13 | 0) == (r15 | 0)) {
    r23 = 0;
    STACKTOP = r4;
    return r23;
  }
  r21 = (r13 + 48 | 0) >> 2;
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r21], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 1], HEAPF64[tempDoublePtr >> 3]);
  r25 = (r17 + 48 | 0) >> 2;
  r26 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r25], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r25 + 1], HEAPF64[tempDoublePtr >> 3]);
  r27 = (r15 + 48 | 0) >> 2;
  r28 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3]);
  r29 = (r11 + 48 | 0) >> 2;
  r30 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r29], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r29 + 1], HEAPF64[tempDoublePtr >> 3]);
  if ((r24 > r26 ? r26 : r24) > (r28 < r30 ? r30 : r28)) {
    r23 = 0;
    STACKTOP = r4;
    return r23;
  }
  r30 = (r13 + 40 | 0) >> 2;
  r26 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
  r31 = (r15 + 40 | 0) >> 2;
  r32 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r26 < r32) {
      r3 = 1345;
    } else {
      if (!(r26 != r32 | r24 > r28)) {
        r3 = 1345;
        break;
      }
      if (___gl_edgeSign(r17, r15, r13) < 0) {
        r23 = 0;
      } else {
        break;
      }
      STACKTOP = r4;
      return r23;
    }
  } while (0);
  do {
    if (r3 == 1345) {
      if (___gl_edgeSign(r11, r13, r15) > 0) {
        r23 = 0;
      } else {
        break;
      }
      STACKTOP = r4;
      return r23;
    }
  } while (0);
  ___gl_edgeIntersect(r17, r13, r11, r15, r5);
  r28 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r21], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 1], HEAPF64[tempDoublePtr >> 3]);
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r25], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r25 + 1], HEAPF64[tempDoublePtr >> 3]);
  r32 = (r5 + 48 | 0) >> 2;
  r26 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r32], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r32 + 1], HEAPF64[tempDoublePtr >> 3]);
  if ((r28 > r24 ? r24 : r28) > r26) {
    ___assert_func(5243336, 651, 5245476, 5244168);
  }
  r28 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3]);
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r29], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r29 + 1], HEAPF64[tempDoublePtr >> 3]);
  if (r26 > (r28 < r24 ? r24 : r28)) {
    ___assert_func(5243336, 652, 5245476, 5243952);
  }
  r28 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]);
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]);
  r33 = (r5 + 40 | 0) >> 2;
  r34 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r33], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r33 + 1], HEAPF64[tempDoublePtr >> 3]);
  if ((r28 > r24 ? r24 : r28) > r34) {
    ___assert_func(5243336, 653, 5245476, 5243880);
  }
  r28 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 1], HEAPF64[tempDoublePtr >> 3]);
  r24 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
  if (r34 > (r28 < r24 ? r24 : r28)) {
    ___assert_func(5243336, 654, 5245476, 5243824);
  }
  r28 = HEAP32[r22];
  r24 = r28 + 40 | 0;
  r35 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r24 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r24 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r34 < r35) {
      r24 = r28 + 48 | 0;
      r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r24 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r24 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r3 = 1359;
      break;
    } else {
      if (r34 != r35) {
        r37 = r34;
        r38 = r26;
        break;
      }
      r24 = r28 + 48 | 0;
      r39 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r24 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r24 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r26 > r39) {
        r37 = r34;
        r38 = r26;
        break;
      } else {
        r36 = r39;
        r3 = 1359;
        break;
      }
    }
  } while (0);
  if (r3 == 1359) {
    HEAPF64[tempDoublePtr >> 3] = r35, HEAP32[r33] = HEAP32[tempDoublePtr >> 2], HEAP32[r33 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
    HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r32] = HEAP32[tempDoublePtr >> 2], HEAP32[r32 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
    r37 = r35;
    r38 = r36;
  }
  r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r30], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r30 + 1], HEAPF64[tempDoublePtr >> 3]);
  r30 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 1], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r36 < r30) {
      r40 = r13;
      r41 = r36;
    } else {
      if (r36 == r30) {
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r21], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 1], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3])) {
          r40 = r13;
          r41 = r36;
          break;
        }
      }
      r40 = r15;
      r41 = r30;
    }
  } while (0);
  do {
    if (r41 < r37) {
      r31 = r40 + 48 | 0;
      r42 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r3 = 1368;
      break;
    } else {
      if (r41 != r37) {
        r43 = r37;
        r44 = r38;
        break;
      }
      r31 = r40 + 48 | 0;
      r26 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r31 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r31 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      if (r26 > r38) {
        r43 = r37;
        r44 = r38;
        break;
      } else {
        r42 = r26;
        r3 = 1368;
        break;
      }
    }
  } while (0);
  if (r3 == 1368) {
    HEAPF64[tempDoublePtr >> 3] = r41, HEAP32[r33] = HEAP32[tempDoublePtr >> 2], HEAP32[r33 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
    HEAPF64[tempDoublePtr >> 3] = r42, HEAP32[r32] = HEAP32[tempDoublePtr >> 2], HEAP32[r32 + 1] = HEAP32[tempDoublePtr + 4 >> 2];
    r43 = r41;
    r44 = r42;
  }
  do {
    if (r43 == r36) {
      if (r44 == (HEAP32[tempDoublePtr >> 2] = HEAP32[r21], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 1], HEAPF64[tempDoublePtr >> 3])) {
        break;
      } else {
        r3 = 1371;
        break;
      }
    } else {
      r3 = 1371;
    }
  } while (0);
  do {
    if (r3 == 1371) {
      if (r43 == r30) {
        if (r44 == (HEAP32[tempDoublePtr >> 2] = HEAP32[r27], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r27 + 1], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      do {
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r20], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 1], HEAPF64[tempDoublePtr >> 3]) == r35) {
          r21 = r28 + 48 | 0;
          if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r25], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r25 + 1], HEAPF64[tempDoublePtr >> 3]) == (HEAP32[tempDoublePtr >> 2] = HEAP32[r21 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
            r45 = r28;
            r46 = r35;
            r3 = 1378;
            break;
          } else {
            r3 = 1376;
            break;
          }
        } else {
          r3 = 1376;
        }
      } while (0);
      do {
        if (r3 == 1376) {
          if (___gl_edgeSign(r17, r28, r5) >= 0) {
            break;
          }
          r21 = HEAP32[r22];
          r36 = r21 + 40 | 0;
          r45 = r21;
          r46 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
          r3 = 1378;
          break;
        }
      } while (0);
      do {
        if (r3 == 1378) {
          do {
            if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r19], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 1], HEAPF64[tempDoublePtr >> 3]) == r46) {
              r36 = r45 + 48 | 0;
              if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r29], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r29 + 1], HEAPF64[tempDoublePtr >> 3]) == (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                break;
              } else {
                r3 = 1380;
                break;
              }
            } else {
              r3 = 1380;
            }
          } while (0);
          if (r3 == 1380) {
            if (___gl_edgeSign(r11, r45, r5) <= 0) {
              break;
            }
          }
          if ((___gl_meshSplitEdge(HEAP32[r16]) | 0) == 0) {
            _longjmp(r1 + 2984 | 0, 1);
          }
          if ((___gl_meshSplitEdge(HEAP32[r18]) | 0) == 0) {
            _longjmp(r1 + 2984 | 0, 1);
          }
          if ((___gl_meshSplice(HEAP32[HEAP32[r18] + 12 >> 2], r10) | 0) == 0) {
            _longjmp(r1 + 2984 | 0, 1);
          }
          r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r33], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r33 + 1], HEAPF64[tempDoublePtr >> 3]);
          r21 = HEAP32[r12] + 40 | 0;
          HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r21 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r21 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          r21 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r32], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r32 + 1], HEAPF64[tempDoublePtr >> 3]);
          r36 = HEAP32[r12] + 48 | 0;
          HEAPF64[tempDoublePtr >> 3] = r21, HEAP32[r36 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r36 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
          r36 = (r1 + 108 | 0) >> 2;
          r21 = ___gl_pqSortInsert(HEAP32[r36], HEAP32[r12]);
          HEAP32[HEAP32[r12] + 56 >> 2] = r21;
          r21 = HEAP32[r12];
          if ((HEAP32[r21 + 56 >> 2] | 0) == 2147483647) {
            ___gl_pqSortDeletePriorityQ(HEAP32[r36]);
            HEAP32[r36] = 0;
            _longjmp(r1 + 2984 | 0, 1);
          }
          _GetIntersectData(r1, r21, r13, r17, r15, r11);
          HEAP32[r8 + 5] = 1;
          HEAP32[r2 + 20 >> 2] = 1;
          HEAP32[HEAP32[HEAP32[HEAP32[r6] + 4 >> 2] >> 2] + 20 >> 2] = 1;
          r23 = 0;
          STACKTOP = r4;
          return r23;
        }
      } while (0);
      r21 = HEAP32[r22];
      if ((r11 | 0) == (r21 | 0)) {
        if ((___gl_meshSplitEdge(HEAP32[r16]) | 0) == 0) {
          _longjmp(r1 + 2984 | 0, 1);
        }
        if ((___gl_meshSplice(HEAP32[r18], r10) | 0) == 0) {
          _longjmp(r1 + 2984 | 0, 1);
        }
        r36 = _TopLeftRegion(r2);
        if ((r36 | 0) == 0) {
          _longjmp(r1 + 2984 | 0, 1);
        }
        r42 = HEAP32[HEAP32[HEAP32[r36 + 4 >> 2] + 8 >> 2] >> 2];
        r41 = HEAP32[r42 >> 2];
        _FinishLeftRegions(r1, r42, r9);
        _AddRightEdges(r1, r36, HEAP32[HEAP32[r41 + 4 >> 2] + 12 >> 2], r41, r41, 1);
        r23 = 1;
        STACKTOP = r4;
        return r23;
      }
      if ((r17 | 0) == (r21 | 0)) {
        if ((___gl_meshSplitEdge(HEAP32[r18]) | 0) == 0) {
          _longjmp(r1 + 2984 | 0, 1);
        }
        if ((___gl_meshSplice(HEAP32[r10 + 12 >> 2], HEAP32[HEAP32[r18] + 12 >> 2]) | 0) == 0) {
          _longjmp(r1 + 2984 | 0, 1);
        }
        r41 = _TopRightRegion(r2);
        r36 = HEAP32[HEAP32[HEAP32[HEAP32[HEAP32[HEAP32[r41 + 4 >> 2] + 8 >> 2] >> 2] >> 2] + 4 >> 2] + 8 >> 2];
        HEAP32[r7 >> 2] = HEAP32[HEAP32[r18] + 12 >> 2];
        _AddRightEdges(r1, r41, HEAP32[_FinishLeftRegions(r1, r2, 0) + 8 >> 2], HEAP32[HEAP32[r16] + 8 >> 2], r36, 1);
        r23 = 1;
        STACKTOP = r4;
        return r23;
      }
      do {
        if (___gl_edgeSign(r17, r21, r5) >= 0) {
          HEAP32[r2 + 20 >> 2] = 1;
          HEAP32[HEAP32[HEAP32[HEAP32[r6] + 4 >> 2] >> 2] + 20 >> 2] = 1;
          if ((___gl_meshSplitEdge(HEAP32[r16]) | 0) == 0) {
            _longjmp(r1 + 2984 | 0, 1);
          } else {
            r36 = HEAP32[r22] + 40 | 0;
            r41 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
            r36 = HEAP32[r12] + 40 | 0;
            HEAPF64[tempDoublePtr >> 3] = r41, HEAP32[r36 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r36 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
            r36 = HEAP32[r22] + 48 | 0;
            r41 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r36 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r36 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
            r36 = HEAP32[r12] + 48 | 0;
            HEAPF64[tempDoublePtr >> 3] = r41, HEAP32[r36 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r36 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
            break;
          }
        }
      } while (0);
      if (___gl_edgeSign(r11, HEAP32[r22], r5) > 0) {
        r23 = 0;
        STACKTOP = r4;
        return r23;
      }
      HEAP32[r8 + 5] = 1;
      HEAP32[r2 + 20 >> 2] = 1;
      if ((___gl_meshSplitEdge(HEAP32[r18]) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      r21 = HEAP32[r22] + 40 | 0;
      r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r21 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r21 = HEAP32[r14] + 40 | 0;
      HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r21 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r21 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
      r21 = HEAP32[r22] + 48 | 0;
      r36 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r21 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r21 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r21 = HEAP32[r14] + 48 | 0;
      HEAPF64[tempDoublePtr >> 3] = r36, HEAP32[r21 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r21 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
      r23 = 0;
      STACKTOP = r4;
      return r23;
    }
  } while (0);
  _CheckForRightSplice(r1, r2);
  r23 = 0;
  STACKTOP = r4;
  return r23;
}
_CheckForIntersect["X"] = 1;
function _skip_vertex(r1, r2) {
  return;
}
function _ComputeWinding(r1, r2) {
  var r3;
  r3 = HEAP32[HEAP32[r2 >> 2] + 28 >> 2] + HEAP32[HEAP32[HEAP32[HEAP32[r2 + 4 >> 2] + 4 >> 2] >> 2] + 8 >> 2] | 0;
  HEAP32[r2 + 8 >> 2] = r3;
  HEAP32[r2 + 12 >> 2] = _IsWindingInside(HEAP32[r1 + 96 >> 2], r3);
  return;
}
function _EdgeLeq(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9;
  r4 = HEAP32[r1 + 112 >> 2];
  r1 = HEAP32[r2 >> 2] >> 2;
  r2 = HEAP32[r3 >> 2], r3 = r2 >> 2;
  r5 = HEAP32[HEAP32[r1 + 1] + 16 >> 2];
  r6 = r2 + 4 | 0;
  r2 = HEAP32[HEAP32[r6 >> 2] + 16 >> 2];
  r7 = (r2 | 0) == (r4 | 0);
  if ((r5 | 0) != (r4 | 0)) {
    r8 = HEAP32[r1 + 4];
    if (r7) {
      r9 = ___gl_edgeSign(r5, r4, r8) >= 0 & 1;
      return r9;
    } else {
      r9 = ___gl_edgeEval(r5, r4, r8) >= ___gl_edgeEval(HEAP32[HEAP32[r6 >> 2] + 16 >> 2], r4, HEAP32[r3 + 4]) & 1;
      return r9;
    }
  }
  if (!r7) {
    r9 = ___gl_edgeSign(r2, r4, HEAP32[r3 + 4]) <= 0 & 1;
    return r9;
  }
  r2 = HEAP32[r1 + 4];
  r1 = r2 + 40 | 0;
  r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r1 = HEAP32[r3 + 4];
  r3 = r1 + 40 | 0;
  r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r7 >= r6) {
      if (r7 == r6) {
        r3 = r2 + 48 | 0;
        r8 = r1 + 48 | 0;
        if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
          break;
        }
      }
      r9 = ___gl_edgeSign(r4, r1, r2) >= 0 & 1;
      return r9;
    }
  } while (0);
  r9 = ___gl_edgeSign(r4, r2, r1) <= 0 & 1;
  return r9;
}
_EdgeLeq["X"] = 1;
function ___gl_meshTessellateMonoRegion(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29;
  r2 = 0;
  r3 = HEAP32[r1 + 12 >> 2];
  do {
    if ((r3 | 0) == (r1 | 0)) {
      r2 = 1444;
    } else {
      if ((HEAP32[r3 + 12 >> 2] | 0) == (r1 | 0)) {
        r2 = 1444;
        break;
      } else {
        r4 = r1, r5 = r4 >> 2;
        break;
      }
    }
  } while (0);
  do {
    if (r2 == 1444) {
      ___assert_func(5243156, 82, 5245184, 5243768);
      r4 = r1, r5 = r4 >> 2;
      break;
    }
  } while (0);
  while (1) {
    r1 = HEAP32[HEAP32[r5 + 1] + 16 >> 2];
    r3 = r1 + 40 | 0;
    r6 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r3 = HEAP32[r5 + 4];
    r7 = r3 + 40 | 0;
    r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    if (r6 >= r8) {
      if (r6 != r8) {
        r9 = r4, r10 = r9 >> 2;
        r11 = r3;
        r12 = r8;
        r13 = r1;
        r14 = r6;
        break;
      }
      r7 = r1 + 48 | 0;
      r15 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        r9 = r4, r10 = r9 >> 2;
        r11 = r3;
        r12 = r8;
        r13 = r1;
        r14 = r6;
        break;
      }
    }
    r4 = HEAP32[HEAP32[r5 + 2] + 4 >> 2], r5 = r4 >> 2;
  }
  while (1) {
    if (r12 >= r14) {
      if (r12 != r14) {
        break;
      }
      r4 = r11 + 48 | 0;
      r5 = r13 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) > (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      }
    }
    r5 = HEAP32[r10 + 3];
    r4 = HEAP32[r5 + 16 >> 2];
    r6 = r4 + 40 | 0;
    r1 = HEAP32[HEAP32[r5 + 4 >> 2] + 16 >> 2];
    r8 = r1 + 40 | 0;
    r9 = r5, r10 = r9 >> 2;
    r11 = r4;
    r12 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r6 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r6 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
    r13 = r1;
    r14 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r8 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r8 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  }
  r14 = HEAP32[HEAP32[r10 + 2] + 4 >> 2];
  L1911 : do {
    if ((HEAP32[r10 + 3] | 0) == (r14 | 0)) {
      r16 = r9;
      r17 = r14;
    } else {
      r13 = r14;
      r12 = r9;
      L1912 : while (1) {
        r11 = r13 + 16 | 0;
        r8 = r13 + 12 | 0, r1 = r8 >> 2;
        r6 = r12;
        while (1) {
          r4 = HEAP32[HEAP32[r6 + 4 >> 2] + 16 >> 2];
          r5 = r4 + 40 | 0;
          r3 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
          r5 = HEAP32[r11 >> 2];
          r15 = r5 + 40 | 0;
          r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
          if (r3 < r7) {
            break;
          }
          if (r3 == r7) {
            r7 = r4 + 48 | 0;
            r4 = r5 + 48 | 0;
            if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
              break;
            }
          }
          L1920 : do {
            if ((HEAP32[r1] | 0) == (r6 | 0)) {
              r18 = r6;
            } else {
              r4 = r6;
              while (1) {
                r7 = r4 + 8 | 0;
                r5 = HEAP32[HEAP32[r7 >> 2] + 4 >> 2];
                r3 = HEAP32[r5 + 16 >> 2];
                r15 = r3 + 40 | 0;
                r19 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                r15 = HEAP32[HEAP32[r5 + 4 >> 2] + 16 >> 2];
                r20 = r15 + 40 | 0;
                r21 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
                do {
                  if (r19 < r21) {
                    r22 = r5;
                  } else {
                    if (r19 == r21) {
                      r20 = r3 + 48 | 0;
                      r23 = r15 + 48 | 0;
                      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r23 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r23 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                        r22 = r5;
                        break;
                      }
                    }
                    if (___gl_edgeSign(HEAP32[HEAP32[r4 + 4 >> 2] + 16 >> 2], HEAP32[r4 + 16 >> 2], r3) < 0) {
                      r18 = r4;
                      break L1920;
                    }
                    r22 = HEAP32[HEAP32[r7 >> 2] + 4 >> 2];
                  }
                } while (0);
                r7 = ___gl_meshConnect(r4, r22);
                if ((r7 | 0) == 0) {
                  r24 = 0;
                  r2 = 1483;
                  break L1912;
                }
                r3 = HEAP32[r7 + 4 >> 2];
                if ((HEAP32[r1] | 0) == (r3 | 0)) {
                  r18 = r3;
                  break L1920;
                } else {
                  r4 = r3;
                }
              }
            }
          } while (0);
          r4 = HEAP32[r18 + 12 >> 2];
          if ((HEAP32[r4 + 12 >> 2] | 0) == (r13 | 0)) {
            r16 = r4;
            r17 = r13;
            break L1911;
          } else {
            r6 = r4;
          }
        }
        r11 = HEAP32[r1];
        L1933 : do {
          if ((r11 | 0) == (r6 | 0)) {
            r25 = r13;
          } else {
            r4 = r13;
            r3 = r8;
            r7 = r11;
            while (1) {
              r5 = HEAP32[HEAP32[r7 + 4 >> 2] + 16 >> 2];
              r15 = r5 + 40 | 0;
              r21 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r15 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r15 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
              r15 = HEAP32[r7 + 16 >> 2];
              r19 = r15 + 40 | 0;
              r23 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
              do {
                if (r21 < r23) {
                  r26 = r7;
                } else {
                  if (r21 == r23) {
                    r19 = r5 + 48 | 0;
                    r20 = r15 + 48 | 0;
                    if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r19 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r19 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
                      r26 = r7;
                      break;
                    }
                  }
                  if (___gl_edgeSign(HEAP32[r4 + 16 >> 2], HEAP32[HEAP32[r4 + 4 >> 2] + 16 >> 2], r5) > 0) {
                    r25 = r4;
                    break L1933;
                  }
                  r26 = HEAP32[r3 >> 2];
                }
              } while (0);
              r5 = ___gl_meshConnect(r26, r4);
              if ((r5 | 0) == 0) {
                r24 = 0;
                r2 = 1486;
                break L1912;
              }
              r15 = HEAP32[r5 + 4 >> 2];
              r5 = r15 + 12 | 0;
              r23 = HEAP32[r5 >> 2];
              if ((r23 | 0) == (r6 | 0)) {
                r25 = r15;
                break L1933;
              } else {
                r4 = r15;
                r3 = r5;
                r7 = r23;
              }
            }
          }
        } while (0);
        r11 = HEAP32[HEAP32[r25 + 8 >> 2] + 4 >> 2];
        if ((HEAP32[r6 + 12 >> 2] | 0) == (r11 | 0)) {
          r16 = r6;
          r17 = r11;
          break L1911;
        } else {
          r13 = r11;
          r12 = r6;
        }
      }
      if (r2 == 1483) {
        return r24;
      } else if (r2 == 1486) {
        return r24;
      }
    }
  } while (0);
  r25 = r17 + 12 | 0;
  r26 = HEAP32[r25 >> 2];
  if ((r26 | 0) == (r16 | 0)) {
    ___assert_func(5243156, 118, 5245184, 5243528);
    r27 = HEAP32[r25 >> 2];
  } else {
    r27 = r26;
  }
  if ((HEAP32[r27 + 12 >> 2] | 0) == (r16 | 0)) {
    r24 = 1;
    return r24;
  } else {
    r28 = r17;
    r29 = r27;
  }
  while (1) {
    r27 = ___gl_meshConnect(r29, r28);
    if ((r27 | 0) == 0) {
      r24 = 0;
      r2 = 1484;
      break;
    }
    r17 = HEAP32[r27 + 4 >> 2];
    r27 = HEAP32[r17 + 12 >> 2];
    if ((HEAP32[r27 + 12 >> 2] | 0) == (r16 | 0)) {
      r24 = 1;
      r2 = 1485;
      break;
    } else {
      r28 = r17;
      r29 = r27;
    }
  }
  if (r2 == 1484) {
    return r24;
  } else if (r2 == 1485) {
    return r24;
  }
}
___gl_meshTessellateMonoRegion["X"] = 1;
function ___gl_meshTessellateInterior(r1) {
  var r2, r3, r4, r5, r6;
  r2 = 0;
  r3 = r1 + 60 | 0;
  r1 = HEAP32[r3 >> 2];
  if ((r1 | 0) == (r3 | 0)) {
    r4 = 1;
    return r4;
  } else {
    r5 = r1, r6 = r5 >> 2;
  }
  while (1) {
    r1 = HEAP32[r6];
    if ((HEAP32[r6 + 6] | 0) != 0) {
      if ((___gl_meshTessellateMonoRegion(HEAP32[r6 + 2]) | 0) == 0) {
        r4 = 0;
        r2 = 1494;
        break;
      }
    }
    if ((r1 | 0) == (r3 | 0)) {
      r4 = 1;
      r2 = 1493;
      break;
    } else {
      r5 = r1, r6 = r5 >> 2;
    }
  }
  if (r2 == 1494) {
    return r4;
  } else if (r2 == 1493) {
    return r4;
  }
}
function ___gl_meshDiscardExterior(r1) {
  var r2, r3;
  r2 = r1 + 60 | 0;
  r1 = HEAP32[r2 >> 2];
  if ((r1 | 0) == (r2 | 0)) {
    return;
  } else {
    r3 = r1;
  }
  while (1) {
    r1 = HEAP32[r3 >> 2];
    if ((HEAP32[r3 + 24 >> 2] | 0) == 0) {
      ___gl_meshZapFace(r3);
    }
    if ((r1 | 0) == (r2 | 0)) {
      break;
    } else {
      r3 = r1;
    }
  }
  return;
}
function ___gl_meshSetWindingNumber(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = 0;
  r3 = r1 + 88 | 0;
  r1 = HEAP32[r3 >> 2];
  if ((r1 | 0) == (r3 | 0)) {
    r4 = 1;
    return r4;
  } else {
    r5 = r1, r6 = r5 >> 2;
  }
  while (1) {
    r1 = HEAP32[r6];
    r7 = HEAP32[HEAP32[r6 + 5] + 24 >> 2];
    if ((HEAP32[HEAP32[HEAP32[r6 + 1] + 20 >> 2] + 24 >> 2] | 0) == (r7 | 0)) {
      if ((___gl_meshDelete(r5) | 0) == 0) {
        r4 = 0;
        r2 = 1510;
        break;
      }
    } else {
      HEAP32[r6 + 7] = (r7 | 0) != 0 ? 1 : -1;
    }
    if ((r1 | 0) == (r3 | 0)) {
      r4 = 1;
      r2 = 1508;
      break;
    } else {
      r5 = r1, r6 = r5 >> 2;
    }
  }
  if (r2 == 1510) {
    return r4;
  } else if (r2 == 1508) {
    return r4;
  }
}
function _new_tess_context() {
  var r1, r2;
  r1 = _malloc(32), r2 = r1 >> 2;
  HEAP32[r2] = 0;
  HEAP32[r2 + 1] = 0;
  HEAP32[r2 + 2] = 0;
  HEAP32[r2 + 3] = 0;
  HEAP32[r2 + 4] = 0;
  HEAP32[r2 + 7] = 8;
  HEAP32[r2 + 6] = 0;
  return r1;
}
function _destroy_tess_context(r1) {
  _free(r1);
  return;
}
function _new_vertex(r1, r2, r3) {
  var r4, r5, r6, r7;
  r4 = _malloc(32), r5 = r4 >> 2;
  r6 = r4;
  r7 = (r1 + 16 | 0) >> 2;
  HEAP32[r5 + 7] = HEAP32[r7];
  r1 = r4;
  HEAPF64[tempDoublePtr >> 3] = r2, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r1 = r4 + 8 | 0;
  HEAPF64[tempDoublePtr >> 3] = r3, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r1 = r4 + 16 | 0;
  HEAPF64[tempDoublePtr >> 3] = 0, HEAP32[r1 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r1 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r1 = HEAP32[r7];
  if ((r1 | 0) == 0) {
    HEAP32[r5 + 6] = 0;
    HEAP32[r7] = r6;
    return r6;
  } else {
    HEAP32[r5 + 6] = HEAP32[r1 + 24 >> 2] + 1 | 0;
    HEAP32[r7] = r6;
    return r6;
  }
}
function _new_triangle(r1, r2, r3, r4) {
  var r5, r6, r7;
  r5 = _malloc(16), r6 = r5 >> 2;
  r7 = r1 | 0;
  HEAP32[r6 + 3] = HEAP32[r7 >> 2];
  HEAP32[r6] = r2;
  HEAP32[r6 + 1] = r3;
  HEAP32[r6 + 2] = r4;
  r4 = r1 + 4 | 0;
  HEAP32[r4 >> 2] = HEAP32[r4 >> 2] + 1 | 0;
  HEAP32[r7 >> 2] = r5;
  return;
}
function _fan_vertex(r1, r2) {
  var r3, r4, r5;
  r3 = r2 + 12 | 0;
  r4 = HEAP32[r3 >> 2];
  if ((r4 | 0) == 0) {
    HEAP32[r3 >> 2] = r1;
    return;
  }
  r3 = (r2 + 8 | 0) >> 2;
  r5 = HEAP32[r3];
  if ((r5 | 0) == 0) {
    HEAP32[r3] = r1;
    return;
  } else {
    _new_triangle(r2, HEAP32[r4 + 24 >> 2], HEAP32[r5 + 24 >> 2], HEAP32[r1 + 24 >> 2]);
    HEAP32[r3] = r1;
    return;
  }
}
function _strip_vertex(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = (r2 + 8 | 0) >> 2;
  r4 = HEAP32[r3];
  if ((r4 | 0) == 0) {
    HEAP32[r3] = r1;
    return;
  }
  r5 = (r2 + 12 | 0) >> 2;
  r6 = HEAP32[r5];
  if ((r6 | 0) == 0) {
    HEAP32[r5] = r1;
    return;
  }
  r7 = (r2 + 24 | 0) >> 2;
  if ((HEAP32[r7] | 0) == 0) {
    _new_triangle(r2, HEAP32[r4 + 24 >> 2], HEAP32[r6 + 24 >> 2], HEAP32[r1 + 24 >> 2]);
  } else {
    _new_triangle(r2, HEAP32[r6 + 24 >> 2], HEAP32[r4 + 24 >> 2], HEAP32[r1 + 24 >> 2]);
  }
  HEAP32[r7] = (HEAP32[r7] | 0) == 0 & 1;
  HEAP32[r3] = HEAP32[r5];
  HEAP32[r5] = r1;
  return;
}
function _ConnectLeftDegenerate(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20;
  r4 = HEAP32[r2 >> 2], r5 = r4 >> 2;
  r6 = HEAP32[r5 + 4];
  r7 = r6 + 40 | 0;
  r8 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  r7 = r3 + 40 | 0;
  r9 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
  do {
    if (r8 == r9) {
      r7 = r6 + 48 | 0;
      r10 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      }
      ___assert_func(5243336, 957, 5245432, 5243708);
      _SpliceMergeVertices(r1, r4, HEAP32[r3 + 8 >> 2]);
      return;
    }
  } while (0);
  r6 = HEAP32[r5 + 1];
  r8 = HEAP32[r6 + 16 >> 2];
  r10 = r8 + 40 | 0;
  do {
    if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r10 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r10 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) == r9) {
      r7 = r8 + 48 | 0;
      r11 = r3 + 48 | 0;
      if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r7 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r7 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) != (HEAP32[tempDoublePtr >> 2] = HEAP32[r11 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r11 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
        break;
      }
      ___assert_func(5243336, 978, 5245432, 5243708);
      r11 = _TopRightRegion(r2);
      r7 = HEAP32[HEAP32[HEAP32[r11 + 4 >> 2] + 8 >> 2] >> 2];
      r12 = r7;
      r13 = HEAP32[HEAP32[r7 >> 2] + 4 >> 2];
      r14 = HEAP32[r13 + 8 >> 2], r15 = r14 >> 2;
      do {
        if ((HEAP32[r7 + 24 >> 2] | 0) == 0) {
          r16 = r13;
        } else {
          if ((r14 | 0) == (r13 | 0)) {
            ___assert_func(5243336, 987, 5245432, 5243672);
          }
          _DeleteRegion(r12);
          if ((___gl_meshDelete(r13) | 0) == 0) {
            _longjmp(r1 + 2984 | 0, 1);
          } else {
            r16 = HEAP32[HEAP32[r15 + 1] + 12 >> 2];
            break;
          }
        }
      } while (0);
      if ((___gl_meshSplice(HEAP32[r3 + 8 >> 2], r16) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      }
      r13 = HEAP32[HEAP32[r15 + 1] + 16 >> 2];
      r12 = r13 + 40 | 0;
      r7 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      r12 = HEAP32[r15 + 4];
      r17 = r12 + 40 | 0;
      r18 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r17 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r17 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
      do {
        if (r7 < r18) {
          r19 = r14;
        } else {
          if (r7 == r18) {
            r17 = r13 + 48 | 0;
            r20 = r12 + 48 | 0;
            if ((HEAP32[tempDoublePtr >> 2] = HEAP32[r17 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r17 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]) <= (HEAP32[tempDoublePtr >> 2] = HEAP32[r20 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r20 + 4 >> 2], HEAPF64[tempDoublePtr >> 3])) {
              r19 = r14;
              break;
            }
          }
          r19 = 0;
        }
      } while (0);
      _AddRightEdges(r1, r11, HEAP32[r16 + 8 >> 2], r14, r19, 1);
      return;
    }
  } while (0);
  if ((___gl_meshSplitEdge(r6) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  r6 = r2 + 24 | 0;
  do {
    if ((HEAP32[r6 >> 2] | 0) != 0) {
      if ((___gl_meshDelete(HEAP32[r5 + 2]) | 0) == 0) {
        _longjmp(r1 + 2984 | 0, 1);
      } else {
        HEAP32[r6 >> 2] = 0;
        break;
      }
    }
  } while (0);
  if ((___gl_meshSplice(HEAP32[r3 + 8 >> 2], r4) | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  _SweepEvent(r1, r3);
  return;
}
_ConnectLeftDegenerate["X"] = 1;
function _AddSentinel(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = _malloc(28), r4 = r3 >> 2;
  if ((r3 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  r5 = ___gl_meshMakeEdge(HEAP32[r1 + 8 >> 2]);
  if ((r5 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  }
  r6 = r5 + 16 | 0;
  r7 = HEAP32[r6 >> 2] + 40 | 0;
  HEAPF64[tempDoublePtr >> 3] = 4e+150, HEAP32[r7 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r7 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r7 = HEAP32[r6 >> 2] + 48 | 0;
  HEAPF64[tempDoublePtr >> 3] = r2, HEAP32[r7 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r7 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r7 = (r5 + 4 | 0) >> 2;
  r6 = HEAP32[HEAP32[r7] + 16 >> 2] + 40 | 0;
  HEAPF64[tempDoublePtr >> 3] = -4e+150, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  r6 = HEAP32[HEAP32[r7] + 16 >> 2] + 48 | 0;
  HEAPF64[tempDoublePtr >> 3] = r2, HEAP32[r6 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r6 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
  HEAP32[r1 + 112 >> 2] = HEAP32[HEAP32[r7] + 16 >> 2];
  HEAP32[r4] = r5;
  HEAP32[r4 + 2] = 0;
  HEAP32[r4 + 3] = 0;
  HEAP32[r4 + 6] = 0;
  HEAP32[r4 + 4] = 1;
  HEAP32[r4 + 5] = 0;
  r5 = HEAP32[r1 + 104 >> 2];
  r7 = ___gl_dictListInsertBefore(r5, r5 | 0, r3);
  HEAP32[r4 + 1] = r7;
  if ((r7 | 0) == 0) {
    _longjmp(r1 + 2984 | 0, 1);
  } else {
    return;
  }
}
_AddSentinel["X"] = 1;
function _triangle_vertex(r1, r2) {
  var r3, r4, r5, r6;
  r3 = (r2 + 12 | 0) >> 2;
  r4 = HEAP32[r3];
  if ((r4 | 0) == 0) {
    HEAP32[r3] = r1;
    return;
  }
  r5 = (r2 + 8 | 0) >> 2;
  r6 = HEAP32[r5];
  if ((r6 | 0) == 0) {
    HEAP32[r5] = r1;
    return;
  } else {
    _new_triangle(r2, HEAP32[r4 + 24 >> 2], HEAP32[r6 + 24 >> 2], HEAP32[r1 + 24 >> 2]);
    HEAP32[r3] = 0;
    HEAP32[r5] = 0;
    return;
  }
}
function _vertex(r1, r2) {
  FUNCTION_TABLE[HEAP32[r2 + 28 >> 2]](r1, r2);
  return;
}
function _begin(r1, r2) {
  var r3;
  r3 = r2 >> 2;
  r2 = STACKTOP;
  HEAP32[r3 + 3] = 0;
  HEAP32[r3 + 2] = 0;
  HEAP32[r3 + 6] = 0;
  if ((r1 | 0) == 6) {
    HEAP32[r3 + 7] = 20;
    STACKTOP = r2;
    return;
  } else if ((r1 | 0) == 4) {
    HEAP32[r3 + 7] = 16;
    STACKTOP = r2;
    return;
  } else if ((r1 | 0) == 5) {
    HEAP32[r3 + 7] = 30;
    STACKTOP = r2;
    return;
  } else {
    _fprintf(HEAP32[_stderr >> 2], 5243028, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r1, tempInt));
    HEAP32[r3 + 7] = 8;
    STACKTOP = r2;
    return;
  }
}
function _combine(r1, r2, r3, r4, r5) {
  r3 = r1 + 8 | 0;
  HEAP32[r4 >> 2] = _new_vertex(r5, (HEAP32[tempDoublePtr >> 2] = HEAP32[r1 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r1 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]), (HEAP32[tempDoublePtr >> 2] = HEAP32[r3 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r3 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]));
  return;
}
function _write_output(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11, r12;
  r6 = (r1 + 16 | 0) >> 2;
  r7 = HEAP32[HEAP32[r6] + 24 >> 2] + 1 | 0;
  HEAP32[r4 >> 2] = r7;
  r4 = r1 + 4 | 0;
  r8 = HEAP32[r4 >> 2];
  HEAP32[r5 >> 2] = r8;
  HEAP32[r2 >> 2] = _malloc(r7 << 4);
  r7 = HEAP32[r4 >> 2];
  if ((r7 | 0) == 0) {
    r9 = 0;
  } else {
    r9 = _malloc(r7 * 12 & -1);
  }
  HEAP32[r3 >> 2] = r9;
  r9 = HEAP32[r6];
  L2103 : do {
    if ((r9 | 0) != 0) {
      r7 = r9;
      while (1) {
        r4 = r7 | 0;
        r5 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r4 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r4 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r4 = (HEAP32[r7 + 24 >> 2] << 4) + HEAP32[r2 >> 2] | 0;
        HEAPF64[tempDoublePtr >> 3] = r5, HEAP32[r4 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r4 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
        r4 = HEAP32[r6];
        r5 = r4 + 8 | 0;
        r10 = (HEAP32[tempDoublePtr >> 2] = HEAP32[r5 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r5 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
        r5 = ((HEAP32[r4 + 24 >> 2] << 1 | 1) << 3) + HEAP32[r2 >> 2] | 0;
        HEAPF64[tempDoublePtr >> 3] = r10, HEAP32[r5 >> 2] = HEAP32[tempDoublePtr >> 2], HEAP32[r5 + 4 >> 2] = HEAP32[tempDoublePtr + 4 >> 2];
        r5 = HEAP32[r6];
        r10 = HEAP32[r5 + 28 >> 2];
        _free(r5);
        HEAP32[r6] = r10;
        if ((r10 | 0) == 0) {
          break L2103;
        } else {
          r7 = r10;
        }
      }
    }
  } while (0);
  r6 = (r1 | 0) >> 2;
  r1 = HEAP32[r6];
  if ((r1 | 0) == 0) {
    return;
  } else {
    r11 = r8;
    r12 = r1;
  }
  while (1) {
    r1 = r11 * 3 & -1;
    HEAP32[HEAP32[r3 >> 2] + (r1 - 3 << 2) >> 2] = HEAP32[r12 >> 2];
    HEAP32[HEAP32[r3 >> 2] + (r1 - 2 << 2) >> 2] = HEAP32[HEAP32[r6] + 4 >> 2];
    HEAP32[HEAP32[r3 >> 2] + (r1 - 1 << 2) >> 2] = HEAP32[HEAP32[r6] + 8 >> 2];
    r1 = HEAP32[r6];
    r8 = HEAP32[r1 + 12 >> 2];
    _free(r1);
    HEAP32[r6] = r8;
    if ((r8 | 0) == 0) {
      break;
    }
    r11 = r11 - 1 | 0;
    r12 = r8;
  }
  return;
}
_write_output["X"] = 1;
function _tessellate(r1, r2, r3, r4, r5, r6) {
  var r7, r8, r9, r10, r11, r12, r13, r14;
  r7 = _gluNewTess();
  r8 = _new_tess_context();
  _gluTessProperty(r7);
  _gluTessCallback(r7, 100107, 38);
  _gluTessCallback(r7, 100106, 2);
  _gluTessCallback(r7, 100111, 32);
  _gluTessBeginPolygon(r7, r8);
  r9 = r6 - 4 | 0;
  r6 = r5;
  while (1) {
    r5 = r6 + 4 | 0;
    r10 = HEAP32[r6 >> 2];
    r11 = HEAP32[r5 >> 2];
    _gluTessBeginContour(r7);
    L2116 : do {
      if ((r10 | 0) != (r11 | 0)) {
        r12 = r10;
        while (1) {
          r13 = r12 + 8 | 0;
          r14 = _new_vertex(r8, (HEAP32[tempDoublePtr >> 2] = HEAP32[r12 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r12 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]), (HEAP32[tempDoublePtr >> 2] = HEAP32[r13 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r13 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]));
          r13 = r12 + 16 | 0;
          _gluTessVertex(r7, r14 | 0, r14);
          if ((r13 | 0) == (r11 | 0)) {
            break L2116;
          } else {
            r12 = r13;
          }
        }
      }
    } while (0);
    _gluTessEndContour(r7);
    if ((r5 | 0) == (r9 | 0)) {
      break;
    } else {
      r6 = r5;
    }
  }
  _gluTessEndPolygon(r7);
  _write_output(r8, r1, r3, r2, r4);
  _destroy_tess_context(r8);
  _gluDeleteTess(r7);
  return;
}
Module["_tessellate"] = _tessellate;
function _malloc(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19;
  do {
    if (r1 >>> 0 < 245) {
      if (r1 >>> 0 < 11) {
        r2 = 16;
      } else {
        r2 = r1 + 11 & -8;
      }
      r3 = r2 >>> 3;
      r4 = HEAP32[1311136];
      r5 = r4 >>> (r3 >>> 0);
      if ((r5 & 3 | 0) != 0) {
        r6 = (r5 & 1 ^ 1) + r3 | 0;
        r7 = r6 << 1;
        r8 = (r7 << 2) + 5244584 | 0;
        r9 = (r7 + 2 << 2) + 5244584 | 0;
        r7 = HEAP32[r9 >> 2];
        r10 = r7 + 8 | 0;
        r11 = HEAP32[r10 >> 2];
        do {
          if ((r8 | 0) == (r11 | 0)) {
            HEAP32[1311136] = r4 & (1 << r6 ^ -1);
          } else {
            if (r11 >>> 0 < HEAP32[1311140] >>> 0) {
              _abort();
            } else {
              HEAP32[r9 >> 2] = r11;
              HEAP32[r11 + 12 >> 2] = r8;
              break;
            }
          }
        } while (0);
        r8 = r6 << 3;
        HEAP32[r7 + 4 >> 2] = r8 | 3;
        r11 = r7 + (r8 | 4) | 0;
        HEAP32[r11 >> 2] = HEAP32[r11 >> 2] | 1;
        r12 = r10;
        return r12;
      }
      if (r2 >>> 0 <= HEAP32[1311138] >>> 0) {
        r13 = r2;
        break;
      }
      if ((r5 | 0) == 0) {
        if ((HEAP32[1311137] | 0) == 0) {
          r13 = r2;
          break;
        }
        r11 = _tmalloc_small(r2);
        if ((r11 | 0) == 0) {
          r13 = r2;
          break;
        } else {
          r12 = r11;
        }
        return r12;
      }
      r11 = 2 << r3;
      r8 = r5 << r3 & (r11 | -r11);
      r11 = (r8 & -r8) - 1 | 0;
      r8 = r11 >>> 12 & 16;
      r9 = r11 >>> (r8 >>> 0);
      r11 = r9 >>> 5 & 8;
      r14 = r9 >>> (r11 >>> 0);
      r9 = r14 >>> 2 & 4;
      r15 = r14 >>> (r9 >>> 0);
      r14 = r15 >>> 1 & 2;
      r16 = r15 >>> (r14 >>> 0);
      r15 = r16 >>> 1 & 1;
      r17 = (r11 | r8 | r9 | r14 | r15) + (r16 >>> (r15 >>> 0)) | 0;
      r15 = r17 << 1;
      r16 = (r15 << 2) + 5244584 | 0;
      r14 = (r15 + 2 << 2) + 5244584 | 0;
      r15 = HEAP32[r14 >> 2];
      r9 = r15 + 8 | 0;
      r8 = HEAP32[r9 >> 2];
      do {
        if ((r16 | 0) == (r8 | 0)) {
          HEAP32[1311136] = r4 & (1 << r17 ^ -1);
        } else {
          if (r8 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          } else {
            HEAP32[r14 >> 2] = r8;
            HEAP32[r8 + 12 >> 2] = r16;
            break;
          }
        }
      } while (0);
      r16 = r17 << 3;
      r8 = r16 - r2 | 0;
      HEAP32[r15 + 4 >> 2] = r2 | 3;
      r14 = r15;
      r4 = r14 + r2 | 0;
      HEAP32[r14 + (r2 | 4) >> 2] = r8 | 1;
      HEAP32[r14 + r16 >> 2] = r8;
      r16 = HEAP32[1311138];
      if ((r16 | 0) != 0) {
        r14 = HEAP32[1311141];
        r3 = r16 >>> 3;
        r16 = r3 << 1;
        r5 = (r16 << 2) + 5244584 | 0;
        r10 = HEAP32[1311136];
        r7 = 1 << r3;
        do {
          if ((r10 & r7 | 0) == 0) {
            HEAP32[1311136] = r10 | r7;
            r18 = r5;
            r19 = (r16 + 2 << 2) + 5244584 | 0;
          } else {
            r3 = (r16 + 2 << 2) + 5244584 | 0;
            r6 = HEAP32[r3 >> 2];
            if (r6 >>> 0 >= HEAP32[1311140] >>> 0) {
              r18 = r6;
              r19 = r3;
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r19 >> 2] = r14;
        HEAP32[r18 + 12 >> 2] = r14;
        HEAP32[r14 + 8 >> 2] = r18;
        HEAP32[r14 + 12 >> 2] = r5;
      }
      HEAP32[1311138] = r8;
      HEAP32[1311141] = r4;
      r12 = r9;
      return r12;
    } else {
      if (r1 >>> 0 > 4294967231) {
        r13 = -1;
        break;
      }
      r16 = r1 + 11 & -8;
      if ((HEAP32[1311137] | 0) == 0) {
        r13 = r16;
        break;
      }
      r7 = _tmalloc_large(r16);
      if ((r7 | 0) == 0) {
        r13 = r16;
        break;
      } else {
        r12 = r7;
      }
      return r12;
    }
  } while (0);
  r1 = HEAP32[1311138];
  if (r13 >>> 0 > r1 >>> 0) {
    r18 = HEAP32[1311139];
    if (r13 >>> 0 < r18 >>> 0) {
      r19 = r18 - r13 | 0;
      HEAP32[1311139] = r19;
      r18 = HEAP32[1311142];
      r2 = r18;
      HEAP32[1311142] = r2 + r13 | 0;
      HEAP32[r13 + (r2 + 4) >> 2] = r19 | 1;
      HEAP32[r18 + 4 >> 2] = r13 | 3;
      r12 = r18 + 8 | 0;
      return r12;
    } else {
      r12 = _sys_alloc(r13);
      return r12;
    }
  } else {
    r18 = r1 - r13 | 0;
    r19 = HEAP32[1311141];
    if (r18 >>> 0 > 15) {
      r2 = r19;
      HEAP32[1311141] = r2 + r13 | 0;
      HEAP32[1311138] = r18;
      HEAP32[r13 + (r2 + 4) >> 2] = r18 | 1;
      HEAP32[r2 + r1 >> 2] = r18;
      HEAP32[r19 + 4 >> 2] = r13 | 3;
    } else {
      HEAP32[1311138] = 0;
      HEAP32[1311141] = 0;
      HEAP32[r19 + 4 >> 2] = r1 | 3;
      r13 = r1 + (r19 + 4) | 0;
      HEAP32[r13 >> 2] = HEAP32[r13 >> 2] | 1;
    }
    r12 = r19 + 8 | 0;
    return r12;
  }
}
Module["_malloc"] = _malloc;
_malloc["X"] = 1;
function _tmalloc_small(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21;
  r2 = HEAP32[1311137];
  r3 = (r2 & -r2) - 1 | 0;
  r2 = r3 >>> 12 & 16;
  r4 = r3 >>> (r2 >>> 0);
  r3 = r4 >>> 5 & 8;
  r5 = r4 >>> (r3 >>> 0);
  r4 = r5 >>> 2 & 4;
  r6 = r5 >>> (r4 >>> 0);
  r5 = r6 >>> 1 & 2;
  r7 = r6 >>> (r5 >>> 0);
  r6 = r7 >>> 1 & 1;
  r8 = HEAP32[((r3 | r2 | r4 | r5 | r6) + (r7 >>> (r6 >>> 0)) << 2) + 5244848 >> 2];
  r6 = r8;
  r7 = r8, r5 = r7 >> 2;
  r4 = (HEAP32[r8 + 4 >> 2] & -8) - r1 | 0;
  while (1) {
    r8 = HEAP32[r6 + 16 >> 2];
    if ((r8 | 0) == 0) {
      r2 = HEAP32[r6 + 20 >> 2];
      if ((r2 | 0) == 0) {
        break;
      } else {
        r9 = r2;
      }
    } else {
      r9 = r8;
    }
    r8 = (HEAP32[r9 + 4 >> 2] & -8) - r1 | 0;
    r2 = r8 >>> 0 < r4 >>> 0;
    r6 = r9;
    r7 = r2 ? r9 : r7, r5 = r7 >> 2;
    r4 = r2 ? r8 : r4;
  }
  r9 = r7;
  r6 = HEAP32[1311140];
  if (r9 >>> 0 < r6 >>> 0) {
    _abort();
  }
  r8 = r9 + r1 | 0;
  r2 = r8;
  if (r9 >>> 0 >= r8 >>> 0) {
    _abort();
  }
  r8 = HEAP32[r5 + 6];
  r3 = HEAP32[r5 + 3];
  L2191 : do {
    if ((r3 | 0) == (r7 | 0)) {
      r10 = r7 + 20 | 0;
      r11 = HEAP32[r10 >> 2];
      do {
        if ((r11 | 0) == 0) {
          r12 = r7 + 16 | 0;
          r13 = HEAP32[r12 >> 2];
          if ((r13 | 0) == 0) {
            r14 = 0, r15 = r14 >> 2;
            break L2191;
          } else {
            r16 = r13;
            r17 = r12;
            break;
          }
        } else {
          r16 = r11;
          r17 = r10;
        }
      } while (0);
      while (1) {
        r10 = r16 + 20 | 0;
        r11 = HEAP32[r10 >> 2];
        if ((r11 | 0) != 0) {
          r16 = r11;
          r17 = r10;
          continue;
        }
        r10 = r16 + 16 | 0;
        r11 = HEAP32[r10 >> 2];
        if ((r11 | 0) == 0) {
          break;
        } else {
          r16 = r11;
          r17 = r10;
        }
      }
      if (r17 >>> 0 < r6 >>> 0) {
        _abort();
      } else {
        HEAP32[r17 >> 2] = 0;
        r14 = r16, r15 = r14 >> 2;
        break;
      }
    } else {
      r10 = HEAP32[r5 + 2];
      if (r10 >>> 0 < r6 >>> 0) {
        _abort();
      } else {
        HEAP32[r10 + 12 >> 2] = r3;
        HEAP32[r3 + 8 >> 2] = r10;
        r14 = r3, r15 = r14 >> 2;
        break;
      }
    }
  } while (0);
  L2207 : do {
    if ((r8 | 0) != 0) {
      r3 = r7 + 28 | 0;
      r6 = (HEAP32[r3 >> 2] << 2) + 5244848 | 0;
      do {
        if ((r7 | 0) == (HEAP32[r6 >> 2] | 0)) {
          HEAP32[r6 >> 2] = r14;
          if ((r14 | 0) != 0) {
            break;
          }
          HEAP32[1311137] = HEAP32[1311137] & (1 << HEAP32[r3 >> 2] ^ -1);
          break L2207;
        } else {
          if (r8 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          }
          r16 = r8 + 16 | 0;
          if ((HEAP32[r16 >> 2] | 0) == (r7 | 0)) {
            HEAP32[r16 >> 2] = r14;
          } else {
            HEAP32[r8 + 20 >> 2] = r14;
          }
          if ((r14 | 0) == 0) {
            break L2207;
          }
        }
      } while (0);
      if (r14 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      }
      HEAP32[r15 + 6] = r8;
      r3 = HEAP32[r5 + 4];
      do {
        if ((r3 | 0) != 0) {
          if (r3 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          } else {
            HEAP32[r15 + 4] = r3;
            HEAP32[r3 + 24 >> 2] = r14;
            break;
          }
        }
      } while (0);
      r3 = HEAP32[r5 + 5];
      if ((r3 | 0) == 0) {
        break;
      }
      if (r3 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      } else {
        HEAP32[r15 + 5] = r3;
        HEAP32[r3 + 24 >> 2] = r14;
        break;
      }
    }
  } while (0);
  if (r4 >>> 0 < 16) {
    r14 = r4 + r1 | 0;
    HEAP32[r5 + 1] = r14 | 3;
    r15 = r14 + (r9 + 4) | 0;
    HEAP32[r15 >> 2] = HEAP32[r15 >> 2] | 1;
    r18 = r7 + 8 | 0;
    r19 = r18;
    return r19;
  }
  HEAP32[r5 + 1] = r1 | 3;
  HEAP32[r1 + (r9 + 4) >> 2] = r4 | 1;
  HEAP32[r9 + r4 + r1 >> 2] = r4;
  r1 = HEAP32[1311138];
  if ((r1 | 0) != 0) {
    r9 = HEAP32[1311141];
    r5 = r1 >>> 3;
    r1 = r5 << 1;
    r15 = (r1 << 2) + 5244584 | 0;
    r14 = HEAP32[1311136];
    r8 = 1 << r5;
    do {
      if ((r14 & r8 | 0) == 0) {
        HEAP32[1311136] = r14 | r8;
        r20 = r15;
        r21 = (r1 + 2 << 2) + 5244584 | 0;
      } else {
        r5 = (r1 + 2 << 2) + 5244584 | 0;
        r3 = HEAP32[r5 >> 2];
        if (r3 >>> 0 >= HEAP32[1311140] >>> 0) {
          r20 = r3;
          r21 = r5;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[r21 >> 2] = r9;
    HEAP32[r20 + 12 >> 2] = r9;
    HEAP32[r9 + 8 >> 2] = r20;
    HEAP32[r9 + 12 >> 2] = r15;
  }
  HEAP32[1311138] = r4;
  HEAP32[1311141] = r2;
  r18 = r7 + 8 | 0;
  r19 = r18;
  return r19;
}
_tmalloc_small["X"] = 1;
function _sys_alloc(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22;
  r2 = 0;
  if ((HEAP32[1310720] | 0) == 0) {
    _init_mparams();
  }
  L2252 : do {
    if ((HEAP32[1311246] & 4 | 0) == 0) {
      r3 = HEAP32[1311142];
      do {
        if ((r3 | 0) == 0) {
          r2 = 1717;
        } else {
          r4 = _segment_holding(r3);
          if ((r4 | 0) == 0) {
            r2 = 1717;
            break;
          }
          r5 = HEAP32[1310722];
          r6 = r1 + 47 - HEAP32[1311139] + r5 & -r5;
          if (r6 >>> 0 >= 2147483647) {
            r7 = 0;
            break;
          }
          r5 = _sbrk(r6);
          r8 = (r5 | 0) == (HEAP32[r4 >> 2] + HEAP32[r4 + 4 >> 2] | 0);
          r9 = r8 ? r5 : -1;
          r10 = r8 ? r6 : 0;
          r11 = r5;
          r12 = r6;
          r2 = 1724;
          break;
        }
      } while (0);
      do {
        if (r2 == 1717) {
          r3 = _sbrk(0);
          if ((r3 | 0) == -1) {
            r7 = 0;
            break;
          }
          r6 = HEAP32[1310722];
          r5 = r6 + (r1 + 47) & -r6;
          r6 = r3;
          r8 = HEAP32[1310721];
          r4 = r8 - 1 | 0;
          if ((r4 & r6 | 0) == 0) {
            r13 = r5;
          } else {
            r13 = r5 - r6 + (r4 + r6 & -r8) | 0;
          }
          if (r13 >>> 0 >= 2147483647) {
            r7 = 0;
            break;
          }
          r8 = _sbrk(r13);
          r6 = (r8 | 0) == (r3 | 0);
          r9 = r6 ? r3 : -1;
          r10 = r6 ? r13 : 0;
          r11 = r8;
          r12 = r13;
          r2 = 1724;
          break;
        }
      } while (0);
      L2265 : do {
        if (r2 == 1724) {
          r8 = -r12 | 0;
          if ((r9 | 0) != -1) {
            r14 = r10;
            r15 = r9;
            r2 = 1737;
            break L2252;
          }
          do {
            if ((r11 | 0) != -1 & r12 >>> 0 < 2147483647) {
              if (r12 >>> 0 >= (r1 + 48 | 0) >>> 0) {
                r16 = r12;
                break;
              }
              r6 = HEAP32[1310722];
              r3 = r1 + 47 - r12 + r6 & -r6;
              if (r3 >>> 0 >= 2147483647) {
                r16 = r12;
                break;
              }
              if ((_sbrk(r3) | 0) == -1) {
                _sbrk(r8);
                r7 = r10;
                break L2265;
              } else {
                r16 = r3 + r12 | 0;
                break;
              }
            } else {
              r16 = r12;
            }
          } while (0);
          if ((r11 | 0) != -1) {
            r14 = r16;
            r15 = r11;
            r2 = 1737;
            break L2252;
          }
          HEAP32[1311246] = HEAP32[1311246] | 4;
          r17 = r10;
          r2 = 1734;
          break L2252;
        }
      } while (0);
      HEAP32[1311246] = HEAP32[1311246] | 4;
      r17 = r7;
      r2 = 1734;
      break;
    } else {
      r17 = 0;
      r2 = 1734;
    }
  } while (0);
  do {
    if (r2 == 1734) {
      r7 = HEAP32[1310722];
      r10 = r7 + (r1 + 47) & -r7;
      if (r10 >>> 0 >= 2147483647) {
        break;
      }
      r7 = _sbrk(r10);
      r10 = _sbrk(0);
      if (!((r10 | 0) != -1 & (r7 | 0) != -1 & r7 >>> 0 < r10 >>> 0)) {
        break;
      }
      r11 = r10 - r7 | 0;
      r10 = r11 >>> 0 > (r1 + 40 | 0) >>> 0;
      r16 = r10 ? r7 : -1;
      if ((r16 | 0) == -1) {
        break;
      } else {
        r14 = r10 ? r11 : r17;
        r15 = r16;
        r2 = 1737;
        break;
      }
    }
  } while (0);
  do {
    if (r2 == 1737) {
      r17 = HEAP32[1311244] + r14 | 0;
      HEAP32[1311244] = r17;
      if (r17 >>> 0 > HEAP32[1311245] >>> 0) {
        HEAP32[1311245] = r17;
      }
      r17 = HEAP32[1311142];
      L2287 : do {
        if ((r17 | 0) == 0) {
          r16 = HEAP32[1311140];
          if ((r16 | 0) == 0 | r15 >>> 0 < r16 >>> 0) {
            HEAP32[1311140] = r15;
          }
          HEAP32[1311247] = r15;
          HEAP32[1311248] = r14;
          HEAP32[1311250] = 0;
          HEAP32[1311145] = HEAP32[1310720];
          HEAP32[1311144] = -1;
          _init_bins();
          _init_top(r15, r14 - 40 | 0);
        } else {
          r16 = 5244988, r11 = r16 >> 2;
          while (1) {
            r18 = HEAP32[r11];
            r19 = r16 + 4 | 0;
            r20 = HEAP32[r19 >> 2];
            if ((r15 | 0) == (r18 + r20 | 0)) {
              r2 = 1745;
              break;
            }
            r10 = HEAP32[r11 + 2];
            if ((r10 | 0) == 0) {
              break;
            } else {
              r16 = r10, r11 = r16 >> 2;
            }
          }
          do {
            if (r2 == 1745) {
              if ((HEAP32[r11 + 3] & 8 | 0) != 0) {
                break;
              }
              r16 = r17;
              if (!(r16 >>> 0 >= r18 >>> 0 & r16 >>> 0 < r15 >>> 0)) {
                break;
              }
              HEAP32[r19 >> 2] = r20 + r14 | 0;
              _init_top(HEAP32[1311142], HEAP32[1311139] + r14 | 0);
              break L2287;
            }
          } while (0);
          if (r15 >>> 0 < HEAP32[1311140] >>> 0) {
            HEAP32[1311140] = r15;
          }
          r11 = r15 + r14 | 0;
          r16 = 5244988;
          while (1) {
            r21 = r16 | 0;
            if ((HEAP32[r21 >> 2] | 0) == (r11 | 0)) {
              r2 = 1753;
              break;
            }
            r10 = HEAP32[r16 + 8 >> 2];
            if ((r10 | 0) == 0) {
              break;
            } else {
              r16 = r10;
            }
          }
          do {
            if (r2 == 1753) {
              if ((HEAP32[r16 + 12 >> 2] & 8 | 0) != 0) {
                break;
              }
              HEAP32[r21 >> 2] = r15;
              r10 = r16 + 4 | 0;
              HEAP32[r10 >> 2] = HEAP32[r10 >> 2] + r14 | 0;
              r22 = _prepend_alloc(r15, r11, r1);
              return r22;
            }
          } while (0);
          _add_segment(r15, r14);
        }
      } while (0);
      r17 = HEAP32[1311139];
      if (r17 >>> 0 <= r1 >>> 0) {
        break;
      }
      r11 = r17 - r1 | 0;
      HEAP32[1311139] = r11;
      r17 = HEAP32[1311142];
      r16 = r17;
      HEAP32[1311142] = r16 + r1 | 0;
      HEAP32[r1 + (r16 + 4) >> 2] = r11 | 1;
      HEAP32[r17 + 4 >> 2] = r1 | 3;
      r22 = r17 + 8 | 0;
      return r22;
    }
  } while (0);
  HEAP32[___errno_location() >> 2] = 12;
  r22 = 0;
  return r22;
}
_sys_alloc["X"] = 1;
function _tmalloc_large(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36;
  r2 = r1 >> 2;
  r3 = 0;
  r4 = -r1 | 0;
  r5 = r1 >>> 8;
  do {
    if ((r5 | 0) == 0) {
      r6 = 0;
    } else {
      if (r1 >>> 0 > 16777215) {
        r6 = 31;
        break;
      }
      r7 = (r5 + 1048320 | 0) >>> 16 & 8;
      r8 = r5 << r7;
      r9 = (r8 + 520192 | 0) >>> 16 & 4;
      r10 = r8 << r9;
      r8 = (r10 + 245760 | 0) >>> 16 & 2;
      r11 = 14 - (r9 | r7 | r8) + (r10 << r8 >>> 15) | 0;
      r6 = r1 >>> ((r11 + 7 | 0) >>> 0) & 1 | r11 << 1;
    }
  } while (0);
  r5 = HEAP32[(r6 << 2) + 5244848 >> 2];
  L2321 : do {
    if ((r5 | 0) == 0) {
      r12 = 0;
      r13 = r4;
      r14 = 0;
    } else {
      if ((r6 | 0) == 31) {
        r15 = 0;
      } else {
        r15 = 25 - (r6 >>> 1) | 0;
      }
      r11 = 0;
      r8 = r4;
      r10 = r5, r7 = r10 >> 2;
      r9 = r1 << r15;
      r16 = 0;
      while (1) {
        r17 = HEAP32[r7 + 1] & -8;
        r18 = r17 - r1 | 0;
        if (r18 >>> 0 < r8 >>> 0) {
          if ((r17 | 0) == (r1 | 0)) {
            r12 = r10;
            r13 = r18;
            r14 = r10;
            break L2321;
          } else {
            r19 = r10;
            r20 = r18;
          }
        } else {
          r19 = r11;
          r20 = r8;
        }
        r18 = HEAP32[r7 + 5];
        r17 = HEAP32[((r9 >>> 31 << 2) + 16 >> 2) + r7];
        r21 = (r18 | 0) == 0 | (r18 | 0) == (r17 | 0) ? r16 : r18;
        if ((r17 | 0) == 0) {
          r12 = r19;
          r13 = r20;
          r14 = r21;
          break L2321;
        } else {
          r11 = r19;
          r8 = r20;
          r10 = r17, r7 = r10 >> 2;
          r9 = r9 << 1;
          r16 = r21;
        }
      }
    }
  } while (0);
  do {
    if ((r14 | 0) == 0 & (r12 | 0) == 0) {
      r20 = 2 << r6;
      r19 = HEAP32[1311137] & (r20 | -r20);
      if ((r19 | 0) == 0) {
        r22 = 0;
        return r22;
      } else {
        r20 = (r19 & -r19) - 1 | 0;
        r19 = r20 >>> 12 & 16;
        r15 = r20 >>> (r19 >>> 0);
        r20 = r15 >>> 5 & 8;
        r5 = r15 >>> (r20 >>> 0);
        r15 = r5 >>> 2 & 4;
        r4 = r5 >>> (r15 >>> 0);
        r5 = r4 >>> 1 & 2;
        r16 = r4 >>> (r5 >>> 0);
        r4 = r16 >>> 1 & 1;
        r23 = HEAP32[((r20 | r19 | r15 | r5 | r4) + (r16 >>> (r4 >>> 0)) << 2) + 5244848 >> 2];
        break;
      }
    } else {
      r23 = r14;
    }
  } while (0);
  L2338 : do {
    if ((r23 | 0) == 0) {
      r24 = r13;
      r25 = r12, r26 = r25 >> 2;
    } else {
      r14 = r23, r6 = r14 >> 2;
      r4 = r13;
      r16 = r12;
      while (1) {
        r5 = (HEAP32[r6 + 1] & -8) - r1 | 0;
        r15 = r5 >>> 0 < r4 >>> 0;
        r19 = r15 ? r5 : r4;
        r5 = r15 ? r14 : r16;
        r15 = HEAP32[r6 + 4];
        if ((r15 | 0) != 0) {
          r14 = r15, r6 = r14 >> 2;
          r4 = r19;
          r16 = r5;
          continue;
        }
        r15 = HEAP32[r6 + 5];
        if ((r15 | 0) == 0) {
          r24 = r19;
          r25 = r5, r26 = r25 >> 2;
          break L2338;
        } else {
          r14 = r15, r6 = r14 >> 2;
          r4 = r19;
          r16 = r5;
        }
      }
    }
  } while (0);
  if ((r25 | 0) == 0) {
    r22 = 0;
    return r22;
  }
  if (r24 >>> 0 >= (HEAP32[1311138] - r1 | 0) >>> 0) {
    r22 = 0;
    return r22;
  }
  r12 = r25, r13 = r12 >> 2;
  r23 = HEAP32[1311140];
  if (r12 >>> 0 < r23 >>> 0) {
    _abort();
  }
  r16 = r12 + r1 | 0;
  r4 = r16;
  if (r12 >>> 0 >= r16 >>> 0) {
    _abort();
  }
  r14 = HEAP32[r26 + 6];
  r6 = HEAP32[r26 + 3];
  L2355 : do {
    if ((r6 | 0) == (r25 | 0)) {
      r5 = r25 + 20 | 0;
      r19 = HEAP32[r5 >> 2];
      do {
        if ((r19 | 0) == 0) {
          r15 = r25 + 16 | 0;
          r20 = HEAP32[r15 >> 2];
          if ((r20 | 0) == 0) {
            r27 = 0, r28 = r27 >> 2;
            break L2355;
          } else {
            r29 = r20;
            r30 = r15;
            break;
          }
        } else {
          r29 = r19;
          r30 = r5;
        }
      } while (0);
      while (1) {
        r5 = r29 + 20 | 0;
        r19 = HEAP32[r5 >> 2];
        if ((r19 | 0) != 0) {
          r29 = r19;
          r30 = r5;
          continue;
        }
        r5 = r29 + 16 | 0;
        r19 = HEAP32[r5 >> 2];
        if ((r19 | 0) == 0) {
          break;
        } else {
          r29 = r19;
          r30 = r5;
        }
      }
      if (r30 >>> 0 < r23 >>> 0) {
        _abort();
      } else {
        HEAP32[r30 >> 2] = 0;
        r27 = r29, r28 = r27 >> 2;
        break;
      }
    } else {
      r5 = HEAP32[r26 + 2];
      if (r5 >>> 0 < r23 >>> 0) {
        _abort();
      } else {
        HEAP32[r5 + 12 >> 2] = r6;
        HEAP32[r6 + 8 >> 2] = r5;
        r27 = r6, r28 = r27 >> 2;
        break;
      }
    }
  } while (0);
  L2371 : do {
    if ((r14 | 0) == 0) {
      r31 = r25;
    } else {
      r6 = r25 + 28 | 0;
      r23 = (HEAP32[r6 >> 2] << 2) + 5244848 | 0;
      do {
        if ((r25 | 0) == (HEAP32[r23 >> 2] | 0)) {
          HEAP32[r23 >> 2] = r27;
          if ((r27 | 0) != 0) {
            break;
          }
          HEAP32[1311137] = HEAP32[1311137] & (1 << HEAP32[r6 >> 2] ^ -1);
          r31 = r25;
          break L2371;
        } else {
          if (r14 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          }
          r29 = r14 + 16 | 0;
          if ((HEAP32[r29 >> 2] | 0) == (r25 | 0)) {
            HEAP32[r29 >> 2] = r27;
          } else {
            HEAP32[r14 + 20 >> 2] = r27;
          }
          if ((r27 | 0) == 0) {
            r31 = r25;
            break L2371;
          }
        }
      } while (0);
      if (r27 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      }
      HEAP32[r28 + 6] = r14;
      r6 = HEAP32[r26 + 4];
      do {
        if ((r6 | 0) != 0) {
          if (r6 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          } else {
            HEAP32[r28 + 4] = r6;
            HEAP32[r6 + 24 >> 2] = r27;
            break;
          }
        }
      } while (0);
      r6 = HEAP32[r26 + 5];
      if ((r6 | 0) == 0) {
        r31 = r25;
        break;
      }
      if (r6 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      } else {
        HEAP32[r28 + 5] = r6;
        HEAP32[r6 + 24 >> 2] = r27;
        r31 = r25;
        break;
      }
    }
  } while (0);
  do {
    if (r24 >>> 0 < 16) {
      r25 = r24 + r1 | 0;
      HEAP32[r31 + 4 >> 2] = r25 | 3;
      r27 = r25 + (r12 + 4) | 0;
      HEAP32[r27 >> 2] = HEAP32[r27 >> 2] | 1;
    } else {
      HEAP32[r31 + 4 >> 2] = r1 | 3;
      HEAP32[r2 + (r13 + 1)] = r24 | 1;
      HEAP32[(r24 >> 2) + r13 + r2] = r24;
      r27 = r24 >>> 3;
      if (r24 >>> 0 < 256) {
        r25 = r27 << 1;
        r28 = (r25 << 2) + 5244584 | 0;
        r26 = HEAP32[1311136];
        r14 = 1 << r27;
        do {
          if ((r26 & r14 | 0) == 0) {
            HEAP32[1311136] = r26 | r14;
            r32 = r28;
            r33 = (r25 + 2 << 2) + 5244584 | 0;
          } else {
            r27 = (r25 + 2 << 2) + 5244584 | 0;
            r6 = HEAP32[r27 >> 2];
            if (r6 >>> 0 >= HEAP32[1311140] >>> 0) {
              r32 = r6;
              r33 = r27;
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r33 >> 2] = r4;
        HEAP32[r32 + 12 >> 2] = r4;
        HEAP32[r2 + (r13 + 2)] = r32;
        HEAP32[r2 + (r13 + 3)] = r28;
        break;
      }
      r25 = r16;
      r14 = r24 >>> 8;
      do {
        if ((r14 | 0) == 0) {
          r34 = 0;
        } else {
          if (r24 >>> 0 > 16777215) {
            r34 = 31;
            break;
          }
          r26 = (r14 + 1048320 | 0) >>> 16 & 8;
          r27 = r14 << r26;
          r6 = (r27 + 520192 | 0) >>> 16 & 4;
          r23 = r27 << r6;
          r27 = (r23 + 245760 | 0) >>> 16 & 2;
          r29 = 14 - (r6 | r26 | r27) + (r23 << r27 >>> 15) | 0;
          r34 = r24 >>> ((r29 + 7 | 0) >>> 0) & 1 | r29 << 1;
        }
      } while (0);
      r14 = (r34 << 2) + 5244848 | 0;
      HEAP32[r2 + (r13 + 7)] = r34;
      HEAP32[r2 + (r13 + 5)] = 0;
      HEAP32[r2 + (r13 + 4)] = 0;
      r28 = HEAP32[1311137];
      r29 = 1 << r34;
      if ((r28 & r29 | 0) == 0) {
        HEAP32[1311137] = r28 | r29;
        HEAP32[r14 >> 2] = r25;
        HEAP32[r2 + (r13 + 6)] = r14;
        HEAP32[r2 + (r13 + 3)] = r25;
        HEAP32[r2 + (r13 + 2)] = r25;
        break;
      }
      if ((r34 | 0) == 31) {
        r35 = 0;
      } else {
        r35 = 25 - (r34 >>> 1) | 0;
      }
      r29 = r24 << r35;
      r28 = HEAP32[r14 >> 2];
      while (1) {
        if ((HEAP32[r28 + 4 >> 2] & -8 | 0) == (r24 | 0)) {
          break;
        }
        r36 = (r29 >>> 31 << 2) + r28 + 16 | 0;
        r14 = HEAP32[r36 >> 2];
        if ((r14 | 0) == 0) {
          r3 = 1832;
          break;
        } else {
          r29 = r29 << 1;
          r28 = r14;
        }
      }
      if (r3 == 1832) {
        if (r36 >>> 0 < HEAP32[1311140] >>> 0) {
          _abort();
        } else {
          HEAP32[r36 >> 2] = r25;
          HEAP32[r2 + (r13 + 6)] = r28;
          HEAP32[r2 + (r13 + 3)] = r25;
          HEAP32[r2 + (r13 + 2)] = r25;
          break;
        }
      }
      r29 = r28 + 8 | 0;
      r14 = HEAP32[r29 >> 2];
      r27 = HEAP32[1311140];
      if (r28 >>> 0 < r27 >>> 0) {
        _abort();
      }
      if (r14 >>> 0 < r27 >>> 0) {
        _abort();
      } else {
        HEAP32[r14 + 12 >> 2] = r25;
        HEAP32[r29 >> 2] = r25;
        HEAP32[r2 + (r13 + 2)] = r14;
        HEAP32[r2 + (r13 + 3)] = r28;
        HEAP32[r2 + (r13 + 6)] = 0;
        break;
      }
    }
  } while (0);
  r22 = r31 + 8 | 0;
  return r22;
}
_tmalloc_large["X"] = 1;
function _release_unused_segments() {
  var r1, r2;
  r1 = 5244996;
  while (1) {
    r2 = HEAP32[r1 >> 2];
    if ((r2 | 0) == 0) {
      break;
    } else {
      r1 = r2 + 8 | 0;
    }
  }
  HEAP32[1311144] = -1;
  return;
}
function _sys_trim() {
  var r1, r2, r3, r4, r5, r6, r7;
  if ((HEAP32[1310720] | 0) == 0) {
    _init_mparams();
  }
  r1 = HEAP32[1311142];
  if ((r1 | 0) == 0) {
    return;
  }
  r2 = HEAP32[1311139];
  do {
    if (r2 >>> 0 > 40) {
      r3 = HEAP32[1310722];
      r4 = Math.imul(Math.floor(((r2 - 41 + r3 | 0) >>> 0) / (r3 >>> 0)) - 1 | 0, r3);
      r5 = _segment_holding(r1);
      if ((HEAP32[r5 + 12 >> 2] & 8 | 0) != 0) {
        break;
      }
      r6 = _sbrk(0);
      r7 = (r5 + 4 | 0) >> 2;
      if ((r6 | 0) != (HEAP32[r5 >> 2] + HEAP32[r7] | 0)) {
        break;
      }
      r5 = _sbrk(-(r4 >>> 0 > 2147483646 ? -2147483648 - r3 | 0 : r4) | 0);
      r4 = _sbrk(0);
      if (!((r5 | 0) != -1 & r4 >>> 0 < r6 >>> 0)) {
        break;
      }
      r5 = r6 - r4 | 0;
      if ((r6 | 0) == (r4 | 0)) {
        break;
      }
      HEAP32[r7] = HEAP32[r7] - r5 | 0;
      HEAP32[1311244] = HEAP32[1311244] - r5 | 0;
      _init_top(HEAP32[1311142], HEAP32[1311139] - r5 | 0);
      return;
    }
  } while (0);
  if (HEAP32[1311139] >>> 0 <= HEAP32[1311143] >>> 0) {
    return;
  }
  HEAP32[1311143] = -1;
  return;
}
_sys_trim["X"] = 1;
function _free(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40;
  r2 = r1 >> 2;
  r3 = 0;
  if ((r1 | 0) == 0) {
    return;
  }
  r4 = r1 - 8 | 0;
  r5 = r4;
  r6 = HEAP32[1311140];
  if (r4 >>> 0 < r6 >>> 0) {
    _abort();
  }
  r7 = HEAP32[r1 - 4 >> 2];
  r8 = r7 & 3;
  if ((r8 | 0) == 1) {
    _abort();
  }
  r9 = r7 & -8, r10 = r9 >> 2;
  r11 = r1 + (r9 - 8) | 0;
  r12 = r11;
  L2470 : do {
    if ((r7 & 1 | 0) == 0) {
      r13 = HEAP32[r4 >> 2];
      if ((r8 | 0) == 0) {
        return;
      }
      r14 = -8 - r13 | 0, r15 = r14 >> 2;
      r16 = r1 + r14 | 0;
      r17 = r16;
      r18 = r13 + r9 | 0;
      if (r16 >>> 0 < r6 >>> 0) {
        _abort();
      }
      if ((r17 | 0) == (HEAP32[1311141] | 0)) {
        r19 = (r1 + (r9 - 4) | 0) >> 2;
        if ((HEAP32[r19] & 3 | 0) != 3) {
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break;
        }
        HEAP32[1311138] = r18;
        HEAP32[r19] = HEAP32[r19] & -2;
        HEAP32[r15 + (r2 + 1)] = r18 | 1;
        HEAP32[r11 >> 2] = r18;
        return;
      }
      r19 = r13 >>> 3;
      if (r13 >>> 0 < 256) {
        r13 = HEAP32[r15 + (r2 + 2)];
        r23 = HEAP32[r15 + (r2 + 3)];
        if ((r13 | 0) == (r23 | 0)) {
          HEAP32[1311136] = HEAP32[1311136] & (1 << r19 ^ -1);
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break;
        }
        r24 = (r19 << 3) + 5244584 | 0;
        if ((r13 | 0) != (r24 | 0) & r13 >>> 0 < r6 >>> 0) {
          _abort();
        }
        if ((r23 | 0) == (r24 | 0) | r23 >>> 0 >= r6 >>> 0) {
          HEAP32[r13 + 12 >> 2] = r23;
          HEAP32[r23 + 8 >> 2] = r13;
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break;
        } else {
          _abort();
        }
      }
      r13 = r16;
      r16 = HEAP32[r15 + (r2 + 6)];
      r23 = HEAP32[r15 + (r2 + 3)];
      L2495 : do {
        if ((r23 | 0) == (r13 | 0)) {
          r24 = r14 + (r1 + 20) | 0;
          r19 = HEAP32[r24 >> 2];
          do {
            if ((r19 | 0) == 0) {
              r25 = r14 + (r1 + 16) | 0;
              r26 = HEAP32[r25 >> 2];
              if ((r26 | 0) == 0) {
                r27 = 0, r28 = r27 >> 2;
                break L2495;
              } else {
                r29 = r26;
                r30 = r25;
                break;
              }
            } else {
              r29 = r19;
              r30 = r24;
            }
          } while (0);
          while (1) {
            r24 = r29 + 20 | 0;
            r19 = HEAP32[r24 >> 2];
            if ((r19 | 0) != 0) {
              r29 = r19;
              r30 = r24;
              continue;
            }
            r24 = r29 + 16 | 0;
            r19 = HEAP32[r24 >> 2];
            if ((r19 | 0) == 0) {
              break;
            } else {
              r29 = r19;
              r30 = r24;
            }
          }
          if (r30 >>> 0 < r6 >>> 0) {
            _abort();
          } else {
            HEAP32[r30 >> 2] = 0;
            r27 = r29, r28 = r27 >> 2;
            break;
          }
        } else {
          r24 = HEAP32[r15 + (r2 + 2)];
          if (r24 >>> 0 < r6 >>> 0) {
            _abort();
          } else {
            HEAP32[r24 + 12 >> 2] = r23;
            HEAP32[r23 + 8 >> 2] = r24;
            r27 = r23, r28 = r27 >> 2;
            break;
          }
        }
      } while (0);
      if ((r16 | 0) == 0) {
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
      r23 = r14 + (r1 + 28) | 0;
      r24 = (HEAP32[r23 >> 2] << 2) + 5244848 | 0;
      do {
        if ((r13 | 0) == (HEAP32[r24 >> 2] | 0)) {
          HEAP32[r24 >> 2] = r27;
          if ((r27 | 0) != 0) {
            break;
          }
          HEAP32[1311137] = HEAP32[1311137] & (1 << HEAP32[r23 >> 2] ^ -1);
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break L2470;
        } else {
          if (r16 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          }
          r19 = r16 + 16 | 0;
          if ((HEAP32[r19 >> 2] | 0) == (r13 | 0)) {
            HEAP32[r19 >> 2] = r27;
          } else {
            HEAP32[r16 + 20 >> 2] = r27;
          }
          if ((r27 | 0) == 0) {
            r20 = r17, r21 = r20 >> 2;
            r22 = r18;
            break L2470;
          }
        }
      } while (0);
      if (r27 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      }
      HEAP32[r28 + 6] = r16;
      r13 = HEAP32[r15 + (r2 + 4)];
      do {
        if ((r13 | 0) != 0) {
          if (r13 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          } else {
            HEAP32[r28 + 4] = r13;
            HEAP32[r13 + 24 >> 2] = r27;
            break;
          }
        }
      } while (0);
      r13 = HEAP32[r15 + (r2 + 5)];
      if ((r13 | 0) == 0) {
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
      if (r13 >>> 0 < HEAP32[1311140] >>> 0) {
        _abort();
      } else {
        HEAP32[r28 + 5] = r13;
        HEAP32[r13 + 24 >> 2] = r27;
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
    } else {
      r20 = r5, r21 = r20 >> 2;
      r22 = r9;
    }
  } while (0);
  r5 = r20, r27 = r5 >> 2;
  if (r5 >>> 0 >= r11 >>> 0) {
    _abort();
  }
  r5 = r1 + (r9 - 4) | 0;
  r28 = HEAP32[r5 >> 2];
  if ((r28 & 1 | 0) == 0) {
    _abort();
  }
  do {
    if ((r28 & 2 | 0) == 0) {
      if ((r12 | 0) == (HEAP32[1311142] | 0)) {
        r6 = HEAP32[1311139] + r22 | 0;
        HEAP32[1311139] = r6;
        HEAP32[1311142] = r20;
        HEAP32[r21 + 1] = r6 | 1;
        if ((r20 | 0) == (HEAP32[1311141] | 0)) {
          HEAP32[1311141] = 0;
          HEAP32[1311138] = 0;
        }
        if (r6 >>> 0 <= HEAP32[1311143] >>> 0) {
          return;
        }
        _sys_trim();
        return;
      }
      if ((r12 | 0) == (HEAP32[1311141] | 0)) {
        r6 = HEAP32[1311138] + r22 | 0;
        HEAP32[1311138] = r6;
        HEAP32[1311141] = r20;
        HEAP32[r21 + 1] = r6 | 1;
        HEAP32[(r6 >> 2) + r27] = r6;
        return;
      }
      r6 = (r28 & -8) + r22 | 0;
      r29 = r28 >>> 3;
      L2561 : do {
        if (r28 >>> 0 < 256) {
          r30 = HEAP32[r2 + r10];
          r8 = HEAP32[((r9 | 4) >> 2) + r2];
          if ((r30 | 0) == (r8 | 0)) {
            HEAP32[1311136] = HEAP32[1311136] & (1 << r29 ^ -1);
            break;
          }
          r4 = (r29 << 3) + 5244584 | 0;
          do {
            if ((r30 | 0) != (r4 | 0)) {
              if (r30 >>> 0 >= HEAP32[1311140] >>> 0) {
                break;
              }
              _abort();
            }
          } while (0);
          do {
            if ((r8 | 0) != (r4 | 0)) {
              if (r8 >>> 0 >= HEAP32[1311140] >>> 0) {
                break;
              }
              _abort();
            }
          } while (0);
          HEAP32[r30 + 12 >> 2] = r8;
          HEAP32[r8 + 8 >> 2] = r30;
        } else {
          r4 = r11;
          r7 = HEAP32[r10 + (r2 + 4)];
          r13 = HEAP32[((r9 | 4) >> 2) + r2];
          L2575 : do {
            if ((r13 | 0) == (r4 | 0)) {
              r16 = r9 + (r1 + 12) | 0;
              r23 = HEAP32[r16 >> 2];
              do {
                if ((r23 | 0) == 0) {
                  r24 = r9 + (r1 + 8) | 0;
                  r14 = HEAP32[r24 >> 2];
                  if ((r14 | 0) == 0) {
                    r31 = 0, r32 = r31 >> 2;
                    break L2575;
                  } else {
                    r33 = r14;
                    r34 = r24;
                    break;
                  }
                } else {
                  r33 = r23;
                  r34 = r16;
                }
              } while (0);
              while (1) {
                r16 = r33 + 20 | 0;
                r23 = HEAP32[r16 >> 2];
                if ((r23 | 0) != 0) {
                  r33 = r23;
                  r34 = r16;
                  continue;
                }
                r16 = r33 + 16 | 0;
                r23 = HEAP32[r16 >> 2];
                if ((r23 | 0) == 0) {
                  break;
                } else {
                  r33 = r23;
                  r34 = r16;
                }
              }
              if (r34 >>> 0 < HEAP32[1311140] >>> 0) {
                _abort();
              } else {
                HEAP32[r34 >> 2] = 0;
                r31 = r33, r32 = r31 >> 2;
                break;
              }
            } else {
              r16 = HEAP32[r2 + r10];
              if (r16 >>> 0 < HEAP32[1311140] >>> 0) {
                _abort();
              } else {
                HEAP32[r16 + 12 >> 2] = r13;
                HEAP32[r13 + 8 >> 2] = r16;
                r31 = r13, r32 = r31 >> 2;
                break;
              }
            }
          } while (0);
          if ((r7 | 0) == 0) {
            break;
          }
          r13 = r9 + (r1 + 20) | 0;
          r30 = (HEAP32[r13 >> 2] << 2) + 5244848 | 0;
          do {
            if ((r4 | 0) == (HEAP32[r30 >> 2] | 0)) {
              HEAP32[r30 >> 2] = r31;
              if ((r31 | 0) != 0) {
                break;
              }
              HEAP32[1311137] = HEAP32[1311137] & (1 << HEAP32[r13 >> 2] ^ -1);
              break L2561;
            } else {
              if (r7 >>> 0 < HEAP32[1311140] >>> 0) {
                _abort();
              }
              r8 = r7 + 16 | 0;
              if ((HEAP32[r8 >> 2] | 0) == (r4 | 0)) {
                HEAP32[r8 >> 2] = r31;
              } else {
                HEAP32[r7 + 20 >> 2] = r31;
              }
              if ((r31 | 0) == 0) {
                break L2561;
              }
            }
          } while (0);
          if (r31 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          }
          HEAP32[r32 + 6] = r7;
          r4 = HEAP32[r10 + (r2 + 2)];
          do {
            if ((r4 | 0) != 0) {
              if (r4 >>> 0 < HEAP32[1311140] >>> 0) {
                _abort();
              } else {
                HEAP32[r32 + 4] = r4;
                HEAP32[r4 + 24 >> 2] = r31;
                break;
              }
            }
          } while (0);
          r4 = HEAP32[r10 + (r2 + 3)];
          if ((r4 | 0) == 0) {
            break;
          }
          if (r4 >>> 0 < HEAP32[1311140] >>> 0) {
            _abort();
          } else {
            HEAP32[r32 + 5] = r4;
            HEAP32[r4 + 24 >> 2] = r31;
            break;
          }
        }
      } while (0);
      HEAP32[r21 + 1] = r6 | 1;
      HEAP32[(r6 >> 2) + r27] = r6;
      if ((r20 | 0) != (HEAP32[1311141] | 0)) {
        r35 = r6;
        break;
      }
      HEAP32[1311138] = r6;
      return;
    } else {
      HEAP32[r5 >> 2] = r28 & -2;
      HEAP32[r21 + 1] = r22 | 1;
      HEAP32[(r22 >> 2) + r27] = r22;
      r35 = r22;
    }
  } while (0);
  r22 = r35 >>> 3;
  if (r35 >>> 0 < 256) {
    r27 = r22 << 1;
    r28 = (r27 << 2) + 5244584 | 0;
    r5 = HEAP32[1311136];
    r31 = 1 << r22;
    do {
      if ((r5 & r31 | 0) == 0) {
        HEAP32[1311136] = r5 | r31;
        r36 = r28;
        r37 = (r27 + 2 << 2) + 5244584 | 0;
      } else {
        r22 = (r27 + 2 << 2) + 5244584 | 0;
        r32 = HEAP32[r22 >> 2];
        if (r32 >>> 0 >= HEAP32[1311140] >>> 0) {
          r36 = r32;
          r37 = r22;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[r37 >> 2] = r20;
    HEAP32[r36 + 12 >> 2] = r20;
    HEAP32[r21 + 2] = r36;
    HEAP32[r21 + 3] = r28;
    return;
  }
  r28 = r20;
  r36 = r35 >>> 8;
  do {
    if ((r36 | 0) == 0) {
      r38 = 0;
    } else {
      if (r35 >>> 0 > 16777215) {
        r38 = 31;
        break;
      }
      r37 = (r36 + 1048320 | 0) >>> 16 & 8;
      r27 = r36 << r37;
      r31 = (r27 + 520192 | 0) >>> 16 & 4;
      r5 = r27 << r31;
      r27 = (r5 + 245760 | 0) >>> 16 & 2;
      r22 = 14 - (r31 | r37 | r27) + (r5 << r27 >>> 15) | 0;
      r38 = r35 >>> ((r22 + 7 | 0) >>> 0) & 1 | r22 << 1;
    }
  } while (0);
  r36 = (r38 << 2) + 5244848 | 0;
  HEAP32[r21 + 7] = r38;
  HEAP32[r21 + 5] = 0;
  HEAP32[r21 + 4] = 0;
  r22 = HEAP32[1311137];
  r27 = 1 << r38;
  do {
    if ((r22 & r27 | 0) == 0) {
      HEAP32[1311137] = r22 | r27;
      HEAP32[r36 >> 2] = r28;
      HEAP32[r21 + 6] = r36;
      HEAP32[r21 + 3] = r20;
      HEAP32[r21 + 2] = r20;
    } else {
      if ((r38 | 0) == 31) {
        r39 = 0;
      } else {
        r39 = 25 - (r38 >>> 1) | 0;
      }
      r5 = r35 << r39;
      r37 = HEAP32[r36 >> 2];
      while (1) {
        if ((HEAP32[r37 + 4 >> 2] & -8 | 0) == (r35 | 0)) {
          break;
        }
        r40 = (r5 >>> 31 << 2) + r37 + 16 | 0;
        r31 = HEAP32[r40 >> 2];
        if ((r31 | 0) == 0) {
          r3 = 1985;
          break;
        } else {
          r5 = r5 << 1;
          r37 = r31;
        }
      }
      if (r3 == 1985) {
        if (r40 >>> 0 < HEAP32[1311140] >>> 0) {
          _abort();
        } else {
          HEAP32[r40 >> 2] = r28;
          HEAP32[r21 + 6] = r37;
          HEAP32[r21 + 3] = r20;
          HEAP32[r21 + 2] = r20;
          break;
        }
      }
      r5 = r37 + 8 | 0;
      r6 = HEAP32[r5 >> 2];
      r31 = HEAP32[1311140];
      if (r37 >>> 0 < r31 >>> 0) {
        _abort();
      }
      if (r6 >>> 0 < r31 >>> 0) {
        _abort();
      } else {
        HEAP32[r6 + 12 >> 2] = r28;
        HEAP32[r5 >> 2] = r28;
        HEAP32[r21 + 2] = r6;
        HEAP32[r21 + 3] = r37;
        HEAP32[r21 + 6] = 0;
        break;
      }
    }
  } while (0);
  r21 = HEAP32[1311144] - 1 | 0;
  HEAP32[1311144] = r21;
  if ((r21 | 0) != 0) {
    return;
  }
  _release_unused_segments();
  return;
}
Module["_free"] = _free;
_free["X"] = 1;
function _mmap_resize(r1, r2) {
  var r3, r4;
  r3 = HEAP32[r1 + 4 >> 2] & -8;
  if (r2 >>> 0 < 256) {
    r4 = 0;
    return r4;
  }
  do {
    if (r3 >>> 0 >= (r2 + 4 | 0) >>> 0) {
      if ((r3 - r2 | 0) >>> 0 > HEAP32[1310722] << 1 >>> 0) {
        break;
      } else {
        r4 = r1;
      }
      return r4;
    }
  } while (0);
  r4 = 0;
  return r4;
}
function _segment_holding(r1) {
  var r2, r3, r4, r5, r6;
  r2 = 0;
  r3 = 5244988, r4 = r3 >> 2;
  while (1) {
    r5 = HEAP32[r4];
    if (r5 >>> 0 <= r1 >>> 0) {
      if ((r5 + HEAP32[r4 + 1] | 0) >>> 0 > r1 >>> 0) {
        r6 = r3;
        r2 = 2031;
        break;
      }
    }
    r5 = HEAP32[r4 + 2];
    if ((r5 | 0) == 0) {
      r6 = 0;
      r2 = 2030;
      break;
    } else {
      r3 = r5, r4 = r3 >> 2;
    }
  }
  if (r2 == 2030) {
    return r6;
  } else if (r2 == 2031) {
    return r6;
  }
}
function _init_top(r1, r2) {
  var r3, r4, r5;
  r3 = r1;
  r4 = r1 + 8 | 0;
  if ((r4 & 7 | 0) == 0) {
    r5 = 0;
  } else {
    r5 = -r4 & 7;
  }
  r4 = r2 - r5 | 0;
  HEAP32[1311142] = r3 + r5 | 0;
  HEAP32[1311139] = r4;
  HEAP32[r5 + (r3 + 4) >> 2] = r4 | 1;
  HEAP32[r2 + (r3 + 4) >> 2] = 40;
  HEAP32[1311143] = HEAP32[1310724];
  return;
}
function _init_bins() {
  var r1, r2, r3;
  r1 = 0;
  while (1) {
    r2 = r1 << 1;
    r3 = (r2 << 2) + 5244584 | 0;
    HEAP32[(r2 + 3 << 2) + 5244584 >> 2] = r3;
    HEAP32[(r2 + 2 << 2) + 5244584 >> 2] = r3;
    r3 = r1 + 1 | 0;
    if ((r3 | 0) == 32) {
      break;
    } else {
      r1 = r3;
    }
  }
  return;
}
function _realloc(r1, r2) {
  var r3;
  if ((r1 | 0) == 0) {
    r3 = _malloc(r2);
    return r3;
  } else {
    r3 = _internal_realloc(r1, r2);
    return r3;
  }
}
Module["_realloc"] = _realloc;
function _internal_realloc(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r3 = 0;
  if (r2 >>> 0 > 4294967231) {
    HEAP32[___errno_location() >> 2] = 12;
    r4 = 0;
    return r4;
  }
  r5 = r1 - 8 | 0;
  r6 = r5;
  r7 = (r1 - 4 | 0) >> 2;
  r8 = HEAP32[r7];
  r9 = r8 & -8;
  r10 = r9 - 8 | 0;
  r11 = r1 + r10 | 0;
  if (r5 >>> 0 < HEAP32[1311140] >>> 0) {
    _abort();
  }
  r5 = r8 & 3;
  if (!((r5 | 0) != 1 & (r10 | 0) > -8)) {
    _abort();
  }
  r10 = (r1 + (r9 - 4) | 0) >> 2;
  if ((HEAP32[r10] & 1 | 0) == 0) {
    _abort();
  }
  if (r2 >>> 0 < 11) {
    r12 = 16;
  } else {
    r12 = r2 + 11 & -8;
  }
  do {
    if ((r5 | 0) == 0) {
      r13 = _mmap_resize(r6, r12);
      r14 = 0;
      r3 = 2060;
      break;
    } else {
      if (r9 >>> 0 >= r12 >>> 0) {
        r15 = r9 - r12 | 0;
        if (r15 >>> 0 <= 15) {
          r13 = r6;
          r14 = 0;
          r3 = 2060;
          break;
        }
        HEAP32[r7] = r12 | r8 & 1 | 2;
        HEAP32[r1 + (r12 - 4) >> 2] = r15 | 3;
        HEAP32[r10] = HEAP32[r10] | 1;
        r13 = r6;
        r14 = r1 + r12 | 0;
        r3 = 2060;
        break;
      }
      if ((r11 | 0) != (HEAP32[1311142] | 0)) {
        break;
      }
      r15 = HEAP32[1311139] + r9 | 0;
      if (r15 >>> 0 <= r12 >>> 0) {
        break;
      }
      r16 = r15 - r12 | 0;
      HEAP32[r7] = r12 | r8 & 1 | 2;
      HEAP32[r1 + (r12 - 4) >> 2] = r16 | 1;
      HEAP32[1311142] = r1 + (r12 - 8) | 0;
      HEAP32[1311139] = r16;
      r13 = r6;
      r14 = 0;
      r3 = 2060;
      break;
    }
  } while (0);
  do {
    if (r3 == 2060) {
      if ((r13 | 0) == 0) {
        break;
      }
      if ((r14 | 0) != 0) {
        _free(r14);
      }
      r4 = r13 + 8 | 0;
      return r4;
    }
  } while (0);
  r13 = _malloc(r2);
  if ((r13 | 0) == 0) {
    r4 = 0;
    return r4;
  }
  r14 = r9 - ((HEAP32[r7] & 3 | 0) == 0 ? 8 : 4) | 0;
  _memcpy(r13, r1, r14 >>> 0 < r2 >>> 0 ? r14 : r2);
  _free(r1);
  r4 = r13;
  return r4;
}
_internal_realloc["X"] = 1;
function _init_mparams() {
  var r1;
  if ((HEAP32[1310720] | 0) != 0) {
    return;
  }
  r1 = _sysconf(8);
  if ((r1 - 1 & r1 | 0) != 0) {
    _abort();
  }
  HEAP32[1310722] = r1;
  HEAP32[1310721] = r1;
  HEAP32[1310723] = -1;
  HEAP32[1310724] = 2097152;
  HEAP32[1310725] = 0;
  HEAP32[1311246] = 0;
  HEAP32[1310720] = _time(0) & -16 ^ 1431655768;
  return;
}
function _prepend_alloc(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40;
  r4 = r2 >> 2;
  r5 = r1 >> 2;
  r6 = 0;
  r7 = r1 + 8 | 0;
  if ((r7 & 7 | 0) == 0) {
    r8 = 0;
  } else {
    r8 = -r7 & 7;
  }
  r7 = r2 + 8 | 0;
  if ((r7 & 7 | 0) == 0) {
    r9 = 0, r10 = r9 >> 2;
  } else {
    r9 = -r7 & 7, r10 = r9 >> 2;
  }
  r7 = r2 + r9 | 0;
  r11 = r7;
  r12 = r8 + r3 | 0, r13 = r12 >> 2;
  r14 = r1 + r12 | 0;
  r12 = r14;
  r15 = r7 - (r1 + r8) - r3 | 0;
  HEAP32[(r8 + 4 >> 2) + r5] = r3 | 3;
  if ((r11 | 0) == (HEAP32[1311142] | 0)) {
    r3 = HEAP32[1311139] + r15 | 0;
    HEAP32[1311139] = r3;
    HEAP32[1311142] = r12;
    HEAP32[r13 + (r5 + 1)] = r3 | 1;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  if ((r11 | 0) == (HEAP32[1311141] | 0)) {
    r3 = HEAP32[1311138] + r15 | 0;
    HEAP32[1311138] = r3;
    HEAP32[1311141] = r12;
    HEAP32[r13 + (r5 + 1)] = r3 | 1;
    HEAP32[(r3 >> 2) + r5 + r13] = r3;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r3 = HEAP32[r10 + (r4 + 1)];
  if ((r3 & 3 | 0) == 1) {
    r18 = r3 & -8;
    r19 = r3 >>> 3;
    L2755 : do {
      if (r3 >>> 0 < 256) {
        r20 = HEAP32[((r9 | 8) >> 2) + r4];
        r21 = HEAP32[r10 + (r4 + 3)];
        if ((r20 | 0) == (r21 | 0)) {
          HEAP32[1311136] = HEAP32[1311136] & (1 << r19 ^ -1);
          break;
        }
        r22 = (r19 << 3) + 5244584 | 0;
        do {
          if ((r20 | 0) != (r22 | 0)) {
            if (r20 >>> 0 >= HEAP32[1311140] >>> 0) {
              break;
            }
            _abort();
          }
        } while (0);
        do {
          if ((r21 | 0) != (r22 | 0)) {
            if (r21 >>> 0 >= HEAP32[1311140] >>> 0) {
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r20 + 12 >> 2] = r21;
        HEAP32[r21 + 8 >> 2] = r20;
      } else {
        r22 = r7;
        r23 = HEAP32[((r9 | 24) >> 2) + r4];
        r24 = HEAP32[r10 + (r4 + 3)];
        L2769 : do {
          if ((r24 | 0) == (r22 | 0)) {
            r25 = r9 | 16;
            r26 = r25 + (r2 + 4) | 0;
            r27 = HEAP32[r26 >> 2];
            do {
              if ((r27 | 0) == 0) {
                r28 = r2 + r25 | 0;
                r29 = HEAP32[r28 >> 2];
                if ((r29 | 0) == 0) {
                  r30 = 0, r31 = r30 >> 2;
                  break L2769;
                } else {
                  r32 = r29;
                  r33 = r28;
                  break;
                }
              } else {
                r32 = r27;
                r33 = r26;
              }
            } while (0);
            while (1) {
              r26 = r32 + 20 | 0;
              r27 = HEAP32[r26 >> 2];
              if ((r27 | 0) != 0) {
                r32 = r27;
                r33 = r26;
                continue;
              }
              r26 = r32 + 16 | 0;
              r27 = HEAP32[r26 >> 2];
              if ((r27 | 0) == 0) {
                break;
              } else {
                r32 = r27;
                r33 = r26;
              }
            }
            if (r33 >>> 0 < HEAP32[1311140] >>> 0) {
              _abort();
            } else {
              HEAP32[r33 >> 2] = 0;
              r30 = r32, r31 = r30 >> 2;
              break;
            }
          } else {
            r26 = HEAP32[((r9 | 8) >> 2) + r4];
            if (r26 >>> 0 < HEAP32[1311140] >>> 0) {
              _abort();
            } else {
              HEAP32[r26 + 12 >> 2] = r24;
              HEAP32[r24 + 8 >> 2] = r26;
              r30 = r24, r31 = r30 >> 2;
              break;
            }
          }
        } while (0);
        if ((r23 | 0) == 0) {
          break;
        }
        r24 = r9 + (r2 + 28) | 0;
        r20 = (HEAP32[r24 >> 2] << 2) + 5244848 | 0;
        do {
          if ((r22 | 0) == (HEAP32[r20 >> 2] | 0)) {
            HEAP32[r20 >> 2] = r30;
            if ((r30 | 0) != 0) {
              break;
            }
            HEAP32[1311137] = HEAP32[1311137] & (1 << HEAP32[r24 >> 2] ^ -1);
            break L2755;
          } else {
            if (r23 >>> 0 < HEAP32[1311140] >>> 0) {
              _abort();
            }
            r21 = r23 + 16 | 0;
            if ((HEAP32[r21 >> 2] | 0) == (r22 | 0)) {
              HEAP32[r21 >> 2] = r30;
            } else {
              HEAP32[r23 + 20 >> 2] = r30;
            }
            if ((r30 | 0) == 0) {
              break L2755;
            }
          }
        } while (0);
        if (r30 >>> 0 < HEAP32[1311140] >>> 0) {
          _abort();
        }
        HEAP32[r31 + 6] = r23;
        r22 = r9 | 16;
        r24 = HEAP32[(r22 >> 2) + r4];
        do {
          if ((r24 | 0) != 0) {
            if (r24 >>> 0 < HEAP32[1311140] >>> 0) {
              _abort();
            } else {
              HEAP32[r31 + 4] = r24;
              HEAP32[r24 + 24 >> 2] = r30;
              break;
            }
          }
        } while (0);
        r24 = HEAP32[(r22 + 4 >> 2) + r4];
        if ((r24 | 0) == 0) {
          break;
        }
        if (r24 >>> 0 < HEAP32[1311140] >>> 0) {
          _abort();
        } else {
          HEAP32[r31 + 5] = r24;
          HEAP32[r24 + 24 >> 2] = r30;
          break;
        }
      }
    } while (0);
    r34 = r2 + (r18 | r9) | 0;
    r35 = r18 + r15 | 0;
  } else {
    r34 = r11;
    r35 = r15;
  }
  r15 = r34 + 4 | 0;
  HEAP32[r15 >> 2] = HEAP32[r15 >> 2] & -2;
  HEAP32[r13 + (r5 + 1)] = r35 | 1;
  HEAP32[(r35 >> 2) + r5 + r13] = r35;
  r15 = r35 >>> 3;
  if (r35 >>> 0 < 256) {
    r34 = r15 << 1;
    r11 = (r34 << 2) + 5244584 | 0;
    r18 = HEAP32[1311136];
    r9 = 1 << r15;
    do {
      if ((r18 & r9 | 0) == 0) {
        HEAP32[1311136] = r18 | r9;
        r36 = r11;
        r37 = (r34 + 2 << 2) + 5244584 | 0;
      } else {
        r15 = (r34 + 2 << 2) + 5244584 | 0;
        r2 = HEAP32[r15 >> 2];
        if (r2 >>> 0 >= HEAP32[1311140] >>> 0) {
          r36 = r2;
          r37 = r15;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[r37 >> 2] = r12;
    HEAP32[r36 + 12 >> 2] = r12;
    HEAP32[r13 + (r5 + 2)] = r36;
    HEAP32[r13 + (r5 + 3)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r11 = r14;
  r14 = r35 >>> 8;
  do {
    if ((r14 | 0) == 0) {
      r38 = 0;
    } else {
      if (r35 >>> 0 > 16777215) {
        r38 = 31;
        break;
      }
      r36 = (r14 + 1048320 | 0) >>> 16 & 8;
      r12 = r14 << r36;
      r37 = (r12 + 520192 | 0) >>> 16 & 4;
      r34 = r12 << r37;
      r12 = (r34 + 245760 | 0) >>> 16 & 2;
      r9 = 14 - (r37 | r36 | r12) + (r34 << r12 >>> 15) | 0;
      r38 = r35 >>> ((r9 + 7 | 0) >>> 0) & 1 | r9 << 1;
    }
  } while (0);
  r14 = (r38 << 2) + 5244848 | 0;
  HEAP32[r13 + (r5 + 7)] = r38;
  HEAP32[r13 + (r5 + 5)] = 0;
  HEAP32[r13 + (r5 + 4)] = 0;
  r9 = HEAP32[1311137];
  r12 = 1 << r38;
  if ((r9 & r12 | 0) == 0) {
    HEAP32[1311137] = r9 | r12;
    HEAP32[r14 >> 2] = r11;
    HEAP32[r13 + (r5 + 6)] = r14;
    HEAP32[r13 + (r5 + 3)] = r11;
    HEAP32[r13 + (r5 + 2)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  if ((r38 | 0) == 31) {
    r39 = 0;
  } else {
    r39 = 25 - (r38 >>> 1) | 0;
  }
  r38 = r35 << r39;
  r39 = HEAP32[r14 >> 2];
  while (1) {
    if ((HEAP32[r39 + 4 >> 2] & -8 | 0) == (r35 | 0)) {
      break;
    }
    r40 = (r38 >>> 31 << 2) + r39 + 16 | 0;
    r14 = HEAP32[r40 >> 2];
    if ((r14 | 0) == 0) {
      r6 = 2147;
      break;
    } else {
      r38 = r38 << 1;
      r39 = r14;
    }
  }
  if (r6 == 2147) {
    if (r40 >>> 0 < HEAP32[1311140] >>> 0) {
      _abort();
    }
    HEAP32[r40 >> 2] = r11;
    HEAP32[r13 + (r5 + 6)] = r39;
    HEAP32[r13 + (r5 + 3)] = r11;
    HEAP32[r13 + (r5 + 2)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r40 = r39 + 8 | 0;
  r6 = HEAP32[r40 >> 2];
  r38 = HEAP32[1311140];
  if (r39 >>> 0 < r38 >>> 0) {
    _abort();
  }
  if (r6 >>> 0 < r38 >>> 0) {
    _abort();
  }
  HEAP32[r6 + 12 >> 2] = r11;
  HEAP32[r40 >> 2] = r11;
  HEAP32[r13 + (r5 + 2)] = r6;
  HEAP32[r13 + (r5 + 3)] = r39;
  HEAP32[r13 + (r5 + 6)] = 0;
  r16 = r8 | 8;
  r17 = r1 + r16 | 0;
  return r17;
}
_prepend_alloc["X"] = 1;
function _add_segment(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  r3 = 0;
  r4 = HEAP32[1311142], r5 = r4 >> 2;
  r6 = r4;
  r7 = _segment_holding(r6);
  r8 = HEAP32[r7 >> 2];
  r9 = HEAP32[r7 + 4 >> 2];
  r7 = r8 + r9 | 0;
  r10 = r8 + (r9 - 39) | 0;
  if ((r10 & 7 | 0) == 0) {
    r11 = 0;
  } else {
    r11 = -r10 & 7;
  }
  r10 = r8 + (r9 - 47) + r11 | 0;
  r11 = r10 >>> 0 < (r4 + 16 | 0) >>> 0 ? r6 : r10;
  r10 = r11 + 8 | 0, r9 = r10 >> 2;
  _init_top(r1, r2 - 40 | 0);
  HEAP32[r11 + 4 >> 2] = 27;
  HEAP32[r9] = HEAP32[1311247];
  HEAP32[r9 + 1] = HEAP32[1311248];
  HEAP32[r9 + 2] = HEAP32[1311249];
  HEAP32[r9 + 3] = HEAP32[1311250];
  HEAP32[1311247] = r1;
  HEAP32[1311248] = r2;
  HEAP32[1311250] = 0;
  HEAP32[1311249] = r10;
  r10 = r11 + 28 | 0;
  HEAP32[r10 >> 2] = 7;
  L2854 : do {
    if ((r11 + 32 | 0) >>> 0 < r7 >>> 0) {
      r2 = r10;
      while (1) {
        r1 = r2 + 4 | 0;
        HEAP32[r1 >> 2] = 7;
        if ((r2 + 8 | 0) >>> 0 < r7 >>> 0) {
          r2 = r1;
        } else {
          break L2854;
        }
      }
    }
  } while (0);
  if ((r11 | 0) == (r6 | 0)) {
    return;
  }
  r7 = r11 - r4 | 0;
  r11 = r7 + (r6 + 4) | 0;
  HEAP32[r11 >> 2] = HEAP32[r11 >> 2] & -2;
  HEAP32[r5 + 1] = r7 | 1;
  HEAP32[r6 + r7 >> 2] = r7;
  r6 = r7 >>> 3;
  if (r7 >>> 0 < 256) {
    r11 = r6 << 1;
    r10 = (r11 << 2) + 5244584 | 0;
    r2 = HEAP32[1311136];
    r1 = 1 << r6;
    do {
      if ((r2 & r1 | 0) == 0) {
        HEAP32[1311136] = r2 | r1;
        r12 = r10;
        r13 = (r11 + 2 << 2) + 5244584 | 0;
      } else {
        r6 = (r11 + 2 << 2) + 5244584 | 0;
        r9 = HEAP32[r6 >> 2];
        if (r9 >>> 0 >= HEAP32[1311140] >>> 0) {
          r12 = r9;
          r13 = r6;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[r13 >> 2] = r4;
    HEAP32[r12 + 12 >> 2] = r4;
    HEAP32[r5 + 2] = r12;
    HEAP32[r5 + 3] = r10;
    return;
  }
  r10 = r4;
  r12 = r7 >>> 8;
  do {
    if ((r12 | 0) == 0) {
      r14 = 0;
    } else {
      if (r7 >>> 0 > 16777215) {
        r14 = 31;
        break;
      }
      r13 = (r12 + 1048320 | 0) >>> 16 & 8;
      r11 = r12 << r13;
      r1 = (r11 + 520192 | 0) >>> 16 & 4;
      r2 = r11 << r1;
      r11 = (r2 + 245760 | 0) >>> 16 & 2;
      r6 = 14 - (r1 | r13 | r11) + (r2 << r11 >>> 15) | 0;
      r14 = r7 >>> ((r6 + 7 | 0) >>> 0) & 1 | r6 << 1;
    }
  } while (0);
  r12 = (r14 << 2) + 5244848 | 0;
  HEAP32[r5 + 7] = r14;
  HEAP32[r5 + 5] = 0;
  HEAP32[r5 + 4] = 0;
  r6 = HEAP32[1311137];
  r11 = 1 << r14;
  if ((r6 & r11 | 0) == 0) {
    HEAP32[1311137] = r6 | r11;
    HEAP32[r12 >> 2] = r10;
    HEAP32[r5 + 6] = r12;
    HEAP32[r5 + 3] = r4;
    HEAP32[r5 + 2] = r4;
    return;
  }
  if ((r14 | 0) == 31) {
    r15 = 0;
  } else {
    r15 = 25 - (r14 >>> 1) | 0;
  }
  r14 = r7 << r15;
  r15 = HEAP32[r12 >> 2];
  while (1) {
    if ((HEAP32[r15 + 4 >> 2] & -8 | 0) == (r7 | 0)) {
      break;
    }
    r16 = (r14 >>> 31 << 2) + r15 + 16 | 0;
    r12 = HEAP32[r16 >> 2];
    if ((r12 | 0) == 0) {
      r3 = 2186;
      break;
    } else {
      r14 = r14 << 1;
      r15 = r12;
    }
  }
  if (r3 == 2186) {
    if (r16 >>> 0 < HEAP32[1311140] >>> 0) {
      _abort();
    }
    HEAP32[r16 >> 2] = r10;
    HEAP32[r5 + 6] = r15;
    HEAP32[r5 + 3] = r4;
    HEAP32[r5 + 2] = r4;
    return;
  }
  r4 = r15 + 8 | 0;
  r16 = HEAP32[r4 >> 2];
  r3 = HEAP32[1311140];
  if (r15 >>> 0 < r3 >>> 0) {
    _abort();
  }
  if (r16 >>> 0 < r3 >>> 0) {
    _abort();
  }
  HEAP32[r16 + 12 >> 2] = r10;
  HEAP32[r4 >> 2] = r10;
  HEAP32[r5 + 2] = r16;
  HEAP32[r5 + 3] = r15;
  HEAP32[r5 + 6] = 0;
  return;
}



_add_segment["X"]=1;

// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

Module.callMain = function callMain(args) {
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_STATIC);


  var ret;

  ret = Module['_main'](argc, argv, 0);


  return ret;
}




function run(args) {
  args = args || Module['arguments'];

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return 0;
  }

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    var toRun = Module['preRun'];
    Module['preRun'] = [];
    for (var i = toRun.length-1; i >= 0; i--) {
      toRun[i]();
    }
    if (runDependencies > 0) {
      // a preRun added a dependency, run will be called later
      return 0;
    }
  }

  function doRun() {
    var ret = 0;
    calledRun = true;
    if (Module['_main']) {
      preMain();
      ret = Module.callMain(args);
      if (!Module['noExitRuntime']) {
        exitRuntime();
      }
    }
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length > 0) {
        Module['postRun'].pop()();
      }
    }
    return ret;
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
    return 0;
  } else {
    return doRun();
  }
}
Module['run'] = Module.run = run;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

initRuntime();

var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}

if (shouldRunNow) {
  var ret = run();
}

// {{POST_RUN_ADDITIONS}}






  // {{MODULE_ADDITIONS}}


// EMSCRIPTEN_GENERATED_FUNCTIONS: ["_AddVertex","_RemoveDegenerateFaces","___gl_noVertexData","___gl_meshDiscardExterior","_EmptyCache","_KillVertex","_destroy_tess_context","_FinishLeftRegions","_VertexWeights","___gl_renderBoundary","_MakeVertex","_gluDeleteTess","_MakeDormant","_RenderMaximumFaceGroup","_MakeEdge","___gl_pqHeapDeletePriorityQ","_combine","___gl_meshDeleteMesh","_gluTessBeginPolygon","___gl_meshDelete","_GetIntersectData","_ComputeNormal","_tessellate","_KillFace","_gluTessEndContour","_release_unused_segments","___gl_meshSetWindingNumber","_strip_vertex","___gl_transEval","_sys_alloc","_free","___gl_meshMakeEdge","_allocVertex","_noEdgeFlag","_gluTessVertex","___gl_noBeginData","_IsWindingInside","_AddRegionBelow","_init_bins","_skip_vertex","___gl_dictListDeleteDict","_noCombine","_LongAxis","_RenderFan","___gl_renderCache","_RenderTriangle","_gluNewTess","___gl_meshTessellateInterior","_tmalloc_large","_MaximumFan","_SweepEvent","_CacheVertex","___gl_dictListDelete","___gl_dictListInsertBefore","_fan_vertex","___gl_computeInterior","___gl_renderMesh","___gl_noErrorData","_noMesh","_RenderLonelyTriangles","_FloatUp","___gl_pqSortInsert","___gl_meshZapFace","_ConnectLeftVertex","___gl_edgeIntersect","_InitEdgeDict","_gluTessProperty","___gl_meshSplitEdge","_vertex","_new_triangle","___gl_meshSplice","_new_vertex","_CheckForRightSplice","_sys_trim","_AddRightEdges","_begin","_Splice","_mmap_resize","_EdgeLeq","_AddSentinel","_triangle_vertex","_prepend_alloc","_CallCombine","___gl_meshAddEdgeVertex","_DoneEdgeDict","_RemoveDegenerateEdges","_MaximumStrip","___gl_meshTessellateMonoRegion","_gluTessEndPolygon","_FinishRegion","___gl_projectPolygon","_allocFace","_CheckOrientation","___gl_pqHeapDelete","___gl_pqSortDelete","_ConnectLeftDegenerate","_ConnectRightVertex","_WalkDirtyRegions","_MakeFace","_gluTessCallback","_DeleteRegion","_add_segment","_InitPriorityQ","___gl_pqHeapInsert","_malloc","_FixUpperEdge","___gl_meshConnect","_noVertex","_GotoState","_FloatDown","_tmalloc_small","_TopRightRegion","_CheckForLeftSplice","___gl_dictListSearch","___gl_noEndData","___gl_transSign","___gl_pqSortInit","___gl_pqHeapNewPriorityQ","_ComputeWinding","_init_top","___gl_pqHeapInit","___gl_meshNewMesh","_KillEdge","___gl_dictListNewDict","_noEnd","___gl_pqSortExtractMin","_internal_realloc","_init_mparams","___gl_meshCheckMesh","_TopLeftRegion","___gl_pqSortDeletePriorityQ","___gl_pqSortNewPriorityQ","_realloc","_segment_holding","_new_tess_context","___gl_vertLeq","_CheckForIntersect","___gl_pqSortMinimum","_SpliceMergeVertices","_write_output","_ComputeNormal40","___gl_edgeEval","___gl_edgeSign","_DonePriorityQ","___gl_pqHeapExtractMin","___gl_noEdgeFlagData","_gluTessBeginContour","_noError","_RenderStrip","___gl_noCombineData","_noBegin"]



