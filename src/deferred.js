(function( jQuery ) {

// promise and invert methods factory
function promiseInvertFactory( invert ) {
	return function( promise ) {
		var cache;
		return function( object ) {
			var i;
			if ( !cache ) {
				cache = {};
				for( i in pMethods ) {
					cache[ i ] = invert ?
						( pMethods[ i ] && promise[ pMethods[ i ] ] ||
							dFactories[ i ]( cache ) ) :
						promise[ i ];
				}
			}
			if ( !object ) {
				object = cache;
			} else {
				for( i in cache ) {
					object[ i ] = cache[ i ];
				}
			}
			return object;
		};
	};
}

// Deferred methods factories
var dFactories = {
		always: function( promise ) {
			return function() {
				var args = sliceDeferred.call( arguments, 0 );
				promise.done( args ).fail( args );
				return this;
			};
		},
		chain: function( promise ) {
			return function( fn ) {
				return jQuery.Deferred(function( defer ) {
					promise.done(function() {
						jQuery.when( fn.apply( this, arguments ) )
							.done( defer.resolve )
							.fail( defer.reject );
					}).fail( defer.reject );
				}).promise();
			};
		},
		invert: promiseInvertFactory( true ),
		promise: promiseInvertFactory(),
		then: function( promise ) {
			return function( doneCallbacks, failCallbacks ) {
				promise.done( doneCallbacks ).fail( failCallbacks );
				return this;
			};
		}
	},
	// Promise methods
	pMethods = {
		always: "always",
		done: "fail",
		fail: "done",
		invert: "promise",
		isRejected: "isResolved",
		isResolved: "isRejected",
		promise: "invert"
	},
	iDeferred,
	sliceDeferred = [].slice;

// Add methods with no invert
for( iDeferred in dFactories ) {
	pMethods[ iDeferred ] = pMethods[ iDeferred ] || false;
}

jQuery.extend({

	// Create a simple deferred (single callbacks list)
	_Deferred: function() {
		var // callbacks list (false when cancelled)
			callbacks = [],
			// stored [ context , args ]
			fired = false,
			// to avoid firing when already doing so
			firing = false,
			// the deferred itself
			deferred  = {
				// Add callbacks
				done: function() {
					if ( callbacks ) {
						var i = 0,
							length = arguments.length,
							type,
							savedFired = fired;
						fired = false;
						for ( ; i < length; i++ ) {
							type = jQuery.type( arguments[ i ] );
							if ( type === "array" ) {
								deferred.done.apply( deferred, arguments[ i ] );
							} else if ( type === "function" ) {
								callbacks.push( arguments[ i ] );
							}
						}
						if ( savedFired ) {
							deferred.resolveWith( savedFired[ 0 ], savedFired[ 1 ] );
						}
					}
					return this;
				},
				// resolve with given context and args
				resolveWith: function( context, args ) {
					var callback;
					if ( callbacks && !fired && !firing ) {
						firing = true;
						try {
							while( ( callback = callbacks.shift() ) ) {
								callback.apply( context, args );
							}
						}
						finally {
							fired = [ context, args ];
							firing = false;
						}
					}
					return this;
				},
				// resolve with this as context (or promise if available) and given arguments
				resolve: function() {
					deferred.resolveWith(
						jQuery.isFunction( this.promise ) ? this.promise() : this,
						arguments );
					return this;
				},
				// Has this deferred been resolved?
				isResolved: function() {
					return firing || !!fired;
				},
				// Cancel
				cancel: function() {
					callbacks = false;
				}
			};

		return deferred;
	},

	// Full fledged deferred (two callbacks list)
	Deferred: function( fn ) {
		// Create the underlying deferreds
		var defer = jQuery._Deferred(),
			failDefer = jQuery._Deferred(),
			i;
		// Add missing pMethods to defer
		defer.reject = failDefer.resolve;
		defer.rejectWith = failDefer.resolveWith;
		for( i in pMethods ) {
			defer[ i ] = defer[ i ] ||
				pMethods[ i ] && failDefer[ pMethods[i] ] ||
				dFactories[ i ]( defer );
		}
		// Make sure only one callback list will be used
		defer.done( failDefer.cancel ).fail( defer.cancel );
		// Unexpose cancel
		delete defer.cancel;
		// Call given func if any
		if ( fn ) {
			fn.call( defer, defer );
		}
		return defer;
	},

	// Deferred helpers
	when: function( object ) {
		var length = arguments.length,
			deferred = length <= 1 && object && jQuery.isFunction( object.promise ) ?
				object :
				jQuery.Deferred(),
			promise = deferred.promise();

		if ( length > 1 ) {
			var array = sliceDeferred.call( arguments, 0 ),
				count = length,
				iCallback = function( index ) {
					return function( value ) {
						array[ index ] = arguments.length > 1 ?
								sliceDeferred.call( arguments, 0 ) : value;
						if ( !( --count ) ) {
							deferred.resolveWith( promise, array );
						}
					};
				};
			while( length-- ) {
				object = array[ length ];
				if ( object && jQuery.isFunction( object.promise ) ) {
					object.promise().then( iCallback(length), deferred.reject );
				} else {
					--count;
				}
			}
			if ( !count ) {
				deferred.resolveWith( promise, array );
			}
		} else if ( deferred !== object ) {
			deferred.resolve( object );
		}
		return promise;
	}
});

})( jQuery );
