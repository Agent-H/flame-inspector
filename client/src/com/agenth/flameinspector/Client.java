package com.agenth.flameinspector;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;

import javax.imageio.ImageIO;

public class Client {

	private static int    _port;
	private static String _addr;
    private static Socket _socket;
    
    private static Fractal _fractal;
    private static int _density;
    
    
	public static void main(String[] args) {
		DataInputStream input = null;
		DataOutputStream output = null;
		
        try {
        	
        	_port   = (args.length > 1) ? Integer.parseInt(args[1]) : 5000;
    	 	_addr = (args.length > 0) ? args[0] : "127.0.0.1";
    	 	
    	 	System.out.println("Connecting to "+_addr+" on port "+_port);
    	 	
        	_socket = new Socket(_addr, _port);
			
        	 // Open stream
            input = new DataInputStream(_socket.getInputStream());
            output = new DataOutputStream(_socket.getOutputStream());
            
            System.out.println("Connection successful");
            
            //Loops forever on working process
            while(true){
            	System.out.println("Waiting for new command");
            	getCommand(input);
            	
            	System.out.println("Command received, beginning work");
            	BufferedImage img = Worker.compute(_fractal, _density);
            	
            	System.out.println("Sending image");
            	sendImages(output, img);
            }
        	
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try
            {
                input.close();
                output.close();
                _socket.close();
            }
            catch (IOException e)
            {
                e.printStackTrace();
            }
		}

	}

	
	public static void sendImages(DataOutputStream output, BufferedImage image) throws IOException {
		
		for(int z = 0 ; z < Config.ZOOM_PER_CHUNK ; z++){
			for (int y = 0; y < Config.IMAGE_PER_CHUNK_LEVEL_ROW(z) ; y++) {
	            for (int x = 0; x < Config.IMAGE_PER_CHUNK_LEVEL_ROW(z) ; x++) {
	            	
	                //Initialize the image array with image chunks  
	                BufferedImage imgOut = new BufferedImage(Config.IMAGE_SIZE, Config.IMAGE_SIZE, image.getType());  
	  
	                // draws the image chunk  
	                Graphics2D gr = imgOut.createGraphics();  
	                gr.drawImage(image, 0, 0, Config.IMAGE_SIZE, Config.IMAGE_SIZE, 
	                		(int)(Config.IMAGE_SIZE * x * Math.pow(2, z)),
	                		(int)(Config.IMAGE_SIZE * y * Math.pow(2, z)),
	                		(int)(Config.IMAGE_SIZE * (x+1) * Math.pow(2, z)),
            				(int)(Config.IMAGE_SIZE * (y+1) * Math.pow(2, z)),
	                		null);
	                
	                gr.dispose();
	                
	                sendImage(output, imgOut, x, y, z);
	            }
	        }
		}
		
		output.writeByte(Config.OPCODE_ENDOFDATA);
		//Header padding
		output.writeInt(0);
		output.writeInt(0);
		output.writeInt(0);
		output.writeInt(0);
	}
	
	public static void sendImage(DataOutputStream output, BufferedImage image, int x, int y, int z) throws IOException{
		ByteArrayOutputStream tmp = new ByteArrayOutputStream();
        
		/*
		 * We have to write the image one first time to get it's size,
		 * then rewrite it to the socket.
		 */
		ImageIO.write(image, "jpeg", tmp);
        tmp.close();
        Integer contentLength = tmp.size();
        
        output.writeByte(Config.OPCODE_IMAGE);
        output.writeInt(contentLength);
        output.writeInt(x);
        output.writeInt(y);
        output.writeInt(z);
        
        ImageIO.write(image, "jpeg", output);
	}
	
	//Blocks until it receives a command from the server.
	public static void getCommand(DataInputStream input) throws IOException{
		
		@SuppressWarnings("unused")
		short packetLength = input.readShort();
		
		
		float left 		= input.readFloat();
		float top 		= input.readFloat();
		float right 	= input.readFloat();
		float bottom 	= input.readFloat();
		
		CameraBuilder camera = new CameraBuilder();
		camera.setOriginRect(left, top, right, bottom);
		camera.setSize(Config.CHUNK_WIDTH, Config.CHUNK_HEIGHT);
		
		Fractal.Builder fractal = readFractal(input);
		
		fractal.setCamera(camera.build());
		
		_density = input.readInt();
		_fractal = fractal.build();
		
		System.out.println("Camera : "+left+", "+top+", "+right+", "+bottom+"\nDensity : "+_density);
		
		
	}
	
	public static Fractal.Builder readFractal(DataInputStream input) throws IOException{
		Fractal.Builder fractal = new Fractal.Builder();
		
		byte nbTransform = input.readByte();
		
		//Reads each transform
		for(byte i = 0 ; i < nbTransform ; i++){
			
			//Getting transform's matrix components
			float[] components = new float[6];
			for(int j = 0 ; j < 6 ; j++){
				components[j] = input.readFloat();
			}
			
			Transform.Builder transform = new Transform.Builder(components);
			
			transform.setColorIndex(input.readFloat());
			
			for(int j = 0 ; j < 6 ; j++){
				float coef = input.readFloat();
				if(coef != 0){
					transform.setVariationWeight(j, coef);
				}
			}
			
			fractal.addTransform(transform.build());
		}
		
		return fractal;
	}

}
