var net = require('net');

var HOST = '127.0.0.1';
var PORT = 5000;

var clients = new Array();

module.exports = function(fractalManager){
	// Create a server instance, and chain the listen function to it
	// The function passed to net.createServer() becomes the event handler for the 'connection' event
	// The sock object the callback function receives UNIQUE for each connection
	net.createServer(function(sock) {
		var _this = this;
		var chunk = null;
		
		var outputLength = 0;
		var currentLength = 0;
		var bufferedHeader = new Buffer(4);
		var headerCount = 0;
		var imageCount = 0;
		
		
		clients.push(sock);
		
		//Polls for a new job to assign to this socket
		function pollJob(){		
			if(fractalManager.hasNextChunk()){
				console.log("new job available");
				chunk = fractalManager.lockNextChunk();
				
				/* Buffer format :
					buffer size (2 bytes)
					left | top | right | bottom (4*4 bytes)
					fractal
				*/
				
				var bufferSize = fractalManager.fractal.getBufferSize()+18;
				var buffer = new Buffer(bufferSize);
				
				buffer.writeInt16BE(bufferSize, 0);
				buffer.writeFloatBE(chunk.x, 2);
				buffer.writeFloatBE(chunk.y+chunk.height, 6);
				buffer.writeFloatBE(chunk.x+chunk.width, 10);
				buffer.writeFloatBE(chunk.y, 14);
				
				fractalManager.fractal.writeToBuffer(buffer, 18);
				
				//Sends command to client
				sock.write(buffer);
				
				console.log("Sent buffer of size :"+bufferSize);
				
			} else {
				console.log("Waiting for new job");
				fractalManager.once('chunksAvailable', pollJob);
			}
		};
		
		function writeData(data, sourceStart){
			if(typeof(sourceStart) == 'undefined') sourceStart = 0
			
			data.copy(chunk.images[imageCount], currentLength, sourceStart);
			
			currentLength += data.length-sourceStart;
			
			if(currentLength == outputLength){
				
				outputLength = 0;
				currentLength = 0;
				
				imageCount ++;
				if(imageCount == fractalManager.IMG_PER_CHUNK){
					console.log("End of download");
					imageCount = 0;
					fractalManager.saveChunk(chunk);
					chunk = null;
					
					pollJob();
				} else {
					if(imageCount == 1)
						console.log("Receiving images");
				}
			}
		}
		
		// Add a 'data' event handler to this instance of socket
		sock.on('data', function(data) {
			
			if(chunk !== null){
				if(outputLength == 0){
					
					//Receiving image header (size)
					if(data.length+headerCount < 4){
						data.copy(bufferedHeader, headerCount);
						headerCount += data.length;
					} else if(headerCount != 0){
						data.copy(bufferedHeader, headerCount, 0, 4-headerCount);
						
						outputLength = bufferedHeader.readInt32BE(0);
						chunk.images[imageCount] = new Buffer(outputLength);
						
						writeData(data, 4-headerCount);
						
						headerCount = 0;
					} 
					//receiving image data
					else {
						
						outputLength = data.readInt32BE(0);
						chunk.images[imageCount] = new Buffer(outputLength);
						
						writeData(data, 4);
					}
				} else {					
					writeData(data);
				}
				
			} else {
				console.log("received bullshit data");
			}
		});
		
		// Add a 'close' event handler to this instance of socket
		sock.on('close', function(data) {
			//Removes the listener listening for new jobs
			fractalManager.removeListener('chunksAvailable', pollJob);
			
			//Releases the currently processed chunk if there is
			if(chunk !== null){
				fractalManager.unlockChunk(chunk);
			}
			
			//Removes client from clients list
			clients.splice(clients.indexOf(sock), 1);
			console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
		});
		
		// We have a connection - a socket object is assigned to the connection automatically
		console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
		
		//Polls for a new job
		pollJob();
		
	}).listen(PORT);

	console.log('Net server listening on ' + HOST +':'+ PORT);
};