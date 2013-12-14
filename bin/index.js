#!/usr/bin/env node


/**
 * Module dependencies
 */
var _			= require('lodash'),
	fs			= require('fs-extra'),
	argv		= require('optimist').argv,
	Err			= require('../errors'),
	Logger		= require('captains-log'),
	Sails		= require('../lib/app');
	_interpretArgs = require('./_arguments');
	cliutil		= require('sails-util/cli');
	_.str		= require('underscore.string'),
	REPL		= require('repl'),
	Grunt__		= require('./www'),
	path		= require('path');
	_.str		= require('underscore.string');



// Build Sails options using command-line arguments
var sailsOptions = cliutil.getCLIConfig(argv);

// Build logger
var log = new Logger(sailsOptions.log);


// Handlers containing all of the logic & responses
// to run/send back to the CLI
var CLIController = {




	/**
	 * `sails new`
	 *
	 * Create all the files/folders for a new app at the specified path.
	 * Relative and/or absolute paths are ok!
	 *
	 * Asset auto-"linker" is enabled by default.
	 */
	new: function ( options ) {

		require('./generators/app')( options, {
			error: function(err) {
				log.error(err);
				return;
			},
			success: function(msg) {
				log.info(msg);
			},
			missingAppName: function () {
				log.error('Please choose the name or destination path for your new app.');
				return;
			}
		});

		// Evaluate options
		// var appName = options.appName;
		// var isLinkerEnabled = options.assetLinker.enabled;
		// var linkerSrc = options.assetLinker.src;

		// log.error('Sorry, `sails new` is currently out of commission.');
		// process.exit(1);
	},






	/**
	 * `sails generate`
	 *
	 * Generate module(s) for the app in our working directory.
	 * Internally, uses ejs for rendering the various module templates.
	 *
	 * @param {Object} options
	 *	 {String} appPath		- path to sails app
	 *	 {String} module		- e.g. 'controller' or 'model'
	 *	 {String} path			- path to output directory
	 *	 {String} id			- the module identity, e.g. 'user'
	 *	 {String} globalID		- override for global identity (automatically generated by default)
	 *	 {String} ext			- file extension for new module (Defaults to .js)
	 *	 {Array} actions		- the array of action names (for controllers only)
	 *	 {String} attributes	- the array of attribute name/type pairs (for models only)
	 *
	 * @param {Object} handlers
	 *	{Function} * - different callbacks than may be triggered
	 */

	generate: function ( options ) {

		var GeneratorFactory = require('./generators/factory');
		var generate = GeneratorFactory( options.module );

		generate (options, {
			error: function (err) {
				log.error('Unexpected error occurred.');
				log.error(err);
			},
			notSailsApp: function () {
				Err.fatal.notSailsApp();
			},
			alreadyExists: function () {
				CLIController.error(options.globalID + ' already exists!');
			},
			success: function () {	

				// Log custom message if override is defined
				if (options.logStatusOverride) {
					return options.logStatusOverride(options, log);
				}

				var hasActions = options.actions && options.actions.length;
				var hasAttributes = options.attributes && options.attributes.length;
				
				// Build a status message
				var statusMessage = '';
				statusMessage += options.dry ? 'That would have generated' : 'Generated';
				statusMessage += ' a new ' + options.module + ' called `' + options.globalID + '`';
				statusMessage += hasActions ? ' with ' + options.actions.length + ' actions:' : '.';
				statusMessage += hasAttributes ? ' with ' + options.attributes.length + ' attributes:' : '.';

				// Log the status message to indicate success
				if (options.dry) { log.info('(dry run)'); }
				log.debug(statusMessage);

				// TODO: pull out generator-specific logging into a customizable generator fn

				// Log actions
				_.each(options.actions || [], function (action) {
					log.debug('  ' + options.globalID + '.' + action + '()');
				});
				// Log attributes
				_.each(options.attributes || [], function (attribute) {
					log.debug('  ' + attribute.name + ' : { type: "' + attribute.type + '" }');
				});

				if (options.dry) {
					log.verbose += 'New file would have been created: ' + options.dirPath + '/' + options.filename;
				}
				else log.verbose += 'New file created: ' + options.dirPath + '/' + options.filename;
			}
		});
	},






	/**
	 * `sails console`
	 *
	 * Enter the interactive console (aka REPL) for the app
	 * in our working directory.
	 */

	console: function () {
		// Load up sails just to get the version
		var sails0 = new Sails();
		sails0.load(_.merge({},sailsOptions,{
			hooks: false,
			globals: false
		}), function (err) {
			if (err) return Err.fatal.failedToLoadSails(err);

			var appID		= _.str.capitalize(path.basename(process.cwd())),
				appName		= _.str.capitalize(appID);

			console.log();
			log('Welcome to the Sails console (v' + sails0.version + ')');
			log('( to exit, type <CTRL>+<C> )');
			log.verbose('Lifting `'+process.cwd()+'` in interactive mode...');

			// Now load up sails for real
			var sails = new Sails();
			sails.lift(_.merge(
				{},
				sailsOptions, {

				// Disable ASCII ship to keep from dirtying things up
				log: {
					noShip: true
				}
			}), function (err) {
				if (err) return Err.fatal.failedToLoadSails(err);

				var repl = REPL.start('sails> ');
				repl.on('exit', function (err) {
					if (err) {
						log.error(err);
						process.exit(1);
					}
					process.exit(0);
				});
				
			});
		});	
	},







	/**
	 * `sails run`
	 *
	 * Issue a command/instruction
	 */

	run: function () {
		log.error('Sorry, `sails run` is currently out of commission.');
		process.exit(1);
	},







	/**
	 * `sails www`
	 *
	 * Build a www directory from the assets folder.
	 * Uses the Gruntfile.
	 */

	www: function () {
		var wwwPath = path.resolve( process.cwd(), './www' ),
			GRUNT_TASK_NAME = 'build';

		log.info('Compiling assets into standalone `www` directory with `grunt ' + GRUNT_TASK_NAME + '`...');

		var sails = new Sails();
		sails.load(_.merge({},sailsOptions,{
			hooks: {
				grunt: false
			},
			globals: false
		}), function sailsReady (err) {
			if (err) return Err.fatal.failedToLoadSails(err);

			var Grunt = Grunt__(sails);
			Grunt( GRUNT_TASK_NAME );

			// Bind error event
			sails.on('hook:grunt:error', function (err) {
				log.error('Error occured starting `grunt ' + GRUNT_TASK_NAME + '`');
				log.error('Please resolve any issues and try running `sails www` again.');
				process.exit(1);
			});

			// Task is not actually complete yet-- it's just been started
			// We'll bind an event listener so we know when it is
			sails.on('hook:grunt:done', function () {
				log.info();
				log.info('Created `www` directory at:');
				log.info(wwwPath);
				process.exit(0);
			});
		});
	},







	/**
	 * `sails version`
	 *
	 * Output the version of the Sails in our working directory-
	 * i.e. usually, the version we installed with `npm install sails`
	 *
	 * If no local installation of Sails exists, display the version
	 * of the Sails currently running this CLI code- (that's me!)
	 * i.e. usually, the version we installed with `sudo npm install -g sails`
	 */

	version: function () {
		var sails = new Sails();
		sails.load( _.merge({},sailsOptions,{
			hooks: false,
			globals: false
		}), function (err) {
			if (err) return Err.fatal.failedToLoadSails(err);
			log.info('v' + sails.version);
		});
	},





	/**
	 * `sails lift`
	 * 
	 * Expose method which lifts the appropriate instance of Sails.
	 * (Fire up the Sails app in our working directory.)
	 *
	 * @param {Object} options - to pass to sails.lift()
	 */
	lift: function ( ) {

		// Ensure options passed in are not mutated
		var options = _.clone(sailsOptions);

		// Use the app's local Sails in `node_modules` if one exists
		var appPath = process.cwd();
		var localSailsPath = appPath + '/node_modules/sails';

		// But first make sure it'll work...
		if ( Sails.isLocalSailsValid(localSailsPath, appPath) ) {
			require( localSailsPath + '/lib' ).lift(options);
			return;
		}

		// Otherwise, if no workable local Sails exists, run the app 
		// using the currently running version of Sails.  This is 
		// probably always the global install.
		var globalSails = new Sails();
		globalSails.lift(options);
		return;
	},
	



	
	/**
	 * User entered an unknown or invalid command.
	 *
	 * Print out usage and stuff.
	 */

	invalid: function ( /* [msg1|options], [msg2], [msg3], [...] */ ) {
		var args = Array.prototype.slice.call(arguments, 0),
			options = _.isPlainObject(args[0]) ? args[0] : null,
			messages = !_.isPlainObject(args[0]) ? args : args.splice(1);

		// If options were specified, it should contain the arguments
		// that were passed to the CLI.  Build the best error message
		// we can based on what we know.
		if ( options ) {
			if ( !options.first ) {
				messages.push('Sorry, I don\'t understand what that means.');
			}
			else messages.push('Sorry, I don\'t understand what `'+options.first+'` means.');
		}

		// Iterate through any other message arguments
		// and output a console message for each
		_.each(messages, function (msg) {
			log.error(msg);
		});

		// Finish up with an explanation of how to get more docs/information
		// on using the Sails CLI.
		log.info( 'To get help using the Sails command-line tool, run `sails`.');
	},





	/**
	 * Sails CLI internal error occurred.
	 *
	 * Print error message.
	 */

	error: function ( err ) {
		// log.error( 'An error occurred.' );
		log.error( err );
		console.log('');
	},






	/**
	 * The CLI was run with no arguments.
	 *
	 * Print welcome message and usage info.
	 */

	sails: function () {
		var sails = new Sails();
		sails.load( _.merge({},sailsOptions, {
			hooks: false,
			globals: false
		}), function (err) {
			if (err) return Err.fatal.failedToLoadSails(err);
			console.log('');
			log.info('Welcome to Sails! (v' + sails.version + ')');
			log.info( cliutil.usage.sails() );
			console.log('');
		});
	}
};



