package com.agenth.flameinspector;

public class Config {
	public static final int KERNELS_COUNT = 2048;
	
	public static final int CHUNK_WIDTH = 4096;
	public static final int CHUNK_HEIGHT = 4096;
	public static final int IMAGE_SIZE = 256;
	
	
	public static final int IMAGE_COUNT_X = CHUNK_WIDTH/IMAGE_SIZE;
	public static final int IMAGE_COUNT_Y = CHUNK_HEIGHT/IMAGE_SIZE;
	public static final int IMAGE_COUNT = IMAGE_COUNT_X * IMAGE_COUNT_Y;
}
