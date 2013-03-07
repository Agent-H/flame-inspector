package com.agenth.flameinspector;

/**
 * Construit une transformation dans le format du kernel :
 * 
 * Tableau de float de longueur 13 :
 * 
 * [ Matrice de transformation (6) | color index (1) | coefficients de variations (6) ]
 * @author Hadrien
 *
 */
public class Transform {
	
	public static final int LENGTH = 13;
	public static final int COLOR_INDEX_POS = 6;
	public static final int VARIATIONS_POS = 7;
	
	public static class Builder{
		private float[] m_coefs = new float[LENGTH];
		
		public Builder(float[] components){
			for(int i = 0 ; i < 6 ; i++){
				m_coefs[i] = components[i];
			}
		}
		
		public Builder(float a, float b, float c, float d, float e, float f){
			m_coefs[0] = a;
			m_coefs[1] = b;
			m_coefs[2] = c;
			m_coefs[3] = d;
			m_coefs[4] = e;
			m_coefs[5] = f;
		}
		
		public Builder(){
			m_coefs[0] = 1;
			m_coefs[4] = 1;
			m_coefs[VARIATIONS_POS] = 1;
		}
		
		public Builder addScaling(float sx, float sy){
			m_coefs[0] = m_coefs[0] * sx; 
			m_coefs[1] = m_coefs[1] * sy; 
			m_coefs[3] = m_coefs[3] * sx; 
			m_coefs[4] = m_coefs[4] * sy; 
			return this;
		}
		
		public Builder addTranslation(float dx, float dy){ 
			m_coefs[2] = m_coefs[0] * dx + m_coefs[1] * dy + m_coefs[2]; 
			m_coefs[5] = m_coefs[3] * dx + m_coefs[4] * dy + m_coefs[5];
			
			return this;
		}
		
		public Builder setVariationWeight(int id, float weight){
			if(id < 0 || id >= 6)
				throw new IndexOutOfBoundsException();
			
			m_coefs[VARIATIONS_POS+id] = weight;
			
			return this;
		}
		
		public Builder setColorIndex(float id){
			m_coefs[COLOR_INDEX_POS] = id;
			
			return this;
		}
		
		public float[] build(){
			return m_coefs;
		}
	}
}
