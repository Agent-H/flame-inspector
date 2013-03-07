var fractalManager = require("./FractalManager");

require("./NetManager")(fractalManager);

fractalManager.on('ready', function(){
	console.log('manager is ready');
});