// Interpret arguments, route to appropriate handler
_interpretArgs( argv, CLIController );
























	// // Check for newer version and upgrade if available.
	// else if (_.contains(['upgrade'], argv._[0])) {
	// 	var sys = require('sys');
	// 	var exec = require('child_process').exec;
	// 	var child;
	// 	var http = require('http');
	// 	var newest;
	// 	var current;
	// 	var options = {
	// 		host: 'registry.npmjs.org',
	// 		port: 80,
	// 		path: '/sails'
	// 	};
	// 	http.get(options, function (res) {
	// 		var jsond = '';
	// 		var body = '';
	// 		res.on('data', function (chunk) {
	// 			body += chunk;
	// 		});
	// 		res.on('end', function () {
	// 			jsond = JSON.parse(body);
	// 			if (jsond['dist-tags'].latest > sails.version) {
	// 				// executes `pwd`
	// 				child = exec('npm install sails@' + jsond['dist-tags'].latest, function (error, stdout, stderr) {
	// 					if (error !== null) {
	// 						console.log('exec error: ' + error);
	// 					}
	// 					console.log('Upgrade Complete:  You are now on Sails Version: ' + jsond['dist-tags'].latest);
	// 				});
	// 			} else {
	// 				console.log('Already Up To Date');
	// 			}
	// 		});
	// 	}).on('error', function (e) {
	// 		console.error(e);
	// 	});
	// }

