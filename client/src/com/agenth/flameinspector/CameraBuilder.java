package com.agenth.flameinspector;


public class CameraBuilder {
	float 	originWidth,
			originHeight,
			originLeft,
			originBottom,
			cameraWidth,
			cameraHeight;
	
	public CameraBuilder setOriginRect(float left, float top, float right, float bottom){
		originWidth = right-left;
		originHeight = top-bottom;
		originLeft = left;
		originBottom = bottom;
		return this;
	}
	
	public CameraBuilder setSize(int width, int height){
		cameraWidth = width;
		cameraHeight = height;
		return this;
	}
	
	public float[] build(){
		return new Transform.Builder()
				.addScaling(cameraWidth/originWidth, cameraHeight/originHeight)
				.addTranslation(-originLeft, -originBottom)
				.build();
	}

}
