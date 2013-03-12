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
		
		var OPCODE_IMAGE = 0x01;
		var OPCODE_ENDOFDATA = 0x02;
		
		var HEADER_SIZE = 17;
		var infos = {
			length: 0,
			x: 0,
			y: 0,
			z: 0,
			op: 'end'
		};
		var currentLength = 0;
		var bufferedHeader = new Buffer(HEADER_SIZE);
		var headerCount = 0;
		var imageCount = 0;
		var zoom = 0;
		
		
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
		
		function readHeader(header, start){
			if(typeof(start) == 'undefined') start = 0;
			
			var opcode = header.readUInt8(start);
			
			if(opcode == OPCODE_IMAGE){
				if(infos.op == 'end')
					console.log("receiving images");
					
				infos.op = 'img';
			
				infos.length = header.readInt32BE(start + 1);
				infos.x = header.readInt32BE(start + 5);
				infos.y = header.readInt32BE(start + 9);
				infos.z = header.readInt32BE(start + 13);
				
			} else if(opcode == OPCODE_ENDOFDATA){
				infos.op = 'end';
				console.log("End of download");
				
				fractalManager.saveChunk(chunk);
				chunk = null;
				
				pollJob();
			} else {
				infos.op = 'null';
				console.log("Unrecognised opcode : "+opcode);
			}
		}
		
		function writeImageData(data, sourceStart){
			if(typeof(sourceStart) == 'undefined') sourceStart = 0;
			var sourceEnd;
			
			if(currentLength + data.length - sourceStart >= infos.length){
				sourceEnd = infos.length - currentLength + sourceStart;
			}
			
			data.copy(chunk.images[infos.z][infos.x][infos.y], currentLength, sourceStart, sourceEnd);
	
			currentLength += data.length - sourceStart;
			
			if(currentLength >= infos.length){
				infos.length = 0;
				currentLength = 0;
				
				if(sourceEnd < data.length){
					onHeaderData(data, sourceEnd);
				}
			}
		}
		
		function onHeaderData(data, start){
			if(typeof(start) == 'undefined') start = 0;
			
			//Header has not been completely received
			if(data.length + headerCount - start < HEADER_SIZE){
				data.copy(bufferedHeader, headerCount);
				headerCount += data.length - start;
			} 
			//Header has been received but in multiple parts
			else if(headerCount != 0) {
				var bufEnd = start + HEADER_SIZE - headerCount;
				
				data.copy(bufferedHeader, headerCount, start, bufEnd);	
				headerCount = 0;
				
				readHeader(bufferedHeader, start);
				
				if(infos.op == 'img'){
					chunk.images[infos.z][infos.x][infos.y] = new Buffer(infos.length);
					
					if(data.length > bufEnd){
						writeImageData(data, bufEnd);
					}
				}
			} 
			//Header is received all at once
			else {
				
				readHeader(data, start);
				
				if(infos.op == 'img'){
					chunk.images[infos.z][infos.x][infos.y] = new Buffer(infos.length);
					
					if(data.length > start + HEADER_SIZE){
						writeImageData(data, start + HEADER_SIZE);
					}
				}
			}
		}
		
		// Add a 'data' event handler to this instance of socket
		sock.on('data', function(data) {
			
			if(chunk !== null){
				if(infos.length == 0){
					
					onHeaderData(data);
					
				} else {					
					writeImageData(data, 0);
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