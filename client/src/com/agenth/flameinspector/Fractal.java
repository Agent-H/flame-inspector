package com.agenth.flameinspector;

import java.util.ArrayList;

public class Fractal {
	
	private float[] m_transforms;
	private int m_nbTransforms;
	
	private Fractal(float[] transforms, int nbTransforms){
		m_transforms = transforms;
		m_nbTransforms = nbTransforms;
	}
	
	public float[] getTransforms(){
		return m_transforms;
	}
	
	public int getNbTransforms(){
		return m_nbTransforms;
	}
	
	static public class Builder{
		
		private ArrayList<float[]> m_transforms = new ArrayList<float[]>();
		float[] m_camera;
		
		public Builder addTransform(float[] trns){
			m_transforms.add(trns);
			return this;
		}
		
		public Builder setCamera(float[] camera){
			m_camera = camera;
			return this;
		}
		
		public Fractal build(){
			float serialized[] = new float[(m_transforms.size()+1)*Transform.LENGTH];
			for(int i = 0 ; i < m_transforms.size() ; i++){
				
				float[] trns = m_transforms.get(i);
				
				for(int j = 0 ; j < Transform.LENGTH ; j++){
					serialized[i*Transform.LENGTH+j] = trns[j];
				}
			}
			
			for(int i = 0 ; i < Transform.LENGTH ; i++){
				serialized[m_transforms.size()*Transform.LENGTH+i] = m_camera[i];
			}
			
			return new Fractal(serialized, m_transforms.size());
		}
	}
}
