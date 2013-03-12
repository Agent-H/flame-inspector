package com.agenth.flameinspector;

public class Config {
	public static final int KERNELS_COUNT = 2048;
	
	public static final int CHUNK_WIDTH = 4096;
	public static final int CHUNK_HEIGHT = 4096;
	public static final int IMAGE_SIZE = 256;
	public static final int ZOOM_PER_CHUNK = (int) (Math.log(CHUNK_WIDTH/IMAGE_SIZE)/Math.log(2) +1);
	
	public static final int IMAGE_COUNT_X = CHUNK_WIDTH/IMAGE_SIZE;
	public static final int IMAGE_COUNT_Y = CHUNK_HEIGHT/IMAGE_SIZE;
	public static final int IMAGE_COUNT = IMAGE_COUNT_X * IMAGE_COUNT_Y;
	
	public static final byte OPCODE_IMAGE = 0x01;
	public static final byte OPCODE_ENDOFDATA = 0x02;
	
	public static int IMAGE_PER_CHUNK_LEVEL_ROW(int l){
		return (int) Math.floor(CHUNK_WIDTH/IMAGE_SIZE / Math.pow(2, l));
	}
}
