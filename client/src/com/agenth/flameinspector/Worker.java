package com.agenth.flameinspector;

import static org.bridj.Pointer.allocateBytes;
import static org.bridj.Pointer.allocateFloats;
import static org.bridj.Pointer.allocateInts;
import static org.bridj.Pointer.allocateLongs;

import java.awt.image.BufferedImage;
import java.awt.image.DataBuffer;
import java.awt.image.Raster;
import java.awt.image.WritableRaster;
import java.io.IOException;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

import org.bridj.Pointer;

import com.nativelibs4java.opencl.CLBuffer;
import com.nativelibs4java.opencl.CLContext;
import com.nativelibs4java.opencl.CLEvent;
import com.nativelibs4java.opencl.CLKernel;
import com.nativelibs4java.opencl.CLMem.Usage;
import com.nativelibs4java.opencl.CLProgram;
import com.nativelibs4java.opencl.CLQueue;
import com.nativelibs4java.opencl.JavaCL;
import com.nativelibs4java.util.IOUtils;

public class Worker {
	
	public static BufferedImage compute(Fractal fractal, int density) throws IOException{
		CLContext context = JavaCL.createBestContext();
        CLQueue queue = context.createDefaultQueue();
        ByteOrder byteOrder = context.getByteOrder();
        
		Pointer<Byte> mapPtr = allocateBytes(Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT).order(byteOrder);
		Pointer<Integer> intensitiesPtr = allocateInts(Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT).order(byteOrder);
		Pointer<Float> trnsPtr = allocateFloats((fractal.getNbTransforms()+1)*Transform.LENGTH).order(byteOrder);
		Pointer<Float> ptsPtr = allocateFloats(Config.KERNELS_COUNT*3).order(byteOrder);
		
		trnsPtr.setFloats(fractal.getTransforms());
		
		CLBuffer<Byte> map = context.createByteBuffer(Usage.InputOutput, mapPtr);
		CLBuffer<Integer> intensities = context.createIntBuffer(Usage.InputOutput, intensitiesPtr);
		CLBuffer<Float> transformsBuffer = context.createFloatBuffer(Usage.Input, trnsPtr);
		CLBuffer<Float> pointsBuffer = context.createFloatBuffer(Usage.InputOutput, ptsPtr);
		
		// Read the program sources and compile them :
        String src = IOUtils.readText(Client.class.getClassLoader().getResource("renderer.cl"));
        CLProgram program = context.createProgram(src);
        
        //Récupération des kernels
        CLKernel computeKernel = program.createKernel("compute"),
        		normalizeKernel = program.createKernel("logarithmize");
		
        //Calcul de la durée de vie du random
		int random_life = computeRandomLife(fractal.getNbTransforms());
		Pointer<Long> seedsPtr = allocateLongs(Config.KERNELS_COUNT).order(byteOrder);
		
		generateRandom(seedsPtr, Config.KERNELS_COUNT);
        CLBuffer<Long> seeds = context.createBuffer(Usage.Input, seedsPtr);
        
        System.out.println("Plotting...");
        int percent = 0;
        CLEvent computeEvt;
        
        //Calcul de la fractale avec l'algorithme du chaos
        for(int i = 0 ; i < density ; i++){
        	computeKernel.setArgs(
            		seeds, 
            		map, 
            		intensities, 
            		Config.CHUNK_WIDTH, 
            		Config.CHUNK_HEIGHT, 
            		transformsBuffer, 
            		fractal.getNbTransforms(), 
            		random_life, 
            		pointsBuffer );
	        computeEvt = computeKernel.enqueueNDRange(queue, new int[] { Config.KERNELS_COUNT });
	        
	        if(i < density-1){
		        generateRandom(seedsPtr, Config.KERNELS_COUNT);
		        seeds.write(queue, seedsPtr, true, computeEvt);
	        } else {
	        	intensitiesPtr = intensities.read(queue, computeEvt);
	        }
	        
	        if(100*i/density > percent+4){
	        	percent = 100*i/density;
	        	System.out.println(percent+"%");
	        }
        }
        
        //On libère les ressources intutiles
        seeds.release();
        seedsPtr.release();
	    transformsBuffer.release();
	    
	    System.gc();
	    
	    //Calcul de la luminosité maximale
	    int max = 0;
        for(int i = 0 ; i < Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT ; i++){
        	if(intensitiesPtr.get(i) > max)
        		max = intensitiesPtr.get(i);
        }
	    
        normalizeKernel.setArgs(intensities, (float)Math.log(max+1), Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT);
        
        CLEvent normalizeEvt = normalizeKernel.enqueueNDRange(queue, new int[]{ Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT });
        
        // blocks until  normalize finished
        intensitiesPtr = intensities.read(queue, normalizeEvt);
        mapPtr = map.read(queue);
        
        
        //Rendu du png
        System.out.println("Generating png..");

		int[] imgbytes = new int[Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT];
		
		List<Color> c = new ArrayList<Color>();
		c.add(new Color(1, 0, 0.513725));
		c.add(new Color(0.047058, 0.815683, 0.968627));
		c.add(new Color(0, 1, 0.227451));
		c.add(new Color(0.874509, 1, 0));
		c.add(new Color(1, 0.584313, 0));
		Palette palette = new InterpolatedPalette(c);
		
		Color colorMix = new Color(0,0,0);
		
		for(int i = 0 ; i < Config.CHUNK_WIDTH*Config.CHUNK_HEIGHT ; i++){
			
			palette.setColorForIndex(colorMix, mapPtr.get(i)/127.0);
			imgbytes[i] = colorMix.setMix(colorMix, Color.BLACK, intensitiesPtr.get(i)/2147483647.0).asPackedRGB();
		}
		
		intensitiesPtr.release();
		mapPtr.release();
		
		WritableRaster raster = Raster.createPackedRaster(DataBuffer.TYPE_INT, Config.CHUNK_WIDTH, Config.CHUNK_HEIGHT, 3, 8, null);
		raster.setDataElements(0, 0, Config.CHUNK_WIDTH, Config.CHUNK_HEIGHT, imgbytes);

		BufferedImage newimage = new BufferedImage(Config.CHUNK_WIDTH, Config.CHUNK_HEIGHT, BufferedImage.TYPE_3BYTE_BGR);
		newimage.setData(raster);
        
		System.out.println("Done");
		
		return newimage;
	}
	
	private static int computeRandomLife(long divider){
    	long random = 0X7FFFFFFFFFFFFFFFL; // Largest long
    	
    	int i = 0;
    	while(random > divider){
    		i++;
        	random /= divider;
        }
    	
    	return i;
    }
    
	private static void generateRandom(Pointer<Long> seedsPtr, int n){
    	for (int j = 0; j < n; j++) {
            seedsPtr.set(j, (long) (Math.random()*0X7FFFFFFFFFFFFFFFL)+1);
        }
    }
}
