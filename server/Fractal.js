module.exports = function(id, density){
	var id = id;
	var density = density;
	
	var transformations = new Array();
	
	this.addTransform = function(affine, variations, color){
		transformations.push({
				affine: affine,
				variations: variations,
				color: color
		});
	};
	
	this.getId = function(){
		return id;
	};
	
	this.getDensity = function(){
		return density;
	};
	
	
	//Returns the size the fractal takues on the buffer with writeToBuffer
	this.getBufferSize = function(){
		return 5+52*transformations.length;
	}
	
	/* Format :
	
	nb of transforms (1 byte) | transformations [ affine (4*6) | color (4) | variations (4*6) ] * nbTransforms | density (4)
	
	*/
	this.writeToBuffer = function(buffer, offset){
		buffer.writeInt8(transformations.length, offset);
		buffer.writeInt32BE(density, offset+52*transformations.length+1);
		
		for(var i = 0 ; i < transformations.length ; i++){
			var transform = transformations[i];
			
			var trnsOffset = offset+1+i*52;
			
			for(var j = 0 ; j < 6 ; j++){
				buffer.writeFloatBE(transform.affine[j], trnsOffset+j*4);
			}
			
			buffer.writeFloatBE(transform.color, trnsOffset+24);
			
			for(var j = 0 ; j < 6 ; j++){
				buffer.writeFloatBE(transform.variations[j], trnsOffset+28+j*4);
			}
		}
	};
}