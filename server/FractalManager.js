var events = require("events"),
		fs = require("fs"),
		Fractal = require("./Fractal");

var Manager = function(){
	
	var _this = this;
	
	var CHUNK_SIZE = this.CHUNK_SIZE = 4096;
	var IMG_PER_CHUNK = this.IMG_PER_CHUNK = 16*16;
	
	var fractal = this.fractal = new Fractal(2, 200000);
	
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
			[-0.4113504, -0.7124804, -0.4, 0.7124795, -0.4113508, 0.8],
    		[1, 0.1, 0.1, 0, 0, 0],
			0 );
	
    fractal.addTransform(
			[-0.3957339, 0.12, -1.6, 0.12, -0.3957337, 0.2],
    		[0.1, 0, 0, 0, 0.8, 1],
			1 );
    fractal.addTransform(
			[0.4810169, 0, 1, 0.456, 0.4810169, 0.9],
    		[1, 0, 0, 0.3, 0, 0],
			0.5 );
    
	var viewport = {
		width: 3,
		height: 3,
		centerX: 0.1,
		centerY: 0.1
	};
	
	var divisions = {
		x: 4,
		y: 4
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
					images: new Array(IMG_PER_CHUNK)
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
		
		function saveImage(id){
			fs.writeFile("data/"+_this.fractal.getId()+"/0-"+x+"-"+y+"-"+id+".png", chunk.images[id], function(err){
				if(err){
					console.log("an error has occured : ");
					console.log(err);
					//En cas d'erreur, on libère le chunk pour être recalculé
					unlockChunk(chunk);
				} else {
					if(id < IMG_PER_CHUNK-1)
						saveImage(id+1);
					else
						console.log("Data successfully saved");
				}
			});
		}
		
		saveImage(0);
		
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
			
			// Recence les images présentes
			var images = new Array(chunksCount*IMG_PER_CHUNK);
			
			for(var i = 0 ; i < files.length ; i++){
				
				var infos = files[i].replace(/0-([0-9]+)-([0-9]+)-([0-9]+)\.png/, '$1 $2 $3').split(' ');
				var x = parseInt(infos[0]);
				var y = parseInt(infos[1]);
				var number = parseInt(infos[2]);
				
				images[(y*divisions.x+x)*IMG_PER_CHUNK + number] = true;
			}
			
			for(var i = 0 ; i < chunksCount ; i++){
				if(
					(function(i){
						console.log("checking chunk "+i);
						var count = 0;
						for(var j = 0 ; j < IMG_PER_CHUNK ; j++){
							if(images[i*IMG_PER_CHUNK+j] === true)
								count ++;
						}
						console.log("Image count : "+count);
						return count != IMG_PER_CHUNK;
					})(i)
				){
					console.log("chunk is available");
					chunkLock[i] = false;
					availableChunks++;
				} else {
					chunkLock[i] = true;
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