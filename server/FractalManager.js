var events = require("events"),
		fs = require("fs"),
		Fractal = require("./Fractal");

var Manager = function(){
	
	var _this = this;
	
	var fractal = this.fractal = new Fractal(1, 200000);
	
	/*
	fractal.addTransform(
			[-0.4113504, -0.7124804, -0.4, 0.7124795, -0.4113508, 0.8],
			[1, 0.1, 0, 0, 0, 0],
			0 );
	fractal.addTransform(
			[-0.3957339, 0, -1.6, 0, -0.3957337, 0.2],
			[0, 0, 0, 0, 0.8, 1],
			1 );
	fractal.addTransform(
			[0.4810169, 0, 1, 0, 0.4810169, 0.9],
			[1, 0, 0, 0, 0, 0],
			0.5 );
	
	var viewport = {
		width: 5,
		height: 4,
		centerX: -0.25,
		centerY: 0
	};
	
	var divisions = {
		x: 10,
		y: 8
	};*/
	
	fractal.addTransform(
			[0.7124807, -0.4113509, -0.3, 0.4113513, 0.7124808, -0.7],
    		[0.5, 0, 0, 0.4, 0, 0],
			0 );
	
    fractal.addTransform(
			[0.3731079, -0.6462417, 0.4, 0.6462414, 0.3731076, 0.3],
    		[1, 0, 0.1, 0, 0, 0],
			1 );
    fractal.addTransform(
			[0.0842641, -0.314478, 0.1, 0.314478, 0.0842641, 0.3],
    		[1, 0, 0, 0, 0, 0],
			0.5 );
    
	var viewport = {
		width: 3,
		height: 3,
		centerX: 0.1,
		centerY: 0.1
	};
	
	var divisions = {
		x: 12,
		y: 12
	};
	
	var chunkWidth = viewport.width/divisions.x;
	var chunkHeight = viewport.height/divisions.y;
	
	//True when manager is fully initialized
	var _ready = false;
	this.isReady = function(){
		return _ready;
	}
	
	//True when manager has an empty chunk to process. False when ready is false
	this.hasNextChunk = function(){
		return availableChunks > 0;
	}

	//returns the next chunk to compute and locks it (prevents any other access to this chunk until unlockChunk is called
	this.lockNextChunk = function(){
		if(availableChunks <= 0)
			return null;
		
		for(var i = 0 ; i < chunksCount ; i++){
			if(chunkLock[i] == false){
			
				console.log("Chunk locked : "+i);
				
				availableChunks --;
				chunkLock[i] = true;
				
				var x = i%divisions.x;
				var y = Math.floor(i/divisions.x);
				
				return {
					id: i,
					width: chunkWidth,
					height: chunkHeight,
					x: x*chunkWidth + viewport.centerX - viewport.width/2,
					y: y*chunkHeight + viewport.centerY - viewport.height/2,
					chunkX: x,
					chunkY: y,
					data: ''
				};
			}
		}
		
		return null;
	}
	
	/* Unlocks the current chunk so that subsequent calls to lockNextChunk can use this chunk. */
	this.unlockChunk = function(chunk){
		chunkLock[chunk.id] = false;
		
		availableChunks ++;
		
		//We just unfreezed the job queue, let's tell everyone !
		if(availableChunks == 1){
			_this.emit("chunksAvailable");
		}
		
		console.log("chunk released : "+chunk.id);
	}
	
	this.saveChunk = function(chunk){
		var x = chunk.chunkX;
		var y = chunk.chunkY;
		
		fs.writeFile("data/"+_this.fractal.getId()+"/"+x+"-"+y+".png", chunk.data, function(err){
			if(err){
				console.log("an error has occured : ");
				console.log(err);
				//En cas d'erreur, on libère le chunk pour être recalculé
				unlockChunk(chunk);
			} else {
				console.log("Data successfully saved");
			}
		});
	}
	
	
	
	/* Stores which chunk have already been computed */
	var chunksCount = divisions.x * divisions.y;
	
	/* Holds chunk locks. A chunk is locked (i.e. true) when it was already completed or when a client is processing it */
	var chunkLock = new Array(chunksCount);
	var availableChunks = 0;
	
	/* Scans for existing chunks */
	fs.readdir("data/"+this.fractal.getId(), function(err, files){
		
		//fractal not yet created
		if(err != null){
			if(err.code == 'ENOENT'){
				for(var i = 0 ; i < chunksCount ; i++){
					chunkLock[i] = false;
				}
				fs.mkdir("data/"+_this.fractal.getId(), function(){
					availableChunks = chunksCount;
					_ready = true;
					_this.emit('ready');
				});
			} else {
				_this.emit('error', 'A filesystem error occured');
			}
		} else {
		
			for(var i = 0 ; i < files.length ; i++){
				
				var x = parseInt(files[i].replace(/([0-9]+)-[0-9]+\.png/, '$1'));
				var y = parseInt(files[i].replace(/[0-9]+-([0-9]+)\.png/, '$1'));
				
				chunkLock[y*divisions.x+x] = true;
			}
			
			for(var i = 0 ; i < chunksCount ; i++){
				if(chunkLock[i] !== true){
					chunkLock[i] = false;
					availableChunks++;
				}
			}
			
			_ready = true;
			
			_this.emit('ready');
			_this.emit('chunksAvaliable');
		}
	});
	
	
};

Manager.prototype = new events.EventEmitter;

module.exports = new Manager();