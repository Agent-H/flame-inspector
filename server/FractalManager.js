var events = require("events"),
		fs = require("fs"),
		Fractal = require("./Fractal");

var Manager = function(){
	
	var _this = this;
	
	var CHUNK_SIZE = this.CHUNK_SIZE = 4096;
	var IMG_PER_CHUNK_ROW = this.IMG_PER_CHUNK_ROW = 16;
	var ZOOM_PER_CHUNK = Math.log(IMG_PER_CHUNK_ROW)/Math.log(2) +1;
	var IMG_PER_CHUNK = Math.floor(IMG_PER_CHUNK_ROW * IMG_PER_CHUNK_ROW * (1-Math.pow(4, ZOOM_PER_CHUNK))/(1-4)/Math.pow(4, ZOOM_PER_CHUNK-1));
	
	console.log("IMG_PER_CHUNK : "+IMG_PER_CHUNK);
	var DATA_DIR = "../www/data/";
	
	var fractal = this.fractal = new Fractal(0, 200000);
	
	var imgPerChunkLevel = this.imgPerChunkLevel = function(l){
		return Math.floor(IMG_PER_CHUNK_ROW*IMG_PER_CHUNK_ROW/Math.pow(4, l));
	}
	
	var imgPerChunkLevelRow = this.imgPerChunkLevelRow = function(l){
		return Math.floor(IMG_PER_CHUNK_ROW / Math.pow(2, l));
	}
	
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
    		[0.5, 0, 0.2, 0.4, 0.8, 0],
			0 );
	
    fractal.addTransform(
			[0.3731078, -0.64624117, 0.4, 0.6462414, 0.3731076, 0.3],
    		[1, 0, 0.1, 0, 0, 0],
			0.5 );
    fractal.addTransform(
			[0.0842641, -0.314478, -0.1, 0.314478, 0.0842641, 0.3],
    		[1, 0, 0, 0, 0, 0],
			1 );
    
	var viewport = {
		width: 5,
		height: 5,
		centerX: 0.1,
		centerY: 0.1
	};
	
	var divisions = {
		x: 5,
		y: 5
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
				
				var images = new Array(ZOOM_PER_CHUNK);
				
				for(var z = 0 ; z < ZOOM_PER_CHUNK ; z++){
					var nbImg = imgPerChunkLevelRow(z);
					images[z] = new Array(nbImg);
					for(var j = 0 ; j < nbImg ; j++){
						images[z][j] = new Array(nbImg);
					}
				}
				
				return {
					id: i,
					width: chunkWidth,
					height: chunkHeight,
					x: x*chunkWidth + viewport.centerX - viewport.width/2,
					y: y*chunkHeight + viewport.centerY - viewport.height/2,
					chunkX: x,
					chunkY: y,
					images: images
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
		
		console.log("saving chunk : "+chunk.chunkX+" "+chunk.chunkY);
		
		function saveImage(x, y, z){
		
			if(typeof(chunk.images[z][x][y]) === 'undefined'){
				console.log("Aborting save on image : "+x+" "+y+" "+z);
				console.log("img/chunklvl (z = "+z+") : "+imgPerChunkLevelRow(z));
				return;
			}
			
			fs.writeFile(DATA_DIR+_this.fractal.getId()+"/"+z+"-"+(x + chunk.chunkX*imgPerChunkLevelRow(z))+"-"+((chunk.chunkY+1)*imgPerChunkLevelRow(z) - y -1)+".jpg", chunk.images[z][x][y], function(err){
				if(err){
					console.log("an error has occured : ");
					console.log(err);
					//En cas d'erreur, on libère le chunk pour être recalculé
					unlockChunk(chunk);
				} else {
					if(++y >= imgPerChunkLevelRow(z)){
						y = 0;
						if(++x >= imgPerChunkLevelRow(z)){
							x = 0;
							if(++z >= ZOOM_PER_CHUNK){
								console.log("Data successfully saved");
								return;
							}
						}
					}
					saveImage(x, y, z);
				}
			});
		}
		
		saveImage(0,0,0);
	}
	
	
	/* Stores which chunk have already been computed */
	var chunksCount = divisions.x * divisions.y;
	
	/* Holds chunk locks. A chunk is locked (i.e. true) when it was already completed or when a client is processing it */
	var chunkLock = new Array(chunksCount);
	var availableChunks = 0;
	
	/* Scans for existing chunks */
	fs.readdir(DATA_DIR+this.fractal.getId(), function(err, files){
		
		//fractal not yet created
		if(err != null){
			if(err.code == 'ENOENT'){
				for(var i = 0 ; i < chunksCount ; i++){
					chunkLock[i] = false;
				}
				fs.mkdir(DATA_DIR+_this.fractal.getId(), function(){
					availableChunks = chunksCount;
					_ready = true;
					_this.emit('ready');
				});
			} else {
				_this.emit('error', 'A filesystem error occured');
			}
		} else {
			
			// Recence les images présentes
			var images = new Array(ZOOM_PER_CHUNK);
			for(var z = 0 ; z < ZOOM_PER_CHUNK ; z++){
				images[z] = new Array(chunksCount*imgPerChunkLevel(z));
			}
			
			for(var i = 0 ; i < files.length ; i++){
				
				var infos = files[i].replace(/([0-9]+)-([0-9]+)-([0-9]+)\.jpg/, '$1 $2 $3').split(' ');
				var x = parseInt(infos[1]);
				var y = parseInt(infos[2]);
				var z = parseInt(infos[0]);
				
				images[z][x + y * imgPerChunkLevelRow(z)] = true;
			}
			
			for(var i = 0 ; i < chunksCount ; i++){
				if(
					(function(i){
						var count = 0;
						
						for(var z = 0 ; z < ZOOM_PER_CHUNK ; z++){
							for(var j = 0 ; j < imgPerChunkLevel(z) ; j++){
								if(images[z][i*imgPerChunkLevel(z)+j] === true)
									count ++;
							}
						}
						
						console.log("Chunk "+i+" Image count : "+count);
						return count != IMG_PER_CHUNK;
					})(i)
				){
					console.log("Chunk "+i+" is empty");
					chunkLock[i] = false;
					availableChunks++;
				} else {
					console.log("Chunk "+i+" is complete");
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